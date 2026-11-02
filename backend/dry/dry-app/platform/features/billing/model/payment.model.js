/**
 * PAIEMENT MOBILE MONEY (FeexPay) d'un abonnement.
 * Trace complete de la transaction, du declenchement au statut final.
 */
const mongoose = require("mongoose");
const { PAYMENT_STATUS } = require("../../../../../core/constants");

const paymentSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "platform-shop",
      required: true,
      index: true,
    },
    factureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "platform-invoice",
      index: true,
    },

    fournisseur: { type: String, default: "feexpay" },
    operateur: { type: String, default: "mtn_cg" },
    reference: { type: String, index: true },      // reference renvoyee par FeexPay
    callbackInfo: { type: String, index: true },   // NOTRE reference interne

    montant: { type: Number, required: true, min: 100 }, // minimum impose par FeexPay
    devise: { type: String, default: () => process.env.DEFAULT_CURRENCY || "XAF" },

    /**
     * Numero PARTIELLEMENT MASQUE (ex. "***4567").
     * On ne conserve jamais le numero complet du payeur : c'est une donnee
     * personnelle sans utilite apres la transaction.
     */
    telephoneMasque: { type: String },

    statut: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    verifieLe: { type: Date },
    tentativesVerification: { type: Number, default: 0 },

    // Reponse brute de la passerelle : indispensable au support en cas de litige
    reponseBrute: { type: mongoose.Schema.Types.Mixed, select: false },
    initiePar: { type: mongoose.Schema.Types.ObjectId, ref: "platform-user" },
  },
  { timestamps: true }
);

paymentSchema.index({ shopId: 1, createdAt: -1 });
paymentSchema.index({ statut: 1, createdAt: -1 });

module.exports = mongoose.model("platform-payment", paymentSchema);
