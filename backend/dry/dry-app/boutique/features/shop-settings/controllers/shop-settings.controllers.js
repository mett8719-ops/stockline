const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");
const ShopModel = require("../../../platform/features/shop/model/shop.model");

/**
 * Formate les donnees d'une boutique pour la reponse API des parametres.
 */
function formatShopSettings(shop) {
  return {
    id: shop._id,
    code: shop.code,
    nom: shop.nom,
    typeActivite: shop.typeActivite,
    adresse: shop.adresse || "",
    ville: shop.ville || "",
    pays: shop.pays || "Congo",
    telephone: shop.telephone || "",
    email: shop.email || "",
    rccm: shop.rccm || "",
    devise: shop.devise || "XAF",
    delaiPaiementClient: shop.delaiPaiementClient ?? 30,
    delaiPaiementFournisseur: shop.delaiPaiementFournisseur ?? 15,
    tauxTva: shop.tauxTva ?? 0,
    logoUrl: shop.logoUrl || null,
    onboardingTermine: Boolean(shop.onboardingTermine),
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
  };
}

/**
 * GET /settings (ou /shop) — Lecture des parametres de la boutique connectee.
 * Accessible par tous les utilisateurs autorises de cette boutique.
 * Isolation tenant stricte : lit uniquement req.user.shopId.
 */
const getSettings = asyncHandler(async (req, res) => {
  const shopId = req.user?.shopId;
  if (!shopId) {
    throw AppError.unauthorized("Utilisateur non associe a une boutique");
  }

  const shop = await ShopModel.findById(shopId);
  if (!shop) {
    throw AppError.notFound("Boutique introuvable");
  }

  return success(res, formatShopSettings(shop));
});

/**
 * PUT / PATCH /settings (ou /shop) — Mise a jour des parametres boutique.
 * Reserve strictement a l'administrateur de cette boutique.
 * Isolation tenant stricte : modifie uniquement req.user.shopId.
 */
const updateSettings = asyncHandler(async (req, res) => {
  const shopId = req.user?.shopId;
  if (!shopId) {
    throw AppError.unauthorized("Utilisateur non associe a une boutique");
  }

  // Seul l'administrateur de la boutique est habilite a modifier ses parametres
  if (req.user.role !== "admin") {
    throw AppError.forbidden("Seul l'administrateur de la boutique peut modifier ses parametres");
  }

  const shop = await ShopModel.findById(shopId);
  if (!shop) {
    throw AppError.notFound("Boutique introuvable");
  }

  const donnees = req.validated.body;
  const avant = {
    nom: shop.nom,
    adresse: shop.adresse,
    telephone: shop.telephone,
    email: shop.email,
    rccm: shop.rccm,
    devise: shop.devise,
    delaiPaiementClient: shop.delaiPaiementClient,
    delaiPaiementFournisseur: shop.delaiPaiementFournisseur,
  };

  // Mise a jour securisee des champs autorises
  if (donnees.nom !== undefined) shop.nom = donnees.nom;
  if (donnees.adresse !== undefined) shop.adresse = donnees.adresse || "";
  if (donnees.ville !== undefined) shop.ville = donnees.ville || "";
  if (donnees.pays !== undefined) shop.pays = donnees.pays;
  if (donnees.telephone !== undefined) shop.telephone = donnees.telephone || "";
  if (donnees.email !== undefined) shop.email = donnees.email || "";
  if (donnees.rccm !== undefined) shop.rccm = donnees.rccm || "";
  if (donnees.devise !== undefined) shop.devise = donnees.devise;
  if (donnees.delaiPaiementClient !== undefined) shop.delaiPaiementClient = donnees.delaiPaiementClient;
  if (donnees.delaiPaiementFournisseur !== undefined) shop.delaiPaiementFournisseur = donnees.delaiPaiementFournisseur;
  if (donnees.tauxTva !== undefined) shop.tauxTva = donnees.tauxTva;

  if (donnees.logoUrl !== undefined) {
    shop.logoUrl = donnees.logoUrl || null;
    if (donnees.logoUrl) {
      shop.etapesOnboarding = shop.etapesOnboarding || {};
      shop.etapesOnboarding.logoAjoute = true;
    }
  }

  await shop.save();

  recordAudit(req, "shop.settings.updated", {
    severite: "moyenne",
    cible: "Shop",
    cibleId: shop._id,
    avant,
    apres: {
      nom: shop.nom,
      adresse: shop.adresse,
      telephone: shop.telephone,
      email: shop.email,
      rccm: shop.rccm,
      devise: shop.devise,
      delaiPaiementClient: shop.delaiPaiementClient,
      delaiPaiementFournisseur: shop.delaiPaiementFournisseur,
    },
  });

  return success(res, formatShopSettings(shop), 200, null, "Parametres de la boutique mis a jour avec succes");
});

module.exports = {
  getSettings,
  updateSettings,
};
