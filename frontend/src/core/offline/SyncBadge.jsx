/**
 * SyncBadge — Indicateur temps réel de synchronisation offline.
 *
 * États :
 *  - En cours de sync    → spinner + "Synchronisation…"
 *  - Ventes en attente   → badge orange avec le compteur
 *  - Tout synchronisé    → badge vert "Synchronisé"
 *
 * Utilisé dans BoutiqueLayout, monté une seule fois dans le shell.
 */
import { LoaderCircle, Check, CloudOff } from "lucide-react";
import { useSyncQueue } from "./useSyncQueue.js";

export default function SyncBadge() {
  const { pendingCount, isSyncing } = useSyncQueue();

  if (isSyncing) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-medium text-blue-700">
        <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        <span className="hidden sm:inline">Synchronisation…</span>
        <span className="sr-only sm:hidden">Synchronisation en cours</span>
      </span>
    );
  }

  if (pendingCount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-700">
        <CloudOff aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {pendingCount} vente{pendingCount > 1 ? "s" : ""} en attente
        </span>
        <span className="sr-only sm:hidden">
          {pendingCount} vente{pendingCount > 1 ? "s" : ""} hors ligne
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-medium text-emerald-700">
      <Check aria-hidden="true" className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Synchronisé</span>
      <span className="sr-only sm:hidden">Synchronisé</span>
    </span>
  );
}
