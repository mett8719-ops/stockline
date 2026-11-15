import { forwardRef, useId } from "react";
import { cn } from "@/core/utils/cn.js";

const Toggle = forwardRef(function Toggle(
  {
    id,
    label,
    required = false,
    error,
    className,
    "aria-describedby": ariaDescribedBy,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? `toggle-${generatedId}`;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={cn("w-full", className)}>
      <label
        className={cn(
          "flex min-h-11 items-center gap-3",
          props.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        )}
        htmlFor={fieldId}
      >
        <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
          <input
            {...props}
            ref={ref}
            id={fieldId}
            type="checkbox"
            role="switch"
            required={required}
            aria-describedby={
              [ariaDescribedBy, errorId].filter(Boolean).join(" ") || undefined
            }
            aria-invalid={error ? true : undefined}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600 peer-disabled:opacity-60"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
          />
        </span>
        {label && (
          <span className="text-sm text-slate-700">
            {label}
            {required && (
              <span className="ml-1 text-red-600" aria-hidden="true">
                *
              </span>
            )}
          </span>
        )}
      </label>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default Toggle;
