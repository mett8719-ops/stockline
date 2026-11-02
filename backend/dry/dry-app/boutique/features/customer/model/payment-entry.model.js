/**
 * VERSEMENT — historique des paiements echelonnes.
 *
 * UN SEUL MODELE POUR LES DEUX SENS :
 *   sens = "client"      → le client nous verse de l'argent (reduit sa creance)
 *   sens = "fournisseur" → nous payons un fournisseur (reduit notre dette)
 *
 * Les deux ont exactement la meme structure : montant, date, mode de paiement,
 * solde apres operation. Les separer en deux collections dupliquerait le code
 * sans aucun benefice.
 *
 * `soldeApres` permet de reconstituer l'historique affiche sur la fiche :
 * "Versement partiel +50 000 · Reglement facture #0189 +75 000"
 */
const mongoose = require("mongoose");
const tenantPlugin = require("../../../../../core/tenant.plugin");
const { PAYMENT_METHODS } = require("../../../../../core/constants");

const paymentEntrySchema = new mongoose.Schema(
  {
    sens: { type: String, enum: ["client", "fournisseur"], required: true },

    /**
     * Reference dynamique : pointe vers un Customer ou un Supplier selon
     * `tiersModel`. C'est le mecanisme `refPath` de Mongoose.
     */
    tiersId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      refPath: "tiersModel",
    },
    tiersModel: {
      type: String,
      enum: ["boutique-customer", "boutique-supplier"],
      required: true,
    },
    tiersNom: { type: String },   // fige pour l'historique

    libelle: { type: String, trim: true, maxlength: 200 },
    montant: { type: Number, required: true, min: 0 },
    modePaiement: { type: String, enum: PAYMENT_METHODS, default: "especes" },

    /** Solde du tiers APRES ce versement — reconstitue l'historique. */
    soldeApres: { type: Number },

    // Rattachement facultatif a une facture precise
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-document" },

    auteurId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
    auteurNom: { type: String },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

paymentEntrySchema.plugin(tenantPlugin);

/** Historique des paiements d'un tiers (fiche client ou fournisseur). */
paymentEntrySchema.index({ shopId: 1, tiersId: 1, date: -1 });

/** Tous les encaissements ou tous les decaissements sur une periode. */
paymentEntrySchema.index({ shopId: 1, sens: 1, date: -1 });

module.exports = mongoose.model("boutique-payment-entry", paymentEntrySchema);
