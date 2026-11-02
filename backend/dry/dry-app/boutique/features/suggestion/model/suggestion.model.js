/**
 * SUGGESTION D'AMELIORATION (boite a suggestions interne a la boutique).
 *
 * Les agents proposent, l'equipe vote, l'admin repond et fait evoluer le
 * statut : en attente → en analyse → planifie → livre (ou refuse).
 */
const mongoose = require("mongoose");
const tenantPlugin = require("../../../../../core/tenant.plugin");
const { SUGGESTION_STATUS } = require("../../../../../core/constants");

const suggestionSchema = new mongoose.Schema(
  {
    titre: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },

    module: {
      type: String,
      enum: ["caisse", "stock", "clients", "factures", "rapports", "autre"],
      default: "autre",
      index: true,
    },

    statut: {
      type: String,
      enum: Object.values(SUGGESTION_STATUS),
      default: SUGGESTION_STATUS.PENDING,
      index: true,
    },

    auteurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-user",
      required: true,
    },
    auteurNom: { type: String },

    /**
     * On stocke la LISTE des votants, pas seulement un compteur : c'est ce qui
     * permet d'empecher un double vote et d'afficher l'etat du bouton pour
     * l'utilisateur courant.
     */
    votants: [{ type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" }],
    nombreVotes: { type: Number, default: 0, index: true },

    reponseEquipe: {
      texte: { type: String, maxlength: 2000 },
      auteurId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
      auteurNom: String,
      date: Date,
    },

    /** Remontee anonymisee vers la roadmap produit Stockline. */
    remonteePlateforme: { type: Boolean, default: false },
  },
  { timestamps: true }
);

suggestionSchema.plugin(tenantPlugin);

/** Tri par nombre de votes decroissant, filtre par statut. */
suggestionSchema.index({ shopId: 1, statut: 1, nombreVotes: -1 });

/** Filtres par module (Caisse, Stock, Clients...). */
suggestionSchema.index({ shopId: 1, module: 1, createdAt: -1 });

module.exports = mongoose.model("boutique-suggestion", suggestionSchema);
