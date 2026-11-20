import { forwardRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/core/utils/cn.js";
import { fieldControlClass } from "./Field.jsx";

const SearchInput = forwardRef(function SearchInput(
  {
    value,
    defaultValue,
    onChange,
    onClear,
    placeholder = "Rechercher...",
    className,
    inputClassName,
    disabled = false,
    ...props
  },
  ref,
) {
  const hasValue = String(value ?? defaultValue ?? "").length > 0;

  function clearSearch() {
    onClear?.();
  }

  return (
    <div className={cn("relative w-full", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        {...props}
        ref={ref}
        type="search"
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          fieldControlClass,
          "pl-10",
          hasValue && "pr-10",
          inputClassName,
        )}
      />
      {hasValue && onClear && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          disabled={disabled}
          onClick={clearSearch}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-not-allowed"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
});

export default SearchInput;
