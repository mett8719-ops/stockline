/**
 * DOCUMENT COMMERCIAL emis par la boutique a SES clients :
 * devis, facture, recu, bon de livraison.
 *
 * A NE PAS CONFONDRE avec `platform-invoice`, qui represente les factures
 * d'abonnement que Stockline emet a ses clients commercants.
 *
 * NUMEROTATION SEQUENTIELLE par boutique ET par type (FAC-2026-0042,
 * DEV-2026-0018). C'est une exigence de continuite legale : une facture ne
 * peut pas manquer dans la serie. D'ou l'index unique { shopId, numero }.
 */
const mongoose = require("mongoose");
const tenantPlugin = require("../../../../../core/tenant.plugin");
const { DOCUMENT_TYPES, DOCUMENT_STATUS } = require("../../../../../core/constants");

const ligneDocSchema = new mongoose.Schema(
  {
    // Optionnel : une ligne peut etre une prestation libre, sans produit
    produitId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-product" },
    designation: { type: String, required: true },
    quantite: { type: Number, required: true, min: 0 },
    prixUnitaire: { type: Number, required: true, min: 0 },
    tauxTva: { type: Number, default: 0 },
    remise: { type: Number, default: 0 },
    totalLigne: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(DOCUMENT_TYPES),
      required: true,
      index: true,
    },
    numero: { type: String, required: true },   // FAC-2026-0042

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-customer",
      index: true,
    },
    // Figes : le document doit rester lisible meme si la fiche client change
    clientNom: { type: String, required: true },
    clientAdresse: { type: String },
    clientTelephone: { type: String },

    lignes: { type: [ligneDocSchema], default: [] },

    sousTotal: { type: Number, default: 0, min: 0 },
    montantTva: { type: Number, default: 0, min: 0 },
    remiseGlobale: { type: Number, default: 0, min: 0 },
    montantTotal: { type: Number, default: 0, min: 0 },
    montantPaye: { type: Number, default: 0, min: 0 },
    montantRestant: { type: Number, default: 0, min: 0 },

    statut: {
      type: String,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.DRAFT,
      index: true,
    },

    dateEmission: { type: Date, default: Date.now, index: true },
    dateEcheance: { type: Date },      // factures
    dateValidite: { type: Date },      // devis
    datePaiement: { type: Date },

    notes: { type: String, maxlength: 1000 },   // conditions de paiement

    // Lien vers la vente en caisse si le document en decoule
    venteId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-sale" },

    /**
     * Devis converti en facture : on conserve le lien entre les deux
     * documents. Le devis reste consultable, la facture sait d'ou elle vient.
     */
    documentSourceId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-document" },

    pdfUrl: { type: String },
    relancesEnvoyees: { type: Number, default: 0 },
    derniereRelance: { type: Date },

    auteurId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
    auteurNom: { type: String },
  },
  { timestamps: true }
);

documentSchema.plugin(tenantPlugin);

// ══ INDEX ═════════════════════════════════════════════════════════════

/** Continuite de la numerotation legale. */
documentSchema.index({ shopId: 1, numero: 1 }, { unique: true });

/** Onglets "Tous / Factures / Devis" de l'ecran Devis & Factures. */
documentSchema.index({ shopId: 1, type: 1, dateEmission: -1 });

/** Detection des factures arrivant a echeance ou en retard. */
documentSchema.index({ shopId: 1, statut: 1, dateEcheance: 1 });

/** Factures d'un client precis (fiche client). */
documentSchema.index({ shopId: 1, clientId: 1, dateEmission: -1 });

/** Genere le numero sequentiel du type demande, pour l'annee en cours. */
documentSchema.statics.genererNumero = async function genererNumero(shopId, type) {
  const prefixes = {
    devis: "DEV",
    facture: "FAC",
    recu: "REC",
    bon_livraison: "BL",
  };
  const prefixe = prefixes[type] || "DOC";
  const annee = new Date().getFullYear();

  const dernier = await this.findOne({
    shopId,
    numero: new RegExp(`^${prefixe}-${annee}-`),
  })
    .sort({ numero: -1 })
    .select("numero")
    .lean();

  const suivant = dernier ? Number(dernier.numero.split("-")[2]) + 1 : 1;
  return `${prefixe}-${annee}-${String(suivant).padStart(4, "0")}`;
};

module.exports = mongoose.model("boutique-document", documentSchema);
