import { useEffect, useRef, useState } from "react";

export default function InventoryCountField({
  line,
  productId,
  error,
  isSaving,
  onSave,
}) {
  const initialValue =
    line.quantiteComptee === null || line.quantiteComptee === undefined
      ? ""
      : String(line.quantiteComptee);
  const [value, setValue] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const timerRef = useRef(null);
  const displayedValue = value ?? initialValue;

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  async function saveCurrentValue() {
    window.clearTimeout(timerRef.current);
    if (!isDirty || isSaving) return;

    const saved = await onSave(productId, displayedValue);
    if (saved) {
      setValue(null);
      setIsDirty(false);
    }
  }

  function handleChange(event) {
    const nextValue = event.target.value;
    setValue(nextValue);
    setIsDirty(true);
    window.clearTimeout(timerRef.current);

    if (nextValue.trim()) {
      timerRef.current = window.setTimeout(async () => {
        const saved = await onSave(productId, nextValue);
        if (saved) {
          setValue(null);
          setIsDirty(false);
        }
      }, 500);
    }
  }

  return (
    <div className="min-w-24">
      <input
        aria-label={`Quantité comptée pour ${line.produitNom}`}
        aria-invalid={Boolean(error)}
        className={`h-10 w-full rounded-lg border bg-white px-3 text-center text-sm text-slate-900 outline-none transition focus:ring-2 disabled:bg-slate-50 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
            : "border-slate-200 focus:border-brand-500 focus:ring-brand-100"
        }`}
        disabled={isSaving}
        min="0"
        onBlur={saveCurrentValue}
        onChange={handleChange}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        step="any"
        type="number"
        value={displayedValue}
      />
      {isSaving ? (
        <p aria-live="polite" className="mt-1 text-center text-xs text-slate-500">
          Sauvegarde…
        </p>
      ) : error ? (
        <div className="mt-1 max-w-36 text-center">
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
          <button
            className="mt-1 text-xs font-medium text-brand-700 underline underline-offset-2"
            onClick={saveCurrentValue}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            Réessayer
          </button>
        </div>
      ) : line.quantiteComptee !== null &&
        line.quantiteComptee !== undefined &&
        !isDirty ? (
        <p className="mt-1 text-center text-xs text-emerald-700" role="status">
          Enregistré
        </p>
      ) : null}
    </div>
  );
}
