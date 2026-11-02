/**
 * Gestionnaire d'erreurs global — DERNIER middleware de la chaine Express.
 *
 * Il traduit toutes les familles d'erreurs en reponse standardisee et, surtout,
 * ne divulgue jamais de detail technique au client en production (pas de stack
 * trace, pas de message Mongo brut qui revelerait la structure de la base).
 */
const AppError = require("./app-error");
const { failure } = require("./response");
const colors = require("colors");

/** Route inconnue → 404 JSON propre plutot que la page HTML d'Express. */
function notFoundHandler(req, res) {
  return failure(
    res,
    `Route introuvable : ${req.method} ${req.originalUrl}`,
    404,
    "ROUTE_NOT_FOUND"
  );
}

function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Erreur interne du serveur";
  let code = err.code || "INTERNAL_ERROR";
  let details = err.details;

  // ── Erreurs Mongoose ────────────────────────────────────────────────
  if (err.name === "ValidationError") {
    statusCode = 422;
    code = "VALIDATION_ERROR";
    message = "Donnees invalides";
    details = Object.values(err.errors).map((e) => ({
      champ: e.path,
      message: e.message,
    }));
  } else if (err.name === "CastError") {
    statusCode = 400;
    code = "INVALID_ID";
    message = `Identifiant invalide pour le champ ${err.path}`;
  } else if (err.code === 11000) {
    // Violation d'index unique. On nomme le champ concerne mais JAMAIS sa
    // valeur : sinon on confirmerait a un attaquant qu'un email existe.
    statusCode = 409;
    code = "DUPLICATE_KEY";
    const champ = Object.keys(err.keyPattern || {})
      .filter((k) => k !== "shopId")
      .join(", ");
    message = `Cette valeur existe deja${champ ? ` pour : ${champ}` : ""}`;
  }

  // ── Erreurs JWT ─────────────────────────────────────────────────────
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    code = "INVALID_TOKEN";
    message = "Jeton invalide";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    code = "TOKEN_EXPIRED";
    message = "Session expiree, veuillez vous reconnecter";
  }

  // ── Journalisation ──────────────────────────────────────────────────
  const contexte = `${req.method} ${req.originalUrl} [${statusCode}]`;
  if (statusCode >= 500) {
    console.error(`${contexte} ${message}`.red.bold);
    console.error(err.stack);
  } else {
    console.warn(`${contexte} ${message}`.yellow);
  }

  // En production, on masque le detail des 500 non maitrisees : un message
  // Mongo brut renseignerait un attaquant sur la structure de la base.
  if (
    statusCode >= 500 &&
    process.env.NODE_ENV === "production" &&
    !(err instanceof AppError)
  ) {
    message = "Une erreur interne est survenue. Notre equipe a ete notifiee.";
    details = undefined;
  }

  return failure(res, message, statusCode, code, details);
}

module.exports = { errorHandler, notFoundHandler };
