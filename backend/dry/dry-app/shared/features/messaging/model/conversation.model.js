/**
 * CONVERSATION de messagerie.
 *
 * TROIS FORMES :
 *   "direct"  → message prive entre deux membres d'une meme boutique
 *   "groupe"  → groupe interne a la boutique
 *   "support" → echange entre l'admin d'une boutique et le staff Stockline
 *
 * Pour une conversation "support", shopId identifie la boutique concernee mais
 * ne donne AUCUN acces a ses donnees commerciales — c'est un canal de
 * communication, pas un canal d'acces.
 */
const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "groupe", "support"],
      required: true,
      index: true,
    },

    // null uniquement pour une conversation interne au staff plateforme
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "platform-shop",
      default: null,
      index: true,
    },
    shopNom: { type: String },

    titre: { type: String, trim: true, maxlength: 150 },

    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user", index: true },
    ],
    creePar: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },

    /** Apercu affiche dans la liste des conversations, sans charger les messages. */
    dernierMessage: {
      texte: String,
      auteurId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
      auteurNom: String,
      date: Date,
    },

    /**
     * Compteur de non-lus PAR PARTICIPANT : { "userId1": 3, "userId2": 0 }
     * Permet d'afficher le badge propre a chaque utilisateur sans requete
     * supplementaire sur la collection des messages.
     */
    nonLus: { type: Map, of: Number, default: {} },

    // Utilise pour les conversations de type "support"
    statut: {
      type: String,
      enum: ["ouvert", "en_cours", "resolu", "ferme"],
      default: "ouvert",
    },
    archivee: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/** Liste des conversations d'un utilisateur, la plus recente en premier. */
conversationSchema.index({ participants: 1, updatedAt: -1 });

/** Conversations d'une boutique par type. */
conversationSchema.index({ shopId: 1, type: 1, updatedAt: -1 });

/** Boite de reception du support plateforme. */
conversationSchema.index({ type: 1, statut: 1, updatedAt: -1 });

module.exports = mongoose.model("shared-conversation", conversationSchema);
