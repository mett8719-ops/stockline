import { History, Search, ShoppingCart, Trash2 } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { parseApiError } from "@/core/api/errors.js";
import ProductGrid from "../components/ProductGrid.jsx";
import { submitSaleToApi, getStockIssueNames } from "../services/submitSale.js";
import { usePosCart } from "../store/cartStore.js";

const categories = [
  "Tous",
  "Céréales",
  "Huiles",
  "Épicerie",
  "Produits laitiers",
  "Hygiène",
  "Conserves",
  "Boisson",
];

const products = [
  { id: "p-1", name: "Riz local 25kg", price: 15000, stock: 48, category: "Céréales", unit: "sac" },
  { id: "p-2", name: "Huile palma 5L", price: 4500, stock: 3, category: "Huiles", unit: "bidon" },
  { id: "p-3", name: "Sucre cristal 1kg", price: 950, stock: 120, category: "Épicerie", unit: "kg" },
  { id: "p-4", name: "Farine de blé 25kg", price: 22000, stock: 15, category: "Céréales", unit: "sac" },
  { id: "p-5", name: "Lait Nido 900g", price: 8500, stock: 24, category: "Produits laitiers", unit: "boîte" },
  { id: "p-6", name: "Savon Omo 1kg", price: 2200, stock: 60, category: "Hygiène", unit: "paquet" },
  { id: "p-7", name: "Tomates concentrées 400g", price: 1200, stock: 2, category: "Conserves", unit: "boîte" },
  { id: "p-8", name: "Sardines Jealsa 125g", price: 750, stock: 85, category: "Conserves", unit: "boîte" },
  { id: "p-9", name: "Eau minérale 1,5L", price: 500, stock: 144, category: "Boisson", unit: "bouteille" },
  { id: "p-10", name: "Coca-Cola 33cl", price: 600, stock: 72, category: "Boisson", unit: "bouteille" },
  { id: "p-11", name: "Bière Castel 65cl", price: 900, stock: 96, category: "Boisson", unit: "bouteille" },
  { id: "p-12", name: "Maribor", price: 2500, stock: 40, category: "Boisson", unit: "bouteille" },
  { id: "p-13", name: "Allumettes", price: 100, stock: 150, category: "Épicerie", unit: "boîte" },
  { id: "p-14", name: "Sel fin 1kg", price: 400, stock: 80, category: "Épicerie", unit: "sac" },
  { id: "p-15", name: "Maïs concassé 25kg", price: 12000, stock: 7, category: "Céréales", unit: "sac" },
];

const paymentMethods = [
  { key: "especes", label: "Espèces" },
  { key: "mobile", label: "Mobile" },
  { key: "credit", label: "Crédit" },
];

