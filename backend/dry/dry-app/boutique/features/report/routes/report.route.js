/** Routes du module Rapports & Tableau de bord. */
const express = require("express");
const { z } = require("zod");
const validate = require("../../../../../core/validate");
const { registerRoute, registerSchema } = require("../../../../../core/openapi");
const { requirePermission } = require("../../../../../core/authorize");
const { trackUsage } = require("../../../../../core/usage-tracker");
const { dateRangeQuery } = require("../../../../../core/common-schemas");
const { PERMISSIONS } = require("../../../../../core/constants");
const c = require("../controllers/report.controllers");

const router = express.Router();
router.use(requirePermission(PERMISSIONS.DASHBOARD), trackUsage("dashboard"));

const reportResponse = registerSchema(
  "Report",
  z.object({
    kpis: z.any().optional(),
    totaux: z.any().optional(),
    periode: z.any().optional(),
  })
);

router.get("/dashboard", c.dashboard);
registerRoute({
  method: "get", path: "/reports/dashboard", tags: ["Rapports"], permissions: ["dashboard"],
  summary: "Tableau de bord de la boutique",
  description:
    "KPIs du jour avec evolution en pourcentage par rapport a la veille, " +
    "courbe ventes/benefice des 7 derniers jours, alertes de stock bas et " +
    "dernieres ventes du jour.",
  responses: { 200: reportResponse },
});

router.get("/sales", validate({ query: dateRangeQuery }), c.salesReport);
registerRoute({
  method: "get", path: "/reports/sales", tags: ["Rapports"], permissions: ["dashboard"],
  summary: "Rapport de ventes avec comparatif de periode",
  description:
    "Totaux, panier moyen, marge moyenne, et comparaison avec la periode " +
    "**precedente de meme duree**.\n\n" +
    "Inclut le classement des 15 produits les plus vendus, la ventilation " +
    "par caissier et par mode de paiement.",
  request: { query: dateRangeQuery },
  responses: { 200: reportResponse },
});

router.get("/stock", c.stockReport);
registerRoute({
  method: "get", path: "/reports/stock", tags: ["Rapports"], permissions: ["dashboard"],
  summary: "Valorisation du stock, alertes et produits dormants",
  description:
    "Les **produits dormants** sont ceux qui ont du stock mais n'ont " +
    "enregistre aucune vente sur les 30 derniers jours : c'est de la " +
    "tresorerie immobilisee.",
  responses: { 200: reportResponse },
});

module.exports = router;
