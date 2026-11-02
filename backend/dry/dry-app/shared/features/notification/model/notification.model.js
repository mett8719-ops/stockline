/**
 * NOTIFICATION du centre de notifications (boutique ET plateforme).
 *
 * PAS DE PLUGIN TENANT : une notification appartient a son DESTINATAIRE, pas a
 * une boutique. Le staff plateforme en recoit aussi, et il n'a pas de shopId.
 * L'isolation se fait donc sur `destinataireId`.
 *
 * INDEX TTL : les notifications de plus de 90 jours sont supprimees
 * automatiquement par MongoDB. Sans cela, la collection grossirait
 * indefiniment — plusieurs millions de documents inutiles au bout d'un an.
 */
const mongoose = require("mongoose");
const { NOTIFICATION_CATEGORIES } = require("../../../../../core/constants");

const notificationSchema = new mongoose.Schema(
  {
    destinataireId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "boutique-user",
      required: true,
      index: true,
    },
    // null pour une notification destinee au staff plateforme
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "platform-shop",
      default: null,
      index: true,
    },

    titre: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 500 },

    categorie: {
      type: String,
      enum: Object.values(NOTIFICATION_CATEGORIES),
      default: NOTIFICATION_CATEGORIES.SYSTEM,
      index: true,
    },

    /** Route frontend ouverte au clic sur la notification. */
    lien: { type: String },

    /** Donnees libres exploitables par le frontend (id de la ressource...). */
    meta: { type: mongoose.Schema.Types.Mixed },

    lu: { type: Boolean, default: false, index: true },
    luLe: { type: Date },
  },
  { timestamps: true }
);

// ══ INDEX ═════════════════════════════════════════════════════════════

/** Liste du centre de notifications : non-lues d'abord, puis par date. */
notificationSchema.index({ destinataireId: 1, lu: 1, createdAt: -1 });

/** Filtres par categorie (Comptes, Facturation, Securite, Systeme). */
notificationSchema.index({ shopId: 1, categorie: 1, createdAt: -1 });

/** Purge automatique apres 90 jours. */
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model("shared-notification", notificationSchema);
