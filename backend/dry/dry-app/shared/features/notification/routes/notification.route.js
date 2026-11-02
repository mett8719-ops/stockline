/** Routes du centre de notifications. */
const express = require("express");
const { z } = require("zod");
const validate = require("../../../../../core/validate");
const { registerRoute, registerSchema } = require("../../../../../core/openapi");
const { idParam, paginationQuery, objectId } = require("../../../../../core/common-schemas");
const { NOTIFICATION_CATEGORIES } = require("../../../../../core/constants");
const c = require("../controllers/notification.controllers");

const router = express.Router();

const listQuerySchema = paginationQuery.extend({
  categorie: z.enum(Object.values(NOTIFICATION_CATEGORIES)).optional(),
  lu: z.enum(["true", "false"]).optional(),
});

const notificationResponse = registerSchema(
  "Notification",
  z.object({
    id: objectId,
    titre: z.string(),
    message: z.string(),
    categorie: z.string(),
    lu: z.boolean(),
    lien: z.string().nullable(),
  })
);

router.get("/", validate({ query: listQuerySchema }), c.list);
registerRoute({
  method: "get", path: "/notifications", tags: ["Notifications"],
  summary: "Lister ses notifications",
  description:
    "Filtrable par categorie : compte, facturation, securite, systeme, metier.\n\n" +
    "Renvoie le nombre total de non-lues (badge de la barre superieure) et " +
    "les compteurs par categorie (onglets de filtre).",
  request: { query: listQuerySchema },
  responses: { 200: notificationResponse },
});

// Declaree AVANT /:id/read pour ne pas etre capturee par le parametre
router.patch("/read-all", c.markAllRead);
registerRoute({
  method: "patch", path: "/notifications/read-all", tags: ["Notifications"],
  summary: "Tout marquer comme lu",
  responses: { 200: notificationResponse },
});

router.patch("/:id/read", validate({ params: idParam }), c.markRead);
registerRoute({
  method: "patch", path: "/notifications/{id}/read", tags: ["Notifications"],
  summary: "Marquer une notification comme lue",
  request: { params: idParam },
  responses: { 200: notificationResponse },
});

module.exports = router;
