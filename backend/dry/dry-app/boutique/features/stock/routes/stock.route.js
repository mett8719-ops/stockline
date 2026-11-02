/** Routes du module Stock & Mouvements. */
const express = require("express");
const validate = require("../../../../../core/validate");
const { registerRoute } = require("../../../../../core/openapi");
const { requirePermission } = require("../../../../../core/authorize");
const { trackUsage } = require("../../../../../core/usage-tracker");
const { PERMISSIONS } = require("../../../../../core/constants");
const S = require("../model/stock.schema");
const c = require("../controllers/stock.controllers");

const router = express.Router();
router.use(requirePermission(PERMISSIONS.STOCK), trackUsage("stock"));

// ══ POST /stock/movements ═════════════════════════════════════════════
router.post("/movements", validate({ body: S.createMovementSchema }), c.createMovement);
registerRoute({
  method: "post", path: "/stock/movements", tags: ["Stock"], permissions: ["stock"],
  summary: "Enregistrer un mouvement de stock",
  description:
    "Types : `entree`, `sortie`, `ajustement`.\n\n" +
    "Pour un **ajustement**, fournir `quantiteCible` (le stock final souhaite, " +
    "pas la variation).\n\n" +
    "Une **sortie** superieure au stock disponible est refusee avec le code " +
    "`INSUFFICIENT_STOCK`.\n\n" +
    "L'alerte de seuil se declenche uniquement au **franchissement**, pas a " +
    "chaque mouvement d'un produit deja sous le seuil.",
  request: { body: S.createMovementSchema },
  responses: { 201: S.movementResponse },
});

// ══ GET /stock/movements ══════════════════════════════════════════════
router.get("/movements", validate({ query: S.listMovementsQuerySchema }), c.listMovements);
registerRoute({
  method: "get", path: "/stock/movements", tags: ["Stock"], permissions: ["stock"],
  summary: "Journal des mouvements de stock",
  description:
    "Filtrable par produit, par type et par plage de dates. Chaque mouvement " +
    "porte son stock avant et apres, permettant de rejouer l'historique.",
  request: { query: S.listMovementsQuerySchema },
  responses: { 200: S.movementResponse },
});

// ══ GET /stock/alerts ═════════════════════════════════════════════════
router.get("/alerts", c.alerts);
registerRoute({
  method: "get", path: "/stock/alerts", tags: ["Stock"], permissions: ["stock"],
  summary: "Produits sous le seuil d'alerte et proches de la peremption",
  description:
    "Alimente le bandeau d'alerte du module Stock et la carte du tableau de bord.",
  responses: { 200: S.movementResponse },
});

module.exports = router;
