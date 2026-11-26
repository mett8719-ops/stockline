import { useEffect, useRef, useState } from "react";
import { CircleDollarSign, LoaderCircle, X } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import {
  createPaymentSchema,
  getPaymentFieldErrors,
  paymentModes,
} from "../paymentSchema.js";

const fieldClassName =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const moneyFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  return `${moneyFormat.format(value)} FCFA`;
}

export default function PaymentModal({
  balance,
  isPending,
  onClose,
  onSubmit,
  partyName,
}) {
  const dialogRef = useRef(null);
  const maxAmount = Math.round(balance * 100) / 100;
  const [amount, setAmount] = useState("");
  const [modePaiement, setModePaiement] = useState("especes");
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    dialog.showModal();
    dialog.querySelector("input")?.focus();
    return () => dialog.close();
  }, []);

  function updateAmount(event) {
    setAmount(event.target.value);
    setFieldErrors((current) => ({ ...current, montant: undefined }));
    setErrorMessage("");
  }

  function updatePaymentMode(event) {
    setModePaiement(event.target.value);
    setFieldErrors((current) => ({ ...current, modePaiement: undefined }));
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    const result = createPaymentSchema(maxAmount).safeParse({
      montant: amount.trim() ? Number(amount) : Number.NaN,
      modePaiement,
    });

    if (!result.success) {
      const errors = getPaymentFieldErrors(result.error);
      setFieldErrors(errors);
      const firstInvalidField = Object.keys(errors)[0];
      if (firstInvalidField) {
        dialogRef.current
          ?.querySelector(`[name="${firstInvalidField}"]`)
          ?.focus();
      }
      return;
    }

    setFieldErrors({});

    try {
      await onSubmit(result.data);
      onClose();
    } catch (error) {
      const status = error?.response?.status;
      if (!error?.response || status >= 500) {
        setErrorMessage(
          "Le résultat du versement est incertain. Actualisez la fiche avant de réessayer afin d’éviter un double versement.",
        );
        return;
      }
      setErrorMessage(parseApiError(error).message);
    }
  }

  return (
    <dialog
      aria-labelledby="customer-payment-title"
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-slate-950/50"
      onClick={(event) => {
        if (event.target === dialogRef.current && !isPending) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex min-h-full items-start justify-center px-3 py-5 sm:items-center sm:px-5">
        <section className="my-auto w-full max-w-md overflow-hidden rounded-xl bg-white shadow-modal">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <CircleDollarSign aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900" id="customer-payment-title">
                  Enregistrer un versement
                </h2>
                <p className="text-sm text-slate-500">{partyName}</p>
              </div>
            </div>
            <button
              aria-label="Fermer la fenêtre"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
              disabled={isPending}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>

          <form className="space-y-5 p-5" noValidate onSubmit={handleSubmit}>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Solde dû actuel</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatMoney(maxAmount)}</p>
            </div>

            {errorMessage && (
              <p
                aria-live="assertive"
                className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
                role="alert"
              >
                {errorMessage}
              </p>
            )}

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-slate-700" htmlFor="payment-amount">
                  Montant versé (FCFA)
                </label>
                <button
                  className="text-xs font-semibold text-brand-700 hover:text-brand-900 focus:outline-none focus:underline disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPending || maxAmount <= 0}
                  onClick={() => {
                    setAmount(maxAmount.toFixed(2));
                    setFieldErrors((current) => ({ ...current, montant: undefined }));
                    setErrorMessage("");
                  }}
                  type="button"
                >
                  Tout solder
                </button>
              </div>
              <input
                aria-describedby={fieldErrors.montant ? "payment-amount-error" : "payment-amount-help"}
                aria-invalid={Boolean(fieldErrors.montant)}
                className={fieldClassName}
                disabled={isPending}
                id="payment-amount"
                max={maxAmount}
                min="0.01"
                name="montant"
                onChange={updateAmount}
                required
                step="0.01"
                type="number"
                value={amount}
              />
              {fieldErrors.montant ? (
                <p className="mt-1 text-xs text-red-600" id="payment-amount-error">
                  {fieldErrors.montant}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500" id="payment-amount-help">
                  Le montant ne peut pas dépasser {formatMoney(maxAmount)}.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="payment-mode">
                Mode de paiement
              </label>
              <select
                aria-describedby={fieldErrors.modePaiement ? "payment-mode-error" : undefined}
                aria-invalid={Boolean(fieldErrors.modePaiement)}
                className={fieldClassName}
                disabled={isPending}
                id="payment-mode"
                name="modePaiement"
                onChange={updatePaymentMode}
                value={modePaiement}
              >
                {paymentModes.map(({ label, value }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {fieldErrors.modePaiement && (
                <p className="mt-1 text-xs text-red-600" id="payment-mode-error">
                  {fieldErrors.modePaiement}
                </p>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={onClose}
                type="button"
              >
                Annuler
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                type="submit"
              >
                {isPending && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                {isPending ? "Enregistrement…" : "Confirmer le versement"}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </dialog>
  );
}