function formatMoney(value) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} CDF`;
}

export default function PosPage() {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [cartOpen, setCartOpen] = useState(true);
  const {
    items,
    total,
    count,
    removeItem,
    updateQuantity,
    selectedPayment,
    setSelectedPayment,
    client,
    setClient,
    paymentAmount,
    setPaymentAmount,
    paymentBreakdown,
    setPaymentBreakdown,
    getPaymentTotal,
    getChange,
    submitSale,
    lastSale,
  } = usePosCart();

  const filteredProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "Tous" || product.category === activeCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, deferredQuery]);

  async function handleSubmitSale() {
    try {
      const sale = await submitSaleToApi({
        items,
        total,
        client,
        selectedPayment,
        paymentBreakdown,
        paymentAmount,
      });
      setCheckoutError("");
      setCheckoutOpen(false);
      console.info("Vente validée", sale);
      submitSale();
    } catch (error) {
      const apiError = parseApiError(error);
      const stockIssues = getStockIssueNames(error);
      setCheckoutError(
        stockIssues.length > 0
          ? `${apiError.message} • ${stockIssues.join(", ")}`
          : apiError.message,
      );
    }
  }

  function handlePaymentModeChange(mode) {
    setSelectedPayment(mode);
    if (mode === "credit") {
      setPaymentBreakdown({
        ...paymentBreakdown,
        credit: total,
      });
      return;
    }

    if (mode === "mobile_money") {
      setPaymentBreakdown({
        ...paymentBreakdown,
        mobile_money: paymentAmount || total,
      });
      return;
    }

    setPaymentBreakdown({
      ...paymentBreakdown,
      especes: paymentAmount || total,
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.15fr)_380px]">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                aria-label="Rechercher un produit"
                className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un produit..."
                type="search"
                value={query}
              />
            </div>
            <div className="flex gap-2">
              <Link to="/pos/mobile">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <History className="h-4 w-4" aria-hidden="true" />
                  Mobile
                </button>
              </Link>
              <Link to="/pos/history">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <History className="h-4 w-4" aria-hidden="true" />
                  Historique
                </button>
              </Link>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  activeCategory === category
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <ProductGrid
            key={JSON.stringify([activeCategory, deferredQuery])}
            products={filteredProducts}
          />
        </section>

        <aside className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm ${cartOpen ? "" : "xl:w-[90px]"}`}>
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-200 pb-3 text-lg font-semibold text-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {cartOpen && <span>Panier</span>}
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600"
              onClick={() => setCartOpen((current) => !current)}
            >
              {cartOpen ? "Réduire" : "Ouvrir"}
            </button>
          </div>

          {!cartOpen ? (
            <div className="flex min-h-[120px] items-center justify-center text-xs font-medium text-slate-500">
              Panier
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[365px] flex-col items-center justify-center gap-4 text-center text-slate-500">
              <ShoppingCart className="h-14 w-14 text-slate-300" aria-hidden="true" />
              <div>
                <p className="text-lg font-medium text-slate-700">Panier vide</p>
                <p className="text-sm">Sélectionnez des produits</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">{formatMoney(item.price)} / unité</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 transition hover:text-red-500"
                      aria-label={`Retirer ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                      <button
                        type="button"
                        className="h-6 w-6 rounded-md text-base text-slate-600 hover:bg-slate-200"
                        onClick={() => {
                          if (item.quantity <= 1) {
                            removeItem(item.id);
                            return;
                          }
                          updateQuantity(item.id, item.quantity - 1);
                        }}
                        aria-label={`Diminuer la quantité de ${item.name}`}
                      >
                        −
                      </button>
                      <span className="min-w-5 text-center text-sm font-medium text-slate-700">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="h-6 w-6 rounded-md text-base text-slate-600 hover:bg-slate-200"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label={`Augmenter la quantité de ${item.name}`}
                      >
                        +
                      </button>
                    </div>

                    <span className="text-base font-semibold text-slate-800">
                      {formatMoney(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 space-y-4 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{count} article{count > 1 ? "s" : ""}</span>
              <span className="text-3xl font-black text-slate-900">{formatMoney(total)}</span>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-600">Client (optionnel)</span>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500"
                onChange={(event) => setClient(event.target.value)}
                placeholder="Client (optionnel)"
                type="text"
                value={client}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "especes", label: "Espèces" },
                { key: "mobile_money", label: "Mobile" },
                { key: "credit", label: "Crédit" },
                { key: "mixed", label: "Mixte" },
              ].map((method) => (
                <button
                  key={method.key}
                  type="button"
                  onClick={() => handlePaymentModeChange(method.key)}
                  className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
                    (selectedPayment === method.key || (method.key === "mixed" && selectedPayment === "mixed"))
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>

            {selectedPayment === "mixed" && (
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-600">Espèces</span>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                    min={0}
                    onChange={(event) =>
                      setPaymentBreakdown({
                        ...paymentBreakdown,
                        especes: Number(event.target.value || 0),
                      })
                    }
                    type="number"
                    value={paymentBreakdown.especes || 0}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-600">Mobile Money</span>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                    min={0}
                    onChange={(event) =>
                      setPaymentBreakdown({
                        ...paymentBreakdown,
                        mobile_money: Number(event.target.value || 0),
                      })
                    }
                    type="number"
                    value={paymentBreakdown.mobile_money || 0}
                  />
                </label>
              </div>
            )}

            {selectedPayment !== "mixed" && (
              <label className="block">
                <span className="mb-2 block text-sm text-slate-600">
                  {selectedPayment === "credit" ? "Montant du crédit" : "Montant remis"}
                </span>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                  min={0}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value || 0);
                    setPaymentAmount(nextValue);
                    if (selectedPayment === "credit") {
                      setPaymentBreakdown({
                        ...paymentBreakdown,
                        credit: nextValue,
                      });
                    }
                  }}
                  type="number"
                  value={selectedPayment === "credit" ? paymentBreakdown.credit || total : paymentAmount || 0}
                />
              </label>
            )}

            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Total encaissé</span>
                <strong className="text-slate-900">{formatMoney(getPaymentTotal())}</strong>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Monnaie</span>
                <strong className="text-emerald-700">{formatMoney(getChange())}</strong>
              </div>
            </div>

            <button
              type="button"
              disabled={items.length === 0}
              className="w-full rounded-lg bg-slate-300 px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                if (items.length === 0) return;
                setCheckoutError("");
                setCheckoutOpen(true);
              }}
            >
              Valider la vente
            </button>
          </div>
        </aside>
      </div>

      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">Confirmer la vente</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>Client : <span className="font-medium text-slate-800">{client || "Client général"}</span></p>
              <p>Mode de paiement : <span className="font-medium text-slate-800">{paymentMethods.find((option) => option.key === selectedPayment)?.label}</span></p>
              <p>Total : <span className="text-lg font-bold text-slate-900">{formatMoney(total)}</span></p>
              <p>Montant remis : <span className="font-medium text-slate-800">{formatMoney(Number(paymentAmount || 0))}</span></p>
            </div>

            {checkoutError && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {checkoutError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                onClick={() => setCheckoutOpen(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                onClick={handleSubmitSale}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {lastSale && (
        <div className="fixed bottom-4 right-4 z-40 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg">
          Vente validée • {lastSale.client}
        </div>
      )}
    </main>
  );
}
