import { lazy, Suspense, useState } from "react";
import {
  FileText,
  Eye,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Badge from "@/components/ui/Badge.jsx";
import Button from "@/components/ui/Button.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import ErrorState from "@/components/ui/ErrorState.jsx";
import Skeleton from "@/components/ui/Skeleton.jsx";
import { parseApiError } from "@/core/api/errors.js";
import { useDebounce } from "@/core/hooks/useDebounce.js";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/core/utils/formatDate.js";
import { formatMoney } from "@/core/utils/formatMoney.js";
import {
  documentStatusLabels,
  documentTypeLabels,
} from "@/core/utils/labels.js";
import { useDocuments } from "../hooks.js";

const CreateDocumentModal = lazy(
  () => import("../components/CreateDocumentModal.jsx"),
);

const PAGE_SIZE = 10;

const tabs = [
  { id: "tous", label: "Tous" },
  { id: "facture", label: "Factures" },
  { id: "devis", label: "Devis" },
];

const statusVariants = {
  accepte: "info",
  annule: "neutral",
  brouillon: "neutral",
  en_attente: "warning",
  en_retard: "danger",
  expire: "neutral",
  paye: "success",
  refuse: "danger",
};

function MetricCard({ label, value, caption, variant = "neutral", icon: Icon }) {
  const styles = {
    neutral: "border-slate-200 bg-white text-slate-900",
    danger: "border-red-100 bg-red-50 text-red-600",
    info: "border-blue-100 bg-blue-50 text-blue-600",
    success: "border-emerald-100 bg-emerald-50 text-emerald-700",
  };

  return (
    <article
      aria-label={`${label} : ${value}`}
      className={`rounded-xl border p-4 sm:p-5 ${styles[variant]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 opacity-70" />
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
      {caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
    </article>
  );
}

function DocumentStatus({ status }) {
  return (
    <Badge variant={statusVariants[status] ?? "neutral"}>
      {documentStatusLabels[status] ?? status}
    </Badge>
  );
}

function DocumentsTable({ documents, onOpen }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-medium text-slate-500">
          <tr>
            <th className="px-4 py-3 sm:px-5" scope="col">Référence</th>
            <th className="px-4 py-3" scope="col">Type</th>
            <th className="px-4 py-3" scope="col">Client</th>
            <th className="px-4 py-3" scope="col">Date</th>
            <th className="px-4 py-3" scope="col">Échéance</th>
            <th className="px-4 py-3 text-right" scope="col">Montant</th>
            <th className="px-4 py-3 sm:px-5" scope="col">Statut</th>
            <th className="px-4 py-3 sm:px-5" scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documents.map((document) => (
            <tr
              className="text-slate-600 hover:bg-slate-50/70"
              key={document._id ?? document.id}
            >
              <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-slate-700 sm:px-5">
                {document.numero}
              </td>
              <td className="whitespace-nowrap px-4 py-4">
                {documentTypeLabels[document.type] ?? document.type}
              </td>
              <td className="max-w-56 truncate px-4 py-4 font-medium text-slate-900">
                {document.clientNom}
              </td>
              <td className="whitespace-nowrap px-4 py-4">
                <time dateTime={document.dateEmission}>
                  {formatDate(document.dateEmission)}
                </time>
              </td>
              <td
                className={`whitespace-nowrap px-4 py-4 ${
                  document.statut === "en_retard" ? "text-red-600" : ""
                }`}
              >
                {document.dateEcheance ? (
                  <time dateTime={document.dateEcheance}>
                    {formatDate(document.dateEcheance)}
                  </time>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-slate-900">
                {formatMoney(document.montantTotal)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 sm:px-5">
                <DocumentStatus status={document.statut} />
              </td>
              <td className="px-4 py-2 sm:px-5">
                <Button
                  aria-label={`Consulter ${document.numero}`}
                  className="!min-h-10 !h-10 !w-10 !p-0"
                  onClick={() => onOpen(document._id ?? document.id)}
                  variant="ghost"
                >
                  <Eye aria-hidden="true" className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentsTableSkeleton() {
  return (
    <div aria-label="Chargement des documents" className="space-y-4 p-5">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton className="h-9 w-full" key={index} />
      ))}
    </div>
  );
}

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("tous");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const debouncedSearch = useDebounce(search.trim(), 300);
  const type = activeTab === "tous" ? undefined : activeTab;
  const { data, error, isError, isFetching, isPending, refetch } = useDocuments({
    page,
    limit: PAGE_SIZE,
    type,
    q: debouncedSearch || undefined,
  });

  const indicateurs = data?.indicateurs;
  const meta = data?.meta;
  const documents = data?.documents ?? [];

  return (
    <main className="min-h-full bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Devis &amp; Factures
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Gérez vos devis clients et suivez vos factures.
            </p>
          </div>
          <Button
            className="w-full sm:w-auto"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nouveau document
          </Button>
        </header>

        {isPending ? (
          <section
            aria-label="Chargement des indicateurs"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton className="h-28 rounded-xl" key={index} />
            ))}
          </section>
        ) : data ? (
          <section
            aria-label="Indicateurs des documents"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <MetricCard
              caption="Toutes les factures"
              icon={FileText}
              label="Total facturé"
              value={formatMoney(indicateurs.totalFacture)}
            />
            <MetricCard
              caption="Factures à encaisser"
              icon={TrendingDown}
              label="Montant impayé"
              variant="danger"
              value={formatMoney(indicateurs.montantImpaye)}
            />
            <MetricCard
              caption="En attente de réponse"
              icon={FileText}
              label="Devis en cours"
              variant="info"
              value={String(indicateurs.devisEnCours)}
            />
            <MetricCard
              caption="Part déjà encaissée"
              icon={TrendingUp}
              label="Taux d’encaissement"
              variant="success"
              value={`${indicateurs.tauxEncaissement}%`}
            />
          </section>
        ) : null}

        <section
          aria-label="Liste des devis et factures"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5">
            <div
              aria-label="Filtrer par type"
              className="flex rounded-lg bg-slate-100 p-1"
              role="group"
            >
              {tabs.map((tab) => (
                <button
                  aria-pressed={activeTab === tab.id}
                  className={`min-h-10 rounded-md px-3 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  key={tab.id}
                  onClick={() => {
                    setPage(1);
                    setActiveTab(tab.id);
                  }}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <label className="relative min-w-0 flex-1 sm:max-w-md">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <span className="sr-only">
                Rechercher un client ou une référence
              </span>
              <input
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Rechercher par client ou référence..."
                type="search"
                value={search}
              />
            </label>
            {isFetching && data && (
              <span aria-live="polite" className="text-xs text-slate-500">
                Actualisation…
              </span>
            )}
          </div>

          {isError && data && (
            <div
              className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {parseApiError(error).message}
            </div>
          )}

          {isPending ? (
            <DocumentsTableSkeleton />
          ) : isError && !data ? (
            <div className="p-4">
              <ErrorState
                description={parseApiError(error).message}
                onRetry={refetch}
                title="Impossible de charger les documents"
              />
            </div>
          ) : documents.length ? (
            <DocumentsTable
              documents={documents}
              onOpen={(id) => navigate(`/documents/${encodeURIComponent(id)}`)}
            />
          ) : (
            <EmptyState
              description={
                search
                  ? "Essayez une autre référence ou un autre nom de client."
                  : "Les devis et factures créés apparaîtront ici."
              }
              icon={<FileText aria-hidden="true" className="h-6 w-6" />}
              title={search ? "Aucun résultat" : "Aucun document"}
            />
          )}

          {meta && meta.total > 0 && (
            <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p>
                {meta.total} document{meta.total === 1 ? "" : "s"} · page{" "}
                {meta.page} sur {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  className="!min-h-10"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  variant="secondary"
                >
                  Précédent
                </Button>
                <Button
                  className="!min-h-10"
                  disabled={page >= meta.totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(meta.totalPages, current + 1))
                  }
                  variant="secondary"
                >
                  Suivant
                </Button>
              </div>
            </footer>
          )}
        </section>
      </div>
      {isCreateOpen && (
        <Suspense fallback={null}>
          <CreateDocumentModal
            isOpen
            onClose={() => setIsCreateOpen(false)}
            onCreated={(createdType) => {
              setActiveTab(createdType);
              setPage(1);
              setIsCreateOpen(false);
            }}
          />
        </Suspense>
      )}
    </main>
  );
}
