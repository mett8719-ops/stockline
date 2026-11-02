/**
 * Controleurs de la messagerie interne.
 *
 * TROIS TYPES : `direct` (deux membres), `groupe` (equipe),
 * `support` (admin boutique ↔ staff Stockline).
 *
 * ══ ISOLATION ══
 * Une conversation de boutique ne peut reunir que des membres de CETTE
 * boutique. La verification est faite a la creation ET a chaque envoi de
 * message — un participant desactive ou transfere ne doit plus pouvoir ecrire.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success, paginationMeta } = require("../../../../../core/response");
const {
  emitToConversation, emitToUser,
} = require("../../../../../core/services/realtime.service");
const { SHOP_ROLES } = require("../../../../../core/constants");

const ConversationModel = require("../model/conversation.model");
const MessageModel = require("../model/message.model");
const UserModel = require("../../../../boutique/features/auth/model/user.model");
const ShopModel = require("../../../../platform/features/shop/model/shop.model");

/** GET /messaging/conversations — Conversations de l'utilisateur. */
const listConversations = asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;

  // Le staff plateforme voit toutes les conversations de type support
  const filtre = req.user.isPlatform
    ? { type: "support" }
    : { participants: req.user.id, archivee: false };

  const [conversations, total] = await Promise.all([
    ConversationModel.find(filtre)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("participants", "nom role")
      .lean(),

    ConversationModel.countDocuments(filtre),
  ]);

  return success(
    res,
    conversations.map((c) => ({
      ...c,
      // Compteur de non-lus propre a l'utilisateur courant
      nonLus: c.nonLus?.[req.user.id] || 0,
    })),
    200,
    paginationMeta(page, limit, total)
  );
});

/** POST /messaging/conversations — Ouverture d'une conversation. */
const createConversation = asyncHandler(async (req, res) => {
  const { type, participantIds = [], titre } = req.validated.body;

  // ══ CONVERSATION AVEC LE SUPPORT STOCKLINE ═════════════════════════
  if (type === "support") {
    if (req.user.role !== SHOP_ROLES.ADMIN) {
      throw AppError.forbidden(
        "Seul l'administrateur de la boutique peut contacter le support"
      );
    }

    // Une seule conversation support active par boutique
    const existante = await ConversationModel.findOne({
      type: "support",
      shopId: req.user.shopId,
      archivee: false,
    }).lean();

    if (existante) return success(res, existante);

    const boutique = await ShopModel.findById(req.user.shopId)
      .select("nom")
      .lean();

    const conversation = await ConversationModel.create({
      type: "support",
      shopId: req.user.shopId,
      shopNom: boutique?.nom,
      titre: titre || `Support — ${boutique?.nom}`,
      participants: [req.user.id],
      creePar: req.user.id,
    });

    return success(res, conversation, 201);
  }

  // ══ CONVERSATION INTERNE ═══════════════════════════════════════════
  const tousIds = [...new Set([...participantIds, req.user.id])];

  /**
   * Tous les participants doivent etre des membres ACTIFS de la MEME boutique.
   * Sans cette verification, un identifiant force permettrait d'ouvrir une
   * conversation avec un membre d'une autre boutique.
   */
  const membres = await UserModel.find({
    _id: { $in: tousIds },
    shopId: req.user.shopId,
    actif: true,
  })
    .select("_id nom")
    .lean();

  if (membres.length !== tousIds.length) {
    throw AppError.badRequest(
      "Tous les participants doivent etre des membres actifs de votre boutique"
    );
  }

  // Une conversation directe entre deux personnes est unique : on la reutilise
  if (type === "direct" && tousIds.length === 2) {
    const existante = await ConversationModel.findOne({
      type: "direct",
      shopId: req.user.shopId,
      participants: { $all: tousIds, $size: 2 },
    }).lean();

    if (existante) return success(res, existante);
  }

  const conversation = await ConversationModel.create({
    type,
    shopId: req.user.shopId,
    titre: titre || (type === "groupe" ? "Nouveau groupe" : undefined),
    participants: tousIds,
    creePar: req.user.id,
  });

  return success(res, conversation, 201);
});

/** GET /messaging/conversations/:id/messages — Fil de discussion. */
const listMessages = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { page, limit } = req.validated.query;

  const conversation = await ConversationModel.findById(id).lean();
  if (!conversation) throw AppError.notFound("Conversation introuvable");

  const autorise = req.user.isPlatform
    ? conversation.type === "support"
    : conversation.participants.some((p) => String(p) === req.user.id);

  if (!autorise) throw AppError.notFound("Conversation introuvable");

  const [messages, total] = await Promise.all([
    MessageModel.find({ conversationId: id, supprime: false })
      // Du plus recent au plus ancien pour la pagination...
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    MessageModel.countDocuments({ conversationId: id, supprime: false }),
  ]);

  // Ouvrir la conversation remet le compteur de non-lus a zero
  await ConversationModel.updateOne(
    { _id: id },
    { $set: { [`nonLus.${req.user.id}`]: 0 } }
  );

  // ...puis on inverse pour l'affichage chronologique
  return success(res, messages.reverse(), 200, paginationMeta(page, limit, total));
});

/** POST /messaging/conversations/:id/messages — Envoi d'un message. */
const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { texte } = req.validated.body;

  const conversation = await ConversationModel.findById(id);
  if (!conversation) throw AppError.notFound("Conversation introuvable");

  const autorise = req.user.isPlatform
    ? conversation.type === "support"
    : conversation.participants.some((p) => String(p) === req.user.id);

  if (!autorise) {
    throw AppError.forbidden("Vous ne participez pas a cette conversation");
  }

  const auteurNom = req.user.isPlatform ? "Support Stockline" : req.user.nom;

  const message = await MessageModel.create({
    conversationId: id,
    shopId: conversation.shopId,
    auteurId: req.user.id,
    auteurNom,
    auteurRole: req.user.role,
    texte,
    luPar: [req.user.id],   // l'auteur a forcement lu son propre message
  });

  // Incremente le compteur de non-lus des AUTRES participants
  const incrementations = {};
  for (const participant of conversation.participants) {
    if (String(participant) !== req.user.id) {
      incrementations[`nonLus.${participant}`] = 1;
    }
  }

  conversation.dernierMessage = {
    texte: texte.slice(0, 140),
    auteurId: req.user.id,
    auteurNom,
    date: new Date(),
  };

  if (Object.keys(incrementations).length) {
    await ConversationModel.updateOne({ _id: id }, { $inc: incrementations });
  }

  await conversation.save();

  // ── Diffusion temps reel ────────────────────────────────────────────
  emitToConversation(id, "message:new", message.toJSON());

  // Notification a ceux qui n'ont pas la conversation ouverte
  for (const participant of conversation.participants) {
    if (String(participant) !== req.user.id) {
      emitToUser(String(participant), "conversation:updated", {
        conversationId: id,
        apercu: texte.slice(0, 100),
        auteurNom,
      });
    }
  }

  return success(res, message, 201);
});

module.exports = {
  listConversations, createConversation, listMessages, sendMessage,
};
