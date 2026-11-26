/**
 * submitSale — Wrapper de création de vente offline-first.
 *
 * Comportement :
 *  - En ligne  → appel direct à POST /api/v1/sales, retourne la vente créée.
 *  - Hors ligne → enregistrement dans IndexedDB (pendingSales), retourne
 *                 un objet `{ enAttente: true, clientOperationId }`.
 *
 * Le `clientOperationId` garantit l'idempotence : même si la vente est
 * synchronisée plusieurs fois (perte réseau pendant le POST /sync), le
 * backend ne l'enregistre qu'une fois.
 */
import { apiClient } from "@/core/api/client.js";
import { db } from "./db.js";

function generateOperationId() {
  // crypto.randomUUID() est disponible dans tous les navigateurs modernes
  // et dans le SW. Repli sur Math.random pour les très vieux contextes.
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * @param {object} salePayload  Corps de la vente (lignes, paiements, etc.)
 * @returns {Promise<{ enAttente: boolean, clientOperationId: string, data?: object }>}
 */
export async function submitSale(salePayload) {
  const clientOperationId =
    salePayload.clientOperationId ?? generateOperationId();

  const payload = { ...salePayload, clientOperationId };

  if (navigator.onLine) {
    try {
      const { data: response } = await apiClient.post("/sales", payload);
      return { enAttente: false, clientOperationId, data: response?.data };
    } catch (error) {
      // Erreur réseau malgré navigator.onLine (timeout, coupure brutale)
      if (!error.response) {
        await _savePending(clientOperationId, payload);
        return { enAttente: true, clientOperationId };
      }
      throw error;
    }
  }

  await _savePending(clientOperationId, payload);
  return { enAttente: true, clientOperationId };
}

async function _savePending(clientOperationId, payload) {
  await db.pendingSales.put({
    clientOperationId,
    payload,
    createdAt: Date.now(),
    tentatives: 0,
  });
}
