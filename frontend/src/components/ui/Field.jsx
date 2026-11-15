import { useId } from "react";
import { cn } from "@/core/utils/cn.js";

export function Field({
  id,
  label,
  required = false,
  error,
  icon,
  className,
  children,
}) {
  const generatedId = useId();
  const fieldId = id ?? `field-${generatedId}`;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label
          className="mb-1.5 block text-sm font-medium text-slate-800"
          htmlFor={fieldId}
        >
          {label}
          {required && (
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            {icon}
          </span>
        )}
        {children({
          id: fieldId,
          "aria-describedby": errorId,
          "aria-invalid": error ? true : undefined,
          "aria-required": required || undefined,
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const fieldControlClass =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:border-red-500 aria-[invalid=true]:focus:ring-red-500/20";
