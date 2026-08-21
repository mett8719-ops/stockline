/**
 * POST /auth/logout — Deconnexion.
 *
 * Revoque le refresh token cote SERVEUR (retrait de la liste des sessions) ET
 * supprime le cookie cote client. Supprimer seulement le cookie ne suffirait
 * pas : le jeton resterait valide si quelqu'un en avait fait une copie.
 */
const asyncHandler = require("../../../../../core/async-handler");
const { success } = require("../../../../../core/response");
const { verifyRefreshToken, refreshCookieOptions } = require("../../../../../core/tokens");
const UserModel = require("../model/user.model");

module.exports = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      // Retrait de cette session precise, sans toucher aux autres appareils
      await UserModel.updateOne(
        { _id: payload.sub },
        { $pull: { refreshTokens: { jti: payload.jti } } }
      );
    } catch {
      // Jeton deja expire ou invalide : rien a revoquer, on continue
    }
  }

  res.clearCookie("refreshToken", refreshCookieOptions());
  return success(res, { message: "Deconnexion reussie" });
});
