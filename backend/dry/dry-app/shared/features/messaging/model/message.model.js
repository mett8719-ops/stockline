/**
 * MESSAGE appartenant a une conversation.
 *
 * La suppression est LOGIQUE (`supprime: true`) : dans un contexte
 * professionnel, un echange supprime doit rester recuperable en cas de litige
 * entre un employe et son gerant.
 */
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "shared-conversation",
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "platform-shop",
      default: null,
      index: true,
    },

    auteurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-user",
      required: true,
    },
    // Fige : "Support Stockline" pour les messages du staff plateforme
    auteurNom: { type: String, required: true },
    auteurRole: { type: String },

    texte: { type: String, required: true, trim: true, maxlength: 4000 },

    piecesJointes: [
      { url: String, nom: String, type: String, tailleKo: Number },
    ],

    /** Accuses de lecture. */
    luPar: [{ type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" }],

    modifieLe: { type: Date },
    supprime: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/** Chargement d'un fil de discussion, du plus recent au plus ancien. */
messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model("shared-message", messageSchema);
