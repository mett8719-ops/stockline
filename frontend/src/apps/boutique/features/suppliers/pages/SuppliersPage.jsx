import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Search,
  Truck,
} from "lucide-react";
import Badge from "@/components/ui/Badge.jsx";
import Button from "@/components/ui/Button.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import ErrorState from "@/components/ui/ErrorState.jsx";
import Skeleton from "@/components/ui/Skeleton.jsx";
import { parseApiError } from "@/core/api/errors.js";
import { useDebounce } from "@/core/hooks/useDebounce.js";
import { formatMoney } from "@/core/utils/formatMoney.js";
import { useSuppliers } from "../hooks.js";

function MetricCard({ icon: Icon, label, value, caption, tone = "neutral" }) {
  const tones = {
    neutral: "border-slate-200 bg-white text-slate-900",
    warning: "border-amber-100 bg-amber-50 text-amber-800",
  };

  return (
    <article
      aria-label={`${label} : ${value}`}
      className={`rounded-xl border p-4 shadow-sm sm:p-5 ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon aria-hidden="true" className="h-5 w-5 shrink-0 opacity-70" />
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
      {caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
    </article>
  );
}

function SupplierRowsSkeleton() {
  return (
    <div aria-label="Chargement des fournisseurs" className="space-y-4 p-5">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton className="h-12 w-full" key={index} />
      ))}
    </div>
  );
}

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim(), 300);
  const escapedSearch = debouncedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const suppliersQuery = useSuppliers({
    page,
    q: escapedSearch || undefined,
  });
  const data = suppliersQuery.data;
  const suppliers = data?.fournisseurs ?? [];
  const meta = data?.meta;
  const queryError = suppliersQuery.error
    ? parseApiError(suppliersQuery.error).message
    : "";
  const isEmptySearch = Boolean(debouncedSearch);

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-brand-700">Gestion des partenaires</p>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fournisseurs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consultez vos fournisseurs, leurs coordonnées et les dettes en cours.
          </p>
        </div>
      </header>

      <section aria-label="Résumé des fournisseurs" className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          caption={data ? "Fournisseurs actifs dans votre annuaire" : undefined}
          icon={Building2}
          label="Fournisseurs"
          value={!data ? suppliersQuery.isPending ? "…" : "—" : meta.total}
        />
        <MetricCard
          caption={
            data
              ? `${data.dettes.nombre} fournisseur${data.dettes.nombre === 1 ? "" : "s"} avec une dette`
              : undefined
          }
          icon={CircleDollarSign}
          label="Dettes fournisseurs"
          tone="warning"
          value={!data ? suppliersQuery.isPending ? "…" : "—" : formatMoney(data.dettes.total)}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Rechercher un fournisseur par nom</span>
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              maxLength={120}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Nom du fournisseur"
              type="search"
              value={search}
            />
          </label>
          {suppliersQuery.isFetching && data && (
            <span aria-live="polite" className="text-xs text-slate-500">
              Mise à jour…
            </span>
          )}
        </div>

        {suppliersQuery.isError && !data ? (
          <ErrorState
            description={queryError}
            onRetry={() => suppliersQuery.refetch()}
            title="Impossible de charger les fournisseurs"
          />
        ) : suppliersQuery.isPending ? (
          <SupplierRowsSkeleton />
        ) : suppliers.length === 0 ? (
          <EmptyState
            description={
              isEmptySearch
                ? "Vérifiez l’orthographe ou essayez un autre nom."
                : "Les fournisseurs actifs apparaîtront ici dès qu’ils seront enregistrés."
            }
            icon={<Truck aria-hidden="true" className="h-6 w-6" />}
            title={isEmptySearch ? "Aucun résultat" : "Aucun fournisseur"}
          />
        ) : (
          <>
            {suppliersQuery.isError && (
              <div
                aria-live="polite"
                className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
                role="status"
              >
                <span>Impossible d’actualiser les données. Les résultats affichés peuvent être périmés.</span>
                <Button
                  className="min-h-9 px-3 py-1.5 text-xs"
                  onClick={() => suppliersQuery.refetch()}
                  variant="secondary"
                >
                  Réessayer
                </Button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                  <tr>
                    <th className="px-4 py-3 sm:px-5" scope="col">Fournisseur</th>
                    <th className="px-4 py-3" scope="col">Contact</th>
                    <th className="px-4 py-3 text-right" scope="col">Achats cumulés</th>
                    <th className="px-4 py-3" scope="col">Solde fournisseur</th>
                    <th className="px-4 py-3 text-right sm:px-5" scope="col">
                      <span className="sr-only">Fiche</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map((supplier) => {
                    const supplierId = supplier._id ?? supplier.id;
                    const hasDebt = supplier.soldeDu > 0;
                    return (
                      <tr
                        className="text-slate-600 transition-colors hover:bg-slate-50/70"
                        key={supplierId}
                      >
                        <td className="px-4 py-4 sm:px-5">
                          <Link
                            className="font-semibold text-slate-900 hover:text-brand-700 focus:outline-none focus:underline"
                            to={`/suppliers/${encodeURIComponent(supplierId)}`}
                          >
                            {supplier.nom}
                          </Link>
                          {supplier.email && (
                            <p className="mt-1 text-xs text-slate-500">{supplier.email}</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-700">{supplier.contactNom || "—"}</p>
                          {supplier.telephone && (
                            <p className="mt-1 text-xs text-slate-500">{supplier.telephone}</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-slate-700">
                          {formatMoney(supplier.totalAchats)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {hasDebt ? (
                            <Badge variant="warning">À payer : {formatMoney(supplier.soldeDu)}</Badge>
                          ) : (
                            <Badge variant="success">Solde réglé</Badge>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right sm:px-5">
                          <Link
                            aria-label={`Ouvrir la fiche de ${supplier.nom}`}
                            className="font-semibold text-brand-700 hover:text-brand-900"
                            to={`/suppliers/${encodeURIComponent(supplierId)}`}
                          >
                            Voir la fiche
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {meta && (
              <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p aria-live="polite" className="text-sm text-slate-500">
                  Page {meta.page} sur {meta.totalPages} · {meta.total} fournisseur
                  {meta.total === 1 ? "" : "s"}
                </p>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    className="min-h-9 px-3 py-1.5 text-xs"
                    disabled={page <= 1 || suppliersQuery.isFetching}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    variant="secondary"
                  >
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    Précédent
                  </Button>
                  <Button
                    className="min-h-9 px-3 py-1.5 text-xs"
                    disabled={page >= meta.totalPages || suppliersQuery.isFetching}
                    onClick={() => setPage((current) => current + 1)}
                    variant="secondary"
                  >
                    Suivant
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
              </footer>
            )}
          </>
        )}
      </section>
    </main>
  );
}
