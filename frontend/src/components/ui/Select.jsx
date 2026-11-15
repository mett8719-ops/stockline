import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/core/utils/cn.js";
import { Field, fieldControlClass } from "./Field.jsx";

const Select = forwardRef(function Select(
  {
    id,
    label,
    required = false,
    error,
    icon,
    className,
    children,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...props
  },
  ref,
) {
  return (
    <Field
      id={id}
      label={label}
      required={required}
      error={error}
      icon={icon}
    >
      {(fieldProps) => (
        <>
          <select
            {...props}
            {...fieldProps}
            ref={ref}
            required={required}
            aria-describedby={[ariaDescribedBy, fieldProps["aria-describedby"]]
              .filter(Boolean)
              .join(" ") || undefined}
            aria-invalid={error ? true : ariaInvalid}
            className={cn(
              fieldControlClass,
              "appearance-none pr-10",
              icon && "pl-10",
              className,
            )}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        </>
      )}
    </Field>
  );
});

export default Select;
