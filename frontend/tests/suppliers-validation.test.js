import test from "node:test";
import assert from "node:assert/strict";
import {
  validateSupplierDetailResponse,
  validateSupplierListResponse,
} from "../src/apps/boutique/features/suppliers/schemas.js";

const validSupplier = {
  _id: "supplier-id",
  nom: "Fournisseur Exemple",
  contactNom: "Contact Exemple",
  telephone: "+225 0102030405",
  email: "contact@example.com",
  adresse: "Abidjan",
  soldeDu: 15000,
  totalAchats: 50000,
  createdAt: "2026-01-15T10:00:00.000Z",
  derniereCommande: "2026-01-20T10:00:00.000Z",
  produitsHabituels: ["Riz"],
  notes: "Livraison le matin",
  historiqueCommandes: [
    {
      _id: "purchase-id",
      montantTotal: 50000,
      montantPaye: 35000,
      montantRestant: 15000,
      dateCommande: "2026-01-20T10:00:00.000Z",
      dateLivraison: "2026-01-21T10:00:00.000Z",
      lignes: [{ quantite: 10, prixAchat: 5000, totalLigne: 50000 }],
    },
  ],
  historiquePaiements: [
    {
      _id: "payment-id",
      montant: 35000,
      date: "2026-01-20T12:00:00.000Z",
      libelle: "Acompte",
    },
  ],
};

const validMeta = { page: 1, limit: 10, total: 1, totalPages: 1 };

test("supplier list response validates debt summary, suppliers, and pagination", () => {
  const data = {
    fournisseurs: [validSupplier],
    dettes: { total: 15000, nombre: 1 },
  };

  assert.deepEqual(
    validateSupplierListResponse(data, validMeta),
    { ...data, meta: validMeta },
  );
});

test("supplier list response accepts an empty directory", () => {
  const data = { fournisseurs: [], dettes: { total: 0, nombre: 0 } };
  const meta = { page: 1, limit: 10, total: 0, totalPages: 1 };

  assert.deepEqual(validateSupplierListResponse(data, meta), { ...data, meta });
});

test("supplier detail response validates order and payment histories", () => {
  assert.equal(validateSupplierDetailResponse(validSupplier), validSupplier);

  const invalidDetail = structuredClone(validSupplier);
  invalidDetail.historiqueCommandes[0].lignes[0].quantite = "10";

  assert.throws(
    () => validateSupplierDetailResponse(invalidDetail),
    /montant invalide/,
  );
});

test("supplier list response rejects malformed supplier debt", () => {
  const data = {
    fournisseurs: [{ ...validSupplier, soldeDu: "15000" }],
    dettes: { total: 15000, nombre: 1 },
  };

  assert.throws(
    () => validateSupplierListResponse(data, validMeta),
    /fournisseur invalide/,
  );
});
