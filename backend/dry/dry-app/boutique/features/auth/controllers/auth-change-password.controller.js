/**
 * POST /auth/change-password — Changement de mot de passe.
 *
 * ══ DEUX CAS D'USAGE ══
 *
 * 1. PREMIERE CONNEXION : l'utilisateur a recu un mot de passe temporaire par
 *    email. `doitChangerMotDePasse` est vrai, on n'exige donc PAS l'ancien
 *    mot de passe — il vient de le saisir pour se connecter.
 *    (C'est la modale bloquante "Bienvenue ! Definissez votre mot de passe".)
 *
 * 2. CHANGEMENT VOLONTAIRE : l'ancien mot de passe est obligatoire, pour
 *    empecher qu'un poste laisse ouvert permette a un tiers de changer le
 *    mot de passe.
 *
 * Dans les DEUX cas, toutes les autres sessions sont revoquees : si le
 * changement fait suite a une suspicion de compromission, l'intrus perd son
 * acces immediatement.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");
const { refreshCookieOptions } = require("../../../../../core/tokens");
const UserModel = require("../model/user.model");

module.exports = asyncHandler(async (req, res) => {
  const { motDePasseActuel, nouveauMotDePasse } = req.validated.body;

  const utilisateur = await UserModel.findById(req.user.id)
    .select("+passwordHash +refreshTokens");

  if (!utilisateur) throw AppError.notFound("Compte introuvable");

  // ── Hors premiere connexion : l'ancien mot de passe est exige ────────
  if (!utilisateur.doitChangerMotDePasse) {
    if (!motDePasseActuel) {
      throw AppError.badRequest("Le mot de passe actuel est requis");
    }
    const valide = await utilisateur.verifierMotDePasse(motDePasseActuel);
    if (!valide) throw AppError.unauthorized("Mot de passe actuel incorrect");
  }

  // ── Le nouveau doit differer de l'ancien ────────────────────────────
  const identique = await utilisateur.verifierMotDePasse(nouveauMotDePasse);
  if (identique) {
    throw AppError.badRequest(
      "Le nouveau mot de passe doit etre different de l'ancien"
    );
  }

  // Le hook pre-save du modele se charge du hachage Argon2
  utilisateur.passwordHash = nouveauMotDePasse;
  utilisateur.doitChangerMotDePasse = false;
  utilisateur.refreshTokens = [];   // revoque toutes les sessions
  await utilisateur.save();

  recordAudit(req, "auth.password.changed", {
    severite: "moyenne",
    cible: "User",
    cibleId: utilisateur._id,
  });

  // La session courante est aussi revoquee : on nettoie le cookie
  res.clearCookie("refreshToken", refreshCookieOptions());

  return success(res, {
    message:
      "Mot de passe modifie. Veuillez vous reconnecter avec vos nouveaux identifiants.",
  });
});
