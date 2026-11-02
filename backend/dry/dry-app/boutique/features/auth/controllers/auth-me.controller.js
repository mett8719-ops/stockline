/**
 * GET /auth/me — Profil de l'utilisateur connecte.
 *
 * Point d'entree appele par le frontend au chargement de l'application : il
 * renvoie en un seul appel le profil, la boutique, le plan et les permissions
 * — evitant trois requetes separees au demarrage.
 */
const asyncHandler = require("../../../../../core/async-handler");
const { success } = require("../../../../../core/response");
const UserModel = require("../model/user.model");
const ShopModel = require("../../../../platform/features/shop/model/shop.model");

module.exports = asyncHandler(async (req, res) => {
  const utilisateur = await UserModel.findById(req.user.id)
    .select("+permissions")
    .populate("customRole", "nom permissions couleur")
    .lean();

  let boutique = null;
  if (req.user.shopId) {
    boutique = await ShopModel.findById(req.user.shopId)
      .populate("planId", "nom prix devise quotas fonctionnalites")
      .lean();
  }

  return success(res, {
    utilisateur: {
      id: utilisateur._id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      telephone: utilisateur.telephone,
      role: utilisateur.role,
      // Libelle affiche : nom du role personnalise s'il existe
      roleLibelle: utilisateur.customRole?.nom || utilisateur.role,
      couleurRole: utilisateur.customRole?.couleur,
      permissions: req.user.permissions,
      doitChangerMotDePasse: utilisateur.doitChangerMotDePasse,
      aTermineVisiteGuidee: utilisateur.aTermineVisiteGuidee,
      derniereConnexion: utilisateur.derniereConnexion,
    },
    boutique: boutique
      ? {
          id: boutique._id,
          nom: boutique.nom,
          code: boutique.code,
          typeActivite: boutique.typeActivite,
          ville: boutique.ville,
          adresse: boutique.adresse,
          telephone: boutique.telephone,
          logoUrl: boutique.logoUrl,
          devise: boutique.devise,
          tauxTva: boutique.tauxTva,
          statut: boutique.statut,
          onboardingTermine: boutique.onboardingTermine,
          etapesOnboarding: boutique.etapesOnboarding,
          dateProchainRenouvellement: boutique.dateProchainRenouvellement,
        }
      : null,
    plan: boutique?.planId || null,
  });
});
