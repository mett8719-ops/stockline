import { useEffect, useRef } from "react";
import { CircleCheck } from "lucide-react";

function formatCount(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value) || 0);
}

export default function InventoryCloseDialog({
  articlesComptes,
  nombreEcarts,
  isPending,
  error,
  onCancel,
  onConfirm,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      aria-labelledby="inventory-close-title"
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-slate-950/50"
      onClick={(event) => {
        if (event.target === dialogRef.current && !isPending) onCancel();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) onCancel();
      }}
      ref={dialogRef}
    >
      <div className="flex min-h-full items-center justify-center px-3 py-5 sm:px-5">
        <section className="my-auto w-full max-w-md rounded-2xl bg-white px-5 py-6 text-center shadow-modal sm:px-7 sm:py-7">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CircleCheck aria-hidden="true" className="h-12 w-12" strokeWidth={2} />
          </div>
          <h2
            className="mt-5 text-xl font-bold text-slate-800 sm:text-2xl"
            id="inventory-close-title"
          >
            Clôturer l’inventaire ?
          </h2>
          <p className="mt-3 text-base text-slate-500 sm:text-lg">
            {formatCount(articlesComptes)} article
            {Number(articlesComptes) === 1 ? "" : "s"} compté
            {Number(articlesComptes) === 1 ? "" : "s"} · {formatCount(nombreEcarts)}{" "}
            écart{Number(nombreEcarts) === 1 ? "" : "s"}
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400 sm:text-base">
            Les stocks Stockline seront mis à jour avec les quantités réelles
            saisies. Cette action est irréversible.
          </p>
          {error && (
            <p
              className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-left text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-medium text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
              disabled={isPending}
              onClick={onCancel}
              type="button"
            >
              Annuler
            </button>
            <button
              className="h-12 rounded-xl bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={onConfirm}
              type="button"
            >
              {isPending ? "Clôture…" : "Clôturer"}
            </button>
          </div>
        </section>
      </div>
    </dialog>
  );
}
