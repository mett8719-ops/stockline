const express = require("express");
const validate = require("../../../../../core/validate");
const { registerRoute } = require("../../../../../core/openapi");
const { requirePermission } = require("../../../../../core/authorize");
const { trackUsage } = require("../../../../../core/usage-tracker");
const { PERMISSIONS } = require("../../../../../core/constants");
const { updateShopSettingsSchema, shopSettingsResponse } = require("../model/shop-settings.schema");
const c = require("../controllers/shop-settings.controllers");

const router = express.Router();
router.use(requirePermission(PERMISSIONS.SETTINGS), trackUsage("settings"));

// GET /settings (ou /shop)
router.get("/", c.getSettings);
registerRoute({
  method: "get",
  path: "/settings",
  tags: ["Paramètres Boutique"],
  permissions: ["settings"],
  summary: "Lire les paramètres de la boutique connectée",
  description: "Renvoie les informations de la boutique (nom, adresse, téléphone, RCCM, devise, délais de paiement client et fournisseur).",
  responses: { 200: shopSettingsResponse },
});

// PUT /settings (ou /shop)
router.put("/", validate({ body: updateShopSettingsSchema }), c.updateSettings);
// PATCH /settings (ou /shop)
router.patch("/", validate({ body: updateShopSettingsSchema }), c.updateSettings);
registerRoute({
  method: "patch",
  path: "/settings",
  tags: ["Paramètres Boutique"],
  permissions: ["settings"],
  summary: "Mettre à jour les paramètres de la boutique",
  description: "Permet à l'administrateur de modifier les informations de la boutique, la devise (XAF) et les délais de paiement.",
  request: { body: updateShopSettingsSchema },
  responses: { 200: shopSettingsResponse },
});

module.exports = router;
