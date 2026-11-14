import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  Pencil,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import ProductFormModal from "../components/ProductFormModal.jsx";
import ProductImportModal from "../components/ProductImportModal.jsx";
import { fetchProductsForExport } from "../api.js";
import { downloadProductsCsv, serializeProductsCsv } from "../csv.js";
import {
  useDeactivateProduct,
  useProductCategories,
  useProducts,
} from "../hooks.js";

const stockStatuses = [
  { value: "", label: "Tous les stocks" },
  { value: "en_stock", label: "En stock" },
  { value: "stock_bas", label: "Stock bas" },
  { value: "rupture", label: "Rupture" },
];

const numberFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});

function formatPrice(value) {
  return `${numberFormat.format(Number(value) || 0)} CDF`;
}

function StockStatus({ status }) {
  const statuses = {
    en_stock: {
      label: "En stock",
      className: "bg-emerald-50 text-emerald-700",
    },
    stock_bas: {
      label: "Stock bas",
      className: "bg-amber-50 text-amber-700",
    },
    rupture: {
      label: "Rupture",
      className: "bg-red-50 text-red-700",
    },
  };
  const currentStatus = statuses[status] || statuses.en_stock;

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${currentStatus.className}`}
    >
      {currentStatus.label}
    </span>
  );
}

function LoadingRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={index} aria-hidden="true">
      {Array.from({ length: 8 }, (_, cellIndex) => (
        <td key={cellIndex} className="px-4 py-5">
          <div className="skeleton h-4 w-24" />
        </td>
      ))}
    </tr>
  ));
}

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [statutStock, setStatutStock] = useState("");
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const categoriesQuery = useProductCategories();
  const productsQuery = useProducts({
    page,
    q: debouncedSearch,
    categorieId,
    statutStock,
  });
  const deactivateMutation = useDeactivateProduct();
  const products = productsQuery.data?.products || [];
  const pagination = productsQuery.data?.pagination;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function updateCategory(value) {
    setCategorieId(value);
    setPage(1);
  }

  function updateStockStatus(value) {
    setStatutStock(value);
    setPage(1);
  }

  async function handleExport() {
    setFeedback(null);
    setIsExporting(true);

    try {
      const allProducts = await fetchProductsForExport();
      downloadProductsCsv(serializeProductsCsv(allProducts));
      setFeedback({
        type: "success",
        message: `${allProducts.length} produit${allProducts.length === 1 ? "" : "s"} exporté${allProducts.length === 1 ? "" : "s"} au format CSV.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: `Échec de l’export : ${parseApiError(error).message}`,
      });
    } finally {
      setIsExporting(false);
    }
  }

  function handleDeactivate(product) {
    const confirmed = window.confirm(
      `Désactiver « ${product.nom} » ? Ce produit sera retiré du catalogue actif.`,
    );

    if (!confirmed) return;

    setFeedback(null);
    deactivateMutation.mutate(product.id || product._id, {
      onSuccess: (result) => {
        setFeedback({
          type: "success",
          message: result?.message || "Produit désactivé.",
        });
      },
      onError: (error) => {
        setFeedback({ type: "error", message: parseApiError(error).message });
      },
    });
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Produits &amp; Catalogue
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {pagination
              ? `${pagination.total} produit${pagination.total === 1 ? "" : "s"} enregistré${pagination.total === 1 ? "" : "s"}`
              : "Consultez et gérez les produits de votre boutique."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isExporting}
            onClick={handleExport}
            type="button"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            {isExporting ? "Export…" : "Exporter CSV"}
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200"
            onClick={() => setIsImportModalOpen(true)}
            type="button"
          >
            <FileUp aria-hidden="true" className="h-4 w-4" />
            Importer CSV
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
            onClick={() => {
              setEditingProduct(null);
              setIsProductFormOpen(true);
            }}
            type="button"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Ajouter un produit
          </button>
        </div>
      </header>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Rechercher un produit ou une catégorie</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
            maxLength={120}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Rechercher un produit ou une catégorie..."
            type="search"
            value={search}
          />
        </label>

        <div className="flex min-w-0 items-center gap-2 sm:w-auto">
          <SlidersHorizontal
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-slate-400"
          />
          <label className="min-w-0 flex-1 sm:w-48">
            <span className="sr-only">Filtrer par catégorie</span>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              onChange={(event) => updateCategory(event.target.value)}
              value={categorieId}
            >
              <option value="">Toutes les catégories</option>
              {(categoriesQuery.data || []).map((category) => (
                <option key={category.id || category._id} value={category.id || category._id}>
                  {category.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1 sm:w-40">
            <span className="sr-only">Filtrer par statut du stock</span>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              onChange={(event) => updateStockStatus(event.target.value)}
              value={statutStock}
            >
              {stockStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

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

      {categoriesQuery.isError && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          Impossible de charger les catégories. Vous pouvez toujours rechercher et filtrer par stock.
        </p>
      )}

      <div className="card overflow-hidden">
        {productsQuery.isError && !productsQuery.data ? (
          <div className="p-8 text-center" role="alert">
            <p className="font-medium text-slate-900">
              Impossible de charger les produits.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {parseApiError(productsQuery.error).message}
            </p>
            <button
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
              onClick={() => productsQuery.refetch()}
              type="button"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <>
            {productsQuery.isError && (
              <p className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
                Impossible d’actualiser les produits :{" "}
                {parseApiError(productsQuery.error).message}
                <button
                  className="ml-2 font-semibold underline underline-offset-2"
                  onClick={() => productsQuery.refetch()}
                  type="button"
                >
                  Réessayer
                </button>
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="border-b border-slate-200 bg-white text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium" scope="col">Produit</th>
                    <th className="px-4 py-3 font-medium" scope="col">Catégorie</th>
                    <th className="px-4 py-3 font-medium" scope="col">Prix de vente</th>
                    <th className="px-4 py-3 font-medium" scope="col">Prix d’achat</th>
                    <th className="px-4 py-3 font-medium" scope="col">Marge</th>
                    <th className="px-4 py-3 font-medium" scope="col">Stock</th>
                    <th className="px-4 py-3 font-medium" scope="col">Statut</th>
                    <th className="px-4 py-3 text-right font-medium" scope="col">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productsQuery.isPending ? (
                    <LoadingRows />
                  ) : products.length > 0 ? (
                    products.map((product) => {
                      const margin = Number(product.margePourcent) || 0;
                      const productId = product.id || product._id;

                      return (
                        <tr
                          className="transition-colors hover:bg-slate-50"
                          key={productId}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-amber-700">
                                <Package aria-hidden="true" className="h-4 w-4" />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-slate-900">
                                  {product.nom}
                                </span>
                                <span className="block text-xs text-slate-500">
                                  /{product.unite || "pièce"}
                                </span>
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {product.categorieNom ? (
                              <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                {product.categorieNom}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900">
                            {formatPrice(product.prixVente)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                            {formatPrice(product.prixAchat)}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-4 font-medium ${
                              margin >= 30 ? "text-emerald-600" : "text-amber-600"
                            }`}
                          >
                            {margin > 0 ? "+" : ""}
                            {numberFormat.format(margin)}%
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-900">
                            {numberFormat.format(Number(product.stockActuel) || 0)}{" "}
                            {product.unite || "pièce"}
                          </td>
                          <td className="px-4 py-4">
                            <StockStatus status={product.statutStock} />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                aria-label={`Modifier ${product.nom}`}
                                className="rounded-md p-2 text-slate-400 transition hover:bg-blue-50 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setIsProductFormOpen(true);
                                }}
                                title="Modifier le produit"
                                type="button"
                              >
                                <Pencil aria-hidden="true" className="h-4 w-4" />
                              </button>
                              <button
                                aria-label={`Désactiver ${product.nom}`}
                                className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={deactivateMutation.isPending}
                                onClick={() => handleDeactivate(product)}
                                title="Désactiver le produit"
                                type="button"
                              >
                                <Trash2 aria-hidden="true" className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-4 py-12 text-center" colSpan={8}>
                        <Package
                          aria-hidden="true"
                          className="mx-auto h-8 w-8 text-slate-300"
                        />
                        <p className="mt-3 font-medium text-slate-700">
                          Aucun produit trouvé
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Modifiez vos filtres ou votre recherche.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <nav
                aria-label="Pagination des produits"
                className="flex items-center justify-between border-t border-slate-200 px-4 py-3"
              >
                <p className="text-sm text-slate-500">
                  Page {pagination.page} sur {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    aria-label="Page précédente"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={page <= 1 || productsQuery.isFetching}
                    onClick={() => setPage((currentPage) => currentPage - 1)}
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Page suivante"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={
                      page >= pagination.totalPages || productsQuery.isFetching
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

      {isProductFormOpen && (
        <ProductFormModal
          onClose={() => {
            setIsProductFormOpen(false);
            setEditingProduct(null);
          }}
          onSaved={(message) => {
            setFeedback({ type: "success", message });
            setPage(1);
          }}
          product={editingProduct}
        />
      )}
      {isImportModalOpen && (
        <ProductImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={() => {
            setPage(1);
            setFeedback({
              type: "success",
              message: "Import traité. Consultez le rapport pour le détail des lignes.",
            });
          }}
        />
      )}
    </section>
  );
}
