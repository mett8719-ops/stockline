/** Routes du module Fournisseurs. */
const express = require("express");
const validate = require("../../../../../core/validate");
const { registerRoute } = require("../../../../../core/openapi");
const { requirePermission } = require("../../../../../core/authorize");
const { trackUsage } = require("../../../../../core/usage-tracker");
const { idParam, paginationQuery } = require("../../../../../core/common-schemas");
const { PERMISSIONS } = require("../../../../../core/constants");
const S = require("../../customer/model/customer.schema");
const c = require("../controllers/supplier.controllers");

const router = express.Router();
router.use(requirePermission(PERMISSIONS.SUPPLIERS), trackUsage("suppliers"));

router.get("/", validate({ query: paginationQuery }), c.list);
registerRoute({
  method: "get", path: "/suppliers", tags: ["Fournisseurs"], permissions: ["suppliers"],
  summary: "Lister les fournisseurs et le total des dettes",
  request: { query: paginationQuery },
  responses: { 200: S.supplierResponse },
});

router.get("/:id", validate({ params: idParam }), c.getOne);
registerRoute({
  method: "get", path: "/suppliers/{id}", tags: ["Fournisseurs"], permissions: ["suppliers"],
  summary: "Fiche fournisseur avec historique des commandes et paiements",
  request: { params: idParam },
  responses: { 200: S.supplierResponse },
});

router.post("/", validate({ body: S.createSupplierSchema }), c.create);
registerRoute({
  method: "post", path: "/suppliers", tags: ["Fournisseurs"], permissions: ["suppliers"],
  summary: "Creer un fournisseur",
  request: { body: S.createSupplierSchema },
  responses: { 201: S.supplierResponse },
});

router.patch("/:id", validate({ params: idParam, body: S.updateSupplierSchema }), c.update);
registerRoute({
  method: "patch", path: "/suppliers/{id}", tags: ["Fournisseurs"], permissions: ["suppliers"],
  summary: "Modifier un fournisseur",
  request: { params: idParam, body: S.updateSupplierSchema },
  responses: { 200: S.supplierResponse },
});

router.post(
  "/:id/purchases",
  validate({ params: idParam, body: S.createPurchaseSchema }),
  c.createPurchase
);
registerRoute({
  method: "post", path: "/suppliers/{id}/purchases", tags: ["Fournisseurs"], permissions: ["suppliers"],
  summary: "Enregistrer une reception de marchandise",
  description:
    "**Operation transactionnelle.** Genere une entree de stock pour chaque " +
    "ligne, augmente la dette de la part non reglee et enregistre la depense " +
    "en tresorerie pour la part payee comptant.",
  request: { params: idParam, body: S.createPurchaseSchema },
  responses: { 201: S.supplierResponse },
});

router.post(
  "/:id/payments",
  validate({ params: idParam, body: S.recordPaymentSchema }),
  c.recordPayment
);
registerRoute({
  method: "post", path: "/suppliers/{id}/payments", tags: ["Fournisseurs"], permissions: ["suppliers"],
  summary: "Enregistrer un paiement fournisseur (echelonne)",
  description:
    "Reduit la dette et cree la depense correspondante en tresorerie. " +
    "Un paiement superieur a la dette est refuse.",
  request: { params: idParam, body: S.recordPaymentSchema },
  responses: { 201: S.supplierResponse },
});

module.exports = router;
