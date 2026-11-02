/**
 * FEATURE FLAG — activation progressive d'une fonctionnalite.
 *
 * QUATRE STRATEGIES DE CIBLAGE :
 *   "global"      → tous les tenants
 *   "plan"        → uniquement certains plans (ex. Pro + Enterprise)
 *   "beta"        → liste fermee de boutiques
 *   "pourcentage" → deploiement progressif sur une fraction du parc
 */
const mongoose = require("mongoose");

const featureFlagSchema = new mongoose.Schema(
  {
    /** Cle technique utilisee dans le code : "new_dashboard_v2" */
    cle: { type: String, required: true, unique: true, index: true },

    nom: { type: String, required: true, maxlength: 120 },
    description: { type: String, maxlength: 500 },

    environnement: {
      type: String,
      enum: ["production", "staging"],
      default: "staging",
    },
    actif: { type: Boolean, default: false, index: true },

    strategie: {
      type: String,
      enum: ["global", "plan", "beta", "pourcentage"],
      default: "global",
    },
    plansCibles: [{ type: mongoose.Schema.Types.ObjectId, ref: "platform-plan" }],
    boutiquesCibles: [{ type: mongoose.Schema.Types.ObjectId, ref: "platform-shop" }],
    pourcentageDeploiement: { type: Number, default: 0, min: 0, max: 100 },

    modifiePar: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
  },
  { timestamps: true }
);

/**
 * La fonctionnalite est-elle active pour cette boutique ?
 * @param {object} shop - document boutique (peut etre null pour le staff)
 */
featureFlagSchema.methods.estActifPour = function estActifPour(shop) {
  if (!this.actif) return false;

  switch (this.strategie) {
    case "global":
      return true;

    case "plan":
      return this.plansCibles.some((p) => String(p) === String(shop?.planId));

    case "beta":
      return this.boutiquesCibles.some((b) => String(b) === String(shop?._id));

    case "pourcentage": {
      /**
       * Repartition DETERMINISTE, pas aleatoire.
       * Une meme boutique obtient toujours le meme resultat — sinon la
       * fonctionnalite apparaitrait et disparaitrait d'une requete a l'autre,
       * ce qui serait deroutant pour l'utilisateur.
       */
      const id = String(shop?._id || "");
      const empreinte = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 100;
      return empreinte < this.pourcentageDeploiement;
    }

    default:
      return false;
  }
};

module.exports = mongoose.model("platform-feature-flag", featureFlagSchema);
