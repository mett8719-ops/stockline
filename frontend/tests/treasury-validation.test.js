import assert from "node:assert/strict";
import test from "node:test";
import { validateTreasuryTransaction } from "../src/apps/boutique/features/treasury/schemas.js";
import { validateCashSessionAmount } from "../src/apps/boutique/features/treasury/schemas.js";
import { buildTreasuryCsv } from "../src/apps/boutique/features/treasury/utils/exportCsv.js";

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

test("cash session fund accepts zero for opening and requires a closing count", () => {
  assert.equal(validateCashSessionAmount(""), "");
  assert.equal(validateCashSessionAmount("0"), "");
  assert.equal(validateCashSessionAmount("", { required: true }), "Saisissez un montant.");
  assert.equal(validateCashSessionAmount("-1"), "Saisissez un montant positif ou nul.");
});

test("treasury CSV includes totals, preserves accents, and neutralizes formulas", () => {
  const csv = buildTreasuryCsv({
    lignes: [
      {
        date: "2026-11-15",
        libelle: '=IMPORTXML("https://example.invalid","//a")',
        categorie: "Loyer",
        modePaiement: "especes",
        debit: 15000,
        credit: 0,
        auteur: "Équipe",
      },
    ],
    totaux: { debit: 15000, credit: 0 },
  });

  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"Date";"Libellé";"Catégorie";"Mode de paiement"/);
  assert.match(csv, /"'=IMPORTXML/);
  assert.match(csv, /"Équipe"/);
  assert.match(csv, /"Totaux";"15000";"0"/);
});
