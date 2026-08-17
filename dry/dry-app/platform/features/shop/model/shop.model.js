/**
 * BOUTIQUE (tenant) — un document par entreprise cliente.
 *
 * C'est le pivot de toute l'isolation : chaque donnee metier de la plateforme
 * porte un `shopId` qui pointe vers ce document.
 */
const mongoose = require("mongoose");
const { SHOP_STATUS, BUSINESS_TYPES, BILLING_CYCLE } = require("../../../../../core/constants");

const shopSchema = new mongoose.Schema(
  {
    // Code lisible affiche dans la console Super-Admin (T001, T002...)
    code: { type: String, unique: true, index: true },

    nom: { type: String, required: true, trim: true, maxlength: 120 },
    typeActivite: { type: String, enum: BUSINESS_TYPES, default: "boutique_detail" },
    adresse: { type: String, trim: true, maxlength: 250 },
    ville: { type: String, trim: true, maxlength: 80 },
    pays: { type: String, default: () => process.env.DEFAULT_COUNTRY || "Congo" },
    telephone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    logoUrl: { type: String },
    rccm: { type: String, trim: true },   // registre du commerce / numero fiscal
    devise: { type: String, default: () => process.env.DEFAULT_CURRENCY || "XAF" },
    fuseauHoraire: {
      type: String,
      default: () => process.env.DEFAULT_TIMEZONE || "Africa/Brazzaville",
    },
    tauxTva: { type: Number, default: 0, min: 0, max: 100 },

    // ── Etat du compte (pilote par le Super-Admin) ──────────────────────
    statut: {
      type: String,
      enum: Object.values(SHOP_STATUS),
      default: SHOP_STATUS.PENDING,
      index: true,
    },
    gelJusquA: { type: Date, default: null },  // null = gel indefini
    motifGel: { type: String, maxlength: 500 },
    motifBannissement: { type: String, maxlength: 500 },
    banniLe: { type: Date },
    banniPar: { type: mongoose.Schema.Types.ObjectId, ref: "platform-user" },

    // ── Abonnement ──────────────────────────────────────────────────────
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "platform-plan", index: true },
    cycleFacturation: {
      type: String,
      enum: Object.values(BILLING_CYCLE),
      default: BILLING_CYCLE.MONTHLY,
    },
    jourPrelevement: { type: Number, min: 1, max: 28, default: 1 },
    dateDebutAbonnement: { type: Date },
    dateProchainRenouvellement: { type: Date, index: true },
    essaiGratuitJusquA: { type: Date },

    // ── Onboarding (checklist "Completez votre configuration" 0/3) ──────
    onboardingTermine: { type: Boolean, default: false },
    etapesOnboarding: {
      logoAjoute: { type: Boolean, default: false },
      premierProduit: { type: Boolean, default: false },
      employeInvite: { type: Boolean, default: false },
    },

    /**
     * Compteurs MATERIALISES.
     * Sans eux, afficher l'annuaire de 1 200 boutiques declencherait 1 200
     * countDocuments() — plusieurs secondes de latence. Ils sont incrementes
     * a chaque creation de produit / utilisateur.
     */
    compteurs: {
      utilisateurs: { type: Number, default: 0 },
      produits: { type: Number, default: 0 },
      stockageMo: { type: Number, default: 0 },
    },

    derniereConnexion: { type: Date },
    proprietaireId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
  },
  { timestamps: true }
);

// ══ INDEX ═════════════════════════════════════════════════════════════
// Annuaire des tenants : tri par statut puis anciennete
shopSchema.index({ statut: 1, createdAt: -1 });
// Detection des renouvellements a venir / en retard (tache planifiee)
shopSchema.index({ dateProchainRenouvellement: 1, statut: 1 });
// Recherche par nom ou ville dans la console
shopSchema.index({ nom: "text", ville: "text" });

/** Genere automatiquement le code lisible T001, T002... a la creation. */
shopSchema.pre("save", async function attribuerCode(next) {
  if (this.code) return next();
  const dernier = await this.constructor
    .findOne({}, { code: 1 })
    .sort({ code: -1 })
    .lean();
  const numero = dernier?.code ? Number(dernier.code.replace("T", "")) + 1 : 1;
  this.code = `T${String(numero).padStart(3, "0")}`;
  return next();
});

/** La boutique est-elle operationnelle a l'instant T ? */
shopSchema.methods.estActive = function estActive() {
  if (this.statut === SHOP_STATUS.ACTIVE) return true;
  // Gel temporaire arrive a echeance : la boutique redevient utilisable
  if (
    this.statut === SHOP_STATUS.FROZEN &&
    this.gelJusquA &&
    this.gelJusquA <= new Date()
  ) return true;
  return false;
};

module.exports = mongoose.model("platform-shop", shopSchema);
