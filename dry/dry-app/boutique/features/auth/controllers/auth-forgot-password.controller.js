/**
 * POST /auth/forgot-password — Demande de reinitialisation.
 *
 * ══ DEUX POINTS DE SECURITE ══
 *
 * 1. La reponse est TOUJOURS IDENTIQUE, que l'adresse existe ou non. Sans
 *    cela, ce point d'entree permettrait de tester quelles adresses sont
 *    enregistrees sur la plateforme.
 *
 * 2. On stocke le HASH du jeton, pas le jeton lui-meme. Meme une fuite de la
 *    base ne permettrait pas de reinitialiser un mot de passe — meme
 *    raisonnement que pour les mots de passe.
 */
const crypto = require("crypto");
const asyncHandler = require("../../../../../core/async-handler");
const { success } = require("../../../../../core/response");
const { sendMail, layout } = require("../../../../../core/services/mailer.service");
const { recordAudit } = require("../../../../../core/audit");
const UserModel = require("../model/user.model");

module.exports = asyncHandler(async (req, res) => {
  const { email } = req.validated.body;

  // Reponse renvoyee dans TOUS les cas, y compris si l'adresse n'existe pas
  const reponseNeutre = {
    message:
      "Si un compte existe pour cette adresse, un lien de reinitialisation vient d'etre envoye.",
  };

  const utilisateur = await UserModel.findOne({ email })
    .select("+resetToken +resetTokenExpire");

  if (!utilisateur || !utilisateur.actif) return success(res, reponseNeutre);

  // ── Generation du jeton ─────────────────────────────────────────────
  // Le jeton EN CLAIR part par email ; seul son HASH est stocke en base.
  const jetonClair = crypto.randomBytes(32).toString("hex");
  utilisateur.resetToken = crypto
    .createHash("sha256")
    .update(jetonClair)
    .digest("hex");
  utilisateur.resetTokenExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

  await utilisateur.save({ validateBeforeSave: false });

  const lienBase = (process.env.CORS_ORIGIN || "").split(",")[0] || "";
  const lien = `${lienBase}/reset-password?token=${jetonClair}`;

  await sendMail({
    to: utilisateur.email,
    subject: "Reinitialisation de votre mot de passe Stockline",
    text: `Lien de reinitialisation (valable 1 heure) : ${lien}`,
    html: layout(
      `Bonjour ${utilisateur.nom},`,
      `<p style="color:#4b5563;font-size:14px;line-height:1.6">
         Vous avez demande la reinitialisation de votre mot de passe.
         Ce lien est valable <strong>une heure</strong>.
       </p>
       <p style="text-align:center;margin:24px 0">
         <a href="${lien}" style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 30px;border-radius:40px">Reinitialiser mon mot de passe</a>
       </p>
       <p style="color:#9ca3af;font-size:12px">
         Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet e-mail.
         Votre mot de passe reste inchange.
       </p>`
    ),
  });

  recordAudit(req, "auth.password.reset_requested", {
    severite: "moyenne",
    cible: "User",
    cibleId: utilisateur._id,
  });

  return success(res, reponseNeutre);
});
