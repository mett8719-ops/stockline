/** Routes du module Inventaire. */
const express = require("express");
const { z } = require("zod");
const validate = require("../../../../../core/validate");
const { registerRoute, registerSchema } = require("../../../../../core/openapi");
const { requirePermission } = require("../../../../../core/authorize");
const { trackUsage } = require("../../../../../core/usage-tracker");
const {
  idParam, paginationQuery, objectId, quantity, safeText,
} = require("../../../../../core/common-schemas");
const { PERMISSIONS } = require("../../../../../core/constants");
const c = require("../controllers/inventory.controllers");

const router = express.Router();
router.use(requirePermission(PERMISSIONS.INVENTORY), trackUsage("inventory"));

const recordCountSchema = z
  .object({
    produitId: objectId,
    quantiteComptee: quantity.min(0, "La quantite comptee ne peut pas etre negative"),
    commentaire: safeText(200).optional(),
  })
  .openapi("RecordInventoryCount");

const inventoryResponse = registerSchema(
  "Inventory",
  z.object({
    id: objectId,
    reference: z.string(),
    statut: z.string(),
    nombreArticles: z.number(),
    articlesComptes: z.number(),
    nombreEcarts: z.number(),
  })
);

router.get("/", validate({ query: paginationQuery }), c.list);
registerRoute({
  method: "get", path: "/inventories", tags: ["Inventaire"], permissions: ["inventory"],
  summary: "Historique des inventaires et indicateurs",
  description:
    "Renvoie l'historique, la session en cours s'il y en a une, et les " +
    "indicateurs : date du dernier inventaire, ecarts detectes, deficit " +
    "total et valeur du stock.",
  request: { query: paginationQuery },
  responses: { 200: inventoryResponse },
});

router.post("/", c.start);
registerRoute({
  method: "post", path: "/inventories", tags: ["Inventaire"], permissions: ["inventory"],
  summary: "Demarrer une session d'inventaire",
  description:
    "Fige le stock theorique de tous les produits actifs a l'instant T.\n\n" +
    "Une seule session peut etre ouverte a la fois par boutique : sinon deux " +
    "magasiniers pourraient compter le meme stock avec des resultats " +
    "contradictoires.",
  responses: { 201: inventoryResponse },
});

router.get("/:id", validate({ params: idParam }), c.getOne);
registerRoute({
  method: "get", path: "/inventories/{id}", tags: ["Inventaire"], permissions: ["inventory"],
  summary: "Consulter une session et ses lignes de comptage",
  request: { params: idParam },
  responses: { 200: inventoryResponse },
});

router.patch("/:id/count", validate({ params: idParam, body: recordCountSchema }), c.recordCount);
registerRoute({
  method: "patch", path: "/inventories/{id}/count", tags: ["Inventaire"], permissions: ["inventory"],
  summary: "Saisir la quantite comptee d'un article",
  description:
    "L'ecart, le statut (conforme / deficit / excedent) et la progression " +
    "globale sont recalcules automatiquement a chaque saisie.",
  request: { params: idParam, body: recordCountSchema },
  responses: { 200: inventoryResponse },
});

router.post("/:id/close", validate({ params: idParam }), c.close);
registerRoute({
  method: "post", path: "/inventories/{id}/close", tags: ["Inventaire"], permissions: ["inventory"],
  summary: "Cloturer l'inventaire (IRREVERSIBLE)",
  description:
    "**Operation transactionnelle et irreversible.**\n\n" +
    "Aligne le stock systeme sur le comptage physique en generant un " +
    "mouvement d'ajustement trace pour chaque ecart.\n\n" +
    "Les articles non comptes restent inchanges : on ne suppose pas qu'un " +
    "article non compte a un stock nul.",
  request: { params: idParam },
  responses: { 200: inventoryResponse },
});

module.exports = router;
