/**
 * POST /auth/login — Connexion.
 *
 * ══ QUATRE MESURES DE SECURITE ══
 *
 * 1. MESSAGE IDENTIQUE que l'identifiant existe ou non. Sans cela, un
 *    attaquant pourrait enumerer les comptes valides de la plateforme en
 *    comparant les reponses.
 *
 * 2. BLOCAGE TEMPORAIRE apres 5 tentatives echouees (15 minutes).
 *
 * 3. REFRESH TOKEN en cookie httpOnly, inaccessible au JavaScript de la page
 *    et donc immunise contre le vol par injection de script.
 *
 * 4. CONTROLE DE L'ETAT DE LA BOUTIQUE : gelee, bannie ou suspendue, l'acces
 *    est refuse avec un message explicite et le motif.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");
const {
  signAccessToken, signRefreshToken, newTokenId, refreshCookieOptions,
} = require("../../../../../core/tokens");
const { SHOP_STATUS } = require("../../../../../core/constants");

const UserModel = require("../model/user.model");
const ShopModel = require("../../../../platform/features/shop/model/shop.model");

const MAX_TENTATIVES = 5;
const DUREE_BLOCAGE_MS = 15 * 60 * 1000;

module.exports = asyncHandler(async (req, res) => {
  const { identifiant, motDePasse } = req.validated.body;

  // Recherche par email OU telephone — le formulaire accepte les deux
  const estEmail = identifiant.includes("@");
  const filtre = estEmail
    ? { email: identifiant.toLowerCase().trim() }
    : { telephone: identifiant.replace(/[\s+().-]/g, "") };

  const utilisateur = await UserModel.findOne(filtre)
    .select("+passwordHash +tentativesEchouees +bloqueJusquA +refreshTokens +permissions")
    .populate("customRole", "nom permissions actif");

  /**
   * Erreur volontairement identique dans TOUS les cas d'echec : identifiant
   * inexistant ou mot de passe faux. C'est ce qui empeche l'enumeration.
   */
  const erreurIdentifiants = AppError.unauthorized("Identifiants incorrects");

  if (!utilisateur) {
    recordAudit(req, "auth.login.failed", {
      severite: "moyenne",
      apres: { identifiant: estEmail ? identifiant : "[telephone]" },
    });
    throw erreurIdentifiants;
  }

  // ── Compte temporairement bloque ? ──────────────────────────────────
  if (utilisateur.estBloque()) {
    const minutes = Math.ceil((utilisateur.bloqueJusquA - Date.now()) / 60000);
    throw new AppError(
      `Compte temporairement bloque suite a plusieurs tentatives echouees. ` +
      `Reessayez dans ${minutes} minute(s).`,
      429, "ACCOUNT_LOCKED"
    );
  }

  // ── Verification du mot de passe ────────────────────────────────────
  const motDePasseValide = await utilisateur.verifierMotDePasse(motDePasse);

  if (!motDePasseValide) {
    utilisateur.tentativesEchouees = (utilisateur.tentativesEchouees || 0) + 1;

    if (utilisateur.tentativesEchouees >= MAX_TENTATIVES) {
      utilisateur.bloqueJusquA = new Date(Date.now() + DUREE_BLOCAGE_MS);
      recordAudit(req, "auth.account.locked", {
        severite: "haute",
        cible: "User",
        cibleId: utilisateur._id,
        apres: { tentatives: utilisateur.tentativesEchouees },
      });
    }

    // validateBeforeSave: false → on incremente sans revalider tout le document
    await utilisateur.save({ validateBeforeSave: false });
    throw erreurIdentifiants;
  }

  // ── Etat du compte utilisateur ──────────────────────────────────────
  if (!utilisateur.actif) {
    throw AppError.forbidden("Votre compte a ete desactive");
  }
  if (utilisateur.gele) {
    throw AppError.forbidden(
      `Votre compte a ete gele${utilisateur.motifGel ? ` : ${utilisateur.motifGel}` : ""}. ` +
      "Contactez l'administrateur de votre boutique."
    );
  }

  // ── Etat de la boutique ─────────────────────────────────────────────
  let boutique = null;

  if (utilisateur.shopId) {
    boutique = await ShopModel.findById(utilisateur.shopId)
      .populate("planId", "nom quotas fonctionnalites");

    if (!boutique) throw AppError.forbidden("Boutique introuvable");

    if (boutique.statut === SHOP_STATUS.BANNED) {
      throw new AppError(
        `Cette boutique a ete bannie. Motif : ${boutique.motifBannissement || "non precise"}. ` +
        `Contactez ${process.env.SUPPORT_EMAIL || "le support"}.`,
        403, "SHOP_BANNED"
      );
    }

    if (boutique.statut === SHOP_STATUS.FROZEN) {
      // Degel automatique si la duree du gel est ecoulee
      const gelTermine = boutique.gelJusquA && boutique.gelJusquA <= new Date();
      if (!gelTermine) {
        throw new AppError(
          `Cette boutique est temporairement gelee. ` +
          `Contactez ${process.env.SUPPORT_EMAIL || "le support"}.`,
          403, "SHOP_FROZEN"
        );
      }
      boutique.statut = SHOP_STATUS.ACTIVE;
      boutique.gelJusquA = null;
      await boutique.save();
    }

    if (boutique.statut === SHOP_STATUS.SUSPENDED) {
      throw new AppError(
        "Abonnement suspendu pour non-paiement. Regularisez votre situation pour retrouver l'acces.",
        403, "SHOP_SUSPENDED"
      );
    }

    if (boutique.statut === SHOP_STATUS.PENDING) {
      throw new AppError(
        "Votre compte est encore en attente de validation par notre equipe.",
        403, "SHOP_PENDING"
      );
    }
  }

  // ── Emission des jetons ─────────────────────────────────────────────
  const jti = newTokenId();
  const accessToken = signAccessToken(utilisateur);
  const refreshToken = signRefreshToken(utilisateur, jti);

  utilisateur.tentativesEchouees = 0;
  utilisateur.bloqueJusquA = null;
  utilisateur.derniereConnexion = new Date();

  /**
   * On conserve au maximum 5 sessions simultanees. Au-dela, la plus ancienne
   * est evincee : un utilisateur qui se connecte depuis de nombreux appareils
   * ne doit pas accumuler indefiniment des sessions ouvertes.
   */
  utilisateur.refreshTokens = [
    ...(utilisateur.refreshTokens || []).slice(-4),
    {
      jti,
      expireLe: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    },
  ];

  await utilisateur.save({ validateBeforeSave: false });

  if (boutique) {
    boutique.derniereConnexion = new Date();
    await boutique.save({ validateBeforeSave: false });
  }

  res.cookie("refreshToken", refreshToken, refreshCookieOptions());
  recordAudit(req, "auth.login.success", { cible: "User", cibleId: utilisateur._id });

  // Permissions effectives : le role personnalise prime s'il est actif
  const permissions = utilisateur.customRole?.actif
    ? utilisateur.customRole.permissions
    : utilisateur.permissions;

  return success(res, {
    accessToken,
    utilisateur: {
      id: utilisateur._id,
      nom: utilisateur.nom,
      email: utilisateur.email,
      role: utilisateur.role,
      shopId: utilisateur.shopId,
      permissions,
      doitChangerMotDePasse: utilisateur.doitChangerMotDePasse,
      aTermineVisiteGuidee: utilisateur.aTermineVisiteGuidee,
    },
    boutique: boutique
      ? {
          id: boutique._id,
          nom: boutique.nom,
          code: boutique.code,
          statut: boutique.statut,
          devise: boutique.devise,
          logoUrl: boutique.logoUrl,
          onboardingTermine: boutique.onboardingTermine,
          etapesOnboarding: boutique.etapesOnboarding,
          plan: boutique.planId
            ? { nom: boutique.planId.nom, quotas: boutique.planId.quotas }
            : null,
        }
      : null,
  });
});
