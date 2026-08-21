/**
 * SESSION DE CAISSE (ouverture / cloture, dit "Z de caisse").
 *
 * PRINCIPE : a la cloture, le systeme calcule le FONDS THEORIQUE
 * (fonds d'ouverture + especes encaissees - depenses) et le compare au
 * COMPTAGE PHYSIQUE saisi par le caissier. L'ecart est conserve : c'est la
 * piece justificative en cas de manquant.
 *
 * ATTENTION : seules les ESPECES entrent dans le fonds theorique. Un paiement
 * Mobile Money n'est pas dans le tiroir-caisse — l'inclure fausserait tout
 * l'ecart et rendrait la cloture ininterpretable.
 */
const mongoose = require("mongoose");
const tenantPlugin = require("../../../../../core/tenant.plugin");

const cashSessionSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true },
    caisseNom: { type: String, default: "Caisse principale" },

    fondsOuverture: { type: Number, default: 0, min: 0 },
    ouverteLe: { type: Date, default: Date.now },
    ouvertePar: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
    ouvertParNom: { type: String },

    // ── Totaux calcules a la cloture ────────────────────────────────────
    totalVentes: { type: Number, default: 0 },
    totalRecettes: { type: Number, default: 0 },
    totalDepenses: { type: Number, default: 0 },
    nombreVentes: { type: Number, default: 0 },

    /** Ventilation par mode : { especes: 287500, mobile_money: 95000 } */
    ventilationParMode: { type: Map, of: Number, default: {} },

    fondsTheorique: { type: Number, default: 0 },
    fondsComptes: { type: Number },              // saisi manuellement
    ecart: { type: Number, default: 0 },         // comptes - theorique

    statut: { type: String, enum: ["ouverte", "fermee"], default: "ouverte", index: true },
    fermeeLe: { type: Date },
    fermeePar: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

cashSessionSchema.plugin(tenantPlugin);

/** Historique des clotures. */
cashSessionSchema.index({ shopId: 1, ouverteLe: -1 });

/** Une seule session ouverte a la fois par boutique. */
cashSessionSchema.index(
  { shopId: 1, statut: 1 },
  { unique: true, partialFilterExpression: { statut: "ouverte" } }
);

module.exports = mongoose.model("boutique-cash-session", cashSessionSchema);
