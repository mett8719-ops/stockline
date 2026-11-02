/**
 * Limitation de debit — protection contre la force brute et l'abus d'API.
 *
 * Trois niveaux calibres selon le risque :
 *   authLimiter   : tres strict (anti force-brute sur la connexion)
 *   publicLimiter : formulaire d'inscription public (anti-spam de demandes)
 *   apiLimiter    : plafond general par utilisateur authentifie
 */
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { failure } = require("./response");

const handler = (req, res) =>
  failure(
    res,
    "Trop de requetes. Veuillez reessayer dans quelques minutes.",
    429,
    "TOO_MANY_REQUESTS"
  );

/**
 * Connexion / mot de passe oublie : 8 tentatives par IP toutes les 15 min.
 * `skipSuccessfulRequests` : une connexion reussie ne consomme pas le quota,
 * un caissier qui se reconnecte souvent n'est donc jamais bloque.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler,
});

/** Inscription publique : 5 demandes par IP et par heure. */
const publicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/**
 * Usage normal : 300 requetes / 15 min par UTILISATEUR (et non par IP).
 * Important au Congo : plusieurs caisses d'une meme boutique partagent souvent
 * la meme connexion internet, donc la meme IP publique. Limiter par IP
 * bloquerait toute la boutique des que deux caissiers travaillent en parallele.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  validate: { keyGeneratorIpFallback: false },
  handler,
});

module.exports = { authLimiter, publicLimiter, apiLimiter };
