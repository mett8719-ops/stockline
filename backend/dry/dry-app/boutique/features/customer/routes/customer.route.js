/** Routes du module Clients. */
const express = require("express");
const validate = require("../../../../../core/validate");
const { registerRoute } = require("../../../../../core/openapi");
const { requirePermission } = require("../../../../../core/authorize");
const { trackUsage } = require("../../../../../core/usage-tracker");
const { idParam } = require("../../../../../core/common-schemas");
const { PERMISSIONS } = require("../../../../../core/constants");
const S = require("../model/customer.schema");
const c = require("../controllers/customer.controllers");

const router = express.Router();
router.use(requirePermission(PERMISSIONS.CUSTOMERS), trackUsage("customers"));

router.get("/", validate({ query: S.listCustomersQuerySchema }), c.list);
registerRoute({
  method: "get", path: "/customers", tags: ["Clients"], permissions: ["customers"],
  summary: "Lister les clients",
  description:
    "Filtre `impayes=true` pour n'afficher que les clients ayant une creance.\n\n" +
    "Renvoie egalement le total des creances de la boutique, calcule sur " +
    "l'ensemble du fichier client.",
  request: { query: S.listCustomersQuerySchema },
  responses: { 200: S.customerResponse },
});

router.get("/:id", validate({ params: idParam }), c.getOne);
registerRoute({
  method: "get", path: "/customers/{id}", tags: ["Clients"], permissions: ["customers"],
  summary: "Fiche client avec historiques",
  description:
    "Inclut les 20 derniers achats, les 20 derniers versements et la liste " +
    "des factures impayees.",
  request: { params: idParam },
  responses: { 200: S.customerResponse },
});

router.post("/", validate({ body: S.createCustomerSchema }), c.create);
registerRoute({
  method: "post", path: "/customers", tags: ["Clients"], permissions: ["customers"],
  summary: "Creer un client",
  description:
    "Un doublon de numero de telephone est refuse : deux fiches pour la meme " +
    "personne fausseraient le suivi de sa creance.",
  request: { body: S.createCustomerSchema },
  responses: { 201: S.customerResponse },
});

router.patch("/:id", validate({ params: idParam, body: S.updateCustomerSchema }), c.update);
registerRoute({
  method: "patch", path: "/customers/{id}", tags: ["Clients"], permissions: ["customers"],
  summary: "Modifier un client",
  request: { params: idParam, body: S.updateCustomerSchema },
  responses: { 200: S.customerResponse },
});

router.post(
  "/:id/payments",
  validate({ params: idParam, body: S.recordPaymentSchema }),
  c.recordPayment
);
registerRoute({
  method: "post", path: "/customers/{id}/payments", tags: ["Clients"], permissions: ["customers"],
  summary: "Enregistrer un versement client",
  description:
    "Reduit la creance, alimente l'historique des paiements et cree la " +
    "recette correspondante en tresorerie.\n\n" +
    "Si `documentId` est fourni, la facture correspondante est soldee " +
    "automatiquement lorsque le montant restant atteint zero.\n\n" +
    "Un versement superieur a la creance est refuse.",
  request: { params: idParam, body: S.recordPaymentSchema },
  responses: { 201: S.customerResponse },
});

module.exports = router;
