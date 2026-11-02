/**
 * CLIENT de la boutique.
 *
 * `soldeCredit` est MATERIALISE, comme stockActuel sur le produit : la liste
 * des clients affiche un badge "Impaye" avec le montant sur chaque ligne.
 * Recalculer par agregation a chaque chargement serait trop lent.
 *
 * Il est mis a jour a chaque vente a credit et a chaque versement, toujours
 * dans la meme transaction que l'operation qui le fait varier.
 */
const mongoose = require("mongoose");
const tenantPlugin = require("../../../../../core/tenant.plugin");

const customerSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, maxlength: 150 },
    telephone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    adresse: { type: String, trim: true, maxlength: 250 },

    // Segmentation : conditionne d'eventuels tarifs preferentiels
    categorie: {
      type: String,
      enum: ["particulier", "revendeur", "entreprise"],
      default: "particulier",
    },

    /** Creance en cours. Positif = le client nous doit de l'argent. */
    soldeCredit: { type: Number, default: 0 },

    /**
     * Plafond de credit autorise. 0 = aucune limite definie.
     * Verifie au moment de la vente a credit : empeche qu'un client accumule
     * une creance ingerable sans que personne ne s'en apercoive.
     */
    plafondCredit: { type: Number, default: 0 },

    // Cumuls materialises : evitent une agregation a chaque ouverture de fiche
    totalAchats: { type: Number, default: 0 },
    nombreAchats: { type: Number, default: 0 },
    dernierAchat: { type: Date },

    pointsFidelite: { type: Number, default: 0 },

    // Suppression logique : un client ayant un historique n'est jamais efface
    actif: { type: Boolean, default: true },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

customerSchema.plugin(tenantPlugin);

// ══ INDEX ═════════════════════════════════════════════════════════════

/** Recherche par telephone — le plus utilise en caisse. */
customerSchema.index({ shopId: 1, telephone: 1 });

/** Barre "Rechercher un client..." */
customerSchema.index({ shopId: 1, nom: "text", telephone: "text" });

/** Filtre "clients avec solde impaye", tri par montant decroissant. */
customerSchema.index({ shopId: 1, soldeCredit: -1 });

/** Classement des meilleurs clients (rapports). */
customerSchema.index({ shopId: 1, totalAchats: -1 });

/** Badge "Impaye" affiche dans la liste. */
customerSchema.virtual("aImpaye").get(function aImpaye() {
  return this.soldeCredit > 0;
});

module.exports = mongoose.model("boutique-customer", customerSchema);
