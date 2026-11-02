/**
 * PARAMETRES GLOBAUX DE LA PLATEFORME — document UNIQUE (singleton).
 *
 * Correspond a l'ecran "Parametres plateforme" et ses trois onglets :
 * General · Emails & Notifications · Limites & Quotas.
 *
 * Le champ `cle: "global"` avec index unique garantit qu'il ne peut exister
 * qu'un seul document de configuration.
 */
const mongoose = require("mongoose");

const platformSettingsSchema = new mongoose.Schema(
  {
    cle: { type: String, default: "global", unique: true },

    // ── Onglet General ──────────────────────────────────────────────────
    general: {
      nomPlateforme: { type: String, default: "Stockline" },
      urlPrincipale: { type: String, default: "https://app.stockline.cg" },
      emailSupport: { type: String, default: "support@stockline.cg" },
      emailFacturation: { type: String, default: "billing@stockline.cg" },
      deviseParDefaut: { type: String, default: "XAF" },
      fuseauHoraire: { type: String, default: "Africa/Brazzaville" },
    },

    // ── Onglet Emails & Notifications ───────────────────────────────────
    emails: {
      serveurSmtp: { type: String },
      portSmtp: { type: Number, default: 587 },
      expediteurParDefaut: { type: String },
      // Cases a cocher de l'ecran : activation par type d'email
      emailBienvenue: { type: Boolean, default: true },
      emailRappelPaiement: { type: Boolean, default: true },
      emailSuspension: { type: Boolean, default: true },
      alertesSysteme: { type: Boolean, default: true },
    },

    // ── Politique de facturation ────────────────────────────────────────
    facturation: {
      /** Jours avant suspension effective d'un compte impaye. */
      delaiGraceJours: { type: Number, default: 7 },
      /** Jours avant echeance auxquels une relance est envoyee. */
      joursRelance: { type: [Number], default: [7, 3, 0] },
      suspensionAutomatique: { type: Boolean, default: true },
    },

    modifiePar: { type: mongoose.Schema.Types.ObjectId, ref: "boutique-user" },
  },
  { timestamps: true }
);

/**
 * Recupere le document unique, ou le cree au premier appel avec les valeurs
 * par defaut. Evite d'avoir a l'initialiser manuellement.
 */
platformSettingsSchema.statics.get = async function get() {
  let doc = await this.findOne({ cle: "global" });
  if (!doc) doc = await this.create({ cle: "global" });
  return doc;
};

module.exports = mongoose.model("platform-settings", platformSettingsSchema);
