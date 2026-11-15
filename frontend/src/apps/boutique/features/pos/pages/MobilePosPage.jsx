import { Camera, CameraOff, History, Search, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { parseApiError } from "@/core/api/errors.js";
import { findProductByBarcode, supportsCameraScanning } from "../services/scanner.js";
import { getStockIssueNames, submitSaleToApi } from "../services/submitSale.js";
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
  { id: "p-1", barcode: "1111111111111", name: "Riz local 25kg", price: 15000, stock: 48, category: "Céréales", unit: "sac" },
  { id: "p-2", barcode: "2222222222222", name: "Huile palma 5L", price: 4500, stock: 3, category: "Huiles", unit: "bidon" },
  { id: "p-3", barcode: "3333333333333", name: "Sucre cristal 1kg", price: 950, stock: 120, category: "Épicerie", unit: "kg" },
  { id: "p-4", barcode: "4444444444444", name: "Farine de blé 25kg", price: 22000, stock: 15, category: "Céréales", unit: "sac" },
  { id: "p-5", barcode: "5555555555555", name: "Lait Nido 900g", price: 8500, stock: 24, category: "Produits laitiers", unit: "boîte" },
  { id: "p-6", barcode: "6666666666666", name: "Savon Omo 1kg", price: 2200, stock: 60, category: "Hygiène", unit: "paquet" },
  { id: "p-7", barcode: "7777777777777", name: "Tomates concentrées 400g", price: 1200, stock: 2, category: "Conserves", unit: "boîte" },
  { id: "p-8", barcode: "8888888888888", name: "Sardines Jealsa 125g", price: 750, stock: 85, category: "Conserves", unit: "boîte" },
  { id: "p-9", barcode: "9999999999999", name: "Eau minérale 1,5L", price: 500, stock: 144, category: "Boisson", unit: "bouteille" },
];

const mobilePaymentOptions = [
  { key: "especes", label: "Espèces" },
  { key: "mobile_money", label: "Mobile" },
  { key: "credit", label: "Crédit" },
  { key: "mixed", label: "Mixte" },
];

