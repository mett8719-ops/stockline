/**
 * TRANSACTION DE TRESORERIE (recette ou depense).
 *
 * Alimente le journal de caisse groupe par jour et le calcul du solde en
 * temps reel.
 *
 * `origineType` distingue les ecritures AUTOMATIQUES (generees par une vente
 * ou une reception fournisseur) des saisies MANUELLES du gerant. C'est ce qui
 * permet de verifier qu'aucune recette de vente n'a ete oubliee.
 */
const mongoose = require("mongoose");
const tenantPlugin = require("../../../../../core/tenant.plugin");
const { PAYMENT_METHODS } = require("../../../../../core/constants");

const cashTransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["recette", "depense"], required: true, index: true },

    libelle: { type: String, required: true, trim: true, maxlength: 200 },
    montant: { type: Number, required: true, min: 0 },
    modePaiement: { type: String, enum: PAYMENT_METHODS, default: "especes" },

    /** Categorisation des depenses : marchandises, loyer, transport, salaires... */
    categorie: { type: String, trim: true, maxlength: 60, index: true },

    origineType: {
      type: String,
      enum: ["vente", "achat", "manuel", "versement_client", "paiement_fournisseur"],
      default: "manuel",
    },
    origineId: { type: mongoose.Schema.Types.ObjectId },

    sessionCaisseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-cash-session",
      index: true,
    },

    auteurId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
    auteurNom: { type: String },
    date: { type: Date, default: Date.now, index: true },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

cashTransactionSchema.plugin(tenantPlugin);

/** Journal de caisse, du plus recent au plus ancien. */
cashTransactionSchema.index({ shopId: 1, date: -1 });

/** Totaux recettes / depenses sur une periode. */
cashTransactionSchema.index({ shopId: 1, type: 1, date: -1 });

/** Analyse des depenses par categorie (rapports). */
cashTransactionSchema.index({ shopId: 1, categorie: 1, date: -1 });

module.exports = mongoose.model("boutique-cash-transaction", cashTransactionSchema);
