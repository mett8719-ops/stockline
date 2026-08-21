/**
 * COMPTEUR D'USAGE AGREGE — alimente l'ecran "Analytique d'usage".
 *
 * ══ CONFIDENTIALITE ══
 * Ce document ne contient QUE des compteurs : module, jour, nombre de sessions.
 * Aucun montant, aucun nom de client, aucun contenu commercial.
 *
 * C'est ce qui rend l'analytique plateforme compatible avec l'isolation
 * stricte des tenants : le Super-Admin sait que "la caisse a genere 98 400
 * sessions ce mois" sans jamais savoir ce qui y a ete vendu.
 *
 * Les compteurs transitent par Redis (increment non bloquant) puis sont
 * consolides ici une fois par jour.
 */
const mongoose = require("mongoose");

const usageEventSchema = new mongoose.Schema(
  {
    jour: { type: String, required: true, index: true },      // AAAA-MM-JJ
    module: { type: String, required: true, index: true },    // pos, products...

    sessions: { type: Number, default: 0 },
    boutiquesActives: { type: Number, default: 0 },

    /** Taux d'adoption par plan : { starter: 42, pro: 88, enterprise: 100 } */
    adoptionParPlan: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

/** Un seul enregistrement par module et par jour. */
usageEventSchema.index({ jour: 1, module: 1 }, { unique: true });

/** Evolution d'un module dans le temps (courbes de l'ecran analytique). */
usageEventSchema.index({ module: 1, jour: -1 });

module.exports = mongoose.model("platform-usage-event", usageEventSchema);
