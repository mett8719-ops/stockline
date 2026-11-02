/**
 * SESSION D'INVENTAIRE PHYSIQUE.
 *
 * Cycle : demarrage (fige le stock theorique de chaque produit) → saisie des
 * quantites comptees → cloture IRREVERSIBLE qui aligne le stock systeme sur le
 * comptage reel via des mouvements d'ajustement traces.
 *
 * L'ecart est calcule automatiquement : quantite comptee - stock theorique.
 */
const mongoose = require("mongoose");
const tenantPlugin = require("../../../../../core/tenant.plugin");

const ligneInventaireSchema = new mongoose.Schema(
  {
    produitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-product",
      required: true,
    },
    produitNom: { type: String },
    categorieNom: { type: String },
    unite: { type: String },

    /** Stock systeme FIGE au demarrage de la session. */
    stockTheorique: { type: Number, required: true },

    /** null = article pas encore compte (badge "En attente"). */
    quantiteComptee: { type: Number, default: null },

    ecart: { type: Number, default: 0 },
    valeurEcart: { type: Number, default: 0 },   // ecart x prix d'achat

    statut: {
      type: String,
      enum: ["en_attente", "conforme", "deficit", "excedent"],
      default: "en_attente",
    },
    commentaire: { type: String, maxlength: 200 },
  },
  { _id: false }
);

const inventorySchema = new mongoose.Schema(
  {
    reference: { type: String, required: true },   // INV-2026-01
    lignes: { type: [ligneInventaireSchema], default: [] },

    statut: {
      type: String,
      enum: ["en_cours", "cloture", "annule"],
      default: "en_cours",
      index: true,
    },

    // Alimentent la barre de progression et les indicateurs de l'ecran
    nombreArticles: { type: Number, default: 0 },
    articlesComptes: { type: Number, default: 0 },
    nombreEcarts: { type: Number, default: 0 },
    valeurTotale: { type: Number, default: 0 },
    deficitTotal: { type: Number, default: 0 },   // negatif ou nul

    demarreLe: { type: Date, default: Date.now },
    clotureLe: { type: Date },

    realiseParId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
    realiseParNom: { type: String },
    valideParId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },

    rapportPdfUrl: { type: String },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

inventorySchema.plugin(tenantPlugin);

/** Historique des inventaires, du plus recent au plus ancien. */
inventorySchema.index({ shopId: 1, demarreLe: -1 });
inventorySchema.index({ shopId: 1, reference: 1 }, { unique: true });

/**
 * INDEX PARTIEL UNIQUE : une seule session ouverte a la fois par boutique.
 * Sans cette contrainte, deux magasiniers pourraient compter le meme stock en
 * parallele et produire des resultats contradictoires.
 */
inventorySchema.index(
  { shopId: 1, statut: 1 },
  { unique: true, partialFilterExpression: { statut: "en_cours" } }
);

/** Reference sequentielle INV-2026-01, INV-2026-02... */
inventorySchema.statics.genererReference = async function genererReference(shopId) {
  const annee = new Date().getFullYear();
  const prefixe = `INV-${annee}`;

  const dernier = await this.findOne({ shopId, reference: new RegExp(`^${prefixe}-`) })
    .sort({ reference: -1 })
    .select("reference")
    .lean();

  const suivant = dernier ? Number(dernier.reference.split("-")[2]) + 1 : 1;
  return `${prefixe}-${String(suivant).padStart(2, "0")}`;
};

module.exports = mongoose.model("boutique-inventory", inventorySchema);
