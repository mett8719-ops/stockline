import test from "node:test";
import assert from "node:assert/strict";
import {
  computeTotals,
  validateDocumentDraft,
} from "../src/apps/boutique/features/documents/createSchemas.js";

test("computeTotals matches the backend's inclusive VAT and discount rounding", () => {
  const result = computeTotals(
    [
      {
        designation: "Produit A",
        quantite: "2",
        prixUnitaire: "120",
        tauxTva: "10",
        remise: "20",
      },
      {
        designation: "Prestation",
        quantite: "1",
        prixUnitaire: "50",
        tauxTva: "20",
        remise: "0",
      },
    ],
    "10",
  );

  assert.deepEqual(result, {
    lignes: [
      {
        designation: "Produit A",
        quantite: "2",
        prixUnitaire: "120",
        tauxTva: "10",
        remise: "20",
        totalLigne: 220,
        montantTva: 20,
      },
      {
        designation: "Prestation",
        quantite: "1",
        prixUnitaire: "50",
        tauxTva: "20",
        remise: "0",
        totalLigne: 50,
        montantTva: 8.33,
      },
    ],
    sousTotal: 270,
    montantTva: 28.33,
    remiseGlobale: 10,
    montantTotal: 260,
  });
});

test("computeTotals keeps an incomplete line safe while the user is editing", () => {
  assert.equal(
    computeTotals(
      [{ designation: "", quantite: "1", prixUnitaire: "", remise: "0" }],
      "",
    ).montantTotal,
    0,
  );
});

test("validateDocumentDraft accepts an existing client and valid document lines", () => {
  assert.deepEqual(
    validateDocumentDraft({
      type: "facture",
      clientId: "customer-id",
      lignes: [
        {
          designation: "Produit A",
          quantite: "2",
          prixUnitaire: "120",
          tauxTva: "10",
          remise: "0",
        },
      ],
      remiseGlobale: "0",
      dateEmission: "2026-11-15",
      dateEcheance: "2026-12-15",
      notes: "",
    }),
    {},
  );
});

test("validateDocumentDraft reports missing client, lines, and invalid amounts", () => {
  const errors = validateDocumentDraft({
    type: "devis",
    clientId: "",
    clientNom: "",
    lignes: [
      {
        designation: "",
        quantite: "0",
        prixUnitaire: "-5",
        tauxTva: "120",
        remise: "-1",
      },
    ],
    remiseGlobale: "2",
    dateEmission: "2026-11-15",
    dateEcheance: "2026-11-14",
    notes: "",
  });

  assert.equal(errors.client, "Sélectionnez un client ou saisissez son nom.");
  assert.ok(errors["lignes.0.designation"]);
  assert.ok(errors["lignes.0.quantite"]);
  assert.ok(errors["lignes.0.prixUnitaire"]);
  assert.ok(errors["lignes.0.tauxTva"]);
  assert.ok(errors["lignes.0.remise"]);
  assert.ok(errors.remiseGlobale);
  assert.ok(errors.dateEcheance);
});
