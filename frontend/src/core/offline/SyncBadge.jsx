import { Check } from "lucide-react";

export default function SyncBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-medium text-emerald-700">
      <Check aria-hidden="true" className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Synchronisé</span>
      <span className="sr-only sm:hidden">Synchronisé</span>
    </span>
  );
}
