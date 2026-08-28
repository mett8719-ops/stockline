/**
 * Routeur des modules PARTAGES — accessibles cote boutique ET cote plateforme.
 *
 * Ces routes n'appliquent PAS `shopOnly` : le staff plateforme doit pouvoir
 * consulter ses notifications, repondre aux tickets et echanger avec les
 * boutiques via la messagerie support.
 */
const express = require("express");
const { z } = require("zod");
const validate = require("../../../core/validate");
const { registerRoute, registerSchema } = require("../../../core/openapi");
const { authenticate } = require("../../../core/authenticate");
const { apiLimiter } = require("../../../core/rate-limit");
const { trackUsage } = require("../../../core/usage-tracker");
const {
  idParam, paginationQuery, objectId, safeText,
} = require("../../../core/common-schemas");
const { TICKET_STATUS, TICKET_PRIORITY } = require("../../../core/constants");

const notificationRoute = require("../features/notification/routes/notification.route");
const ticket = require("../features/ticket/controllers/ticket.controllers");
const messaging = require("../features/messaging/controllers/messaging.controllers");

const router = express.Router();
router.use(authenticate, apiLimiter);

// ══ NOTIFICATIONS ═════════════════════════════════════════════════════
router.use("/notifications", notificationRoute);

// ══ TICKETS ═══════════════════════════════════════════════════════════
const ticketRouter = express.Router();
ticketRouter.use(trackUsage("tickets"));

const createTicketSchema = z
  .object({
    sujet: safeText(200).openapi({ example: "Probleme d'acces a la caisse" }),
    description: z.string().trim().min(10).max(4000),
    categorie: z
      .enum(["technique", "facturation", "formation", "quota", "autre"])
      .default("autre"),
    priorite: z.enum(Object.values(TICKET_PRIORITY)).default(TICKET_PRIORITY.NORMAL),
    niveau: z.enum(["interne", "plateforme"]).default("interne").openapi({
      description:
        "`plateforme` (vers le support Stockline) est reserve a l'admin de la boutique",
    }),
  })
  .openapi("CreateTicket");

const replySchema = z
  .object({ texte: z.string().trim().min(1).max(4000) })
  .openapi("ReplyTicket");

const listTicketsQuery = paginationQuery.extend({
  statut: z.enum(Object.values(TICKET_STATUS)).optional(),
  priorite: z.enum(Object.values(TICKET_PRIORITY)).optional(),
});

const ticketResponse = registerSchema(
  "Ticket",
  z.object({
    id: objectId,
    reference: z.string(),
    sujet: z.string(),
    statut: z.string(),
    priorite: z.string(),
    reponses: z.array(z.any()),
  })
);

ticketRouter.get("/", validate({ query: listTicketsQuery }), ticket.list);
registerRoute({
  method: "get", path: "/tickets", tags: ["Tickets"],
  summary: "Lister les tickets",
  description:
    "La portee depend du role : le staff plateforme voit les tickets de " +
    "niveau `plateforme`, l'admin voit ceux de sa boutique, un agent voit " +
    "uniquement les siens.",
  request: { query: listTicketsQuery },
  responses: { 200: ticketResponse },
});

ticketRouter.get("/:id", validate({ params: idParam }), ticket.getOne);
registerRoute({
  method: "get", path: "/tickets/{id}", tags: ["Tickets"],
  summary: "Consulter un ticket et son fil de discussion",
  request: { params: idParam },
  responses: { 200: ticketResponse },
});

ticketRouter.post("/", validate({ body: createTicketSchema }), ticket.create);
registerRoute({
  method: "post", path: "/tickets", tags: ["Tickets"],
  summary: "Ouvrir un ticket",
  description:
    "Un agent ouvre un ticket `interne` vers son admin. Seul l'admin de la " +
    "boutique peut ouvrir un ticket `plateforme` vers le support Stockline.",
  request: { body: createTicketSchema },
  responses: { 201: ticketResponse },
});

