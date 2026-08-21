/**
 * POST /auth/refresh — Renouvellement de l'access token.
 *
 * ══ ROTATION DES JETONS ══
 * A chaque rafraichissement, l'ancien jeton est REVOQUE et remplace par un
 * nouveau. Si un jeton deja utilise est represente, cela signale un vol
 * probable : toutes les sessions de l'utilisateur sont alors coupees par
 * precaution.
 *
 * Ce mecanisme transforme un vol de jeton en incident detectable, au lieu
 * d'un acces silencieux de 7 jours.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");
const {
  verifyRefreshToken, signAccessToken, signRefreshToken,
  newTokenId, refreshCookieOptions,
} = require("../../../../../core/tokens");
const UserModel = require("../model/user.model");

module.exports = asyncHandler(async (req, res) => {
  // Le jeton vient du cookie ; le corps de requete sert de repli (mobile)
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) {
    throw AppError.unauthorized("Session expiree, veuillez vous reconnecter");
  }

  const payload = verifyRefreshToken(token);

  const utilisateur = await UserModel.findById(payload.sub)
    .select("+refreshTokens +permissions")
    .populate("customRole", "nom permissions actif");

  if (!utilisateur || !utilisateur.actif || utilisateur.gele) {
    throw AppError.unauthorized("Session invalide");
  }

  // ── Le jeton figure-t-il parmi les sessions actives ? ────────────────
  const sessionValide = (utilisateur.refreshTokens || []).some(
    (t) => t.jti === payload.jti
  );

  if (!sessionValide) {
    /**
     * Le jeton est cryptographiquement valide mais absent de la liste : il a
     * donc deja ete utilise (et donc revoque par rotation), ou revoque
     * manuellement. Dans les deux cas, c'est anormal.
     *
     * On coupe TOUTES les sessions : si le jeton a ete vole, l'attaquant perd
     * son acces en meme temps que le legitime proprietaire, qui devra se
     * reconnecter — signal visible qu'un incident s'est produit.
     */
    utilisateur.refreshTokens = [];
    await utilisateur.save({ validateBeforeSave: false });

    recordAudit(req, "auth.refresh.reuse_detected", {
      severite: "haute",
      cible: "User",
      cibleId: utilisateur._id,
    });

    res.clearCookie("refreshToken", refreshCookieOptions());
    throw AppError.unauthorized("Session invalide, veuillez vous reconnecter");
  }

  // ── Rotation : on retire l'ancien jti et on en emet un nouveau ───────
  const nouveauJti = newTokenId();

  utilisateur.refreshTokens = (utilisateur.refreshTokens || [])
    .filter((t) => t.jti !== payload.jti)
    .concat({
      jti: nouveauJti,
      expireLe: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

  await utilisateur.save({ validateBeforeSave: false });

  res.cookie(
    "refreshToken",
    signRefreshToken(utilisateur, nouveauJti),
    refreshCookieOptions()
  );

  return success(res, {
    accessToken: signAccessToken(utilisateur),
    utilisateur: {
      id: utilisateur._id,
      nom: utilisateur.nom,
      role: utilisateur.role,
      shopId: utilisateur.shopId,
      permissions: utilisateur.customRole?.actif
        ? utilisateur.customRole.permissions
        : utilisateur.permissions,
      doitChangerMotDePasse: utilisateur.doitChangerMotDePasse,
    },
  });
});
