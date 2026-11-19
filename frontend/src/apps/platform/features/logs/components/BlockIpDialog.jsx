import { useEffect, useRef, useState } from "react";
import { Ban, X } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useBlockPlatformIp } from "../hooks.js";
import { blockPlatformIpSchema } from "../schemas.js";

const fieldClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-platform-500 focus:ring-2 focus:ring-platform-100 disabled:bg-slate-50";

export default function BlockIpDialog({ ip, onBlocked, onClose }) {
  const dialogRef = useRef(null);
  const blockMutation = useBlockPlatformIp();
  const [motif, setMotif] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    const validation = blockPlatformIpSchema.safeParse({ ip, motif });
    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message || "Les informations sont invalides.");
      return;
    }

    try {
      const result = await blockMutation.mutateAsync(validation.data);
      onBlocked(result?.message || `L’adresse IP ${ip} a été bloquée.`);
    } catch (error) {
      setErrorMessage(parseApiError(error).message);
    }
  }

  const isPending = blockMutation.isPending;

  return (
    <dialog
      aria-labelledby="block-ip-title"
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-slate-950/50"
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !isPending) onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex min-h-full items-start justify-center px-3 py-5 sm:items-center sm:px-5">
        <section className="my-auto w-full max-w-md overflow-hidden rounded-xl bg-white shadow-modal">
          <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Ban aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900" id="block-ip-title">
                  Bloquer définitivement cette IP ?
                </h2>
                <p className="mt-1 font-mono text-sm text-slate-600">{ip}</p>
              </div>
            </div>
            <button
              aria-label="Fermer la fenêtre"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-platform-300"
              disabled={isPending}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>

          <form className="space-y-4 p-5" onSubmit={handleSubmit}>
            <p className="text-sm leading-6 text-slate-600">
              Cette adresse ne pourra plus accéder à la plateforme. L’action sera
              enregistrée dans le journal d’audit.
            </p>

            {errorMessage && (
              <p
                aria-live="assertive"
                className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
                role="alert"
              >
                {errorMessage}
              </p>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Motif (facultatif)
              </span>
              <textarea
                className={`${fieldClassName} min-h-20 resize-y py-2.5`}
                disabled={isPending}
                maxLength={500}
                onChange={(event) => setMotif(event.target.value)}
                placeholder="Expliquer brièvement le motif du blocage"
                value={motif}
              />
            </label>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                disabled={isPending}
                onClick={onClose}
                type="button"
              >
                Annuler
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-wait disabled:opacity-60"
                disabled={isPending}
                type="submit"
              >
                <Ban aria-hidden="true" className="h-4 w-4" />
                {isPending ? "Blocage en cours…" : "Confirmer le blocage"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </dialog>
  );
}
