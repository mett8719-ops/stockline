/**
 * ACHAT / RECEPTION FOURNISSEUR.
 *
 * Sa validation declenche automatiquement, dans une seule transaction :
 *   - une ENTREE de stock pour chaque ligne
 *   - l'augmentation de la dette fournisseur (part non reglee comptant)
 *   - une depense en tresorerie (part reglee comptant)
 */
const mongoose = require("mongoose");
const tenantPlugin = require("../../../../../core/tenant.plugin");

const lignePurchaseSchema = new mongoose.Schema(
  {
    produitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-product",
      required: true,
    },
    produitNom: { type: String },
    quantite: { type: Number, required: true, min: 0 },
    prixAchat: { type: Number, required: true, min: 0 },
    totalLigne: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true },   // ACH-2026-0001

    fournisseurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-supplier",
      required: true,
      index: true,
    },
    fournisseurNom: { type: String },

    lignes: { type: [lignePurchaseSchema], default: [] },

    montantTotal: { type: Number, required: true, min: 0 },
    montantPaye: { type: Number, default: 0, min: 0 },
    montantRestant: { type: Number, default: 0, min: 0 },

    statut: {
      type: String,
      enum: ["commande", "partiellement_livre", "livre", "annule"],
      default: "commande",
      index: true,
    },
    statutPaiement: {
      type: String,
      enum: ["non_paye", "partiel", "paye"],
      default: "non_paye",
    },

    dateCommande: { type: Date, default: Date.now },
    dateLivraison: { type: Date },

    auteurId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
    auteurNom: { type: String },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

purchaseSchema.plugin(tenantPlugin);

/** Historique des commandes d'un fournisseur (fiche fournisseur). */
purchaseSchema.index({ shopId: 1, fournisseurId: 1, dateCommande: -1 });
purchaseSchema.index({ shopId: 1, reference: 1 }, { unique: true });
purchaseSchema.index({ shopId: 1, statut: 1, dateCommande: -1 });

module.exports = mongoose.model("boutique-purchase", purchaseSchema);
