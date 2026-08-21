/**
 * FOURNISSEUR.
 *
 * Structure symetrique du client, mais le solde represente ici une DETTE de la
 * boutique envers le fournisseur (et non une creance a recouvrer).
 *
 * `soldeDu` augmente a chaque reception non reglee comptant, et diminue a
 * chaque paiement echelonne.
 */
const mongoose = require("mongoose");
const tenantPlugin = require("../../../../../core/tenant.plugin");

const supplierSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, maxlength: 150 },
    contactNom: { type: String, trim: true, maxlength: 120 },  // "Directeur Commercial"
    telephone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    adresse: { type: String, trim: true, maxlength: 250 },

    // Aide a la saisie lors d'une nouvelle commande
    produitsHabituels: { type: [String], default: [] },

    /** Dette en cours. Positif = nous devons de l'argent au fournisseur. */
    soldeDu: { type: Number, default: 0 },

    totalAchats: { type: Number, default: 0 },
    derniereCommande: { type: Date },

    actif: { type: Boolean, default: true },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

supplierSchema.plugin(tenantPlugin);

supplierSchema.index({ shopId: 1, nom: 1 });
supplierSchema.index({ shopId: 1, nom: "text" });
/** Tri par dette decroissante : les fournisseurs a payer en premier. */
supplierSchema.index({ shopId: 1, soldeDu: -1 });

/** Badge "Doit" affiche dans la liste. */
supplierSchema.virtual("aDette").get(function aDette() {
  return this.soldeDu > 0;
});

module.exports = mongoose.model("boutique-supplier", supplierSchema);
