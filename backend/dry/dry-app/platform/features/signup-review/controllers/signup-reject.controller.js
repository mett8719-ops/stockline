/**
 * POST /platform/signup-requests/:id/reject — Rejet d'une demande.
 *
 * Le motif est OBLIGATOIRE (minimum 5 caracteres, valide par le schema) et
 * transmis au demandeur par email. On ne rejette jamais sans explication :
 * le demandeur doit pouvoir corriger et resoumettre.
 *
 * Le statut "rejected" n'etant pas dans l'index partiel unique du modele, une
 * NOUVELLE demande reste possible avec la meme adresse email.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");
const { sendSignupRejected } = require("../../../../../core/services/mailer.service");
const { SIGNUP_STATUS } = require("../../../../../core/constants");
const SignupRequestModel = require("../model/signup-request.model");

module.exports = asyncHandler(async (req, res) => {
  const { motif } = req.validated.body;

  const demande = await SignupRequestModel.findById(req.validated.params.id);
  if (!demande) throw AppError.notFound("Demande introuvable");

  // Une demande deja approuvee a cree un compte : la rejeter n'aurait aucun sens
  if (demande.statut === SIGNUP_STATUS.APPROVED) {
    throw AppError.conflict(
      "Cette demande a deja ete approuvee. Pour retirer l'acces, suspendez ou " +
      "bannissez la boutique depuis l'annuaire."
    );
  }

  demande.statut = SIGNUP_STATUS.REJECTED;
  demande.motifRejet = motif;
  demande.traiteePar = req.user.id;
  demande.traiteeLe = new Date();
  await demande.save();

  await sendSignupRejected({
    to: demande.proprietaire.email,
    ownerName: demande.proprietaire.nomComplet,
    shopName: demande.boutique.nom,
    motif,
  });

  recordAudit(req, "signup.rejected", {
    severite: "moyenne",
    cible: "SignupRequest",
    cibleId: demande._id,
    apres: { motif, boutique: demande.boutique.nom },
  });

  return success(res, {
    message: "Demande rejetee, le demandeur a ete informe par email.",
  });
});
