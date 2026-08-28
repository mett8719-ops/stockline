/**
 * Routes du module Vente / Caisse (POS).
 *
 * Note l'ordre : `/sync` est declaree AVANT `/:id`, sinon Express
 * interpreterait "sync" comme un identifiant de vente.
 */
const express = require("express");
const validate = require("../../../../../core/validate");
const { registerRoute } = require("../../../../../core/openapi");
const { requirePermission, authorizeRoles } = require("../../../../../core/authorize");
const { trackUsage } = require("../../../../../core/usage-tracker");
const { idParam } = require("../../../../../core/common-schemas");
const { PERMISSIONS, SHOP_ROLES } = require("../../../../../core/constants");
const S = require("../model/sale.schema");

const create = require("../controllers/sale-create.controller");
const list = require("../controllers/sale-list.controller");
const getOne = require("../controllers/sale-get-one.controller");
const cancel = require("../controllers/sale-cancel.controller");
const syncOffline = require("../controllers/sale-sync-offline.controller");

const router = express.Router();

router.use(requirePermission(PERMISSIONS.POS), trackUsage("pos"));

// ══ POST /sales ═══════════════════════════════════════════════════════
router.post("/", validate({ body: S.createSaleSchema }), create);
registerRoute({
  method: "post", path: "/sales", tags: ["Ventes"], permissions: ["pos"],
  summary: "Enregistrer une vente en caisse",
  description:
    "**Operation transactionnelle.** Calcule les montants cote serveur, " +
    "decremente le stock, met a jour la creance client et enregistre la " +
    "recette en tresorerie — le tout de maniere atomique.\n\n" +
    "Les montants envoyes par le client ne sont jamais acceptes tels quels : " +
    "tout est recalcule depuis le catalogue.\n\n" +
    "Fournir `clientOperationId` pour garantir l'idempotence en mode " +
    "hors-ligne : une vente synchronisee deux fois n'est enregistree qu'une fois.",
  request: { body: S.createSaleSchema },
  responses: { 201: S.saleResponse },
});

// ══ POST /sales/sync (AVANT /:id) ═════════════════════════════════════
router.post("/sync", validate({ body: S.syncSalesSchema }), syncOffline);
registerRoute({
  method: "post", path: "/sales/sync", tags: ["Ventes"], permissions: ["pos"],
  summary: "Synchroniser un lot de ventes hors ligne",
  description:
    "Chaque vente est traitee independamment : un echec sur l'une n'empeche " +
    "pas l'enregistrement des autres.\n\n" +
    "Renvoie le detail des ventes synchronisees, des doublons ignores et des " +
    "echecs avec leur motif. Maximum 200 ventes par lot.",
  request: { body: S.syncSalesSchema },
  responses: { 200: S.saleResponse },
});

// ══ GET /sales ════════════════════════════════════════════════════════
router.get("/", validate({ query: S.listSalesQuerySchema }), list);
registerRoute({
  method: "get", path: "/sales", tags: ["Ventes"], permissions: ["pos"],
  summary: "Historique des ventes",
  description:
    "Filtrable par date, client, caissier et statut. Les ventes annulees " +
    "sont masquees par defaut.\n\n" +
    "Renvoie egalement les totaux (chiffre d'affaires, benefice, nombre de " +
    "ventes) calcules sur **toute la selection**, pas seulement sur la page.",
  request: { query: S.listSalesQuerySchema },
  responses: { 200: S.saleResponse },
});

// ══ GET /sales/:id ════════════════════════════════════════════════════
router.get("/:id", validate({ params: idParam }), getOne);
registerRoute({
  method: "get", path: "/sales/{id}", tags: ["Ventes"], permissions: ["pos"],
  summary: "Detail d'une vente et donnees du recu",
  description: "Utilise pour reimprimer un ticket depuis l'historique.",
  request: { params: idParam },
  responses: { 200: S.saleResponse },
});

// ══ POST /sales/:id/cancel ════════════════════════════════════════════
router.post(
  "/:id/cancel",
  authorizeRoles(SHOP_ROLES.ADMIN),   // administrateur uniquement
  validate({ params: idParam, body: S.cancelSaleSchema }),
  cancel
);
registerRoute({
  method: "post", path: "/sales/{id}/cancel", tags: ["Ventes"], permissions: ["pos"],
  summary: "Annuler une vente (administrateur uniquement)",
  description:
    "**Operation transactionnelle et auditee en severite haute.**\n\n" +
    "Restitue le stock, annule la creance client et cree une contre-ecriture " +
    "en tresorerie.\n\n" +
    "La vente n'est jamais supprimee : elle est conservee dans l'historique " +
    "avec le statut `annulee`, son motif et son auteur.",
  request: { params: idParam, body: S.cancelSaleSchema },
  responses: { 200: S.saleResponse },
});

module.exports = router;
