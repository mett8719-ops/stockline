import { useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { rejectSignupSchema, requestInfoSchema } from "../schemas.js";

export default function SignupActionModal({
  isPending,
  mode,
  onClose,
  onSubmit,
  signup,
}) {
  const dialogRef = useRef(null);
  const [text, setText] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    dialog.showModal();
    dialog.querySelector("textarea")?.focus();
    return () => dialog.close();
  }, []);

  const isReject = mode === "reject";
  const title = isReject
    ? "Rejeter la demande"
    : "Demander des informations complémentaires";
  const label = isReject
    ? "Motif du rejet (envoyé par email au demandeur)"
    : "Informations complémentaires attendues";
  const placeholder = isReject
    ? "Ex: Informations de contact non vérifiables…"
    : "Ex: Merci de préciser votre adresse complète et votre numéro RCCM…";

  async function handleSubmit(event) {
    event.preventDefault();
    setFieldError("");
    setApiError("");

    const parsed = isReject
      ? rejectSignupSchema.safeParse({ motif: text })
      : requestInfoSchema.safeParse({ message: text });

    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message || "Saisie invalide.");
      return;
    }

    try {
      await onSubmit(parsed.data);
      onClose();
    } catch (error) {
      setApiError(parseApiError(error).message);
    }
  }

  return (
    <dialog
      aria-labelledby="signup-action-title"
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
      <div className="flex min-h-full items-start justify-center px-3 py-6 sm:items-center sm:px-5">
        <section className="my-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-modal">
          <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2
              className="text-base font-semibold text-slate-900"
              id="signup-action-title"
            >
              {title}
            </h2>
            <button
              aria-label="Fermer"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              disabled={isPending}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>

          <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
            <p className="text-sm text-slate-600">
              Boutique :{" "}
              <span className="font-semibold text-slate-900">
                {signup?.boutique?.nom || "—"}
              </span>
            </p>

            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-700"
                htmlFor="signup-action-text"
              >
                {label}
              </label>
              <textarea
                className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-platform-500 focus:ring-2 focus:ring-platform-100"
                id="signup-action-text"
                onChange={(event) => {
                  setText(event.target.value);
                  setFieldError("");
                  setApiError("");
                }}
                placeholder={placeholder}
                value={text}
              />
              {fieldError && (
                <p className="mt-1.5 text-xs text-rose-600" role="alert">
                  {fieldError}
                </p>
              )}
            </div>

            {apiError && (
              <p
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                role="alert"
              >
                {apiError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                disabled={isPending}
                onClick={onClose}
                type="button"
              >
                Annuler
              </button>
              <button
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-60 ${
                  isReject
                    ? "bg-rose-600 hover:bg-rose-700 focus:ring-2 focus:ring-rose-300"
                    : "bg-platform-600 hover:bg-platform-700 focus:ring-2 focus:ring-platform-300"
                }`}
                disabled={isPending}
                type="submit"
              >
                {isPending && (
                  <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                )}
                {isReject ? "Confirmer le rejet" : "Envoyer la demande"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </dialog>
  );
}
