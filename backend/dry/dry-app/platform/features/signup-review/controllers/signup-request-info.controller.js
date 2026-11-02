/**
 * POST /platform/signup-requests/:id/request-info
 * Demande d'informations complementaires avant validation.
 *
 * La demande RESTE dans la file d'attente avec le statut `info_requested` :
 * elle n'est ni acceptee ni rejetee, elle attend une reponse du demandeur.
 * L'equipe voit ainsi immediatement quels dossiers sont en attente de retour.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");
const { sendInfoRequested } = require("../../../../../core/services/mailer.service");
const { SIGNUP_STATUS } = require("../../../../../core/constants");
const SignupRequestModel = require("../model/signup-request.model");

module.exports = asyncHandler(async (req, res) => {
  const { message } = req.validated.body;

  const demande = await SignupRequestModel.findById(req.validated.params.id);
  if (!demande) throw AppError.notFound("Demande introuvable");

  if (["approved", "rejected"].includes(demande.statut)) {
    throw AppError.conflict("Cette demande a deja ete traitee");
  }

  demande.statut = SIGNUP_STATUS.INFO_REQUESTED;
  demande.messageInfosComplementaires = message;
  demande.traiteePar = req.user.id;
  await demande.save();

  await sendInfoRequested({
    to: demande.proprietaire.email,
    ownerName: demande.proprietaire.nomComplet,
    shopName: demande.boutique.nom,
    message,
  });

  recordAudit(req, "signup.info_requested", {
    cible: "SignupRequest",
    cibleId: demande._id,
  });

  return success(res, {
    message: "Demande d'informations envoyee au demandeur.",
  });
});
