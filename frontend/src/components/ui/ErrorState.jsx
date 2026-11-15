import { AlertCircle } from "lucide-react";
import { cn } from "@/core/utils/cn.js";
import Button from "./Button.jsx";

export default function ErrorState({
  title = "Une erreur est survenue",
  description = "Impossible de charger les données. Réessayez dans quelques instants.",
  action,
  onRetry,
  retryLabel = "Réessayer",
  className,
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-10 text-center",
        className,
      )}
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}
      {action ??
        (onRetry && (
          <Button className="mt-5" variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        ))}
    </div>
  );
}
