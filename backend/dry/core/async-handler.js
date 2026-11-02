/**
 * Enveloppe un controleur asynchrone : toute exception levee (ou promesse
 * rejetee) part automatiquement vers le gestionnaire d'erreurs global.
 *
 * Sans ce helper, une promesse rejetee dans un controleur async fait planter
 * le processus Node sans reponse HTTP — le client reste bloque.
 *
 * Usage :
 *   module.exports.create = asyncHandler(async (req, res) => { ... });
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
