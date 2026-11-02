/**
 * POST /auth/reset-password — Application du nouveau mot de passe.
 *
 * Le jeton recu en clair est hache, puis compare a celui stocke en base. La
 * requete verifie AUSSI la date d'expiration dans le meme filtre : un jeton
 * expire ne correspond simplement a aucun document.
 */
const crypto = require("crypto");
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");
const UserModel = require("../model/user.model");

module.exports = asyncHandler(async (req, res) => {
  const { token, nouveauMotDePasse } = req.validated.body;

  const jetonHache = crypto.createHash("sha256").update(token).digest("hex");

  const utilisateur = await UserModel.findOne({
    resetToken: jetonHache,
    resetTokenExpire: { $gt: new Date() },   // non expire
  }).select("+passwordHash +resetToken +resetTokenExpire +refreshTokens");

  if (!utilisateur) {
    // Message unique : jeton faux, deja utilise ou expire, on ne precise pas
    throw AppError.badRequest("Lien invalide ou expire. Refaites une demande.");
  }

  utilisateur.passwordHash = nouveauMotDePasse;   // hache par le hook pre-save
  utilisateur.resetToken = undefined;
  utilisateur.resetTokenExpire = undefined;
  utilisateur.doitChangerMotDePasse = false;
  utilisateur.refreshTokens = [];                 // coupe toutes les sessions
  utilisateur.tentativesEchouees = 0;
  utilisateur.bloqueJusquA = null;

  await utilisateur.save();

  recordAudit(req, "auth.password.reset_completed", {
    severite: "haute",
    cible: "User",
    cibleId: utilisateur._id,
  });

  return success(res, {
    message: "Mot de passe reinitialise. Vous pouvez vous connecter.",
  });
});
