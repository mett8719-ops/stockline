/**
 * Controleurs du module Tickets de support.
 *
 * ══ CONTROLE D'ACCES MANUEL ══
 * Le modele Ticket n'utilise PAS le plugin tenant : un ticket de niveau
 * "plateforme" doit etre visible par le staff Stockline, qui n'a pas de
 * shopId. Le controle d'appartenance est donc explicite dans chaque
 * controleur.
 *
 * PORTEE SELON LE ROLE :
 *   staff plateforme → tous les tickets de niveau "plateforme"
 *   admin boutique   → tous les tickets de SA boutique
 *   agent            → uniquement SES propres tickets
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success, paginationMeta } = require("../../../../../core/response");
const {
  notifyUser, notifyPlatform, notifyShop,
} = require("../../../../../core/services/notification.service");
const {
  TICKET_STATUS, SHOP_ROLES, NOTIFICATION_CATEGORIES,
} = require("../../../../../core/constants");

const TicketModel = require("../model/ticket.model");
const ShopModel = require("../../../../platform/features/shop/model/shop.model");

/**
 * Verifie qu'un utilisateur a le droit de voir ou modifier un ticket.
 * Factorise ici pour eviter toute divergence entre les controleurs.
 */
function peutAcceder(req, ticket, pourModifier = false) {
  if (req.user.isPlatform) {
    return ticket.niveau === "plateforme";
  }

  if (String(ticket.shopId) !== req.user.shopId) return false;

  // Modifier le statut : reserve a l'admin de la boutique
  if (pourModifier) return req.user.role === SHOP_ROLES.ADMIN;

  // Consulter : l'admin voit tout, un agent ne voit que ses propres tickets
  return (
    req.user.role === SHOP_ROLES.ADMIN ||
    String(ticket.auteurId) === req.user.id
  );
}

