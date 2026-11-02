/**
 * FACTURE D'ABONNEMENT emise PAR Stockline A une boutique.
 *
 * ATTENTION a ne pas confondre avec `boutique-document` : celui-ci represente
 * les factures que la BOUTIQUE emet a SES clients. Ici, c'est nous qui
 * facturons notre client (ecran "Factures boutiques", numerotation PF-2026-0142).
 *
 * Pas de plugin tenant : ce document appartient a la plateforme.
 */
const mongoose = require("mongoose");

const platformInvoiceSchema = new mongoose.Schema(
  {
    numero: { type: String, required: true, unique: true, index: true }, // PF-2026-0142

    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "platform-shop",
      required: true,
      index: true,
    },
    shopNom: { type: String },   // copie figee : la boutique peut etre renommee

    planId: { type: mongoose.Schema.Types.ObjectId, ref: "platform-plan" },
    planNom: { type: String },
    periodeLibelle: { type: String },     // "Jan 2026"
    periodeDebut: { type: Date },
    periodeFin: { type: Date },

    montant: { type: Number, required: true, min: 0 },
    devise: { type: String, default: () => process.env.DEFAULT_CURRENCY || "XAF" },

    statut: {
      type: String,
      enum: ["en_attente", "paye", "en_retard", "annule"],
      default: "en_attente",
      index: true,
    },
    dateEmission: { type: Date, default: Date.now },
    dateEcheance: { type: Date, required: true, index: true },
    datePaiement: { type: Date },
    joursRetard: { type: Number, default: 0 },

    // Rattachement a la transaction Mobile Money
    paiementId: { type: mongoose.Schema.Types.ObjectId, ref: "platform-payment" },
    relancesEnvoyees: { type: Number, default: 0 },
    derniereRelance: { type: Date },
  },
  { timestamps: true }
);

// Filtres de l'ecran "Factures boutiques" : par boutique, statut, periode
platformInvoiceSchema.index({ shopId: 1, dateEmission: -1 });
platformInvoiceSchema.index({ statut: 1, dateEcheance: 1 });

/** Numerotation sequentielle PF-AAAA-NNNN (continuite legale). */
platformInvoiceSchema.statics.genererNumero = async function genererNumero() {
  const annee = new Date().getFullYear();
  const dernier = await this.findOne({ numero: new RegExp(`^PF-${annee}-`) })
    .sort({ numero: -1 })
    .lean();
  const suivant = dernier ? Number(dernier.numero.split("-")[2]) + 1 : 1;
  return `PF-${annee}-${String(suivant).padStart(4, "0")}`;
};

module.exports = mongoose.model("platform-invoice", platformInvoiceSchema);
