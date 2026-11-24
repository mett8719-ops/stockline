import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Plus,
  Search,
  UsersRound,
} from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import CreateCustomerDialog from "../components/CreateCustomerDialog.jsx";
import { useCustomers } from "../hooks.js";
import { customerCategoryLabels } from "../schemas.js";

const moneyFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  return `${moneyFormat.format(Number(value) || 0)} FCFA`;
}

function CustomerCategory({ category }) {
  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      {customerCategoryLabels[category] || "Particulier"}
    </span>
  );
}

function LoadingRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <tr aria-hidden="true" key={index}>
      {Array.from({ length: 5 }, (_, cellIndex) => (
        <td className="px-5 py-5" key={cellIndex}>
          <div className="skeleton h-4 w-24" />
        </td>
      ))}
    </tr>
  ));
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdCustomer, setCreatedCustomer] = useState(null);
  const customersQuery = useCustomers({
    page,
    q: debouncedSearch,
    categorie: category,
    impayes: overdueOnly,
  });
  const customers = customersQuery.data?.clients || [];
  const pagination = customersQuery.data?.pagination;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
    setCreatedCustomer(null);
  }

  function updateCategory(value) {
    setCategory(value);
    setPage(1);
    setCreatedCustomer(null);
  }

  function updateOverdueOnly(value) {
    setOverdueOnly(value);
    setPage(1);
    setCreatedCustomer(null);
  }

  function handleCreated(customer) {
    setCreatedCustomer(customer);
    setIsCreateOpen(false);
  }

  const errorMessage = customersQuery.error
    ? parseApiError(customersQuery.error).message
    : "";
  const createdCustomerId = createdCustomer?._id || createdCustomer?.id;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-700">Gestion commerciale</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">
            Retrouvez les coordonnées, achats et soldes de vos clients.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2"
          onClick={() => {
            setCreatedCustomer(null);
            setIsCreateOpen(true);
          }}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nouveau client
        </button>
      </header>

      {createdCustomer && (
        <div
          aria-live="polite"
          className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p>Le client « {createdCustomer.nom} » a été créé.</p>
          {createdCustomerId && (
            <Link
              className="font-semibold underline underline-offset-2 hover:text-emerald-950"
              to={`/customers/${encodeURIComponent(createdCustomerId)}`}
            >
              Ouvrir sa fiche
            </Link>
          )}
        </div>
      )}

      <section aria-label="Résumé des créances clients" className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <UsersRound aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-slate-500">Clients correspondants</p>
            <p className="mt-0.5 text-xl font-bold text-slate-900">
              {!customersQuery.data
                ? customersQuery.isPending ? "…" : "—"
                : pagination?.total ?? 0}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <CircleDollarSign aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-slate-500">Créances clients</p>
            <p className="mt-0.5 text-xl font-bold text-slate-900">
              {!customersQuery.data
                ? customersQuery.isPending ? "…" : "—"
                : formatMoney(customersQuery.data.creances.total)}
            </p>
            {customersQuery.data && (
              <p className="text-xs text-slate-500">
                {customersQuery.data.creances.nombre} client
                {customersQuery.data?.creances.nombre === 1 ? "" : "s"} avec un impayé
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Rechercher un client par nom ou téléphone</span>
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Nom ou téléphone"
              type="search"
              value={search}
            />
          </label>
          <label className="sr-only" htmlFor="customer-category-filter">Filtrer par catégorie</label>
          <select
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            id="customer-category-filter"
            onChange={(event) => updateCategory(event.target.value)}
            value={category}
          >
            <option value="">Toutes les catégories</option>
            {Object.entries(customerCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700">
            <input
              checked={overdueOnly}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              onChange={(event) => updateOverdueOnly(event.target.checked)}
              type="checkbox"
            />
            Impayés uniquement
          </label>
        </div>

        {errorMessage ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-slate-900">Impossible de charger les clients</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">{errorMessage}</p>
            <button
              className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => customersQuery.refetch()}
              type="button"
            >
              Réessayer
            </button>
          </div>
        ) : customersQuery.isPending ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <tbody><LoadingRows /></tbody>
            </table>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <UsersRound aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-slate-900">
              {search || category || overdueOnly ? "Aucun client correspondant" : "Aucun client pour le moment"}
            </h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              {search || category || overdueOnly
                ? "Modifiez vos filtres ou votre recherche."
                : "Créez une fiche client pour retrouver ses coordonnées et suivre ses achats."}
            </p>
            {!search && !category && !overdueOnly && (
              <button
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                onClick={() => setIsCreateOpen(true)}
                type="button"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Ajouter un client
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3" scope="col">Client</th>
                    <th className="px-5 py-3" scope="col">Téléphone</th>
                    <th className="px-5 py-3" scope="col">Catégorie</th>
                    <th className="px-5 py-3 text-right" scope="col">Solde dû</th>
                    <th className="px-5 py-3 text-right" scope="col"><span className="sr-only">Fiche</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((customer) => {
                    const customerId = customer.id || customer._id;
                    const balance = Number(customer.soldeCredit) || 0;
                    return (
                      <tr className="transition-colors hover:bg-slate-50/70" key={customerId}>
                        <td className="px-5 py-4">
                          <Link
                            className="font-medium text-slate-900 hover:text-brand-700 focus:outline-none focus:underline"
                            to={`/customers/${encodeURIComponent(customerId)}`}
                          >
                            {customer.nom}
                          </Link>
                          {customer.email && (
                            <p className="mt-0.5 text-xs text-slate-500">{customer.email}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{customer.telephone || "—"}</td>
                        <td className="px-5 py-4"><CustomerCategory category={customer.categorie} /></td>
                        <td className="px-5 py-4 text-right">
                          {balance > 0 ? (
                            <span className="inline-flex whitespace-nowrap rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                              Impayé : {formatMoney(balance)}
                            </span>
                          ) : (
                            <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                              Solde à jour
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            aria-label={`Ouvrir la fiche de ${customer.nom}`}
                            className="text-sm font-semibold text-brand-700 hover:text-brand-900"
                            to={`/customers/${encodeURIComponent(customerId)}`}
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

            {pagination && (
              <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p aria-live="polite" className="text-sm text-slate-500">
                  Page {pagination.page} sur {pagination.totalPages} · {pagination.total} client
                  {pagination.total === 1 ? "" : "s"}
                </p>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {customersQuery.isFetching && (
                    <span className="mr-2 text-xs text-slate-500">Mise à jour…</span>
                  )}
                  <button
                    aria-label="Page précédente"
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={page <= 1 || customersQuery.isFetching}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    Précédent
                  </button>
                  <button
                    aria-label="Page suivante"
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={page >= pagination.totalPages || customersQuery.isFetching}
                    onClick={() => setPage((current) => current + 1)}
                    type="button"
                  >
                    Suivant
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </footer>
            )}
          </>
        )}
      </section>

      {isCreateOpen && (
        <CreateCustomerDialog
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </main>
  );
}
