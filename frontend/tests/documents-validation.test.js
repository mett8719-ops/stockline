import test from "node:test";
import assert from "node:assert/strict";
import {
  validateDocumentConversion,
  validateDocumentDetail,
  validateDocumentsResponse,
} from "../src/apps/boutique/features/documents/schemas.js";

const validResponse = {
  documents: [
    {
      _id: "document-id",
      numero: "FAC-2026-0001",
      type: "facture",
      clientNom: "Client Exemple",
      dateEmission: "2026-11-15T10:00:00.000Z",
      dateEcheance: "2026-12-15T10:00:00.000Z",
      montantTotal: 12500,
      montantRestant: 5000,
      statut: "en_attente",
    },
  ],
  indicateurs: {
    totalFacture: 12500,
    montantImpaye: 5000,
    devisEnCours: 2,
    tauxEncaissement: 60,
  },
};

const validMeta = { page: 1, limit: 10, total: 1, totalPages: 1 };

const validDetail = {
  _id: "document-id",
  numero: "DEV-2026-0001",
  type: "devis",
  clientNom: "Client Exemple",
  clientAdresse: "1 rue de Test",
  clientTelephone: "+237000000000",
  lignes: [
    {
      designation: "Produit A",
      quantite: 2,
      prixUnitaire: 120,
      tauxTva: 10,
      remise: 0,
      totalLigne: 240,
    },
  ],
  sousTotal: 240,
  montantTva: 21.82,
  remiseGlobale: 0,
  montantTotal: 240,
  montantPaye: 0,
  montantRestant: 240,
  statut: "en_attente",
  dateEmission: "2026-11-15T10:00:00.000Z",
  dateEcheance: "2026-12-15T10:00:00.000Z",
  notes: "Paiement à réception.",
};

const validInvoice = {
  ...validDetail,
  _id: "invoice-id",
  numero: "FAC-2026-0001",
  type: "facture",
  statut: "en_attente",
  documentSourceId: "document-id",
};

test("documents response validates documents, indicators, and pagination", () => {
  assert.deepEqual(
    validateDocumentsResponse(validResponse, validMeta),
    { ...validResponse, meta: validMeta },
  );
});

test("document detail validates lines, dates, and monetary totals", () => {
  assert.equal(validateDocumentDetail(validDetail), validDetail);

  const invalidDetail = structuredClone(validDetail);
  invalidDetail.lignes[0].totalLigne = "240";
  assert.throws(
    () => validateDocumentDetail(invalidDetail),
    /montant invalide/,
  );
});

test("document conversion validates the linked accepted quote and new invoice", () => {
  const result = {
    facture: validInvoice,
    devis: { id: "document-id", statut: "accepte" },
  };
  assert.equal(validateDocumentConversion(result), result);

  assert.throws(
    () =>
      validateDocumentConversion({
        ...result,
        facture: { ...validInvoice, type: "devis" },
      }),
    /n’a pas généré une facture/,
  );
});

test("documents response rejects an invalid amount", () => {
  const response = structuredClone(validResponse);
  response.documents[0].montantTotal = "12500";

  assert.throws(
    () => validateDocumentsResponse(response, validMeta),
    /montant invalide/,
  );
});

test("documents response rejects invalid dates and pagination metadata", () => {
  const response = structuredClone(validResponse);
  response.documents[0].dateEmission = "not-a-date";
  assert.throws(
    () => validateDocumentsResponse(response, validMeta),
    /date invalide/,
  );

  assert.throws(
    () => validateDocumentsResponse(validResponse, { ...validMeta, page: 0 }),
    /pagination/,
  );
});

test("documents response accepts documents without an invoice due date", () => {
  const response = structuredClone(validResponse);
  delete response.documents[0].dateEcheance;

  assert.doesNotThrow(() => validateDocumentsResponse(response, validMeta));
});
