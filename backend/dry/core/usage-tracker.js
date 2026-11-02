/**
 * Suivi d'usage des modules — alimente l'ecran "Analytique d'usage".
 *
 * ══ CONFIDENTIALITE ══
 * On ne stocke QUE des compteurs agreges (module, jour, nombre de sessions).
 * Aucun contenu commercial, aucun montant, aucune donnee client ne remonte
 * cote plateforme. C'est ce qui rend cette analytique compatible avec
 * l'isolation stricte des tenants.
 *
 * Les compteurs transitent par Redis (increment tres rapide, non bloquant)
 * puis sont consolides en base une fois par jour.
 */
const { safeIncr, getRedis } = require("./redis-client");
const colors = require("colors");

/** Middleware : compte une "session d'usage" du module a chaque requete. */
function trackUsage(moduleName) {
  return (req, _res, next) => {
    if (req.user?.shopId) {
      const jour = new Date().toISOString().slice(0, 10); // AAAA-MM-JJ
      const TTL = 60 * 60 * 24 * 40; // 40 jours

      // Compteur global du module (classement plateforme)
      safeIncr(`usage:${jour}:module:${moduleName}`, TTL);
      // Marqueur d'adoption : cette boutique a-t-elle utilise ce module ce jour ?
      safeIncr(`usage:${jour}:shop:${req.user.shopId}:${moduleName}`, TTL);
    }
    return next();
  };
}

/**
 * Consolide les compteurs Redis du jour dans la collection `usageevents`.
 * A appeler par une tache planifiee (cron) une fois par jour.
 */
async function flushUsageToDatabase(jour = new Date().toISOString().slice(0, 10)) {
  const UsageEventModel = require("../dry-app/platform/features/analytic/model/usage-event.model");
  try {
    const redis = getRedis();
    const cles = await redis.keys(`usage:${jour}:module:*`);
    const operations = [];

    for (const cle of cles) {
      const module = cle.split(":").pop();
      const total = Number(await redis.get(cle)) || 0;
      operations.push({
        updateOne: {
          filter: { jour, module },
          update: { $set: { sessions: total } },
          upsert: true,
        },
      });
    }

    if (operations.length) await UsageEventModel.bulkWrite(operations);
    console.log(`Compteurs d'usage consolides : ${operations.length} modules`.cyan);
  } catch (e) {
    console.error(`Echec de consolidation des compteurs : ${e.message}`.red);
  }
}

module.exports = { trackUsage, flushUsageToDatabase };
