/**
 * useSyncQueue — Hook React pour la synchronisation automatique offline.
 *
 * Expose :
 *  - `pendingCount`  → nombre de ventes en attente (live, via liveQuery)
 *  - `isSyncing`     → true pendant une synchronisation en cours
 *  - `lastSyncResult`→ résultat de la dernière sync { synchronisees, doublons, echecs }
 *  - `syncNow()`     → déclencher manuellement une synchronisation
 *
 * Déclenchement automatique :
 *  - Au retour du réseau (événement `online`)
 *  - Au montage du composant si `navigator.onLine` est déjà à true et qu'il
 *    y a des ventes en attente
 */
import { useCallback, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db.js";
import { syncQueue } from "./syncQueue.js";

export function useSyncQueue() {
  const pendingCount = useLiveQuery(
    () => db.pendingSales.count(),
    [],
    0,
  );

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncQueue();
      setLastSyncResult(result);
    } catch {
      // Erreur inattendue — on laisse le prochain online déclencher la retry
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Synchronisation automatique au retour du réseau
  useEffect(() => {
    function handleOnline() {
      syncNow();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncNow]);

  // Sync au montage si déjà en ligne avec des ventes en attente
  useEffect(() => {
    if (navigator.onLine && pendingCount > 0) {
      syncNow();
    }
    // On ne veut ce déclenchement qu'au montage et quand pendingCount passe > 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCount]);

  return { pendingCount, isSyncing, lastSyncResult, syncNow };
}
