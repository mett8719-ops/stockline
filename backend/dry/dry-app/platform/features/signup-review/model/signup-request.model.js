/**
 * DEMANDE D'INSCRIPTION soumise depuis le formulaire public en 4 etapes.
 *
 * AUCUN compte ni boutique n'est cree a ce stade : le document reste en file
 * d'attente jusqu'a validation par le Super-Admin (ecran "Demandes en attente").
 *
 * Ce modele n'utilise PAS le plugin tenant : la demande existe AVANT toute
 * boutique, elle ne peut donc pas porter de shopId.
 */
const mongoose = require("mongoose");
const {
  SIGNUP_STATUS, BUSINESS_TYPES, BILLING_CYCLE,
} = require("../../../../../core/constants");

const signupRequestSchema = new mongoose.Schema(
  {
    // ── Etape 1 : Boutique ──────────────────────────────────────────────
    boutique: {
      nom: { type: String, required: true, trim: true, maxlength: 120 },
      typeActivite: { type: String, enum: BUSINESS_TYPES, required: true },
      adresse: { type: String, trim: true, maxlength: 250 },
      ville: { type: String, required: true, trim: true, maxlength: 80 },
    },

    // ── Etape 2 : Proprietaire ──────────────────────────────────────────
    proprietaire: {
      nomComplet: { type: String, required: true, trim: true, maxlength: 120 },
      email: { type: String, required: true, trim: true, lowercase: true, index: true },
      telephone: { type: String, trim: true },
      /**
       * Le mot de passe choisi par le demandeur est HACHE des la soumission.
       * Il n'est jamais stocke en clair, meme pendant la phase d'attente.
       * `select: false` : jamais renvoye par une requete par defaut.
       */
      passwordHash: { type: String, required: true, select: false },
    },

    // ── Etape 3 : Plan & facturation ────────────────────────────────────
    abonnement: {
      planId: { type: mongoose.Schema.Types.ObjectId, ref: "platform-plan", required: true },
      // Copies FIGEES : le plan peut changer de nom ou de prix apres la demande
      planNom: { type: String },
      prixMensuel: { type: Number },
      cycle: {
        type: String,
        enum: Object.values(BILLING_CYCLE),
        default: BILLING_CYCLE.MONTHLY,
      },
      jourPrelevement: { type: Number, min: 1, max: 28, default: 1 },
    },

    // ── Etape 4 : Recapitulatif ─────────────────────────────────────────
    cguAcceptees: { type: Boolean, required: true },

    // ── Traitement par le Super-Admin ───────────────────────────────────
    statut: {
      type: String,
      enum: Object.values(SIGNUP_STATUS),
      default: SIGNUP_STATUS.PENDING,
      index: true,
    },
    traiteePar: { type: mongoose.Schema.Types.ObjectId, ref: "platform-user" },
    traiteeLe: { type: Date },
    motifRejet: { type: String, maxlength: 500 },
    messageInfosComplementaires: { type: String, maxlength: 1000 },
    shopIdCree: { type: mongoose.Schema.Types.ObjectId, ref: "platform-shop" },

    // Tracabilite anti-abus du formulaire public
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// ══ INDEX ═════════════════════════════════════════════════════════════
// File d'attente : les demandes les plus recentes en premier
signupRequestSchema.index({ statut: 1, createdAt: -1 });

/**
 * INDEX PARTIEL UNIQUE : empeche deux demandes ACTIVES pour la meme adresse.
 * Une nouvelle demande reste possible apres un rejet (le statut "rejected"
 * n'est pas dans la liste), ce qui est le comportement attendu.
 */
signupRequestSchema.index(
  { "proprietaire.email": 1 },
  {
    unique: true,
    partialFilterExpression: {
      statut: { $in: ["pending", "in_review", "info_requested"] },
    },
  }
);

// Recherche dans la file d'attente ("Rechercher une boutique ou un proprietaire")
signupRequestSchema.index({
  "boutique.nom": "text",
  "proprietaire.nomComplet": "text",
});

module.exports = mongoose.model("platform-signup-request", signupRequestSchema);