function formatMoney(value) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} CDF`;
}

export default function MobilePosPage() {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [query, setQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const videoRef = useRef(null);
  const lastScannedRef = useRef("");
  const {
    items,
    total,
    count,
    addItem,
    removeItem,
    updateQuantity,
    selectedPayment,
    setSelectedPayment,
    client,
    setClient,
    paymentBreakdown,
    setPaymentBreakdown,
    paymentAmount,
    setPaymentAmount,
    submitSale,
  } = usePosCart();

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = activeCategory === "Tous" || product.category === activeCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery) ||
        product.barcode.includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  function handleAddByCode(rawCode) {
    const product = findProductByBarcode(products, rawCode);

    if (!product) {
      setScanMessage("Produit introuvable pour ce code-barres.");
      return;
    }

    addItem(product);
    setScanMessage(`${product.name} ajouté au panier.`);
  }

  useEffect(() => {
    if (!scannerOpen || !supportsCameraScanning() || !videoRef.current) {
      return undefined;
    }

    let isMounted = true;
    let stream = null;

    const startScanner = async () => {
      const detectorFactory = typeof window !== "undefined" && "BarcodeDetector" in window;

      if (!detectorFactory) {
        return;
      }

      try {
        const detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code"],
        });

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (!isMounted || !videoRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const scanLoop = async () => {
          if (!isMounted || !videoRef.current) {
            return;
          }

          try {
            const barcodes = await detector.detect(videoRef.current);
            const detected = barcodes.find((entry) => entry?.rawValue);

            if (detected && detected.rawValue !== lastScannedRef.current) {
              lastScannedRef.current = detected.rawValue;
              handleAddByCode(detected.rawValue);
            }
          } catch {
            // Le capteur ne détecte pas encore de code ; on retente au tour suivant.
          }

          if (isMounted && scannerOpen) {
            window.setTimeout(scanLoop, 500);
          }
        };

        scanLoop();
      } catch {
        setScanMessage("Caméra non disponible. Utilisez le code-barres manuel.");
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      lastScannedRef.current = "";
    };
  }, [scannerOpen]);

  async function handleSubmitSale() {
    try {
      const response = await submitSaleToApi({
        items,
        total,
        client,
        selectedPayment,
        paymentBreakdown,
        paymentAmount,
      });
      setScanMessage("");
      submitSale();
      console.info("Vente validée sur mobile", response);
    } catch (error) {
      const apiError = parseApiError(error);
      const stockIssues = getStockIssueNames(error);
      setScanMessage(
        stockIssues.length > 0
          ? `${apiError.message} • ${stockIssues.join(", ")}`
          : apiError.message,
      );
    }
  }

  function handlePaymentModeChange(mode) {
    setSelectedPayment(mode);

    if (mode === "mixed") {
      return;
    }

    if (mode === "credit") {
      setPaymentBreakdown({ ...paymentBreakdown, credit: total });
      return;
    }

    if (mode === "mobile_money") {
      setPaymentBreakdown({ ...paymentBreakdown, mobile_money: paymentAmount || total });
      return;
    }

    setPaymentBreakdown({ ...paymentBreakdown, especes: paymentAmount || total });
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <div className="mx-auto max-w-md space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-700">
                Caisse mobile
              </p>
              <h1 className="text-xl font-bold text-slate-900">Boutique POS</h1>
            </div>
            <Link to="/pos" className="text-sm font-medium text-brand-700">
              Desktop
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              aria-label="Rechercher un produit"
              className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Produit ou code-barres"
              type="search"
              value={query}
            />
          </div>

          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  activeCategory === category
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setScannerOpen((current) => !current)}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700"
          >
            {scannerOpen ? <CameraOff className="h-4 w-4" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
            {scannerOpen ? "Fermer le scanner" : "Scanner un code-barres"}
          </button>

          {scannerOpen && (
            <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {supportsCameraScanning() ? (
                <video ref={videoRef} className="h-52 w-full object-cover" playsInline muted />
              ) : (
                <div className="flex h-52 items-center justify-center px-4 text-center text-sm text-slate-500">
                  Scanner caméra indisponible sur cet appareil. Saisissez le code-barres manuellement.
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-slate-200 bg-white p-2">
                <input
                  aria-label="Code-barres manuel"
                  className="min-h-11 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-brand-500"
                  onChange={(event) => setManualCode(event.target.value)}
                  placeholder="Code-barres"
                  value={manualCode}
                />
                <button
                  type="button"
                  className="min-h-11 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white"
                  onClick={() => {
                    if (!manualCode.trim()) {
                      setScanMessage("Saisissez un code avant d’ajouter.");
                      return;
                    }
                    handleAddByCode(manualCode);
                    setManualCode("");
                  }}
                >
                  Ajouter
                </button>
              </div>
            </div>
          )}

          {scanMessage && (
            <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">{scanMessage}</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Panier</h2>
            <span className="text-sm text-slate-500">{count} article{count > 1 ? "s" : ""}</span>
          </div>

          {items.length === 0 ? (
            <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
              <ShoppingCart className="mb-2 h-8 w-8 text-slate-300" aria-hidden="true" />
              Commencez par scanner ou choisir un produit.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.name}</p>
                      <p className="text-[11px] text-slate-500">{formatMoney(item.price)} / unité</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400"
                      aria-label={`Retirer ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1">
                      <button
                        type="button"
                        className="h-6 w-6 rounded-md text-base text-slate-600"
                        onClick={() => {
                          if (item.quantity <= 1) {
                            removeItem(item.id);
                            return;
                          }
                          updateQuantity(item.id, item.quantity - 1);
                        }}
                      >
                        −
                      </button>
                      <span className="min-w-5 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        className="h-6 w-6 rounded-md text-base text-slate-600"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatMoney(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-2xl font-black text-slate-900">{formatMoney(total)}</span>
          </div>

          <label className="mb-3 block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Client
            </span>
            <input
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-brand-500"
              onChange={(event) => setClient(event.target.value)}
              placeholder="Nom ou numéro"
              value={client}
            />
          </label>

          <div className="mb-3 grid grid-cols-2 gap-2">
            {mobilePaymentOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handlePaymentModeChange(option.key)}
                className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-medium ${
                  selectedPayment === option.key
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {selectedPayment === "mixed" && (
            <div className="mb-3 space-y-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Espèces
                </span>
                <input
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-brand-500"
                  min={0}
                  onChange={(event) => setPaymentBreakdown({ ...paymentBreakdown, especes: Number(event.target.value || 0) })}
                  type="number"
                  value={paymentBreakdown.especes || 0}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Mobile money
                </span>
                <input
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-brand-500"
                  min={0}
                  onChange={(event) => setPaymentBreakdown({ ...paymentBreakdown, mobile_money: Number(event.target.value || 0) })}
                  type="number"
                  value={paymentBreakdown.mobile_money || 0}
                />
              </label>
            </div>
          )}

          {selectedPayment !== "mixed" && (
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                {selectedPayment === "credit" ? "Montant crédit" : "Montant reçu"}
              </span>
              <input
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-brand-500"
                min={0}
                onChange={(event) => {
                  const nextValue = Number(event.target.value || 0);
                  setPaymentAmount(nextValue);
                  setPaymentBreakdown({ ...paymentBreakdown, [selectedPayment === "mobile_money" ? "mobile_money" : "especes"]: nextValue });
                }}
                type="number"
                value={paymentAmount || 0}
              />
            </label>
          )}

          <div className="mb-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>À payer</span>
              <strong>{formatMoney(total)}</strong>
            </div>
            <div className="mt-1 flex items-center justify-between text-slate-600">
              <span>Montant encaissé</span>
              <strong>{formatMoney(Object.values(paymentBreakdown).reduce((sum, value) => sum + Number(value || 0), 0))}</strong>
            </div>
          </div>

          <div className="flex gap-2">
            <Link to="/pos/history" className="flex-1">
              <button
                type="button"
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
              >
                Historique
              </button>
            </Link>
            <button
              type="button"
              className="min-h-11 flex-1 rounded-xl bg-brand-600 px-3 text-sm font-medium text-white"
              onClick={handleSubmitSale}
              disabled={items.length === 0}
            >
              Valider
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
