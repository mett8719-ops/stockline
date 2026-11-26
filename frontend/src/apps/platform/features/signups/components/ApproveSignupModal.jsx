import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";

export default function ApproveSignupModal({
  isPending,
  onClose,
  onConfirm,
  signup,
}) {
  const dialogRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const ownerName = signup?.proprietaire?.nomComplet || "Propriétaire";
  const ownerEmail = signup?.proprietaire?.email || "—";
  const shopName = signup?.boutique?.nom || "Votre boutique";

  async function handleConfirm() {
    setErrorMessage("");
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      setErrorMessage(parseApiError(error).message);
    }
  }

  return (
    <dialog
      aria-labelledby="approve-signup-title"
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
        <section className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-modal">
          <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2
              className="text-lg font-semibold text-slate-900"
              id="approve-signup-title"
            >
              Confirmation de validation
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

          <div className="space-y-4 px-6 py-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Email automatique qui sera envoyé à{" "}
              <span className="font-semibold">{ownerEmail}</span> :
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">
                Objet : Votre compte Stockline est prêt !
              </p>
              <p>Bonjour {ownerName},</p>
              <p>
                Bonne nouvelle — votre espace{" "}
                <span className="font-semibold text-slate-900">{shopName}</span>{" "}
                a été validé et est maintenant actif sur la plateforme Stockline.
              </p>

              <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-xs sm:text-sm">
                <p className="mb-1.5 font-medium text-slate-500">
                  Vos identifiants provisoires
                </p>
                <p className="text-slate-700">
                  Email :{" "}
                  <span className="font-semibold text-slate-900">{ownerEmail}</span>
                </p>
                <p className="mt-1 text-slate-700">
                  Mot de passe temporaire :{" "}
                  <span className="font-mono font-semibold text-slate-900">
                    Généré automatiquement à la validation
                  </span>
                </p>
              </div>

              <p className="flex items-start gap-2 text-xs text-slate-500">
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500"
                />
                <span>
                  Vous devrez changer ce mot de passe à votre première connexion.
                </span>
              </p>
              <p className="text-slate-600">L&apos;équipe Stockline</p>
            </div>

            {errorMessage && (
              <p
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                role="alert"
              >
                {errorMessage}
              </p>
            )}
          </div>

          <footer className="flex flex-col-reverse gap-2.5 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              disabled={isPending}
              onClick={onClose}
              type="button"
            >
              Annuler
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-wait disabled:opacity-60"
              disabled={isPending}
              onClick={handleConfirm}
              type="button"
            >
              {isPending && (
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              )}
              Valider et envoyer l&apos;email
            </button>
          </footer>
        </section>
      </div>
    </dialog>
  );
}
