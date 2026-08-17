/**
 * Formateur de reponses HTTP standardisees.
 *
 * TOUTES les reponses de l'API suivent ce format :
 *   Succes : { success: true,  data: <payload>, meta?: { page, limit, total } }
 *   Erreur : { success: false, error: { message, code, details? } }
 *
 * Le frontend n'a donc qu'une seule forme a gerer, quel que soit le module.
 */

/** Reponse de succes. `meta` transporte la pagination. */
function success(res, data = null, statusCode = 200, meta = undefined) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

/** Reponse d'erreur (utilisee principalement par le gestionnaire global). */
function failure(res, message, statusCode = 400, code = "BAD_REQUEST", details = undefined) {
  const body = { success: false, error: { message, code } };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
}

/** Construit l'objet meta de pagination, identique sur toutes les listes. */
function paginationMeta(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
}

module.exports = { success, failure, paginationMeta };