/** GET /tickets — Liste adaptee au role de l'appelant. */
const list = asyncHandler(async (req, res) => {
  const { page, limit, statut, priorite, q } = req.validated.query;

  const filtre = {};

  if (req.user.isPlatform) {
    filtre.niveau = "plateforme";
  } else {
    filtre.shopId = req.user.shopId;
    // Un agent ne voit que les siens
    if (req.user.role !== SHOP_ROLES.ADMIN) filtre.auteurId = req.user.id;
  }

  if (statut) filtre.statut = statut;
  if (priorite) filtre.priorite = priorite;

  if (q) {
    filtre.$or = [
      { sujet: { $regex: q, $options: "i" } },
      { reference: { $regex: q, $options: "i" } },
    ];
  }

  const [tickets, total, compteurs] = await Promise.all([
    TicketModel.find(filtre)
      // Les ouverts et les urgents en premier
      .sort({ statut: 1, priorite: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    TicketModel.countDocuments(filtre),

    TicketModel.aggregate([
      { $match: filtre },
      { $group: { _id: "$statut", total: { $sum: 1 } } },
    ]),
  ]);

  return success(
    res,
    {
      tickets,
      compteurs: compteurs.reduce(
        (acc, c) => ({ ...acc, [c._id]: c.total }),
        {}
      ),
      // Bandeau affiche cote console plateforme
      avertissementConfidentialite: req.user.isPlatform
        ? "Donnees protegees / Acces isole — aucune donnee commerciale de la boutique n'est accessible."
        : undefined,
    },
    200,
    paginationMeta(page, limit, total)
  );
});

/** GET /tickets/:id — Ticket et son fil de discussion. */
const getOne = asyncHandler(async (req, res) => {
  const ticket = await TicketModel.findById(req.validated.params.id).lean();
  if (!ticket) throw AppError.notFound("Ticket introuvable");

  // 404 et non 403 : on ne confirme pas l'existence d'un ticket inaccessible
  if (!peutAcceder(req, ticket)) throw AppError.notFound("Ticket introuvable");

  return success(res, ticket);
});

/** POST /tickets — Ouverture d'un ticket. */
const create = asyncHandler(async (req, res) => {
  const { sujet, description, categorie, priorite, niveau } = req.validated.body;

  /**
   * Seul l'ADMIN d'une boutique peut ouvrir un ticket vers le support
   * Stockline. Un caissier passe par son admin — cela evite que le support
   * plateforme soit sollicite pour des questions internes a la boutique.
   */
  const niveauEffectif =
    niveau === "plateforme" && req.user.role === SHOP_ROLES.ADMIN
      ? "plateforme"
      : "interne";

  const boutique = await ShopModel.findById(req.user.shopId).select("nom").lean();

  const ticket = await TicketModel.create({
    reference: await TicketModel.genererReference(niveauEffectif),
    niveau: niveauEffectif,
    shopId: req.user.shopId,
    shopNom: boutique?.nom,
    sujet,
    description,
    categorie,
    priorite,
    auteurId: req.user.id,
    auteurNom: req.user.nom,
    auteurRole: req.user.role,
  });

  // Notification de la partie concernee
  if (niveauEffectif === "plateforme") {
    await notifyPlatform({
      titre: "Nouveau ticket support",
      message: `${boutique?.nom} — ${sujet}`,
      categorie: NOTIFICATION_CATEGORIES.SYSTEM,
      lien: `/admin/tickets/${ticket._id}`,
    });
  } else {
    await notifyShop({
      shopId: req.user.shopId,
      roles: [SHOP_ROLES.ADMIN],
      titre: "Nouveau ticket interne",
      message: `${req.user.nom} : ${sujet}`,
      lien: `/tickets/${ticket._id}`,
    });
  }

  return success(res, ticket, 201);
});

/** POST /tickets/:id/reply — Reponse dans le fil. */
const reply = asyncHandler(async (req, res) => {
  const ticket = await TicketModel.findById(req.validated.params.id);
  if (!ticket) throw AppError.notFound("Ticket introuvable");
  if (!peutAcceder(req, ticket)) throw AppError.notFound("Ticket introuvable");

  ticket.reponses.push({
    auteurId: req.user.id,
    // Le staff plateforme repond sous l'identite "Support Stockline"
    auteurNom: req.user.isPlatform ? "Support Stockline" : req.user.nom,
    auteurRole: req.user.role,
    estSupport: req.user.isPlatform,
    texte: req.validated.body.texte,
  });

  // Une premiere reponse fait passer le ticket "en cours"
  if (ticket.statut === TICKET_STATUS.OPEN) {
    ticket.statut = TICKET_STATUS.IN_PROGRESS;
  }

  await ticket.save();

  // Notification de l'auteur, sauf s'il repond a son propre ticket
  if (String(ticket.auteurId) !== req.user.id) {
    await notifyUser({
      userId: ticket.auteurId,
      shopId: ticket.shopId,
      titre: `Reponse au ticket ${ticket.reference}`,
      message: req.validated.body.texte.slice(0, 140),
      categorie: NOTIFICATION_CATEGORIES.SYSTEM,
      lien: `/tickets/${ticket._id}`,
    });
  }

  return success(res, ticket, 201);
});

/** PATCH /tickets/:id/status — Changement de statut. */
const updateStatus = asyncHandler(async (req, res) => {
  const { statut } = req.validated.body;

  const ticket = await TicketModel.findById(req.validated.params.id);
  if (!ticket) throw AppError.notFound("Ticket introuvable");

  if (!peutAcceder(req, ticket, true)) {
    throw AppError.forbidden("Vous ne pouvez pas modifier le statut de ce ticket");
  }

  ticket.statut = statut;
  if (statut === TICKET_STATUS.RESOLVED) ticket.resoluLe = new Date();
  if (statut === TICKET_STATUS.CLOSED) ticket.fermeLe = new Date();

  await ticket.save();
  return success(res, ticket);
});

module.exports = { list, getOne, create, reply, updateStatus };
