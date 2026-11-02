/**
 * VENTE realisee en caisse (POS).
 *
 * ══ TROIS POINTS ESSENTIELS ══
 *
 * 1. COPIES FIGEES — chaque ligne stocke le nom du produit, son prix de vente
 *    ET son prix d'achat au moment de la vente. Si un produit change de tarif
 *    demain, le chiffre d'affaires et le benefice d'aujourd'hui ne doivent pas
 *    bouger retroactivement.
 *
 * 2. PAIEMENTS COMBINES — une vente peut etre reglee avec plusieurs modes
 *    (especes + mobile money + credit). D'ou un tableau plutot qu'un champ.
 *
 * 3. IDEMPOTENCE HORS-LIGNE — clientOperationId avec index unique : si une
 *    caisse synchronise deux fois la meme vente apres une coupure reseau,
 *    MongoDB rejette le doublon au lieu de decrementer le stock deux fois.
 */
const mongoose = require("mongoose");
const tenantPlugin = require("../../../../../core/tenant.plugin");
const { PAYMENT_METHODS } = require("../../../../../core/constants");

/** Une ligne du panier. `_id: false` : pas d'identifiant par sous-document. */
const ligneSchema = new mongoose.Schema(
  {
    produitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-product",
      required: true,
    },
    produitNom: { type: String, required: true },   // fige
    unite: { type: String },
    quantite: { type: Number, required: true, min: 0 },

    prixUnitaire: { type: Number, required: true, min: 0 },  // prix applique
    /** Fige : indispensable pour que le benefice reste juste dans le temps. */
    prixAchatUnitaire: { type: Number, default: 0 },

    remise: { type: Number, default: 0, min: 0 },
    totalLigne: { type: Number, required: true, min: 0 },
    beneficeLigne: { type: Number, default: 0 },
  },
  { _id: false }
);

/** Un mode de paiement utilise pour cette vente. */
const paiementSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: PAYMENT_METHODS, required: true },
    montant: { type: Number, required: true, min: 0 },
    reference: { type: String },   // reference de transaction Mobile Money
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true },   // #0238

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-customer",
      default: null,
      index: true,
    },
    clientNom: { type: String },

    lignes: {
      type: [ligneSchema],
      validate: [
        (v) => Array.isArray(v) && v.length > 0,
        "La vente doit contenir au moins une ligne",
      ],
    },

    sousTotal: { type: Number, required: true, min: 0 },
    remiseGlobale: { type: Number, default: 0, min: 0 },
    montantTva: { type: Number, default: 0, min: 0 },
    montantTotal: { type: Number, required: true, min: 0 },

    paiements: { type: [paiementSchema], default: [] },
    montantPaye: { type: Number, default: 0, min: 0 },      // regle immediatement
    montantRemis: { type: Number, default: 0, min: 0 },     // argent donne par le client
    monnaieRendue: { type: Number, default: 0, min: 0 },
    montantCredit: { type: Number, default: 0, min: 0 },    // part laissee a credit

    beneficeTotal: { type: Number, default: 0 },

    statut: {
      type: String,
      enum: ["payee", "partielle", "credit", "annulee"],
      default: "payee",
      index: true,
    },

    caissierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-user",
      index: true,
    },
    caissierNom: { type: String },
    sessionCaisseId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-cash-session" },

    // ── Annulation (action sensible, reservee a l'admin et auditee) ──────
    annuleeLe: { type: Date },
    annuleePar: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
    motifAnnulation: { type: String, maxlength: 300 },

    // ── Mode hors-ligne ─────────────────────────────────────────────────
    clientOperationId: { type: String, sparse: true },
    synchroniseeLe: { type: Date },
    creeeHorsLigne: { type: Boolean, default: false },

    /**
     * Date REELLE de la vente. Distincte de createdAt : une vente conclue
     * hors ligne a 14h et synchronisee a 18h doit apparaitre a 14h dans les
     * rapports, sinon le chiffre d'affaires par heure serait fausse.
     */
    date: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

saleSchema.plugin(tenantPlugin);

// ══ INDEX ═════════════════════════════════════════════════════════════

/** Historique des ventes, du plus recent au plus ancien. */
saleSchema.index({ shopId: 1, date: -1 });

/** Numerotation unique par boutique. */
saleSchema.index({ shopId: 1, reference: 1 }, { unique: true });

/** Historique d'achats d'un client (fiche client). */
saleSchema.index({ shopId: 1, clientId: 1, date: -1 });

/** Rapport de ventes par caissier. */
saleSchema.index({ shopId: 1, caissierId: 1, date: -1 });

/** Filtre par statut (masquer les annulations par defaut). */
saleSchema.index({ shopId: 1, statut: 1, date: -1 });

/** Idempotence de la synchronisation hors-ligne. */
saleSchema.index(
  { shopId: 1, clientOperationId: 1 },
  { unique: true, partialFilterExpression: { clientOperationId: { $type: "string" } } }
);

/**
 * Numerotation sequentielle PAR BOUTIQUE : #0001, #0002...
 * Chaque boutique a sa propre serie, independante des autres.
 */
saleSchema.statics.genererReference = async function genererReference(shopId) {
  const derniere = await this.findOne({ shopId })
    .sort({ createdAt: -1 })
    .select("reference")
    .lean();

  const suivant = derniere
    ? Number(String(derniere.reference).replace("#", "")) + 1
    : 1;

  return `#${String(suivant).padStart(4, "0")}`;
};

module.exports = mongoose.model("boutique-sale", saleSchema);
