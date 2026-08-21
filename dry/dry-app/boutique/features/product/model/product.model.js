/**
 * PRODUIT du catalogue.
 *
 * ══ POINT CLE : stockActuel est MATERIALISE ══
 * Le stock est stocke sur le produit, et non recalcule depuis les mouvements.
 * L'ecran de caisse affiche "Stock : 48 sac" sur chaque carte produit :
 * recalculer par agregation a chaque affichage de la grille serait bien trop
 * lent sur un poste utilise toute la journee.
 *
 * CONTREPARTIE : ce champ ne doit JAMAIS etre modifie directement. Toute
 * variation passe par le service stock, qui ecrit le mouvement ET met a jour
 * le compteur dans la meme operation. Sans cette discipline, le stock affiche
 * et l'historique des mouvements divergeraient.
 */
const mongoose = require("mongoose");
const tenantPlugin = require("../../../../../core/tenant.plugin");

const productSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, maxlength: 150 },
    sku: { type: String, trim: true, uppercase: true },   // reference interne
    codeBarre: { type: String, trim: true },

    categorieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-category",
      index: true,
    },
    // Denormalise : evite un populate a chaque ligne de la liste catalogue
    categorieNom: { type: String, trim: true },

    // Unite de vente : sac, kg, bidon, boite, bouteille, paquet, piece...
    unite: { type: String, default: "piece", trim: true },

    prixAchat: { type: Number, required: true, min: 0 },
    prixVente: { type: Number, required: true, min: 0 },
    tauxTva: { type: Number, default: 0, min: 0, max: 100 },

    stockActuel: { type: Number, default: 0 },
    seuilAlerte: { type: Number, default: 0, min: 0 },  // declenche "Stock bas"
    stockMax: { type: Number, min: 0 },

    photoUrl: { type: String },                          // URL Cloudinary
    datePeremption: { type: Date },                      // alimentaire, pharmacie
    fournisseurId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-supplier" },

    /**
     * SUPPRESSION LOGIQUE.
     * On ne supprime jamais physiquement un produit deja vendu : cela
     * casserait l'historique des ventes et fausserait tous les rapports passes.
     */
    actif: { type: Boolean, default: true, index: true },

    /**
     * Historique des changements de prix.
     * Une modification de tarif est une action sensible : on garde la trace de
     * qui l'a faite et quand, pour pouvoir expliquer une variation de marge.
     */
    historiquePrix: [
      {
        prixAchat: Number,
        prixVente: Number,
        modifieLe: { type: Date, default: Date.now },
        modifiePar: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.plugin(tenantPlugin);

// ══ INDEX — tous prefixes par shopId ══════════════════════════════════

/** SKU unique dans la boutique, uniquement s'il est renseigne. */
productSchema.index(
  { shopId: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: "string" } } }
);

/** Scan de code-barres en caisse : doit repondre en quelques millisecondes. */
productSchema.index(
  { shopId: 1, codeBarre: 1 },
  { partialFilterExpression: { codeBarre: { $type: "string" } } }
);

/** Filtre par categorie dans la grille du POS. */
productSchema.index({ shopId: 1, categorieId: 1, actif: 1 });

/** Recherche instantanee par nom ou reference ("Rechercher un produit..."). */
productSchema.index({ shopId: 1, nom: "text", sku: "text" });

/** Alertes de stock bas : tableau de bord + bandeau du module Stock. */
productSchema.index({ shopId: 1, stockActuel: 1, actif: 1 });

/** Alertes de peremption (secteur alimentaire et pharmacie). */
productSchema.index(
  { shopId: 1, datePeremption: 1 },
  { partialFilterExpression: { datePeremption: { $type: "date" } } }
);

// ══ CHAMPS VIRTUELS ═══════════════════════════════════════════════════
// Calcules a la lecture, jamais stockes : impossible qu'ils se desynchronisent.

/** Marge unitaire en valeur. */
productSchema.virtual("marge").get(function marge() {
  return (this.prixVente || 0) - (this.prixAchat || 0);
});

/** Colonne "Marge" du catalogue : +25 %, +29 %, +32 %... */
productSchema.virtual("margePourcent").get(function margePourcent() {
  if (!this.prixAchat) return 0;
  return Math.round(((this.prixVente - this.prixAchat) / this.prixAchat) * 100);
});

/** Badge de la colonne "Statut" : En stock / Stock bas / Rupture. */
productSchema.virtual("statutStock").get(function statutStock() {
  if (this.stockActuel <= 0) return "rupture";
  if (this.seuilAlerte > 0 && this.stockActuel <= this.seuilAlerte) return "stock_bas";
  return "en_stock";
});

module.exports = mongoose.model("boutique-product", productSchema);
