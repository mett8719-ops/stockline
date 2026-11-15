import { forwardRef, useId } from "react";
import { cn } from "@/core/utils/cn.js";

const Checkbox = forwardRef(function Checkbox(
  {
    id,
    label,
    description,
    required = false,
    error,
    className,
    "aria-describedby": ariaDescribedBy,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? `checkbox-${generatedId}`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const descriptionId = description ? `${fieldId}-description` : undefined;

  return (
    <div className={cn("w-full", className)}>
      <label
        className={cn(
          "flex min-h-11 items-start gap-3",
          props.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        )}
        htmlFor={fieldId}
      >
        <input
          {...props}
          ref={ref}
          id={fieldId}
          type="checkbox"
          required={required}
          aria-describedby={
            [
              ariaDescribedBy,
              descriptionId,
              errorId,
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          aria-invalid={error ? true : undefined}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        />
        <span className="text-sm text-slate-700">
          {label}
          {required && (
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          )}
          {description && (
            <span
              id={descriptionId}
              className="mt-0.5 block text-xs text-slate-500"
            >
              {description}
            </span>
          )}
        </span>
      </label>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default Checkbox;
