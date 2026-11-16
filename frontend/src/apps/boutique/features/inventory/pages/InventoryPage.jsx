import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Play,
  Search,
} from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import InventoryCloseDialog from "../components/InventoryCloseDialog.jsx";
import InventoryCountField from "../components/InventoryCountField.jsx";
import { inventoryCountSchema } from "../schemas.js";
import {
  useCloseInventory,
  useInventories,
  useInventory,
  useRecordInventoryCount,
  useStartInventory,
} from "../hooks.js";

const quantityFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});
const currencyFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const emptyLines = [];

function getId(item) {
  return item?.id || item?._id;
}

function getProductId(line) {
  return String(line.produitId?.id || line.produitId?._id || line.produitId);
}

function formatQuantity(value) {
  return quantityFormat.format(Number(value) || 0);
}

function formatCurrency(value) {
  return `${currencyFormat.format(Number(value) || 0)} FCFA`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

function getLineStatus(line) {
  if (line.quantiteComptee === null || line.quantiteComptee === undefined) {
    return { label: "En attente", className: "bg-slate-100 text-slate-600" };
  }

  if (line.statut === "conforme") {
    return { label: "Conforme", className: "bg-emerald-50 text-emerald-700" };
  }

  if (line.statut === "deficit") {
    return { label: "Déficit", className: "bg-red-50 text-red-700" };
  }

  return { label: "Excédent", className: "bg-amber-50 text-amber-700" };
}

function LoadingInventory() {
  return (
    <div aria-label="Chargement des inventaires" className="space-y-5" role="status">
      <span className="sr-only">Chargement des inventaires…</span>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="card h-28 p-5" key={index}>
            <div className="skeleton h-4 w-32" />
            <div className="skeleton mt-4 h-6 w-40" />
            <div className="skeleton mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="card h-64 p-5">
        <div className="skeleton h-5 w-48" />
        <div className="skeleton mt-6 h-10 w-full" />
        <div className="skeleton mt-3 h-10 w-full" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, note, valueClassName = "text-slate-900" }) {
  return (
    <article className="card min-w-0 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 break-words text-xl font-bold ${valueClassName}`}>
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </article>
  );
}

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [view, setView] = useState("history");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [countErrors, setCountErrors] = useState({});
  const [savingProductIds, setSavingProductIds] = useState([]);
  const [startError, setStartError] = useState("");
  const [notice, setNotice] = useState("");
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [closeError, setCloseError] = useState("");
  const [closeResult, setCloseResult] = useState(null);
  const savingIdsRef = useRef(new Set());
  const inventoriesQuery = useInventories(page);
  const inventorySummary = inventoriesQuery.data;
  const activeInventory = inventorySummary?.inventaireEnCours;
  const activeInventoryId = getId(activeInventory);
  const showCountingView = view === "count" && Boolean(activeInventory);
  const showHistoryView = !showCountingView;
  const activeInventoryQuery = useInventory(activeInventoryId);
  const activeInventoryDetails = activeInventoryQuery.data;
  const { mutateAsync: saveInventoryCount } =
    useRecordInventoryCount(activeInventoryId);
  const startInventoryMutation = useStartInventory();
  const closeInventoryMutation = useCloseInventory();
  const lines = Array.isArray(activeInventoryDetails?.lignes)
    ? activeInventoryDetails.lignes
    : emptyLines;

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const filteredLines = useMemo(() => {
    const normalizedSearch = debouncedSearch.toLocaleLowerCase("fr");
    if (!normalizedSearch) return lines;
    return lines.filter((line) =>
      `${line.produitNom || ""} ${line.categorieNom || ""}`
        .toLocaleLowerCase("fr")
        .includes(normalizedSearch),
    );
  }, [debouncedSearch, lines]);
  const onSaveCount = useCallback(
    async (productId, value) => {
      if (value.trim() === "") {
        setCountErrors((current) => ({
          ...current,
          [productId]: "Saisissez la quantité comptée.",
        }));
        return false;
      }

      const parsed = inventoryCountSchema.safeParse({
        produitId: productId,
        quantiteComptee: Number(value),
      });

      if (!parsed.success) {
        setCountErrors((current) => ({
          ...current,
          [productId]: parsed.error.issues[0]?.message || "Quantité invalide.",
        }));
        return false;
      }

      if (savingIdsRef.current.has(productId)) return false;
      savingIdsRef.current.add(productId);
      setSavingProductIds((current) => [...current, productId]);
      setCountErrors((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });

      try {
        await saveInventoryCount({
          inventoryId: activeInventoryId,
          ...parsed.data,
        });
        return true;
      } catch (error) {
        setCountErrors((current) => ({
          ...current,
          [productId]: parseApiError(error).message,
        }));
        return false;
      } finally {
        savingIdsRef.current.delete(productId);
        setSavingProductIds((current) =>
          current.filter((id) => id !== productId),
        );
      }
    },
    [activeInventoryId, saveInventoryCount],
  );

  async function handleStartInventory() {
    setStartError("");
    setNotice("");
    setCloseResult(null);

    try {
      await startInventoryMutation.mutateAsync();
      setNotice("Inventaire démarré. Les quantités comptées sont sauvegardées automatiquement.");
      setView("count");
    } catch (error) {
      setStartError(parseApiError(error).message);
    }
  }

  function resumeInventory() {
    setView("count");
  }

  function showInventoryHistory() {
    setView("history");
  }

  async function handleCloseInventory() {
    setCloseError("");

    try {
      const result = await closeInventoryMutation.mutateAsync(activeInventoryId);
      setCloseResult(result);
      setNotice("");
      setView("history");
      setIsCloseDialogOpen(false);
    } catch (error) {
      setCloseError(parseApiError(error).message);
    }
  }

  if (inventoriesQuery.isPending) return <LoadingInventory />;

  if (inventoriesQuery.isError && !inventorySummary) {
    return (
      <section className="card p-8 text-center" role="alert">
        <p className="font-medium text-slate-900">
          Impossible de charger les inventaires.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {parseApiError(inventoriesQuery.error).message}
        </p>
        <button
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          onClick={() => inventoriesQuery.refetch()}
          type="button"
        >
          Réessayer
        </button>
      </section>
    );
  }

  const indicators = inventorySummary?.indicateurs || {};
  const history = Array.isArray(inventorySummary?.inventaires)
    ? inventorySummary.inventaires
    : [];
  const pagination = inventorySummary?.pagination;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Inventaire</h2>
          <p className="mt-1 text-sm text-slate-500">
            {showCountingView
              ? "Saisissez les quantités réellement comptées."
              : "Consultez l’historique ou démarrez un nouvel inventaire."}
          </p>
        </div>
        {showCountingView ? (
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200"
              onClick={showInventoryHistory}
              type="button"
            >
              Historique
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={closeInventoryMutation.isPending}
              onClick={() => {
                setCloseError("");
                setIsCloseDialogOpen(true);
              }}
              type="button"
            >
              Clôturer l’inventaire
            </button>
          </div>
        ) : activeInventory ? (
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-200"
            onClick={resumeInventory}
            type="button"
          >
            Reprendre l’inventaire
          </button>
        ) : (
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={startInventoryMutation.isPending}
            onClick={handleStartInventory}
            type="button"
          >
            <Play aria-hidden="true" className="h-4 w-4" />
            {startInventoryMutation.isPending
              ? "Démarrage…"
              : "Démarrer un inventaire"}
          </button>
        )}
      </header>

      {inventoriesQuery.isError && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          Actualisation impossible : {parseApiError(inventoriesQuery.error).message}
        </p>
      )}
      {showHistoryView && startError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {startError}
        </p>
      )}
      {showHistoryView && notice && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
          {notice}
        </p>
      )}
      {showHistoryView && closeResult?.rapport && (
        <section
          aria-label="Rapport de clôture de l’inventaire"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          role="status"
        >
          <h3 className="font-semibold text-emerald-900">
            {closeResult.message || "Inventaire clôturé avec succès."}
          </h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-emerald-700">Articles comptés</dt>
              <dd className="mt-1 font-semibold text-emerald-950">
                {formatQuantity(closeResult.rapport.articlesComptes)}
              </dd>
            </div>
            <div>
              <dt className="text-emerald-700">Écarts détectés</dt>
              <dd className="mt-1 font-semibold text-emerald-950">
                {formatQuantity(closeResult.rapport.nombreEcarts)}
              </dd>
            </div>
            <div>
              <dt className="text-emerald-700">Déficit total</dt>
              <dd className="mt-1 font-semibold text-emerald-950">
                {formatCurrency(closeResult.rapport.deficitTotal)}
              </dd>
            </div>
            <div>
              <dt className="text-emerald-700">Ajustements appliqués</dt>
              <dd className="mt-1 font-semibold text-emerald-950">
                {formatQuantity(closeResult.rapport.ajustementsAppliques)}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {showHistoryView && (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Dernier inventaire"
            note={indicators.dernierInventaire ? "" : "Aucun inventaire clôturé"}
            value={formatDate(indicators.dernierInventaire)}
          />
          <MetricCard
            label="Écarts détectés"
            note={`Déficit total : ${formatCurrency(indicators.deficitTotal)}`}
            value={`${Number(indicators.ecartsDetectes) || 0} article${Number(indicators.ecartsDetectes) === 1 ? "" : "s"}`}
            valueClassName="text-red-600"
          />
          <MetricCard
            label="Valeur du stock"
            note={`${quantityFormat.format(Number(indicators.nombreReferences) || 0)} références`}
            value={formatCurrency(indicators.valeurInventoriee)}
            valueClassName="text-emerald-700"
          />
        </div>
      )}

      {showCountingView && (
        <section
          aria-labelledby="active-inventory-title"
          className="space-y-4"
        >
          {activeInventoryQuery.isPending ? (
            <div aria-label="Chargement du comptage" className="card h-48 p-5" role="status">
              <span className="sr-only">Chargement du comptage…</span>
              <div className="skeleton h-5 w-48" />
              <div className="skeleton mt-5 h-10 w-full" />
              <div className="skeleton mt-3 h-10 w-full" />
            </div>
          ) : activeInventoryQuery.isError ? (
            <div className="card p-6 text-center" role="alert">
              <p className="font-medium text-slate-900">
                Impossible de reprendre l’inventaire en cours.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {parseApiError(activeInventoryQuery.error).message}
              </p>
              <button
                className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                onClick={() => activeInventoryQuery.refetch()}
                type="button"
              >
                Réessayer
              </button>
            </div>
          ) : activeInventoryDetails ? (
            <div className="card overflow-hidden">
              <div className="border-b border-blue-100 bg-blue-50 px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-blue-900" id="active-inventory-title">
                      Inventaire en cours — {formatDate(activeInventoryDetails.demarreLe)}
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      {activeInventoryDetails.reference} · Saisissez les quantités réellement comptées.
                    </p>
                  </div>
                  <div
                    aria-label={`${activeInventoryDetails.articlesComptes || 0} sur ${activeInventoryDetails.nombreArticles || 0} articles comptés`}
                    className="text-sm font-semibold text-blue-800"
                    role="status"
                  >
                    {activeInventoryDetails.articlesComptes || 0} /{" "}
                    {activeInventoryDetails.nombreArticles || 0} articles comptés
                    <span className="ml-2">
                      {Math.round(
                        ((activeInventoryDetails.articlesComptes || 0) /
                          (activeInventoryDetails.nombreArticles || 1)) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                </div>
                <div
                  aria-label="Progression du comptage"
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={Math.round(
                    ((activeInventoryDetails.articlesComptes || 0) /
                      (activeInventoryDetails.nombreArticles || 1)) *
                      100,
                  )}
                  className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100"
                  role="progressbar"
                >
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((activeInventoryDetails.articlesComptes || 0) /
                            (activeInventoryDetails.nombreArticles || 1)) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="border-b border-slate-100 p-4">
                <label className="relative block max-w-md">
                  <span className="sr-only">Filtrer les articles de l’inventaire</span>
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                    maxLength={120}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Filtrer les articles…"
                    type="search"
                    value={search}
                  />
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="border-b border-slate-100 bg-white text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium" scope="col">Article</th>
                      <th className="px-4 py-3 font-medium" scope="col">Catégorie</th>
                      <th className="px-4 py-3 font-medium" scope="col">Stock théorique</th>
                      <th className="px-4 py-3 font-medium" scope="col">Qté comptée</th>
                      <th className="px-4 py-3 font-medium" scope="col">Écart</th>
                      <th className="px-4 py-3 font-medium" scope="col">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLines.length ? (
                      filteredLines.map((line) => {
                        const productId = getProductId(line);
                        const status = getLineStatus(line);
                        const isSaving = savingProductIds.includes(productId);
                        const difference =
                          line.quantiteComptee === null ||
                          line.quantiteComptee === undefined
                            ? null
                            : Number(line.ecart) || 0;

                        return (
                          <tr className="hover:bg-slate-50" key={productId}>
                            <td className="px-4 py-3.5 font-medium text-slate-900">
                              {line.produitNom || "Article"}
                            </td>
                            <td className="px-4 py-3.5 text-slate-500">
                              {line.categorieNom || "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">
                              {formatQuantity(line.stockTheorique)} {line.unite || ""}
                            </td>
                            <td className="px-4 py-2">
                              <InventoryCountField
                                error={countErrors[productId]}
                                isSaving={isSaving}
                                line={line}
                                onSave={onSaveCount}
                                productId={productId}
                              />
                            </td>
                            <td
                              className={`whitespace-nowrap px-4 py-3.5 font-medium ${
                                difference === null
                                  ? "text-slate-400"
                                  : difference < 0
                                    ? "text-red-600"
                                    : difference > 0
                                      ? "text-emerald-700"
                                      : "text-slate-600"
                              }`}
                            >
                              {difference === null
                                ? "—"
                                : `${difference > 0 ? "+" : ""}${formatQuantity(difference)} ${line.unite || ""}`}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                              >
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="px-4 py-10 text-center text-slate-500" colSpan={6}>
                          {search.trim()
                            ? "Aucun article ne correspond à cette recherche."
                            : "Aucun article dans cet inventaire."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {showHistoryView && (
        <section aria-labelledby="inventory-history-title" className="card overflow-hidden">
          <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <ClipboardList aria-hidden="true" className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-slate-900" id="inventory-history-title">
              Historique des inventaires
            </h3>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="border-b border-slate-100 bg-white text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">Référence</th>
                  <th className="px-4 py-3 font-medium" scope="col">Date</th>
                  <th className="px-4 py-3 font-medium" scope="col">Réalisé par</th>
                  <th className="px-4 py-3 font-medium" scope="col">Articles</th>
                  <th className="px-4 py-3 font-medium" scope="col">Écarts</th>
                  <th className="px-4 py-3 font-medium" scope="col">Valeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.length ? (
                  history.map((inventory) => (
                    <tr className="hover:bg-slate-50" key={getId(inventory)}>
                      <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-slate-700">
                        {inventory.reference || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {formatDate(inventory.demarreLe)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {inventory.realiseParNom || "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatQuantity(inventory.nombreArticles)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={
                            inventory.nombreEcarts
                              ? "font-medium text-red-600"
                              : "text-slate-500"
                          }
                        >
                          {formatQuantity(inventory.nombreEcarts)} écart
                          {Number(inventory.nombreEcarts) === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-900">
                        {formatCurrency(inventory.valeurTotale)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-12 text-center" colSpan={6}>
                      <ClipboardList
                        aria-hidden="true"
                        className="mx-auto h-8 w-8 text-slate-300"
                      />
                      <p className="mt-3 font-medium text-slate-700">
                        Aucun inventaire enregistré.
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Démarrez un inventaire pour commencer le comptage physique.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <nav
              aria-label="Pagination des inventaires"
              className="flex items-center justify-between border-t border-slate-100 px-4 py-3"
            >
              <p className="text-sm text-slate-500">
                Page {pagination.page} sur {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  aria-label="Page précédente"
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={page <= 1 || inventoriesQuery.isFetching}
                  onClick={() => setPage((currentPage) => currentPage - 1)}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>
                <button
                  aria-label="Page suivante"
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={
                    page >= pagination.totalPages || inventoriesQuery.isFetching
                  }
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </nav>
          )}
        </section>
      )}
      {isCloseDialogOpen && activeInventoryDetails && (
        <InventoryCloseDialog
          articlesComptes={activeInventoryDetails.articlesComptes}
          error={closeError}
          isPending={closeInventoryMutation.isPending}
          nombreEcarts={activeInventoryDetails.nombreEcarts}
          onCancel={() => setIsCloseDialogOpen(false)}
          onConfirm={handleCloseInventory}
        />
      )}
    </section>
  );
}
