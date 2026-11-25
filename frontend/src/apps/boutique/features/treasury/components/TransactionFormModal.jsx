import { useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import Button from "@/components/ui/Button.jsx";
import Input from "@/components/ui/Input.jsx";
import Modal from "@/components/ui/Modal.jsx";
import Select from "@/components/ui/Select.jsx";
import { validateTreasuryTransaction } from "../schemas.js";

const initialValues = {
  type: "recette",
  libelle: "",
  montant: "",
  modePaiement: "especes",
};

export default function TransactionFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  function updateValue(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSubmitError("");
  }

  function close() {
    if (isSubmitting) return;
    setValues(initialValues);
    setErrors({});
    setSubmitError("");
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateTreasuryTransaction(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    const payload = {
      type: values.type,
      libelle: values.libelle.trim(),
      montant: Number(values.montant),
      modePaiement: values.modePaiement,
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (error) {
      setSubmitError(parseApiError(error).message);
    }
  }

  const isExpense = values.type === "depense";
  const submitClassName = isExpense
    ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
    : "bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-600";

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Enregistrer une opération"
      size="sm"
      className="!rounded-2xl !shadow-2xl"
      closeOnOverlayClick={!isSubmitting}
      showCloseButton
      footerClassName="!flex-row"
      footer={
        <>
          <Button
            variant="secondary"
            className="!min-h-11 flex-1"
            disabled={isSubmitting}
            onClick={close}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            form="treasury-transaction-form"
            isLoading={isSubmitting}
            className={`min-h-11 flex-1 text-white ${submitClassName}`}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <form
        id="treasury-transaction-form"
        className="space-y-4"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="grid grid-cols-2 gap-2" aria-label="Type d’opération">
          <button
            type="button"
            aria-pressed={!isExpense}
            disabled={isSubmitting}
            onClick={() => {
              setValues((current) => ({ ...current, type: "recette" }));
              setErrors((current) => ({ ...current, type: undefined }));
            }}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              !isExpense
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            Recette
          </button>
          <button
            type="button"
            aria-pressed={isExpense}
            disabled={isSubmitting}
            onClick={() => {
              setValues((current) => ({ ...current, type: "depense" }));
              setErrors((current) => ({ ...current, type: undefined }));
            }}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              isExpense
                ? "border-red-600 bg-red-50 text-red-600"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
            Dépense
          </button>
        </div>

        <Input
          label="Libellé"
          name="libelle"
          value={values.libelle}
          onChange={updateValue}
          placeholder="Ex. Ventes du jour, loyer boutique…"
          autoComplete="off"
          maxLength={200}
          required
          error={errors.libelle}
          disabled={isSubmitting}
        />

        <Input
          label="Montant (FCFA)"
          name="montant"
          type="number"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={values.montant}
          onChange={updateValue}
          placeholder="Ex. 150000"
          required
          error={errors.montant}
          disabled={isSubmitting}
        />

        <Select
          label="Mode de paiement"
          name="modePaiement"
          value={values.modePaiement}
          onChange={updateValue}
          required
          error={errors.modePaiement}
          disabled={isSubmitting}
        >
          <option value="especes">Espèces</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="carte">Carte bancaire</option>
          <option value="virement">Virement</option>
          <option value="credit">Crédit</option>
        </Select>

        {submitError && (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {submitError}
          </p>
        )}
      </form>
    </Modal>
  );
}
