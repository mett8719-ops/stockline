import assert from "node:assert/strict";
import test from "node:test";
import {
  validateSaleDetail,
  validateSalesListResponse,
} from "../src/apps/boutique/features/pos/schemas.js";

const validSale = {
  _id: "sale-1",
  reference: "#0001",
  clientNom: "Client Test",
  statut: "payee",
  montantTotal: 15000,
  montantPaye: 15000,
  montantRemis: 0,
  beneficeTotal: 5000,
  date: "2026-11-15T10:30:00.000Z",
  lignes: [
    {
      produitNom: "Riz local 25kg",
      quantite: 2,
      prixUnitaire: 7500,
      totalLigne: 15000,
    },
  ],
};

test("sales history validates paginated sale list and totals", () => {
  const result = validateSalesListResponse(
    {
      ventes: [validSale],
      totaux: { chiffreAffaires: 15000, benefice: 5000, nombreVentes: 1 },
    },
    { page: 1, limit: 10, total: 1, totalPages: 1 },
  );

  assert.equal(result.ventes[0].reference, "#0001");
  assert.equal(result.meta.total, 1);
  assert.equal(result.totals.benefice, 5000);
});

test("sale detail validates pricing and lines before cancellation", () => {
  assert.equal(validateSaleDetail(validSale).statut, "payee");

  const invalidSale = structuredClone(validSale);
  invalidSale.lignes[0].totalLigne = "15000";
  assert.throws(() => validateSaleDetail(invalidSale), /montant invalide/);
});
