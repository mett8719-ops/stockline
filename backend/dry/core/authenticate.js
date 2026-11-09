/**
 * Middleware d'authentification.
 *
 * Enchainement :
 *  1. extrait et verifie le JWT de l'en-tete `Authorization: Bearer <token>`
 *  2. RECHARGE l'utilisateur en base (permissions a jour, compte toujours actif)
 *  3. verifie l'etat de la boutique (gelee / bannie / suspendue → acces bloque)
 *  4. injecte `req.user`, `req.shop` et `req.shopId` pour toute la suite
 *
 * Le rechargement en base a chaque requete est VOLONTAIRE : il garantit qu'un
 * agent desactive ou une boutique gelee perd l'acces IMMEDIATEMENT.
 */
const AppError = require("./app-error");
const asyncHandler = require("./async-handler");
const { verifyAccessToken } = require("./tokens");
const { SHOP_STATUS, PLATFORM_ROLE_LIST } = require("./constants");

const authenticate = asyncHandler(async (req, _res, next) => {
  // Import tardif : evite les dependances circulaires au chargement des modeles
  const UserModel = require("../dry-app/boutique/features/auth/model/user.model");
  const ShopModel = require("../dry-app/platform/features/shop/model/shop.model");

  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    throw AppError.unauthorized("Jeton d'authentification manquant");
  }

  const payload = verifyAccessToken(header.slice(7).trim());

  const user = await UserModel.findById(payload.sub)
    .select("+permissions")
    .populate("customRole", "nom permissions actif")
    .lean();

  if (!user) throw AppError.unauthorized("Compte introuvable");
  if (!user.actif) {
    throw AppError.forbidden("Votre compte a ete desactive par votre administrateur");
  }
  if (user.gele) {
    throw AppError.forbidden(
      `Votre compte a ete gele${user.motifGel ? ` : ${user.motifGel}` : ""}. ` +
      "Contactez l'administrateur de votre boutique."
    );
  }

  // ── Controle de l'etat de la boutique (staff plateforme exempte) ─────
  let shop = null;
  if (user.shopId) {
    shop = await ShopModel.findById(user.shopId)
      .select("nom statut gelJusquA motifBannissement motifGel planId devise")
      .lean();

    if (!shop) throw AppError.forbidden("Boutique introuvable");

    if (shop.statut === SHOP_STATUS.BANNED) {
      throw new AppError(
        `Cette boutique a ete bannie. Motif : ${shop.motifBannissement || "non precise"}. ` +
        `Contactez ${process.env.SUPPORT_EMAIL || "le support"}.`,
        403, "SHOP_BANNED"
      );
    }

    if (shop.statut === SHOP_STATUS.FROZEN) {
      // Degel automatique si la duree du gel est ecoulee (24h, 48h...)
      const gelTermine = shop.gelJusquA && new Date(shop.gelJusquA) <= new Date();
      if (!gelTermine) {
        throw new AppError(
          `Cette boutique est temporairement gelee. ` +
          `Contactez ${process.env.SUPPORT_EMAIL || "le support"}.`,
          403, "SHOP_FROZEN"
        );
      }
      await ShopModel.updateOne(
        { _id: shop._id },
        { statut: SHOP_STATUS.ACTIVE, gelJusquA: null }
      );
    }

    if (shop.statut === SHOP_STATUS.SUSPENDED) {
      // EXCEPTION INDISPENSABLE : Une boutique suspendue DOIT pouvoir consulter son abonnement et payer pour se reactiver
      const urlDemandee = (req.originalUrl || req.url || "").toLowerCase();
      const estRouteAbonnement = urlDemandee.includes("/subscription");

      if (!estRouteAbonnement) {
        throw new AppError(
          "Abonnement suspendu pour non-paiement. Regularisez votre situation pour retrouver l'acces.",
          403, "SHOP_SUSPENDED"
        );
      }
    }

    if (shop.statut === SHOP_STATUS.PENDING) {
      throw new AppError(
        "Votre compte est encore en attente de validation par notre equipe.",
        403, "SHOP_PENDING"
      );
    }
  }

  // Permissions effectives : le role personnalise prime s'il est actif
  const permissions = user.customRole?.actif
    ? user.customRole.permissions
    : user.permissions || [];

  req.user = {
    id: user._id.toString(),
    nom: user.nom,
    email: user.email,
    role: user.role,
    shopId: user.shopId ? user.shopId.toString() : null,
    permissions,
    isPlatform: PLATFORM_ROLE_LIST.includes(user.role),
    doitChangerMotDePasse: !!user.doitChangerMotDePasse,
  };
  req.shop = shop;
  req.shopId = req.user.shopId;

  return next();
});

module.exports = { authenticate };
