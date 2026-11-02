/**
 * MOUVEMENT DE STOCK — journal IMMUABLE de toutes les variations.
 *
 * Chaque entree, sortie ou ajustement laisse une trace horodatee avec son
 * auteur, sa raison et le document qui l'a declenchee. C'est la piece
 * justificative en cas d'ecart d'inventaire ou de litige avec un employe.
 *
 * `stockAvant` et `stockApres` permettent de REJOUER tout l'historique et de
 * verifier qu'aucun mouvement n'a ete perdu : le stockApres d'un mouvement
 * doit toujours egaler le stockAvant du suivant.
 */
const mongoose = require("mongoose");
const tenantPlugin = require("../../../../../core/tenant.plugin");
const { STOCK_MOVEMENT_TYPES } = require("../../../../../core/constants");

const stockMovementSchema = new mongoose.Schema(
  {
    produitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-product",
      required: true,
      index: true,
    },
    // Fige : le produit peut etre renomme, l'historique doit rester lisible
    produitNom: { type: String },

    type: {
      type: String,
      enum: Object.values(STOCK_MOVEMENT_TYPES), // entree | sortie | ajustement
      required: true,
    },
    quantite: { type: Number, required: true },  // toujours positive

    stockAvant: { type: Number, required: true },
    stockApres: { type: Number, required: true },

    // "Livraison fournisseur", "Vente caisse #0234", "Produits avaries"...
    raison: { type: String, required: true, trim: true, maxlength: 200 },

    // Document a l'origine du mouvement
    referenceType: {
      type: String,
      enum: ["vente", "achat", "inventaire", "transfert", "manuel"],
      default: "manuel",
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    referenceLibelle: { type: String },   // "Vente caisse #0234"

    auteurId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
    auteurNom: { type: String, default: "Systeme" },

    /**
     * MODE HORS-LIGNE : identifiant genere par le poste de caisse.
     * Si le reseau coupe pendant la synchronisation et que la caisse renvoie
     * le meme mouvement, l'index unique ci-dessous le rejette au lieu de
     * doubler la sortie de stock.
     */
    clientOperationId: { type: String, index: true, sparse: true },
  },
  { timestamps: true }
);

stockMovementSchema.plugin(tenantPlugin);

// ══ INDEX ═════════════════════════════════════════════════════════════

/** Historique d'un produit precis (onglet de la fiche produit). */
stockMovementSchema.index({ shopId: 1, produitId: 1, createdAt: -1 });

/** Journal general de l'ecran "Stock & Mouvements". */
stockMovementSchema.index({ shopId: 1, createdAt: -1 });

/** Filtre "Tous les types" → entree / sortie / ajustement. */
stockMovementSchema.index({ shopId: 1, type: 1, createdAt: -1 });

/** Idempotence de la synchronisation hors-ligne. */
stockMovementSchema.index(
  { shopId: 1, clientOperationId: 1 },
  { unique: true, partialFilterExpression: { clientOperationId: { $type: "string" } } }
);

module.exports = mongoose.model("boutique-stock-movement", stockMovementSchema);