ticketRouter.post(
  "/:id/reply",
  validate({ params: idParam, body: replySchema }),
  ticket.reply
);
registerRoute({
  method: "post", path: "/tickets/{id}/reply", tags: ["Tickets"],
  summary: "Repondre a un ticket",
  description:
    "Les reponses du staff Stockline apparaissent sous l'identite " +
    "\"Support Stockline\". La premiere reponse fait passer le ticket en cours.",
  request: { params: idParam, body: replySchema },
  responses: { 201: ticketResponse },
});

ticketRouter.patch(
  "/:id/status",
  validate({
    params: idParam,
    body: z.object({ statut: z.enum(Object.values(TICKET_STATUS)) }),
  }),
  ticket.updateStatus
);
registerRoute({
  method: "patch", path: "/tickets/{id}/status", tags: ["Tickets"],
  summary: "Changer le statut d'un ticket",
  description: "Reserve a l'admin de la boutique ou au staff plateforme.",
  request: { params: idParam },
  responses: { 200: ticketResponse },
});

router.use("/tickets", ticketRouter);

// ══ MESSAGERIE ════════════════════════════════════════════════════════
const messagingRouter = express.Router();
messagingRouter.use(trackUsage("messaging"));

const createConversationSchema = z
  .object({
    type: z.enum(["direct", "groupe", "support"]),
    participantIds: z.array(objectId).max(50).default([]).openapi({
      description: "Ignore pour une conversation de type `support`",
    }),
    titre: safeText(150).optional(),
  })
  .openapi("CreateConversation");

const sendMessageSchema = z
  .object({ texte: z.string().trim().min(1).max(4000) })
  .openapi("SendMessage");

const messageResponse = registerSchema(
  "Message",
  z.object({
    id: objectId,
    texte: z.string(),
    auteurNom: z.string(),
    createdAt: z.string(),
  })
);

messagingRouter.get(
  "/conversations",
  validate({ query: paginationQuery }),
  messaging.listConversations
);
registerRoute({
  method: "get", path: "/messaging/conversations", tags: ["Messagerie"],
  summary: "Lister ses conversations",
  description: "Chaque conversation indique le nombre de messages non lus.",
  request: { query: paginationQuery },
  responses: { 200: messageResponse },
});

messagingRouter.post(
  "/conversations",
  validate({ body: createConversationSchema }),
  messaging.createConversation
);
registerRoute({
  method: "post", path: "/messaging/conversations", tags: ["Messagerie"],
  summary: "Ouvrir une conversation",
  description:
    "Une conversation directe existante entre les memes personnes est " +
    "reutilisee plutot que dupliquee.\n\n" +
    "Le type `support` est reserve a l'administrateur de la boutique.",
  request: { body: createConversationSchema },
  responses: { 201: messageResponse },
});

messagingRouter.get(
  "/conversations/:id/messages",
  validate({ params: idParam, query: paginationQuery }),
  messaging.listMessages
);
registerRoute({
  method: "get", path: "/messaging/conversations/{id}/messages", tags: ["Messagerie"],
  summary: "Lire le fil de discussion",
  description: "Ouvrir la conversation remet son compteur de non-lus a zero.",
  request: { params: idParam, query: paginationQuery },
  responses: { 200: messageResponse },
});

messagingRouter.post(
  "/conversations/:id/messages",
  validate({ params: idParam, body: sendMessageSchema }),
  messaging.sendMessage
);
registerRoute({
  method: "post", path: "/messaging/conversations/{id}/messages", tags: ["Messagerie"],
  summary: "Envoyer un message",
  description:
    "Diffuse egalement le message en temps reel via Socket.IO aux " +
    "participants connectes.",
  request: { params: idParam, body: sendMessageSchema },
  responses: { 201: messageResponse },
});

router.use("/messaging", messagingRouter);

module.exports = router;
