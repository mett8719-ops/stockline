import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSalesReportCsv,
  buildStockReportCsv,
} from "../src/apps/boutique/features/reports/exportCsv.js";

test("sales CSV exports report totals and product breakdown safely", () => {
  const csv = buildSalesReportCsv({
    periode: { debut: "2026-11-01T00:00:00.000Z", fin: "2026-11-15T23:59:59.999Z" },
    totaux: {
      chiffreAffaires: 125000,
      benefice: 35000,
      nombreVentes: 12,
      panierMoyen: 10416.67,
      margeMoyenne: 28,
    },
    comparatif: {
      chiffreAffairesPrecedent: 100000,
      evolutionChiffreAffaires: 25,
      evolutionBenefice: 15,
    },
    topProduits: [
      {
        nom: '=IMPORTXML("https://example.invalid","//a")',
        quantiteVendue: 5,
        chiffreAffaires: 50000,
        benefice: 12000,
      },
    ],
    parCaissier: [{ nom: "Équipe", total: 125000, nombre: 12 }],
    parModePaiement: [{ _id: "especes", total: 75000, nombre: 8 }],
  });

  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"Rapport des ventes"/);
  assert.match(csv, /"Chiffre d’affaires";"125000"/);
  assert.match(csv, /"'=IMPORTXML/);
  assert.match(csv, /"Équipe";"125000";"12"/);
});

test("stock CSV exports valuation, categories, alerts and dormant products", () => {
  const csv = buildStockReportCsv({
    valorisation: {
      valeurAchat: 85000,
      valeurVente: 120000,
      margePotentielle: 35000,
      references: 8,
      unitesTotales: 76,
    },
    parCategorie: [{ _id: "Céréales", valeur: 45000, references: 3 }],
    alertes: {
      stockBas: [
        {
          nom: "Riz local",
          stockActuel: 2,
          seuilAlerte: 5,
          unite: "sac",
          categorieNom: "Céréales",
        },
      ],
      peremption: [
        {
          nom: "Lait",
          datePeremption: "2026-12-01T00:00:00.000Z",
          stockActuel: 4,
          unite: "boîte",
        },
      ],
    },
    produitsDormants: [
      { nom: "Huile", stockActuel: 10, prixAchat: 1500, unite: "bidon" },
    ],
  });

  assert.match(csv, /"Valeur d’achat";"85000"/);
  assert.match(csv, /"Stock par catégorie"/);
  assert.match(csv, /"Riz local";"2";"5"/);
  assert.match(csv, /"Huile";"10";"1500"/);
});

test("report CSV builders reject incomplete report payloads", () => {
  assert.throws(() => buildSalesReportCsv({}), /rapport de ventes sont invalides/);
  assert.throws(() => buildStockReportCsv({}), /rapport de stock sont invalides/);
});
