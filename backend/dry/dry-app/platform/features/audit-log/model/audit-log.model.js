/**
 * JOURNAL D'AUDIT des actions sensibles.
 *
 * Alimente l'ecran "Journaux & Securite" de la console Super-Admin.
 *
 * Actions systematiquement journalisees : modification de prix, annulation de
 * vente, ajustement de stock, creation ou suppression de compte, changement de
 * plan, gel ou bannissement d'une boutique, tentatives de connexion suspectes,
 * et tout acces du Super-Admin a un dossier tenant.
 *
 * RETENTION : 2 ans, purge automatique par index TTL.
 */
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    /** Verbe metier : "shop.ban", "sale.cancel", "product.price_changed"... */
    action: { type: String, required: true, index: true },

    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "platform-shop",
      default: null,
      index: true,
    },

    auteurId: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
    auteurNom: { type: String },
    auteurRole: { type: String },

    cible: { type: String },     // type de ressource : "Product", "Sale"...
    cibleId: { type: String },

    /** Etat avant / apres : permet de comprendre exactement ce qui a change. */
    avant: { type: mongoose.Schema.Types.Mixed },
    apres: { type: mongoose.Schema.Types.Mixed },

    severite: {
      type: String,
      enum: ["info", "moyenne", "haute"],
      default: "info",
      index: true,
    },

    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

/** Journal d'une boutique precise (fiche tenant du Super-Admin). */
auditLogSchema.index({ shopId: 1, createdAt: -1 });

/** Filtre par severite — les alertes de securite en priorite. */
auditLogSchema.index({ severite: 1, createdAt: -1 });

/** Recherche par type d'action. */
auditLogSchema.index({ action: 1, createdAt: -1 });

/** Retention 2 ans. */
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 730 });

module.exports = mongoose.model("platform-audit-log", auditLogSchema);
