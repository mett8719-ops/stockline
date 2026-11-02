/** Routes du module Documents commerciaux. */
const express = require("express");
const { z } = require("zod");
const validate = require("../../../../../core/validate");
const { registerRoute, registerSchema } = require("../../../../../core/openapi");
const { requirePermission } = require("../../../../../core/authorize");
const { trackUsage } = require("../../../../../core/usage-tracker");
const {
  idParam, paginationQuery, dateRangeQuery, objectId,
  money, positiveQuantity, safeText,
} = require("../../../../../core/common-schemas");
const {
  PERMISSIONS, DOCUMENT_TYPES, DOCUMENT_STATUS,
} = require("../../../../../core/constants");
const c = require("../controllers/document.controllers");

const router = express.Router();
router.use(requirePermission(PERMISSIONS.DOCUMENTS), trackUsage("documents"));

const createDocumentSchema = z
  .object({
    type: z.enum([
      DOCUMENT_TYPES.QUOTE,
      DOCUMENT_TYPES.INVOICE,
      DOCUMENT_TYPES.DELIVERY_NOTE,
    ]),
    clientId: objectId.optional(),
    clientNom: safeText(150).optional(),
    lignes: z
      .array(
        z.object({
          // Optionnel : une ligne peut etre une prestation libre
          produitId: objectId.optional(),
          designation: safeText(200),
          quantite: positiveQuantity,
          prixUnitaire: money,
          tauxTva: z.coerce.number().min(0).max(100).default(0),
          remise: money.default(0),
        })
      )
      .min(1, "Le document doit contenir au moins une ligne"),
    remiseGlobale: money.default(0),
    dateEmission: z.coerce.date().optional(),
    dateEcheance: z.coerce.date().optional(),
    notes: safeText(1000).optional(),
  })
  .refine((d) => d.clientId || d.clientNom, {
    message: "Un client (existant ou saisi) est requis",
    path: ["clientNom"],
  })
  .openapi("CreateDocument");

const listQuerySchema = paginationQuery.merge(dateRangeQuery).extend({
  type: z.enum(Object.values(DOCUMENT_TYPES)).optional(),
  statut: z.enum(Object.values(DOCUMENT_STATUS)).optional(),
  clientId: objectId.optional(),
});

const updateStatusSchema = z
  .object({ statut: z.enum(Object.values(DOCUMENT_STATUS)) })
  .openapi("UpdateDocumentStatus");

const documentResponse = registerSchema(
  "Document",
  z.object({
    id: objectId,
    numero: z.string(),
    type: z.string(),
    clientNom: z.string(),
    montantTotal: z.number(),
    montantRestant: z.number(),
    statut: z.string(),
  })
);

router.get("/", validate({ query: listQuerySchema }), c.list);
registerRoute({
  method: "get", path: "/documents", tags: ["Documents"], permissions: ["documents"],
  summary: "Lister les devis et factures",
  description:
    "Renvoie egalement les 4 indicateurs de l'ecran : total facture, montant " +
    "impaye, devis en cours et taux d'encaissement — calcules sur l'ensemble " +
    "des documents, pas seulement la page affichee.",
  request: { query: listQuerySchema },
  responses: { 200: documentResponse },
});

router.get("/:id", validate({ params: idParam }), c.getOne);
registerRoute({
  method: "get", path: "/documents/{id}", tags: ["Documents"], permissions: ["documents"],
  summary: "Consulter un document et ses lignes",
  request: { params: idParam },
  responses: { 200: documentResponse },
});

router.post("/", validate({ body: createDocumentSchema }), c.create);
registerRoute({
  method: "post", path: "/documents", tags: ["Documents"], permissions: ["documents"],
  summary: "Creer un devis, une facture ou un bon de livraison",
  description:
    "Numerotation sequentielle automatique par boutique et par type " +
    "(FAC-2026-0042, DEV-2026-0018) — exigence de continuite legale.",
  request: { body: createDocumentSchema },
  responses: { 201: documentResponse },
});

router.post("/:id/convert", validate({ params: idParam }), c.convertQuote);
registerRoute({
  method: "post", path: "/documents/{id}/convert", tags: ["Documents"], permissions: ["documents"],
  summary: "Convertir un devis en facture",
  description:
    "Le devis est conserve avec le statut `accepte` et reste lie a la facture " +
    "creee, assurant la tracabilite complete.",
  request: { params: idParam },
  responses: { 201: documentResponse },
});

router.patch("/:id/status", validate({ params: idParam, body: updateStatusSchema }), c.updateStatus);
registerRoute({
  method: "patch", path: "/documents/{id}/status", tags: ["Documents"], permissions: ["documents"],
  summary: "Changer le statut d'un document",
  request: { params: idParam, body: updateStatusSchema },
  responses: { 200: documentResponse },
});

router.post("/:id/reminder", validate({ params: idParam }), c.sendReminder);
registerRoute({
  method: "post", path: "/documents/{id}/reminder", tags: ["Documents"], permissions: ["documents"],
  summary: "Envoyer une relance par email au client",
  request: { params: idParam },
  responses: { 200: documentResponse },
});

module.exports = router;
