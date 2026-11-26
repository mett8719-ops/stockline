/**
 * syncQueue — Synchronisation par lot des ventes en attente.
 *
 * Appelé automatiquement par `useSyncQueue` au retour du réseau.
 * Envoie toutes les ventes en attente en un seul POST /sales/sync,
 * puis supprime de l'IDB celles qui ont réussi (y compris les doublons).
 *
 * Les ventes en échec côté serveur incrémentent leur compteur `tentatives`
 * et restent dans la file — elles seront réessayées à la prochaine connexion.
 *
 * @returns {Promise<{ synchronisees: number, doublons: number, echecs: number }>}
 */
import { apiClient } from "@/core/api/client.js";
import { db } from "./db.js";

export async function syncQueue() {
  const pending = await db.pendingSales
    .orderBy("createdAt")
    .toArray();

  if (pending.length === 0) {
    return { synchronisees: 0, doublons: 0, echecs: 0 };
  }

  const ventes = pending.map((item) => item.payload);

  let rapport;
  try {
    const { data: response } = await apiClient.post("/sales/sync", { ventes });
    rapport = response?.data ?? { synchronisees: [], doublons: [], echecs: [] };
  } catch (error) {
    // Erreur réseau pendant la sync — on réessaiera plus tard
    if (!error.response) {
      return { synchronisees: 0, doublons: 0, echecs: pending.length };
    }
    throw error;
  }

  // Supprimer les ventes réussies et les doublons (déjà présents côté serveur)
  const succes = new Set([
    ...(rapport.synchronisees ?? []).map((v) => v.clientOperationId),
    ...(rapport.doublons ?? []).map((v) => v.clientOperationId),
  ]);

  if (succes.size > 0) {
    await db.pendingSales.bulkDelete([...succes]);
  }

  // Incrémenter le compteur des échecs
  const echecsIds = (rapport.echecs ?? []).map((v) => v.clientOperationId);
  for (const id of echecsIds) {
    await db.pendingSales
      .where("clientOperationId")
      .equals(id)
      .modify((item) => {
        item.tentatives = (item.tentatives ?? 0) + 1;
      });
  }

  return {
    synchronisees: (rapport.synchronisees ?? []).length,
    doublons: (rapport.doublons ?? []).length,
    echecs: echecsIds.length,
  };
}

/** Nombre de ventes actuellement en attente dans IndexedDB. */
export async function getPendingCount() {
  return db.pendingSales.count();
}
