/**
 * Service d'envoi d'emails transactionnels.
 *
 * EN DEVELOPPEMENT : si SMTP_HOST/SMTP_USER ne sont pas renseignes, les emails
 * ne sont PAS envoyes mais affiches dans la console. L'equipe peut donc tester
 * tout le parcours d'inscription sans compte Brevo.
 *
 * Emails geres (cases a cocher de l'ecran "Parametres plateforme") :
 *   - accuse de reception d'une demande d'inscription
 *   - activation de compte avec identifiants temporaires
 *   - demande d'informations complementaires
 *   - rejet de demande
 *   - rappel / relance de paiement
 *   - suspension de compte
 *   - invitation d'un employe par l'admin de la boutique
 */
const nodemailer = require("nodemailer");
const colors = require("colors");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn("SMTP non configure — les emails seront simules en console".yellow);
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

/**
 * Envoi generique.
 * Ne leve JAMAIS d'exception : un email non parti ne doit pas annuler une
 * creation de compte deja effectuee en base.
 */
async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();

  if (!t) {
    console.log("─────────── EMAIL SIMULE ───────────".cyan);
    console.log(`  A       : ${to}`.cyan);
    console.log(`  Sujet   : ${subject}`.cyan);
    console.log(`  Contenu : ${(text || "").slice(0, 300)}`.cyan);
    console.log("────────────────────────────────────".cyan);
    return { simulated: true };
  }

  try {
    const info = await t.sendMail({
      from: process.env.MAIL_FROM || "Stockline <noreply@stockline.cg>",
      to, subject, html, text,
    });
    console.log(`Email envoye a ${to} (${subject})`.green);
    return info;
  } catch (e) {
    console.error(`Echec d'envoi d'email a ${to} : ${e.message}`.red);
    return { error: true };
  }
}

