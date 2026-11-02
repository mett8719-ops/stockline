/**
 * ROLE PERSONNALISE cree par l'admin d'une boutique.
 *
 * Permet de composer librement les 14 permissions modulaires.
 * Exemple concret : "Chef de rayon" = products + stock + inventory, sans
 * acces a la caisse ni a la tresorerie.
 *
 * PREMIER MODELE A UTILISER LE PLUGIN TENANT : un role appartient a une
 * boutique et une seule. Le plugin ajoute automatiquement le champ shopId
 * obligatoire, indexe et immuable.
 */
const mongoose = require("mongoose");
const tenantPlugin = require("../../../../../core/tenant.plugin");
const { PERMISSION_LIST } = require("../../../../../core/constants");

const roleSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 250 },

    permissions: {
      type: [String],
      enum: PERMISSION_LIST,
      // Un role sans aucune permission n'aurait aucun sens : on le refuse
      validate: [
        (v) => Array.isArray(v) && v.length > 0,
        "Au moins une permission est requise",
      ],
    },

    // Pastille de couleur affichee a cote du nom dans la liste des membres
    couleur: { type: String, default: "#2563eb" },

    /**
     * Desactiver un role plutot que le supprimer : les utilisateurs qui le
     * portent retombent alors sur les permissions de leur role de base, sans
     * qu'aucun compte ne se retrouve orphelin.
     */
    actif: { type: Boolean, default: true },

    creePar: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
  },
  { timestamps: true }
);

// Ajoute shopId obligatoire + garde-fou anti-oubli de filtre
roleSchema.plugin(tenantPlugin);

// Un nom de role est unique AU SEIN d'une boutique
roleSchema.index({ shopId: 1, nom: 1 }, { unique: true });

module.exports = mongoose.model("boutique-role", roleSchema);
