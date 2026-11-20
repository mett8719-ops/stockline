import { forwardRef } from "react";
import { cn } from "@/core/utils/cn.js";
import { Field, fieldControlClass } from "./Field.jsx";

const Input = forwardRef(function Input(
  {
    id,
    label,
    required = false,
    error,
    icon,
    className,
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
        <input
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
            icon && "pl-10",
            className,
          )}
        />
      )}
    </Field>
  );
});

export default Input;
