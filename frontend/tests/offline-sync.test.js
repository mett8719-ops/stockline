/**
 * Tests unitaires — Moteur offline (ET-07)
 *
 * On teste submitSale et syncQueue en mocquant :
 *   - apiClient  → simuler réseau présent / absent / erreur
 *   - db         → vérifier les écritures dans IndexedDB
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ── Mocks légers ────────────────────────────────────────────────────────────

/** Simule la base IndexedDB en mémoire */
const fakeDb = (() => {
  const store = new Map();
  return {
    pendingSales: {
      async put(item) {
        store.set(item.clientOperationId, { ...item });
      },
      async count() {
        return store.size;
      },
      async bulkDelete(ids) {
        for (const id of ids) store.delete(id);
      },
      orderBy() {
        return {
          async toArray() {
            return [...store.values()];
          },
        };
      },
      where(field) {
        return {
          equals(val) {
            return {
              async modify(fn) {
                for (const [, item] of store) {
                  if (item[field] === val) fn(item);
                }
              },
            };
          },
        };
      },
    },
    _store: store,
    _clear() {
      store.clear();
    },
  };
})();

// Remplace crypto.randomUUID si absent (environnement Node < 19)
if (typeof crypto === "undefined" || !crypto.randomUUID) {
  globalThis.crypto = { randomUUID: () => `test-uuid-${Math.random()}` };
}

// ── Implémentations inline (sans import ESM) ────────────────────────────────

function generateOperationId() {
  return crypto.randomUUID();
}

async function submitSale(salePayload, { apiClient, isOnline }) {
  const clientOperationId =
    salePayload.clientOperationId ?? generateOperationId();
  const payload = { ...salePayload, clientOperationId };

  if (isOnline) {
    try {
      const { data: response } = await apiClient.post("/sales", payload);
      return { enAttente: false, clientOperationId, data: response?.data };
    } catch (error) {
      if (!error.response) {
        await fakeDb.pendingSales.put({
          clientOperationId,
          payload,
          createdAt: Date.now(),
          tentatives: 0,
        });
        return { enAttente: true, clientOperationId };
      }
      throw error;
    }
  }

  await fakeDb.pendingSales.put({
    clientOperationId,
    payload,
    createdAt: Date.now(),
    tentatives: 0,
  });
  return { enAttente: true, clientOperationId };
}

