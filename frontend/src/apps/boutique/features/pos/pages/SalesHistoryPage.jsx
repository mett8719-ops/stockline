import { ArrowLeft, Ban, Printer, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@/components/ui/Button.jsx";
import DataTable from "@/components/ui/DataTable.jsx";
import { useAuth } from "@/core/hooks/useAuth.js";
import { formatDateTime } from "@/core/utils/formatDate.js";
import { formatMoney } from "@/core/utils/formatMoney.js";
import { saleStatusLabels } from "@/core/utils/labels.js";
import { useCancelSale, useSalesHistory } from "../hooks.js";

const saleStatusOptions = [
  { value: "all", label: "Toutes" },
  { value: "payee", label: saleStatusLabels.payee },
  { value: "partielle", label: saleStatusLabels.partielle },
  { value: "credit", label: saleStatusLabels.credit },
  { value: "annulee", label: saleStatusLabels.annulee },
];

function getStatusTone(status) {
  if (status === "annulee") return "bg-red-100 text-red-700";
  if (status === "credit") return "bg-amber-100 text-amber-700";
  if (status === "partielle") return "bg-blue-100 text-blue-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function SalesHistoryPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cancelingSale, setCancelingSale] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const queryFilters = useMemo(
    () => ({
      page,
      limit: 10,
      q: searchTerm.trim() || undefined,
      statut: statusFilter === "all" ? undefined : statusFilter,
    }),
    [page, searchTerm, statusFilter],
  );

  const salesQuery = useSalesHistory(queryFilters);
  const cancelMutation = useCancelSale();
  const isAdmin = user?.role === "admin";

  const sales = salesQuery.data?.ventes ?? [];
  const totals = salesQuery.data?.totals ?? { chiffreAffaires: 0, benefice: 0, nombreVentes: 0 };
  const meta = salesQuery.data?.meta ?? { page: 1, limit: 10, total: 0, totalPages: 1 };

  function handleCancel() {
    const reason = cancelReason.trim();

    if (!cancelingSale) {
      return;
    }

    if (reason.length < 5) {
      setErrorMessage("Le motif doit contenir au moins 5 caractères.");
      return;
    }

    cancelMutation.mutate(
      { id: cancelingSale._id ?? cancelingSale.id, motif: reason },
      {
        onSuccess: () => {
          setCancelingSale(null);
          setCancelReason("");
          setErrorMessage("");
          salesQuery.refetch();
        },
        onError: (error) => {
          setErrorMessage(error?.response?.data?.error?.message ?? "L’annulation a échoué.");
        },
      },
    );
  }

  const columns = [
    { header: "Référence", accessorKey: "reference", className: "font-medium text-slate-900" },
    { header: "Date", accessorKey: "date", cell: (value) => formatDateTime(value) },
    { header: "Client", accessorKey: "clientNom", cell: (value) => value || "Client général" },
    { header: "Total", accessorKey: "montantTotal", cell: (value) => formatMoney(value) },
    { header: "Bénéfice", accessorKey: "beneficeTotal", cell: (value) => formatMoney(value) },
    {
      header: "Statut",
      accessorKey: "statut",
      cell: (value) => (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusTone(value)}`}>
          {saleStatusLabels[value] ?? value}
        </span>
      ),
    },
    {
      header: "Actions",
      accessorKey: "_id",
      className: "text-right",
      cell: (_, row) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
            onClick={(event) => {
              event.stopPropagation();
              window.print();
            }}
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Reçu
          </button>
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isAdmin || row.statut === "annulee"}
            onClick={(event) => {
              event.stopPropagation();
              if (!isAdmin) {
                return;
              }
              setCancelingSale(row);
              setErrorMessage("");
            }}
          >
            <Ban className="h-3.5 w-3.5" aria-hidden="true" />
            {isAdmin ? "Annuler" : "Admin requis"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-700">Historique des ventes</p>
            <h1 className="text-2xl font-bold text-slate-900">Caisse & annulations</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/pos">
              <Button variant="secondary" className="gap-2">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Retour caisse
              </Button>
            </Link>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Chiffre d’affaires</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(totals.chiffreAffaires ?? 0)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Bénéfice</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{formatMoney(totals.benefice ?? 0)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Ventes</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totals.nombreVentes ?? 0}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                aria-label="Rechercher une vente"
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white"
                placeholder="Recherche par référence ou client"
                value={searchTerm}
                onChange={(event) => {
                  setPage(1);
                  setSearchTerm(event.target.value);
                }}
              />
            </div>

            <select
              aria-label="Filtrer par statut"
              className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-brand-500"
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
            >
              {saleStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <DataTable
            caption="Historique des ventes"
            columns={columns}
            data={sales}
            isLoading={salesQuery.isLoading}
            emptyTitle="Aucune vente trouvée"
            emptyDescription="Ajustez les filtres pour retrouver l’historique de caisse."
          />
        </section>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-600">
              Page {meta.page} / {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                Précédent
              </Button>
              <Button variant="secondary" disabled={page >= meta.totalPages} onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}>
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      {cancelingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-red-600">Annulation admin</p>
                <h2 className="text-xl font-bold text-slate-900">Vente {cancelingSale.reference}</h2>
              </div>
              <button
                type="button"
                aria-label="Fermer la modale"
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  setCancelingSale(null);
                  setCancelReason("");
                  setErrorMessage("");
                }}
              >
                ×
              </button>
            </div>

            <label className="block text-sm font-medium text-slate-700" htmlFor="cancel-reason">
              Motif d’annulation
            </label>
            <textarea
              id="cancel-reason"
              className="mt-2 min-h-[112px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-red-500 focus:bg-white"
              placeholder="Ex. : Erreur de caisse, remboursement client, ticket doublé..."
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />

            {errorMessage && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => {
                setCancelingSale(null);
                setCancelReason("");
                setErrorMessage("");
              }}>
                Annuler
              </Button>
              <Button
                variant="danger"
                isLoading={cancelMutation.isPending}
                disabled={cancelReason.trim().length < 5}
                onClick={handleCancel}
              >
                Confirmer l’annulation
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
