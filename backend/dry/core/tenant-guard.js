/**
 * ══════════════════════════════════════════════════════════════════════════
 *  ISOLATION MULTI-TENANT — LE FICHIER LE PLUS CRITIQUE DU PROJET
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Toutes les boutiques partagent les memes collections MongoDB. La SEULE chose
 * qui empeche la boutique A de lire les donnees de la boutique B est le filtre
 * `shopId`. Un oubli dans un seul controleur = fuite de donnees entre clients.
 *
 * REGLE D'EQUIPE ABSOLUE :
 *   Aucune requete metier n'appelle Model.find({...}) directement.
 *   On passe TOUJOURS par tenantScope(req, {...}).
 *
 * Deuxieme barriere : le plugin Mongoose `tenant.plugin.js` refuse tout
 * enregistrement sans shopId et signale, en developpement, toute requete
 * lancee sans filtre d'isolation.
 */
const AppError = require("./app-error");

/**
 * Construit un filtre de requete garanti isole sur la boutique courante.
 *
 * @param {object} req    - requete Express (doit avoir traverse `authenticate`)
 * @param {object} filtre - criteres metier additionnels
 * @returns {object} filtre MongoDB avec shopId force
 *
 * @example
 *   const produits = await ProductModel.find(tenantScope(req, { actif: true }));
 */
function tenantScope(req, filtre = {}) {
  if (!req.user) throw AppError.unauthorized();
  if (!req.user.shopId) {
    throw AppError.forbidden("Operation impossible : aucun contexte boutique");
  }
  // Le shopId est ecrase EN DERNIER : meme si un client malveillant envoie
  // "shopId" dans le corps ou la query string, sa valeur est ignoree.
  return { ...filtre, shopId: req.user.shopId };
}

/**
 * Prepare un document a inserer en forcant son rattachement a la boutique.
 * Retire aussi les champs qu'un client ne doit jamais pouvoir imposer.
 *
 * @example
 *   const produit = await ProductModel.create(tenantPayload(req, req.validated.body));
 */
function tenantPayload(req, donnees = {}) {
  if (!req.user?.shopId) {
    throw AppError.forbidden("Operation impossible : aucun contexte boutique");
  }
  // eslint-disable-next-line no-unused-vars
  const { shopId, _id, createdAt, updatedAt, ...propre } = donnees;
  return { ...propre, shopId: req.user.shopId };
}

/**
 * Verifie qu'une ressource DEJA CHARGEE appartient bien a la boutique courante.
 * Derniere ligne de defense avant une modification ou une suppression.
 *
 * @example
 *   const vente = await SaleModel.findById(id);
 *   assertSameTenant(req, vente, 'Vente');
 */
function assertSameTenant(req, ressource, libelle = "Ressource") {
  if (!ressource) throw AppError.notFound(`${libelle} introuvable`);

  const proprietaire = ressource.shopId?.toString?.() ?? String(ressource.shopId);
  if (proprietaire !== req.user.shopId) {
    // On renvoie volontairement 404 et NON 403 : un 403 confirmerait a un
    // attaquant que la ressource existe bien dans une autre boutique.
    throw AppError.notFound(`${libelle} introuvable`);
  }
  return ressource;
}

module.exports = { tenantScope, tenantPayload, assertSameTenant };
