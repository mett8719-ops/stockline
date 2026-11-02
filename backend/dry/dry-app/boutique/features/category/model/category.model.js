/**
 * CATEGORIE de produits.
 *
 * Correspond aux pastilles de filtre de la grille POS :
 * Tous · Cereales · Huiles · Epicerie · Produits laitiers · Hygiene · ...
 *
 * Les categories par defaut sont creees automatiquement a la validation d'une
 * boutique, selon son type de commerce (voir le controleur d'approbation).
 */
const mongoose = require("mongoose");
const tenantPlugin = require("../../../../../core/tenant.plugin");

const categorySchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, maxlength: 60 },
    couleur: { type: String, default: "#64748b" },
    ordre: { type: Number, default: 0 },   // ordre d'affichage des pastilles
    actif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.plugin(tenantPlugin);

// Un nom de categorie est unique au sein d'une boutique
categorySchema.index({ shopId: 1, nom: 1 }, { unique: true });

module.exports = mongoose.model("boutique-category", categorySchema);
