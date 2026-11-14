import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, RefreshCw, X } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useCreateStockMovement, useStockProducts } from "../hooks.js";

const movementTypes = [
  {
    value: "entree",
    label: "Entrée de stock",
    icon: ArrowDown,
    activeClass: "border-emerald-500 bg-emerald-50 text-emerald-700",
  },
  {
    value: "sortie",
    label: "Sortie de stock",
    icon: ArrowUp,
    activeClass: "border-red-500 bg-red-50 text-red-700",
  },
  {
    value: "ajustement",
    label: "Ajustement",
    icon: RefreshCw,
    activeClass: "border-amber-500 bg-amber-50 text-amber-800",
  },
];

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function StockMovementModal({ onClose, onSaved }) {
  const dialogRef = useRef(null);
  const productsQuery = useStockProducts();
  const createMovement = useCreateStockMovement();
  const [type, setType] = useState("entree");
  const [produitId, setProduitId] = useState("");
  const [quantite, setQuantite] = useState("");
  const [raison, setRaison] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorDetails, setErrorDetails] = useState([]);
  const products = productsQuery.data || [];
  const selectedProduct = products.find(
    (product) => (product.id || product._id) === produitId,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    dialog.showModal();
    dialog.querySelector("select")?.focus();
    return () => dialog.close();
  }, []);

  function changeType(nextType) {
    setType(nextType);
    setErrorMessage("");
    setErrorDetails([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setErrorDetails([]);

    if (!selectedProduct) {
      setErrorMessage("Sélectionnez un produit du catalogue.");
      return;
    }

    const quantityValue = Number(quantite);
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setErrorMessage("La quantité doit être supérieure à zéro.");
      return;
    }

    const payload = {
      produitId,
      type,
      quantite:
        type === "ajustement"
          ? Math.max(1, Math.abs(quantityValue - (selectedProduct.stockActuel || 0)))
          : quantityValue,
      raison: raison.trim(),
    };

    if (type === "ajustement") payload.quantiteCible = quantityValue;

    try {
      await createMovement.mutateAsync(payload);
      onSaved("Mouvement de stock enregistré.");
      onClose();
    } catch (error) {
      const parsed = parseApiError(error);
      setErrorMessage(
        parsed.code === "INSUFFICIENT_STOCK"
          ? `Stock insuffisant. ${parsed.message}`
          : parsed.message,
      );
      setErrorDetails(parsed.details);
    }
  }

  const currentType = movementTypes.find((item) => item.value === type);

  return (
    <dialog
      aria-labelledby="stock-movement-title"
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-slate-950/50"
      onClick={(event) => {
        if (event.target === dialogRef.current && !createMovement.isPending) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!createMovement.isPending) onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex min-h-full items-center justify-center px-3 py-5 sm:px-5">
        <section className="my-auto w-full max-w-md overflow-hidden rounded-xl bg-white shadow-modal">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900" id="stock-movement-title">
              Nouveau mouvement de stock
            </h2>
            <button
              aria-label="Fermer la fenêtre"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
              disabled={createMovement.isPending}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>

          <form className="space-y-4 p-5" onSubmit={handleSubmit}>
            <fieldset>
              <legend className="sr-only">Type de mouvement</legend>
              <div className="grid grid-cols-3 gap-2">
                {movementTypes.map(({ value, label, icon: Icon, activeClass }) => (
                  <button
                    aria-pressed={type === value}
                    className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-200 sm:gap-2 sm:text-sm ${
                      type === value
                        ? activeClass
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                    key={value}
                    onClick={() => changeType(value)}
                    type="button"
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="stock-product">
                Produit
              </label>
              <select
                className={inputClassName}
                disabled={productsQuery.isPending || products.length === 0}
                id="stock-product"
                onChange={(event) => {
                  setProduitId(event.target.value);
                  setErrorMessage("");
                }}
                required
                value={produitId}
              >
                <option value="">
                  {productsQuery.isPending
                    ? "Chargement des produits…"
                    : products.length
                      ? "Sélectionner un produit"
                      : "Aucun produit actif"}
                </option>
                {products.map((product) => (
                  <option key={product.id || product._id} value={product.id || product._id}>
                    {product.nom} — {product.stockActuel} {product.unite || "pièce"}
                  </option>
                ))}
              </select>
              {productsQuery.isError && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {parseApiError(productsQuery.error).message}
                </p>
              )}
              {selectedProduct && (
                <p className="mt-1 text-xs text-slate-500">
                  Stock actuel : {selectedProduct.stockActuel} {selectedProduct.unite || "pièce"}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="stock-quantity">
                {type === "ajustement" ? "Stock final souhaité" : "Quantité"}
              </label>
              <input
                className={inputClassName}
                id="stock-quantity"
                min={type === "ajustement" ? "0" : "0.000001"}
                onChange={(event) => setQuantite(event.target.value)}
                placeholder={type === "ajustement" ? "ex : 20" : "ex : 20"}
                required
                step="any"
                type="number"
                value={quantite}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="stock-reason">
                Raison / Commentaire
              </label>
              <input
                className={inputClassName}
                id="stock-reason"
                maxLength={200}
                onChange={(event) => setRaison(event.target.value)}
                placeholder="ex : Livraison fournisseur, vente, perte…"
                required
                value={raison}
              />
            </div>

            {errorMessage && (
              <div
                aria-live="assertive"
                className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
                role="alert"
              >
                <p>{errorMessage}</p>
                {errorDetails.map((detail, index) => (
                  <p className="mt-1 text-xs" key={`${detail.produit || detail.champ || "detail"}-${index}`}>
                    {detail.produit || detail.champ
                      ? `${detail.produit || detail.champ} : `
                      : ""}
                    {detail.message || detail.raison || ""}
                    {detail.disponible !== undefined &&
                      ` Disponible : ${detail.disponible}; demandé : ${detail.demande}.`}
                  </p>
                ))}
              </div>
            )}

            <footer className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
              <button
                className="h-10 flex-1 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
                disabled={createMovement.isPending}
                onClick={onClose}
                type="button"
              >
                Annuler
              </button>
              <button
                className={`h-10 flex-1 rounded-lg px-4 text-sm font-semibold text-white focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                  type === "entree"
                    ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300"
                    : type === "sortie"
                      ? "bg-red-600 hover:bg-red-700 focus:ring-red-300"
                      : "bg-amber-600 hover:bg-amber-700 focus:ring-amber-300"
                }`}
                disabled={
                  createMovement.isPending ||
                  productsQuery.isPending ||
                  !products.length
                }
                type="submit"
              >
                {createMovement.isPending
                  ? "Enregistrement…"
                  : currentType.value === "entree"
                    ? "Enregistrer l’entrée"
                    : currentType.value === "sortie"
                      ? "Enregistrer la sortie"
                      : "Enregistrer l’ajustement"}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </dialog>
  );
}
