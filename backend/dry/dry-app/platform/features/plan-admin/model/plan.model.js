/**
 * PLAN TARIFAIRE (Starter / Pro / Enterprise ou plan personnalise).
 *
 * Gere depuis l'ecran "Plans tarifaires" de la console Super-Admin.
 * Seuls les plans `publie: true` apparaissent sur la page de tarifs publique
 * et dans l'etape 3 du formulaire d'inscription.
 */
const mongoose = require("mongoose");
const { PERMISSION_LIST, BILLING_CYCLE } = require("../../../../../core/constants");

const planSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, unique: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 250 },

    prix: { type: Number, required: true, min: 0 },
    devise: { type: String, default: () => process.env.DEFAULT_CURRENCY || "XAF" },
    cycle: {
      type: String,
      enum: Object.values(BILLING_CYCLE),
      default: BILLING_CYCLE.MONTHLY,
    },
    // Bascule "Annuel -15%" de la page tarifs
    remiseAnnuellePourcent: { type: Number, default: 15, min: 0, max: 100 },

    // ── Quotas — la valeur -1 signifie ILLIMITE (symbole ∞ de l'interface) ──
    quotas: {
      boutiques: { type: Number, default: 1 },
      utilisateurs: { type: Number, default: 3 },
      produits: { type: Number, default: 500 },
      stockageMo: { type: Number, default: 500 },
    },

    // Modules inclus : conditionne l'acces aux fonctionnalites
    fonctionnalites: { type: [String], enum: PERMISSION_LIST, default: [] },
    // Libelles marketing affiches sur la page tarifs ("SLA 99,9 %", "Support prioritaire")
    fonctionnalitesSupplementaires: { type: [String], default: [] },

    publie: { type: Boolean, default: false, index: true },
    populaire: { type: Boolean, default: false },   // badge "Le plus populaire"
    ordre: { type: Number, default: 0 },            // ordre d'affichage des colonnes
    personnalise: { type: Boolean, default: false },
    creePar: { type: mongoose.Schema.Types.ObjectId, ref: "platform-user" },
  },
  { timestamps: true }
);

// Affichage de la page tarifs : filtre publie + tri
planSchema.index({ publie: 1, ordre: 1 });

/**
 * Le quota est-il atteint ?
 * @param {string} cle - "produits", "utilisateurs", "boutiques", "stockageMo"
 */
planSchema.methods.quotaAtteint = function quotaAtteint(cle, valeurActuelle) {
  const limite = this.quotas?.[cle];
  if (limite === undefined || limite === -1) return false; // illimite
  return valeurActuelle >= limite;
};

module.exports = mongoose.model("platform-plan", planSchema);
