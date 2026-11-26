const crypto = require("crypto");
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { PERMISSIONS } = require("../../../../../core/constants");

/**
 * Verifie que l'utilisateur possede la permission requise selon la ressource cible.
 * - logo      -> permission `settings` (et role admin)
 * - products  -> permission `products`
 * - documents -> permission `documents`
 * - avatars   -> tout utilisateur rattache a la boutique
 */
function assertResourceAccess(user, ressource) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  if (ressource === "logo") {
    if (user?.role !== "admin" && !permissions.includes(PERMISSIONS.SETTINGS)) {
      throw AppError.forbidden("Seul un administrateur autorise peut televerser le logo de la boutique");
    }
    return;
  }

  if (ressource === "products" && user?.role !== "admin" && !permissions.includes(PERMISSIONS.PRODUCTS)) {
    throw AppError.forbidden("Permission 'products' requise pour televerser des images produits");
  }

  if (ressource === "documents" && user?.role !== "admin" && !permissions.includes(PERMISSIONS.DOCUMENTS)) {
    throw AppError.forbidden("Permission 'documents' requise pour televerser des documents");
  }
}

/**
 * Calcule une signature Cloudinary SHA-1 conforme au protocole d'upload signe.
 * Les parametres signes sont tries par ordre alphabetique puis suivis de `apiSecret`.
 */
function generateCloudinarySignature(params, apiSecret) {
  const sortedQuery = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(`${sortedQuery}${apiSecret}`).digest("hex");
}

/**
 * POST /api/v1/uploads/sign
 * Genere une signature Cloudinary isolee par `req.user.shopId`.
 */
const signUpload = asyncHandler(async (req, res) => {
  const shopId = req.user?.shopId;
  if (!shopId) {
    throw AppError.unauthorized("Utilisateur non associe a une boutique");
  }

  const { ressource } = req.validated.body;
  assertResourceAccess(req.user, ressource);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError(
      "Service d'upload Cloudinary non configure sur le serveur",
      503,
      "CLOUDINARY_NOT_CONFIGURED"
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Isolation multi-tenant stricte : le dossier est toujours force cote serveur via req.user.shopId
  const folder = `stockline/shops/${String(shopId)}/${ressource}`;
  const signature = generateCloudinarySignature({ folder, timestamp }, apiSecret);

  return success(res, {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  });
});

module.exports = {
  signUpload,
  generateCloudinarySignature,
  assertResourceAccess,
};
