/**
 * TICKET DE SUPPORT.
 *
 * DEUX NIVEAUX :
 *   niveau = "interne"    → un agent contacte l'admin de SA boutique
 *   niveau = "plateforme" → l'admin d'une boutique contacte le support Stockline
 *
 * ISOLATION : le staff plateforme voit le contenu des tickets de niveau
 * "plateforme" mais AUCUNE donnee commerciale de la boutique concernee.
 * Le ticket porte un shopId pour identifier l'emetteur, pas pour donner acces.
 */
const mongoose = require("mongoose");
const { TICKET_STATUS, TICKET_PRIORITY } = require("../../../../../core/constants");

const reponseSchema = new mongoose.Schema(
  {
    auteurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-user",
      required: true,
    },
    auteurNom: { type: String, required: true },
    auteurRole: { type: String },

    /**
     * Vrai si la reponse vient de l'equipe Stockline.
     * Permet au frontend d'afficher differemment les messages du support.
     */
    estSupport: { type: Boolean, default: false },

    texte: { type: String, required: true, maxlength: 4000 },
    date: { type: Date, default: Date.now },
  },
  { _id: true }   // chaque reponse a son identifiant (edition, suppression)
);

const ticketSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true }, // SA-001

    niveau: {
      type: String,
      enum: ["interne", "plateforme"],
      required: true,
      index: true,
    },

    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "platform-shop",
      required: true,
      index: true,
    },
    shopNom: { type: String },

    sujet: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 4000 },

    categorie: {
      type: String,
      enum: ["technique", "facturation", "formation", "quota", "autre"],
      default: "autre",
    },

    statut: {
      type: String,
      enum: Object.values(TICKET_STATUS),
      default: TICKET_STATUS.OPEN,
      index: true,
    },
    priorite: {
      type: String,
      enum: Object.values(TICKET_PRIORITY),
      default: TICKET_PRIORITY.NORMAL,
      index: true,
    },

    auteurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-user",
      required: true,
      index: true,
    },
    auteurNom: { type: String },
    auteurRole: { type: String },

    assigneA: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
    reponses: { type: [reponseSchema], default: [] },

    resoluLe: { type: Date },
    fermeLe: { type: Date },
  },
  { timestamps: true }
);

// ══ INDEX ═════════════════════════════════════════════════════════════

/** Tickets d'une boutique, filtres par statut. */
ticketSchema.index({ shopId: 1, statut: 1, createdAt: -1 });

/** File du support plateforme : les urgents et les plus anciens en premier. */
ticketSchema.index({ niveau: 1, statut: 1, priorite: -1, createdAt: -1 });

/** Barre "Rechercher un ticket, une boutique...". */
ticketSchema.index({ sujet: "text", description: "text" });

/**
 * Reference : SA-001 pour le support plateforme, TI-001 en interne.
 * Numerotation GLOBALE et non par boutique : le support Stockline doit pouvoir
 * citer un numero de ticket sans ambiguite entre deux clients.
 */
ticketSchema.statics.genererReference = async function genererReference(niveau) {
  const prefixe = niveau === "plateforme" ? "SA" : "TI";

  const dernier = await this.findOne({ reference: new RegExp(`^${prefixe}-`) })
    .sort({ reference: -1 })
    .select("reference")
    .lean();

  const suivant = dernier ? Number(dernier.reference.split("-")[1]) + 1 : 1;
  return `${prefixe}-${String(suivant).padStart(3, "0")}`;
};

module.exports = mongoose.model("shared-ticket", ticketSchema);
