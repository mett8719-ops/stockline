/** Routes de la boite a suggestions. */
const express = require("express");
const { z } = require("zod");
const validate = require("../../../../../core/validate");
const { registerRoute, registerSchema } = require("../../../../../core/openapi");
const { requirePermission, authorizeRoles } = require("../../../../../core/authorize");
const { trackUsage } = require("../../../../../core/usage-tracker");
const { idParam, paginationQuery, objectId, safeText } =
  require("../../../../../core/common-schemas");
const {
  PERMISSIONS, SUGGESTION_STATUS, SHOP_ROLES,
} = require("../../../../../core/constants");
const c = require("../controllers/suggestion.controllers");

const router = express.Router();
router.use(requirePermission(PERMISSIONS.SUGGESTIONS), trackUsage("suggestions"));

const MODULES = ["caisse", "stock", "clients", "factures", "rapports", "autre"];

const createSchema = z
  .object({
    titre: safeText(200).openapi({
      example: "Rappel automatique des clients en retard",
    }),
    description: z.string().trim().min(10).max(2000),
    module: z.enum(MODULES).default("autre"),
  })
  .openapi("CreateSuggestion");

const respondSchema = z
  .object({
    statut: z.enum(Object.values(SUGGESTION_STATUS)).optional(),
    reponse: z.string().trim().max(2000).optional(),
  })
  .openapi("RespondSuggestion");

const listQuerySchema = paginationQuery.extend({
  module: z.enum(MODULES).optional(),
  statut: z.enum(Object.values(SUGGESTION_STATUS)).optional(),
});

const suggestionResponse = registerSchema(
  "Suggestion",
  z.object({
    id: objectId,
    titre: z.string(),
    statut: z.string(),
    nombreVotes: z.number(),
    aVote: z.boolean(),
  })
);

router.get("/", validate({ query: listQuerySchema }), c.list);
registerRoute({
  method: "get", path: "/suggestions", tags: ["Suggestions"], permissions: ["suggestions"],
  summary: "Lister les suggestions (triees par nombre de votes)",
  description:
    "Chaque suggestion indique si l'utilisateur courant a deja vote, pour " +
    "afficher le bon etat du bouton.",
  request: { query: listQuerySchema },
  responses: { 200: suggestionResponse },
});

router.post("/", validate({ body: createSchema }), c.create);
registerRoute({
  method: "post", path: "/suggestions", tags: ["Suggestions"], permissions: ["suggestions"],
  summary: "Proposer une amelioration",
  description: "L'auteur vote automatiquement pour sa propre suggestion.",
  request: { body: createSchema },
  responses: { 201: suggestionResponse },
});

router.post("/:id/vote", validate({ params: idParam }), c.toggleVote);
registerRoute({
  method: "post", path: "/suggestions/{id}/vote", tags: ["Suggestions"], permissions: ["suggestions"],
  summary: "Voter ou retirer son vote (bascule)",
  description: "Un utilisateur ne peut voter qu'une seule fois par suggestion.",
  request: { params: idParam },
  responses: { 200: suggestionResponse },
});

router.patch(
  "/:id",
  authorizeRoles(SHOP_ROLES.ADMIN),
  validate({ params: idParam, body: respondSchema }),
  c.respond
);
registerRoute({
  method: "patch", path: "/suggestions/{id}", tags: ["Suggestions"], permissions: ["suggestions"],
  summary: "Repondre et changer le statut (administrateur uniquement)",
  description:
    "Statuts : en attente → en analyse → planifie → livre (ou refuse).",
  request: { params: idParam, body: respondSchema },
  responses: { 200: suggestionResponse },
});

module.exports = router;
