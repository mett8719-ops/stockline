import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useSaveProduct } from "../hooks.js";

const fieldClassName =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function ProductField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  maxLength,
  step,
  required = false,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        className={fieldClassName}
        id={id}
        maxLength={maxLength}
        min={min}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
        value={value}
      />
    </div>
  );
}

function getInitialValues(product) {
  return {
    nom: product?.nom || "",
    categorieNom: product?.categorieNom || "",
    prixVente: product?.prixVente == null ? "" : String(product.prixVente),
    prixAchat: product?.prixAchat == null ? "" : String(product.prixAchat),
    stockInitial: "",
    seuilAlerte: product?.seuilAlerte == null ? "0" : String(product.seuilAlerte),
    unite: product?.unite || "",
  };
}

export default function ProductFormModal({
  product = null,
  onClose,
  onSaved,
}) {
  const dialogRef = useRef(null);
  const isEditing = Boolean(product);
  const saveProduct = useSaveProduct();
  const [values, setValues] = useState(() => getInitialValues(product));
  const [priceError, setPriceError] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return undefined;

    dialog.showModal();
    dialog.querySelector("input")?.focus();

    return () => dialog.close();
  }, []);

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setPriceError("");
    setSubmitError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setPriceError("");
    setSubmitError("");

    const prixVente = Number(values.prixVente);
    const prixAchat = Number(values.prixAchat);

    if (prixVente < prixAchat) {
      setPriceError("Le prix de vente doit être supérieur ou égal au prix d’achat.");
      return;
    }

    const payload = {
      nom: values.nom.trim(),
      prixVente,
      prixAchat,
      seuilAlerte: Number(values.seuilAlerte),
      unite: values.unite.trim() || "piece",
    };

    if (values.categorieNom.trim()) {
      payload.categorieNom = values.categorieNom.trim();
    }

    if (!isEditing) {
      payload.stockInitial = Number(values.stockInitial);
    }

    try {
      await saveProduct.mutateAsync({
        productId: product?.id || product?._id,
        product: payload,
      });
      onSaved(isEditing ? "Produit modifié avec succès." : "Produit ajouté avec succès.");
      onClose();
    } catch (error) {
      const apiError = parseApiError(error);
      setSubmitError(
        apiError.code === "QUOTA_EXCEEDED"
          ? `${apiError.message} Passez à un forfait supérieur pour ajouter ce produit.`
          : apiError.message,
      );
    }
  }

  return (
    <dialog
      aria-labelledby="product-form-title"
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-slate-950/50"
      onClick={(event) => {
        if (event.target === dialogRef.current && !saveProduct.isPending) onClose();
      }}
      onClose={onClose}
      onCancel={(event) => {
        if (saveProduct.isPending) event.preventDefault();
        else onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex min-h-full items-start justify-center px-3 py-4 sm:items-center sm:px-5 sm:py-8">
        <section className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-modal sm:max-h-[calc(100vh-4rem)]">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-slate-900" id="product-form-title">
              {isEditing ? "Modifier un produit" : "Ajouter un produit"}
            </h2>
            <button
              aria-label="Fermer la fenêtre"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
              disabled={saveProduct.isPending}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              {submitError && (
                <p
                  aria-live="assertive"
                  className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
                  role="alert"
                >
                  {submitError}
                </p>
              )}

              <ProductField
                id="product-name"
                label="Nom du produit"
                maxLength={150}
                onChange={(event) => updateField("nom", event.target.value)}
                placeholder="ex : Riz local 25kg"
                required
                value={values.nom}
              />
              <ProductField
                id="product-category"
                label="Catégorie"
                maxLength={60}
                onChange={(event) => updateField("categorieNom", event.target.value)}
                placeholder="ex : Céréales"
                value={values.categorieNom}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <ProductField
                  id="product-sale-price"
                  label="Prix de vente (CDF)"
                  min="0"
                  onChange={(event) => updateField("prixVente", event.target.value)}
                  placeholder="ex : 15000"
                  required
                  step="0.01"
                  type="number"
                  value={values.prixVente}
                />
                <ProductField
                  id="product-purchase-price"
                  label="Prix d’achat (CDF)"
                  min="0"
                  onChange={(event) => updateField("prixAchat", event.target.value)}
                  placeholder="ex : 12000"
                  required
                  step="0.01"
                  type="number"
                  value={values.prixAchat}
                />
              </div>
              {priceError && (
                <p className="-mt-2 text-sm text-red-600" role="alert">
                  {priceError}
                </p>
              )}

              {!isEditing && (
                <ProductField
                  id="product-initial-stock"
                  label="Stock initial"
                  min="0"
                  onChange={(event) => updateField("stockInitial", event.target.value)}
                  placeholder="ex : 50"
                  required
                  step="any"
                  type="number"
                  value={values.stockInitial}
                />
              )}

              {isEditing && (
                <p className="rounded-lg bg-blue-50 px-3 py-2.5 text-sm text-blue-800">
                  Le stock actuel ne peut pas être modifié ici. Utilisez le module Stock pour enregistrer un mouvement.
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <ProductField
                  id="product-alert-stock"
                  label="Stock minimum (alerte)"
                  min="0"
                  onChange={(event) => updateField("seuilAlerte", event.target.value)}
                  placeholder="ex : 10"
                  required
                  step="any"
                  type="number"
                  value={values.seuilAlerte}
                />
                <ProductField
                  id="product-unit"
                  label="Unité"
                  maxLength={20}
                  onChange={(event) => updateField("unite", event.target.value)}
                  placeholder="ex : sac, kg, litre, pièce"
                  value={values.unite}
                />
              </div>
            </div>

            <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-32"
                disabled={saveProduct.isPending}
                onClick={onClose}
                type="button"
              >
                Annuler
              </button>
              <button
                className="h-11 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-40"
                disabled={saveProduct.isPending}
                type="submit"
              >
                {saveProduct.isPending
                  ? "Enregistrement…"
                  : isEditing
                    ? "Enregistrer"
                    : "Ajouter"}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </dialog>
  );
}