/** Gabarit HTML commun a tous les emails de la plateforme. */
function layout(titre, corpsHtml) {
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <tr><td style="background:#2563eb;padding:24px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:20px">Stockline</h1>
          <p style="margin:4px 0 0;color:#dbeafe;font-size:12px">Gestion commerciale &amp; de stock</p>
        </td></tr>
        <tr><td style="padding:28px">
          <h2 style="margin:0 0 14px;color:#111827;font-size:17px">${titre}</h2>
          ${corpsHtml}
        </td></tr>
        <tr><td style="padding:16px;background:#f9fafb;text-align:center;border-top:1px solid #f3f4f6">
          <p style="margin:0;color:#9ca3af;font-size:11px">
            &copy; ${new Date().getFullYear()} Stockline Africa &middot; ${process.env.SUPPORT_EMAIL || "support@stockline.cg"}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

/** Accuse de reception apres soumission du formulaire d'inscription. */
function sendSignupReceived({ to, ownerName, shopName }) {
  return sendMail({
    to,
    subject: "Votre demande Stockline a bien ete recue",
    text: `Bonjour ${ownerName}, votre demande pour ${shopName} est en cours d'examen.`,
    html: layout(`Bonjour ${ownerName},`, `
      <p style="color:#4b5563;font-size:14px;line-height:1.6">
        Votre demande de creation de compte pour <strong>${shopName}</strong> a bien ete recue.
        Notre equipe verifie vos informations et vous recevrez un e-mail de confirmation
        sous <strong>24 a 48 heures</strong>.
      </p>
      <p style="color:#9ca3af;font-size:12px">Aucune action n'est requise de votre part pour le moment.</p>`),
  });
}

/** Email d'activation : identifiants temporaires apres validation Super-Admin. */
function sendAccountApproved({ to, ownerName, shopName, tempPassword, loginUrl }) {
  return sendMail({
    to,
    subject: `Votre espace ${shopName} est pret`,
    text: `Bonjour ${ownerName}. Identifiant : ${to} — Mot de passe temporaire : ${tempPassword}`,
    html: layout(`Bienvenue, ${ownerName} !`, `
      <p style="color:#4b5563;font-size:14px;line-height:1.6">
        Votre espace <strong>${shopName}</strong> est desormais actif. Voici vos identifiants
        de premiere connexion :
      </p>
      <div style="background:#f3f4f6;border:2px dashed #cbd5e1;border-radius:10px;padding:18px;text-align:center;margin:18px 0">
        <p style="margin:0 0 6px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px">Identifiant</p>
        <p style="margin:0 0 14px;color:#111827;font-size:15px;font-weight:bold">${to}</p>
        <p style="margin:0 0 6px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px">Mot de passe temporaire</p>
        <p style="margin:0;font-family:'Courier New',monospace;font-size:20px;font-weight:bold;color:#2563eb;letter-spacing:2px">${tempPassword}</p>
      </div>
      <p style="text-align:center;margin:22px 0">
        <a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 30px;border-radius:40px">Se connecter</a>
      </p>
      <p style="color:#b45309;font-size:12px;background:#fffbeb;border-left:3px solid #f59e0b;padding:10px 12px;border-radius:4px">
        Pour des raisons de securite, il vous sera demande de definir votre mot de passe
        personnel des votre premiere connexion.
      </p>`),
  });
}

/** Demande d'informations complementaires avant validation. */
function sendInfoRequested({ to, ownerName, shopName, message }) {
  return sendMail({
    to,
    subject: `Informations complementaires — ${shopName}`,
    text: `Bonjour ${ownerName}. ${message}`,
    html: layout(`Bonjour ${ownerName},`, `
      <p style="color:#4b5563;font-size:14px;line-height:1.6">
        Avant de valider la creation de <strong>${shopName}</strong>, notre equipe a besoin
        des precisions suivantes :
      </p>
      <div style="background:#f9fafb;border-left:3px solid #2563eb;padding:12px 14px;border-radius:4px;color:#374151;font-size:14px">${message}</div>
      <p style="color:#6b7280;font-size:13px;margin-top:16px">
        Repondez simplement a cet e-mail avec les informations demandees.
      </p>`),
  });
}

/** Rejet d'une demande d'inscription. */
function sendSignupRejected({ to, ownerName, shopName, motif }) {
  return sendMail({
    to,
    subject: `Suite a votre demande — ${shopName}`,
    text: `Bonjour ${ownerName}, votre demande n'a pas pu etre validee. Motif : ${motif}`,
    html: layout(`Bonjour ${ownerName},`, `
      <p style="color:#4b5563;font-size:14px;line-height:1.6">
        Nous n'avons malheureusement pas pu valider votre demande de creation de compte
        pour <strong>${shopName}</strong>.
      </p>
      <div style="background:#fef2f2;border-left:3px solid #ef4444;padding:12px 14px;border-radius:4px;color:#7f1d1d;font-size:14px">
        <strong>Motif :</strong> ${motif}
      </div>
      <p style="color:#6b7280;font-size:13px;margin-top:16px">
        Vous pouvez soumettre une nouvelle demande ou nous contacter a
        ${process.env.SUPPORT_EMAIL || "support@stockline.cg"}.
      </p>`),
  });
}

/** Rappel d'echeance ou relance d'impaye. */
function sendPaymentReminder({ to, shopName, montant, devise, joursRetard, lienPaiement }) {
  const enRetard = joursRetard > 0;
  return sendMail({
    to,
    subject: enRetard ? `Paiement en retard — ${shopName}` : `Echeance a venir — ${shopName}`,
    text: `Montant du : ${montant} ${devise}.`,
    html: layout(enRetard ? "Paiement en retard" : "Echeance a venir", `
      <p style="color:#4b5563;font-size:14px;line-height:1.6">
        L'abonnement de <strong>${shopName}</strong> presente un montant du de
        <strong>${montant} ${devise}</strong>${enRetard ? ` (retard de ${joursRetard} jours)` : ""}.
      </p>
      ${lienPaiement ? `<p style="text-align:center;margin:22px 0">
        <a href="${lienPaiement}" style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 30px;border-radius:40px">Regler maintenant</a>
      </p>` : ""}
      <p style="color:#9ca3af;font-size:12px">
        Passe le delai de grace, l'acces a votre espace sera suspendu jusqu'a regularisation.
      </p>`),
  });
}

/** Notification de suspension ou de gel d'un compte. */
function sendAccountSuspended({ to, shopName, motif }) {
  return sendMail({
    to,
    subject: `Acces suspendu — ${shopName}`,
    text: `L'acces a votre compte a ete suspendu. Motif : ${motif}`,
    html: layout("Acces suspendu", `
      <p style="color:#4b5563;font-size:14px;line-height:1.6">
        L'acces a l'espace <strong>${shopName}</strong> a ete suspendu.
      </p>
      <div style="background:#fef2f2;border-left:3px solid #ef4444;padding:12px 14px;border-radius:4px;color:#7f1d1d;font-size:14px">
        <strong>Motif :</strong> ${motif}
      </div>
      <p style="color:#6b7280;font-size:13px;margin-top:16px">
        Contactez-nous a ${process.env.SUPPORT_EMAIL || "support@stockline.cg"} pour retablir votre acces.
      </p>`),
  });
}

/** Invitation d'un employe par l'administrateur de la boutique. */
function sendEmployeeInvite({ to, employeeName, shopName, roleLabel, tempPassword, loginUrl }) {
  return sendMail({
    to,
    subject: `Vous avez ete ajoute a ${shopName}`,
    text: `Identifiant : ${to} — Mot de passe temporaire : ${tempPassword}`,
    html: layout(`Bonjour ${employeeName},`, `
      <p style="color:#4b5563;font-size:14px;line-height:1.6">
        Vous avez ete ajoute a l'espace <strong>${shopName}</strong> avec le role
        <strong>${roleLabel}</strong>.
      </p>
      <div style="background:#f3f4f6;border:2px dashed #cbd5e1;border-radius:10px;padding:18px;text-align:center;margin:18px 0">
        <p style="margin:0 0 6px;color:#6b7280;font-size:11px;text-transform:uppercase">Mot de passe temporaire</p>
        <p style="margin:0;font-family:'Courier New',monospace;font-size:20px;font-weight:bold;color:#2563eb;letter-spacing:2px">${tempPassword}</p>
      </div>
      <p style="text-align:center;margin:22px 0">
        <a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 30px;border-radius:40px">Se connecter</a>
      </p>`),
  });
}

module.exports = {
  sendMail, layout,
  sendSignupReceived, sendAccountApproved, sendInfoRequested, sendSignupRejected,
  sendPaymentReminder, sendAccountSuspended, sendEmployeeInvite,
};
