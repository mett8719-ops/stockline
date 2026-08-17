/**
 * Client Redis TOLERANT AUX PANNES.
 *
 * Redis sert aux compteurs d'usage, a la limitation de debit et a la presence
 * temps reel — jamais a stocker une donnee metier critique.
 *
 * REGLE : l'application doit continuer a fonctionner si Redis tombe. Toutes les
 * fonctions ci-dessous echouent silencieusement (retour null) plutot que de
 * faire planter une vente en caisse.
 */
const Redis = require("ioredis");
const colors = require("colors");

let client = null;
let dejaAverti = false;

function getRedis() {
  if (client) return client;

  client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    // Reconnexion progressive : 50ms, 100ms, 150ms... plafonnee a 3s
    retryStrategy: (times) => Math.min(times * 50, 3000),
  });

  client.on("error", (e) => {
    // Une seule alerte : sinon les logs sont noyes si Redis est durablement down
    if (!dejaAverti) {
      console.warn(`Redis indisponible — mode degrade actif : ${e.message}`.yellow);
      dejaAverti = true;
    }
  });

  client.on("ready", () => {
    dejaAverti = false;
    console.log("Redis connecte".green);
  });

  return client;
}

async function safeGet(key) {
  try { return await getRedis().get(key); } catch { return null; }
}

async function safeSet(key, value, ttlSeconds) {
  try {
    const r = getRedis();
    return ttlSeconds ? await r.set(key, value, "EX", ttlSeconds) : await r.set(key, value);
  } catch { return null; }
}

async function safeIncr(key, ttlSeconds) {
  try {
    const r = getRedis();
    const v = await r.incr(key);
    if (ttlSeconds && v === 1) await r.expire(key, ttlSeconds);
    return v;
  } catch { return null; }
}

async function safeDel(key) {
  try { return await getRedis().del(key); } catch { return null; }
}

module.exports = { getRedis, safeGet, safeSet, safeIncr, safeDel };
