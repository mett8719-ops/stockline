/**
 * Erreur applicative typee.
 *
 * Usage depuis n'importe quel controleur ou service :
 *   throw AppError.notFound('Produit introuvable');
 *   throw AppError.forbidden('Stock insuffisant');
 *
 * Le gestionnaire d'erreurs global (error-handler.js) se charge de la mise en
 * forme HTTP. Aucun controleur n'ecrit `res.status(404).json(...)` a la main.
 */
class AppError extends Error {
  constructor(message, statusCode = 400, code = "BAD_REQUEST", details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;          // code machine, exploitable par le frontend
    this.details = details;    // detail par champ (erreurs de validation)
    this.isOperational = true; // distingue une erreur PREVUE d'un vrai bug
    Error.captureStackTrace(this, this.constructor);
  }
}

AppError.badRequest    = (m = "Requete invalide", d) => new AppError(m, 400, "BAD_REQUEST", d);
AppError.unauthorized  = (m = "Authentification requise") => new AppError(m, 401, "UNAUTHORIZED");
AppError.forbidden     = (m = "Acces refuse") => new AppError(m, 403, "FORBIDDEN");
AppError.notFound      = (m = "Ressource introuvable") => new AppError(m, 404, "NOT_FOUND");
AppError.conflict      = (m = "Conflit de donnees") => new AppError(m, 409, "CONFLICT");
AppError.unprocessable = (m = "Donnees invalides", d) => new AppError(m, 422, "UNPROCESSABLE", d);
AppError.tooMany       = (m = "Trop de requetes") => new AppError(m, 429, "TOO_MANY_REQUESTS");
AppError.internal      = (m = "Erreur interne") => new AppError(m, 500, "INTERNAL_ERROR");

module.exports = AppError;
