/**
 * GET /platform/signup-requests/:id — Dossier detaille d'une demande.
 *
 * Le passage au statut `in_review` est AUTOMATIQUE a la premiere ouverture :
 * l'equipe voit ainsi quels dossiers sont deja pris en charge par un collegue
 * (badge "En cours de verification" dans la liste).
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { SIGNUP_STATUS } = require("../../../../../core/constants");
const SignupRequestModel = require("../model/signup-request.model");

module.exports = asyncHandler(async (req, res) => {
  const demande = await SignupRequestModel.findById(req.validated.params.id)
    .populate("abonnement.planId", "nom prix devise quotas")
    .lean();

  if (!demande) throw AppError.notFound("Demande introuvable");

  // Prise en charge implicite a la premiere consultation
  if (demande.statut === SIGNUP_STATUS.PENDING) {
    await SignupRequestModel.updateOne(
      { _id: demande._id },
      { statut: SIGNUP_STATUS.IN_REVIEW, traiteePar: req.user.id }
    );
    demande.statut = SIGNUP_STATUS.IN_REVIEW;
  }

  return success(res, {
    ...demande,
    // Bandeau affiche en haut du dossier dans l'interface
    avertissementConfidentialite:
      "Donnees protegees / Acces isole — ce dossier ne contient que les informations soumises lors de l'inscription.",
  });
});