async function syncQueue({ apiClient }) {
  const pending = await fakeDb.pendingSales.orderBy("createdAt").toArray();
  if (pending.length === 0) return { synchronisees: 0, doublons: 0, echecs: 0 };

  const ventes = pending.map((item) => item.payload);
  let rapport;
  try {
    const { data: response } = await apiClient.post("/sales/sync", { ventes });
    rapport = response?.data ?? { synchronisees: [], doublons: [], echecs: [] };
  } catch (error) {
    if (!error.response) {
      return { synchronisees: 0, doublons: 0, echecs: pending.length };
    }
    throw error;
  }

  const succes = new Set([
    ...(rapport.synchronisees ?? []).map((v) => v.clientOperationId),
    ...(rapport.doublons ?? []).map((v) => v.clientOperationId),
  ]);
  if (succes.size > 0) await fakeDb.pendingSales.bulkDelete([...succes]);

  const echecsIds = (rapport.echecs ?? []).map((v) => v.clientOperationId);
  for (const id of echecsIds) {
    await fakeDb.pendingSales.where("clientOperationId").equals(id).modify((item) => {
      item.tentatives = (item.tentatives ?? 0) + 1;
    });
  }

  return {
    synchronisees: (rapport.synchronisees ?? []).length,
    doublons: (rapport.doublons ?? []).length,
    echecs: echecsIds.length,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("submitSale — online", () => {
  it("appelle POST /sales et retourne la vente créée", async () => {
    fakeDb._clear();
    const fakeVente = { id: "v1", reference: "VNT-001" };
    const apiClient = {
      post: async () => ({ data: { data: fakeVente } }),
    };

    const result = await submitSale(
      { lignes: [{ produitId: "p1", quantite: 2 }] },
      { apiClient, isOnline: true },
    );

    assert.equal(result.enAttente, false);
    assert.deepEqual(result.data, fakeVente);
    assert.equal(typeof result.clientOperationId, "string");
    assert.equal(await fakeDb.pendingSales.count(), 0);
  });

  it("bascule en hors-ligne si le réseau coupe pendant le POST (pas de response)", async () => {
    fakeDb._clear();
    const networkError = new Error("Network Error");
    // Pas de propriété `.response` → coupure réseau
    const apiClient = { post: async () => { throw networkError; } };

    const result = await submitSale(
      { lignes: [] },
      { apiClient, isOnline: true },
    );

    assert.equal(result.enAttente, true);
    assert.equal(await fakeDb.pendingSales.count(), 1);
  });

  it("propage les erreurs serveur 4xx/5xx (avec `.response`)", async () => {
    fakeDb._clear();
    const serverError = Object.assign(new Error("400 Bad Request"), {
      response: { status: 400, data: { message: "Panier vide" } },
    });
    const apiClient = { post: async () => { throw serverError; } };

    await assert.rejects(
      () => submitSale({ lignes: [] }, { apiClient, isOnline: true }),
      (err) => err === serverError,
    );
    assert.equal(await fakeDb.pendingSales.count(), 0);
  });
});

describe("submitSale — offline", () => {
  it("enregistre la vente dans IndexedDB quand navigator.onLine est false", async () => {
    fakeDb._clear();
    const apiClient = { post: async () => { throw new Error("should not be called"); } };

    const payload = { lignes: [{ produitId: "p2", quantite: 1 }], clientOperationId: "op-999" };
    const result = await submitSale(payload, { apiClient, isOnline: false });

    assert.equal(result.enAttente, true);
    assert.equal(result.clientOperationId, "op-999");
    assert.equal(await fakeDb.pendingSales.count(), 1);
  });

  it("conserve le clientOperationId fourni (idempotence)", async () => {
    fakeDb._clear();
    const apiClient = { post: async () => ({}) };

    await submitSale({ clientOperationId: "fixed-id" }, { apiClient, isOnline: false });
    await submitSale({ clientOperationId: "fixed-id" }, { apiClient, isOnline: false });

    // La table utilise `put` donc l'entrée est écrasée, pas dupliquée
    assert.equal(await fakeDb.pendingSales.count(), 1);
  });
});

describe("syncQueue", () => {
  it("ne fait rien si la file est vide", async () => {
    fakeDb._clear();
    const apiClient = { post: async () => { throw new Error("should not be called"); } };
    const result = await syncQueue({ apiClient });
    assert.deepEqual(result, { synchronisees: 0, doublons: 0, echecs: 0 });
  });

  it("supprime les ventes réussies et les doublons de IndexedDB", async () => {
    fakeDb._clear();
    await fakeDb.pendingSales.put({ clientOperationId: "a", payload: {}, createdAt: 1, tentatives: 0 });
    await fakeDb.pendingSales.put({ clientOperationId: "b", payload: {}, createdAt: 2, tentatives: 0 });

    const rapport = {
      synchronisees: [{ clientOperationId: "a", reference: "VNT-A" }],
      doublons: [{ clientOperationId: "b" }],
      echecs: [],
    };
    const apiClient = {
      post: async () => ({ data: { data: rapport } }),
    };

    const result = await syncQueue({ apiClient });
    assert.equal(result.synchronisees, 1);
    assert.equal(result.doublons, 1);
    assert.equal(result.echecs, 0);
    assert.equal(await fakeDb.pendingSales.count(), 0);
  });

  it("incrémente tentatives et conserve les ventes en échec", async () => {
    fakeDb._clear();
    await fakeDb.pendingSales.put({ clientOperationId: "fail-1", payload: {}, createdAt: 1, tentatives: 0 });

    const rapport = {
      synchronisees: [],
      doublons: [],
      echecs: [{ clientOperationId: "fail-1", raison: "Stock insuffisant", code: "OUT_OF_STOCK" }],
    };
    const apiClient = {
      post: async () => ({ data: { data: rapport } }),
    };

    const result = await syncQueue({ apiClient });
    assert.equal(result.echecs, 1);
    assert.equal(await fakeDb.pendingSales.count(), 1);
    // La vente est toujours là mais tentatives = 1
    const item = fakeDb._store.get("fail-1");
    assert.equal(item.tentatives, 1);
  });

  it("retourne echecs=N en cas d'erreur réseau pendant /sales/sync", async () => {
    fakeDb._clear();
    await fakeDb.pendingSales.put({ clientOperationId: "net-err", payload: {}, createdAt: 1, tentatives: 0 });

    const networkError = new Error("Network Error"); // Pas de .response
    const apiClient = { post: async () => { throw networkError; } };

    const result = await syncQueue({ apiClient });
    assert.deepEqual(result, { synchronisees: 0, doublons: 0, echecs: 1 });
  });
});
