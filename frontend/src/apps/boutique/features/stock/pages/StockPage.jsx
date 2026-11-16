import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import StockMovementModal from "../components/StockMovementModal.jsx";
import { useStockAlerts, useStockMovements } from "../hooks.js";

const movementFilters = [
  { value: "", label: "Tous les types" },
  { value: "entree", label: "Entrées" },
  { value: "sortie", label: "Sorties" },
  { value: "ajustement", label: "Ajustements" },
];

const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const numberFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});

function getId(item) {
  return item.id || item._id;
}

function formatMovementDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date);
}

function movementPresentation(movement) {
  if (movement.type === "entree") {
    return {
      label: "Entrée",
      quantityPrefix: "+",
      className: "text-emerald-700",
      badgeClass: "bg-emerald-50 text-emerald-700",
      Icon: ArrowDown,
    };
  }

  if (movement.type === "sortie") {
    return {
      label: "Sortie",
      quantityPrefix: "-",
      className: "text-red-600",
      badgeClass: "bg-red-50 text-red-700",
      Icon: ArrowUpFromLine,
    };
  }

  const increased = Number(movement.stockApres) >= Number(movement.stockAvant);
  return {
    label: "Ajustement",
    quantityPrefix: increased ? "+" : "-",
    className: "text-amber-700",
    badgeClass: "bg-amber-50 text-amber-800",
    Icon: RefreshCw,
  };
}

function LoadingRows() {
  return Array.from({ length: 6 }, (_, index) => (
    <tr aria-hidden="true" key={index}>
      {Array.from({ length: 6 }, (_, cellIndex) => (
        <td className="px-4 py-4" key={cellIndex}>
          <div className="skeleton h-4 w-24" />
        </td>
      ))}
    </tr>
  ));
}

export default function StockPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const movementsQuery = useStockMovements({
    page,
    q: debouncedSearch,
    type,
  });
  const alertsQuery = useStockAlerts();
  const movements = movementsQuery.data?.movements || [];
  const pagination = movementsQuery.data?.pagination;
  const lowStockProducts = alertsQuery.data?.stockBas || [];

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      250,
    );
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function updateType(value) {
    setType(value);
    setPage(1);
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Stock &amp; Mouvements
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Suivez les entrées, sorties et ajustements.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
          onClick={() => setIsMovementModalOpen(true)}
          type="button"
        >
          <ArrowDownToLine aria-hidden="true" className="h-4 w-4" />
          Nouveau mouvement
        </button>
      </header>

      {alertsQuery.isError ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          Impossible de charger les alertes de stock :{" "}
          {parseApiError(alertsQuery.error).message}
          <button
            className="ml-2 font-semibold underline underline-offset-2"
            onClick={() => alertsQuery.refetch()}
            type="button"
          >
            Réessayer
          </button>
        </div>
      ) : (
        lowStockProducts.length > 0 && (
          <section
            aria-label="Produits sous le seuil d’alerte"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
              {lowStockProducts.length} produit
              {lowStockProducts.length === 1 ? "" : "s"} en dessous du seuil d’alerte
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {lowStockProducts.map((product) => (
                <li
                  className="rounded-md border border-amber-200 bg-amber-100/70 px-3 py-1 text-xs font-medium text-amber-900"
                  key={getId(product)}
                >
                  {product.nom} — {numberFormat.format(Number(product.stockActuel) || 0)}{" "}
                  {product.unite || "pièce"}
                </li>
              ))}
            </ul>
          </section>
        )
      )}

      {feedback && (
        <p
          aria-live="polite"
          className={`rounded-lg px-4 py-3 text-sm ${
            feedback.type === "error"
              ? "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}

      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Rechercher un produit ou une raison</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
            maxLength={120}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Rechercher un produit ou une raison..."
            type="search"
            value={search}
          />
        </label>
        <div className="flex items-center gap-2 sm:w-44">
          <SlidersHorizontal
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-slate-400"
          />
          <label className="min-w-0 flex-1">
            <span className="sr-only">Filtrer par type de mouvement</span>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              onChange={(event) => updateType(event.target.value)}
              value={type}
            >
              {movementFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="card overflow-hidden">
        {movementsQuery.isError && !movementsQuery.data ? (
          <div className="p-8 text-center" role="alert">
            <p className="font-medium text-slate-900">
              Impossible de charger les mouvements de stock.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {parseApiError(movementsQuery.error).message}
            </p>
            <button
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
              onClick={() => movementsQuery.refetch()}
              type="button"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <>
            {movementsQuery.isError && (
              <p
                className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                role="alert"
              >
                Impossible d’actualiser les mouvements :{" "}
                {parseApiError(movementsQuery.error).message}
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <thead className="border-b border-slate-200 bg-white text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium" scope="col">Date / Heure</th>
                    <th className="px-4 py-3 font-medium" scope="col">Produit</th>
                    <th className="px-4 py-3 font-medium" scope="col">Type</th>
                    <th className="px-4 py-3 font-medium" scope="col">Quantité</th>
                    <th className="px-4 py-3 font-medium" scope="col">Raison</th>
                    <th className="px-4 py-3 font-medium" scope="col">Utilisateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movementsQuery.isPending ? (
                    <LoadingRows />
                  ) : movements.length > 0 ? (
                    movements.map((movement) => {
                      const presentation = movementPresentation(movement);
                      const Icon = presentation.Icon;
                      const quantityValue = numberFormat.format(
                        Number(movement.quantite) || 0,
                      );

                      return (
                        <tr
                          className="transition-colors hover:bg-slate-50"
                          key={getId(movement)}
                        >
                          <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                            {formatMovementDate(movement.createdAt)}
                          </td>
                          <td className="px-4 py-4 font-medium text-slate-900">
                            {movement.produitNom || "Produit inconnu"}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs ${presentation.className}`}
                            >
                              <Icon aria-hidden="true" className="h-4 w-4" />
                              {presentation.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <span
                              className={`rounded px-2 py-1 text-xs font-semibold ${presentation.badgeClass}`}
                            >
                              {presentation.quantityPrefix}
                              {quantityValue}
                            </span>
                          </td>
                          <td className="max-w-64 truncate px-4 py-4 text-slate-600" title={movement.raison}>
                            {movement.raison || "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                            {movement.auteurNom || "Système"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-4 py-12 text-center" colSpan={6}>
                        <ArrowDownToLine
                          aria-hidden="true"
                          className="mx-auto h-8 w-8 text-slate-300"
                        />
                        <p className="mt-3 font-medium text-slate-700">
                          Aucun mouvement trouvé
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Les entrées, sorties et ajustements apparaîtront ici.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <nav
                aria-label="Pagination des mouvements de stock"
                className="flex items-center justify-between border-t border-slate-200 px-4 py-3"
              >
                <p className="text-sm text-slate-500">
                  Page {pagination.page} sur {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    aria-label="Page précédente"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={page <= 1 || movementsQuery.isFetching}
                    onClick={() => setPage((currentPage) => currentPage - 1)}
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Page suivante"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={
                      page >= pagination.totalPages || movementsQuery.isFetching
                    }
                    onClick={() => setPage((currentPage) => currentPage + 1)}
                    type="button"
                  >
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>

      {isMovementModalOpen && (
        <StockMovementModal
          onClose={() => setIsMovementModalOpen(false)}
          onSaved={(message) => {
            setFeedback({ type: "success", message });
            setPage(1);
          }}
        />
      )}
    </section>
  );
}
