/**
 * Middlewares d'autorisation (RBAC + permissions modulaires).
 * A utiliser TOUJOURS apres `authenticate`.
 *
 *   router.post("/", authenticate, authorizeRoles(SHOP_ROLES.ADMIN), ctrl);
 *   router.get("/",  authenticate, requirePermission(PERMISSIONS.STOCK), ctrl);
 */
const AppError = require("./app-error");
const { PLATFORM_ROLES, SHOP_ROLES } = require("./constants");

/** Restreint l'acces a une liste de roles. */
function authorizeRoles(...roles) {
  const autorises = roles.flat();
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!autorises.includes(req.user.role)) {
      return next(AppError.forbidden("Votre role ne permet pas cette action"));
    }
    return next();
  };
}

/**
 * Exige une ou plusieurs permissions modulaires.
 * L'admin de boutique et le Super-Admin disposent de tout leur perimetre.
 */
function requirePermission(...permissions) {
  const requises = permissions.flat();
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());

    if (
      req.user.role === SHOP_ROLES.ADMIN ||
      req.user.role === PLATFORM_ROLES.SUPER_ADMIN
    ) {
      return next();
    }

    const ok = requises.every((p) => req.user.permissions.includes(p));
    if (!ok) {
      return next(
        AppError.forbidden(
          `Permission requise : ${requises.join(", ")}. ` +
          "Contactez l'administrateur de votre boutique."
        )
      );
    }
    return next();
  };
}

/** Reserve la route au staff de la plateforme (console Super-Admin). */
const platformOnly = authorizeRoles(
  PLATFORM_ROLES.SUPER_ADMIN,
  PLATFORM_ROLES.SUPPORT_AGENT
);

/** Reserve aux actions sensibles : bannir, facturer, modifier un plan. */
const superAdminOnly = authorizeRoles(PLATFORM_ROLES.SUPER_ADMIN);

/** Exige un contexte boutique (bloque le staff plateforme sur les routes tenant). */
function shopOnly(req, _res, next) {
  if (!req.user) return next(AppError.unauthorized());
  if (!req.user.shopId) {
    return next(AppError.forbidden("Cette route est reservee aux comptes boutique"));
  }
  return next();
}

/**
 * Bloque toute action metier tant que l'utilisateur n'a pas remplace son mot de
 * passe temporaire. Correspond a la modale bloquante de premiere connexion
 * ("Bienvenue, Jean-Baptiste ! ... definissez votre mot de passe personnel").
 */
function blockIfPasswordChangeRequired(req, _res, next) {
  if (req.user?.doitChangerMotDePasse) {
    return next(
      new AppError(
        "Vous devez definir votre mot de passe personnel avant de continuer",
        403, "PASSWORD_CHANGE_REQUIRED"
      )
    );
  }
  return next();
}

module.exports = {
  authorizeRoles, requirePermission,
  platformOnly, superAdminOnly, shopOnly, blockIfPasswordChangeRequired,
};
