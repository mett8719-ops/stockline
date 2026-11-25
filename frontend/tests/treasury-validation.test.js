import assert from "node:assert/strict";
import test from "node:test";
import { validateTreasuryTransaction } from "../src/apps/boutique/features/treasury/schemas.js";

test("valid treasury income transaction has no validation errors", () => {
  assert.deepEqual(
    validateTreasuryTransaction({
      type: "recette",
      libelle: "Ventes du jour",
      montant: "150000",
      modePaiement: "especes",
    }),
    {},
  );
});

test("valid expense transaction accepts a category and mobile payment", () => {
  assert.deepEqual(
    validateTreasuryTransaction({
      type: "depense",
      libelle: "Loyer boutique",
      montant: "45000",
      modePaiement: "mobile_money",
      categorie: "loyer",
    }),
    {},
  );
});

test("invalid treasury transaction reports actionable field errors", () => {
  assert.deepEqual(
    validateTreasuryTransaction({
      type: "transfert",
      libelle: " ",
      montant: "0",
      modePaiement: "bitcoin",
      categorie: "x".repeat(61),
    }),
    {
      type: "Sélectionnez le type d’opération.",
      libelle: "Le libellé est obligatoire.",
      montant: "Saisissez un montant supérieur à zéro.",
      modePaiement: "Sélectionnez un mode de paiement valide.",
      categorie: "La catégorie ne peut pas dépasser 60 caractères.",
    },
  );
});
