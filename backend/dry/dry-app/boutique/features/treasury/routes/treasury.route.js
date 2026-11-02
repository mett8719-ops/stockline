/** Routes du module Tresorerie. */
const express = require("express");
const validate = require("../../../../../core/validate");
const { registerRoute } = require("../../../../../core/openapi");
const { requirePermission } = require("../../../../../core/authorize");
const { trackUsage } = require("../../../../../core/usage-tracker");
const { paginationQuery, dateRangeQuery } = require("../../../../../core/common-schemas");
const { PERMISSIONS } = require("../../../../../core/constants");
const S = require("../model/treasury.schema");
const c = require("../controllers/treasury.controllers");

const router = express.Router();
router.use(requirePermission(PERMISSIONS.TREASURY), trackUsage("treasury"));

router.get("/", validate({ query: paginationQuery.merge(dateRangeQuery) }), c.overview);
registerRoute({
  method: "get", path: "/treasury", tags: ["Tresorerie"], permissions: ["treasury"],
  summary: "Solde de caisse, totaux de periode et journal groupe par jour",
  description:
    "Le `soldeCaisse` est calcule depuis le debut de l'activite ; les totaux " +
    "de `periode` portent sur la plage filtree.\n\n" +
    "Le journal est regroupe par journee avec un sous-total de recettes et de " +
    "depenses pour chaque jour.",
  request: { query: paginationQuery.merge(dateRangeQuery) },
  responses: { 200: S.treasuryResponse },
});

router.post("/transactions", validate({ body: S.createTransactionSchema }), c.createTransaction);
registerRoute({
  method: "post", path: "/treasury/transactions", tags: ["Tresorerie"], permissions: ["treasury"],
  summary: "Enregistrer une recette ou une depense",
  description:
    "Saisie manuelle. Les recettes de vente et les depenses d'achat sont " +
    "creees automatiquement par leurs modules respectifs.",
  request: { body: S.createTransactionSchema },
  responses: { 201: S.treasuryResponse },
});

router.post("/sessions/open", validate({ body: S.openSessionSchema }), c.openSession);
registerRoute({
  method: "post", path: "/treasury/sessions/open", tags: ["Tresorerie"], permissions: ["treasury"],
  summary: "Ouvrir une session de caisse",
  description: "Une seule session peut etre ouverte a la fois par boutique.",
  request: { body: S.openSessionSchema },
  responses: { 201: S.treasuryResponse },
});

router.post("/sessions/close", validate({ body: S.closeSessionSchema }), c.closeSession);
registerRoute({
  method: "post", path: "/treasury/sessions/close", tags: ["Tresorerie"], permissions: ["treasury"],
  summary: "Cloturer la caisse (Z de caisse)",
  description:
    "Compare le **fonds theorique** (fonds d'ouverture + especes encaissees " +
    "- depenses) au **comptage physique** saisi par le caissier.\n\n" +
    "Seules les especes entrent dans le calcul : un paiement Mobile Money " +
    "n'est pas dans le tiroir.\n\n" +
    "Tout ecart non nul est enregistre dans le journal d'audit.",
  request: { body: S.closeSessionSchema },
  responses: { 200: S.treasuryResponse },
});

router.get("/export", validate({ query: dateRangeQuery }), c.exportAccounting);
registerRoute({
  method: "get", path: "/treasury/export", tags: ["Tresorerie"], permissions: ["treasury"],
  summary: "Export comptable (format debit / credit)",
  request: { query: dateRangeQuery },
  responses: { 200: S.treasuryResponse },
});

module.exports = router;
