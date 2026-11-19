import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const severityLabels = {
  haute: "Haute",
  moyenne: "Moyenne",
  info: "Info",
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : dateFormat.format(date);
}

function formatAction(action = "") {
  return action
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function LogDetailsDialog({ log, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      aria-labelledby="audit-log-detail-title"
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-slate-950/50"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex min-h-full items-start justify-center px-3 py-5 sm:items-center sm:px-5">
        <section className="my-auto w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-modal">
          <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900" id="audit-log-detail-title">
                Détail de l’événement
              </h2>
              <p className="mt-1 text-xs text-slate-500">{formatDate(log.createdAt)}</p>
            </div>
            <button
              aria-label="Fermer le détail"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-platform-300"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>

          <dl className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500">Événement</dt>
              <dd className="mt-1 break-words text-sm text-slate-900">
                {formatAction(log.action)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Sévérité</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {severityLabels[log.severite] || log.severite || "Inconnue"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Auteur</dt>
              <dd className="mt-1 break-words text-sm text-slate-900">
                {log.auteurNom || "Système"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Cible</dt>
              <dd className="mt-1 break-words text-sm text-slate-900">
                {[log.cible, log.cibleId].filter(Boolean).join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Adresse IP</dt>
              <dd className="mt-1 break-all font-mono text-sm text-slate-900">
                {log.ip || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500">Boutique</dt>
              <dd className="mt-1 break-all font-mono text-sm text-slate-900">
                {log.shopId || "Événement plateforme"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </dialog>
  );
}
