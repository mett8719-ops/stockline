/**
 * POST /auth/complete-tour — Marque la visite guidee comme terminee.
 *
 * Appele quand l'utilisateur termine OU passe le tour en 4 etapes affiche a
 * la premiere connexion. Le flag empeche de reproposer la visite a chaque
 * ouverture de session.
 */
const asyncHandler = require("../../../../../core/async-handler");
const { success } = require("../../../../../core/response");
const UserModel = require("../model/user.model");

module.exports = asyncHandler(async (req, res) => {
  await UserModel.updateOne(
    { _id: req.user.id },
    { aTermineVisiteGuidee: true }
  );

  return success(res, { message: "Visite guidee terminee" });
});
