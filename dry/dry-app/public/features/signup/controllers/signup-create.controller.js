/**
 * POST /public/signup — Soumission d'une demande de creation de compte.
 *
 * POINT CRUCIAL : aucun compte ni boutique n'est cree ici. On enregistre une
 * DEMANDE que le Super-Admin devra valider. C'est exactement ce que dit
 * l'ecran de confirmation : "Votre demande a bien ete recue."
 *
 * ══ PRECAUTIONS ══
 *  - Limitation de debit : 5 demandes par heure et par IP (voir la route)
 *  - Le mot de passe choisi est HACHE immediatement, jamais stocke en clair
 *  - Une seule demande active par adresse email (index partiel unique)
 *  - Le plan choisi doit exister ET etre publie
 */
const argon2 = require("argon2");
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { sendSignupReceived } = require("../../../../../core/services/mailer.service");
const { notifyPlatform } = require("../../../../../core/services/notification.service");
const { NOTIFICATION_CATEGORIES } = require("../../../../../core/constants");

const SignupRequestModel = require("../../../../platform/features/signup-review/model/signup-request.model");
const PlanModel = require("../../../../platform/features/plan-admin/model/plan.model");
const UserModel = require("../../../../boutique/features/auth/model/user.model");

module.exports = asyncHandler(async (req, res) => {
  const { boutique, proprietaire, abonnement } = req.validated.body;

  // ── Un compte existe-t-il deja avec cette adresse ? ──────────────────
  const dejaUtilisateur = await UserModel.findOne({
    email: proprietaire.email,
  }).lean();

  if (dejaUtilisateur) {
    throw AppError.conflict(
      "Un compte existe deja avec cette adresse email. Connectez-vous."
    );
  }

  // ── Une demande est-elle deja en cours de traitement ? ───────────────
  const dejaDemande = await SignupRequestModel.findOne({
    "proprietaire.email": proprietaire.email,
    statut: { $in: ["pending", "in_review", "info_requested"] },
  }).lean();

  if (dejaDemande) {
    throw AppError.conflict(
      "Une demande est deja en cours d'examen pour cette adresse email."
    );
  }

  // ── Le plan doit exister ET etre publie ─────────────────────────────
  // Un plan masque ne doit pas pouvoir etre souscrit, meme en forgeant l'id.
  const plan = await PlanModel.findOne({
    _id: abonnement.planId,
    publie: true,
  }).lean();

  if (!plan) {
    throw AppError.badRequest("Le plan tarifaire selectionne n'est pas disponible");
  }

  // ── Hachage immediat du mot de passe ────────────────────────────────
  const passwordHash = await argon2.hash(proprietaire.motDePasse, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const demande = await SignupRequestModel.create({
    boutique,
    proprietaire: {
      nomComplet: proprietaire.nomComplet,
      email: proprietaire.email,
      telephone: proprietaire.telephone,
      passwordHash,
    },
    abonnement: {
      planId: plan._id,
      // Copies FIGEES : le plan peut changer de nom ou de prix apres la demande
      planNom: plan.nom,
      prixMensuel: plan.prix,
      cycle: abonnement.cycle,
      jourPrelevement: abonnement.jourPrelevement,
    },
    cguAcceptees: true,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  // ── Accuse de reception au demandeur ────────────────────────────────
  await sendSignupReceived({
    to: proprietaire.email,
    ownerName: proprietaire.nomComplet,
    shopName: boutique.nom,
  });

  // ── Notification temps reel dans la console Super-Admin ─────────────
  await notifyPlatform({
    titre: "Nouvelle demande d'inscription",
    message: `${boutique.nom} — ${boutique.ville} a soumis une demande (Plan ${plan.nom}).`,
    categorie: NOTIFICATION_CATEGORIES.ACCOUNT,
    lien: `/admin/demandes/${demande._id}`,
    meta: { demandeId: demande._id },
  });

  return success(
    res,
    {
      id: demande._id,
      statut: demande.statut,
      message:
        "Votre demande a bien ete recue. Vous recevrez un e-mail de confirmation sous 24 a 48 heures.",
      // Reproduit la liste "Prochaines etapes" de l'ecran de confirmation
      prochainesEtapes: [
        "Verification de vos informations par notre equipe",
        "Email de confirmation avec vos identifiants de connexion",
        "Connexion et configuration initiale de votre boutique",
      ],
    },
    201
  );
});
