/**
 * Controleurs du module Utilisateurs & Droits (cote boutique).
 *
 * ══ PRINCIPE FONDAMENTAL ══
 * C'est l'ADMIN DE CHAQUE BOUTIQUE qui cree et gere ses propres agents. Le
 * Super-Admin de la plateforme n'intervient JAMAIS ici et n'a aucun acces a
 * la liste des employes d'une boutique.
 *
 * Deux protections empechent une boutique de se verrouiller elle-meme :
 *   - un admin ne peut pas modifier son propre role ni se desactiver
 *   - la boutique doit toujours conserver au moins un admin actif
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { tenantScope, tenantPayload } = require("../../../../../core/tenant-guard");
const { recordAudit } = require("../../../../../core/audit");
const { generateTemporaryPassword } = require("../../../../../core/tokens");
const { sendEmployeeInvite } = require("../../../../../core/services/mailer.service");
const {
  SHOP_ROLES, DEFAULT_ROLE_PERMISSIONS, PERMISSION_LIST,
} = require("../../../../../core/constants");

const UserModel = require("../../auth/model/user.model");
const RoleModel = require("../model/role.model");
const ShopModel = require("../../../../platform/features/shop/model/shop.model");

/** GET /users — Membres de l'equipe. */
const list = asyncHandler(async (req, res) => {
  const membres = await UserModel.find(tenantScope(req, {}))
    .select("+permissions")
    .populate("customRole", "nom couleur permissions")
    .sort({ role: 1, nom: 1 })
    .lean();

  return success(
    res,
    membres.map((m) => ({
      id: m._id,
      nom: m.nom,
      email: m.email,
      telephone: m.telephone,
      role: m.role,
      // Libelle affiche : nom du role personnalise s'il existe
      roleLibelle: m.customRole?.nom || m.role,
      couleurRole: m.customRole?.couleur,
      permissions: m.customRole?.permissions || m.permissions,
      actif: m.actif,
      gele: m.gele,
      motifGel: m.motifGel,
      derniereConnexion: m.derniereConnexion,
      doitChangerMotDePasse: m.doitChangerMotDePasse,
    }))
  );
});

/**
 * POST /users — Invitation d'un employe.
 *
 * Genere un mot de passe temporaire et l'envoie par email. L'employe devra le
 * changer a sa premiere connexion (flag `doitChangerMotDePasse`).
 */
const invite = asyncHandler(async (req, res) => {
  const { nom, email, telephone, role, customRoleId, permissions } =
    req.validated.body;

  // ══ QUOTA UTILISATEURS DU PLAN ═════════════════════════════════════
  const boutique = await ShopModel.findById(req.user.shopId)
    .populate("planId", "nom quotas")
    .lean();

  const quota = boutique?.planId?.quotas?.utilisateurs;

  if (quota && quota !== -1) {
    const nombreActuel = await UserModel.countDocuments(
      tenantScope(req, { actif: true })
    );

    if (nombreActuel >= quota) {
      throw new AppError(
        `Votre plan ${boutique.planId.nom} est limite a ${quota} utilisateurs. ` +
        "Passez a un plan superieur pour inviter davantage d'employes.",
        403, "QUOTA_EXCEEDED"
      );
    }
  }

  // Unicite de l'email DANS la boutique
  const existe = await UserModel.findOne(tenantScope(req, { email })).lean();
  if (existe) {
    throw AppError.conflict(
      "Un membre de votre equipe utilise deja cette adresse email"
    );
  }

  // ══ RESOLUTION DES PERMISSIONS ═════════════════════════════════════
  let permissionsEffectives = permissions;

  if (customRoleId) {
    // Le role personnalise doit appartenir a CETTE boutique
    const rolePersonnalise = await RoleModel.findOne(
      tenantScope(req, { _id: customRoleId, actif: true })
    ).lean();

    if (!rolePersonnalise) {
      throw AppError.badRequest("Role personnalise introuvable");
    }
    permissionsEffectives = rolePersonnalise.permissions;
  } else if (!permissionsEffectives) {
    permissionsEffectives = DEFAULT_ROLE_PERMISSIONS[role] || [];
  }

  const motDePasseTemporaire = generateTemporaryPassword();

  const employe = await UserModel.create(
    tenantPayload(req, {
      nom,
      email,
      telephone,
      // Le hook pre-save du modele hache automatiquement
      passwordHash: motDePasseTemporaire,
      role: customRoleId ? SHOP_ROLES.CUSTOM : role,
      customRole: customRoleId || null,
      permissions: permissionsEffectives,
      doitChangerMotDePasse: true,
      actif: true,
    })
  );

  await ShopModel.updateOne(
    { _id: req.user.shopId },
    {
      $inc: { "compteurs.utilisateurs": 1 },
      // Coche l'etape "Inviter un employe" de la checklist d'onboarding
      $set: { "etapesOnboarding.employeInvite": true },
    }
  );

  await sendEmployeeInvite({
    to: email,
    employeeName: nom,
    shopName: boutique.nom,
    roleLabel: role,
    tempPassword: motDePasseTemporaire,
    loginUrl: `${(process.env.CORS_ORIGIN || "").split(",")[0]}/login`,
  });

  recordAudit(req, "user.invited", {
    severite: "moyenne",
    cible: "User",
    cibleId: employe._id,
    apres: { nom, email, role },
  });

  return success(
    res,
    {
      employe: {
        id: employe._id,
        nom: employe.nom,
        email: employe.email,
        role: employe.role,
      },
      /**
       * Affiche UNE SEULE FOIS dans l'interface : permet a l'admin de
       * transmettre les acces de vive voix si l'employe n'a pas d'email
       * consultable — cas frequent chez un caissier.
       */
      motDePasseTemporaire,
    },
    201
  );
});

/**
 * PATCH /users/:id — Modification du role, des permissions ou de l'etat.
 *
 * Deux garde-fous empechent une boutique de se verrouiller elle-meme.
 */
const update = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const donnees = req.validated.body;

  const employe = await UserModel.findOne(tenantScope(req, { _id: id }))
    .select("+permissions +refreshTokens");

  if (!employe) throw AppError.notFound("Membre introuvable");

  // ── GARDE-FOU 1 : ne pas se retirer ses propres droits ──────────────
  if (
    String(employe._id) === req.user.id &&
    (donnees.role || donnees.actif === false || donnees.gele)
  ) {
    throw AppError.badRequest(
      "Vous ne pouvez pas modifier votre propre role ni desactiver votre compte"
    );
  }

  // ── GARDE-FOU 2 : toujours au moins un admin actif ──────────────────
  if (
    employe.role === SHOP_ROLES.ADMIN &&
    (donnees.role || donnees.actif === false || donnees.gele)
  ) {
    const autresAdmins = await UserModel.countDocuments(
      tenantScope(req, {
        role: SHOP_ROLES.ADMIN,
        actif: true,
        gele: false,
        _id: { $ne: id },
      })
    );

    if (autresAdmins === 0) {
      throw AppError.badRequest(
        "Votre boutique doit conserver au moins un administrateur actif"
      );
    }
  }

  // ── Role personnalise ───────────────────────────────────────────────
  if (donnees.customRoleId !== undefined) {
    if (donnees.customRoleId) {
      const role = await RoleModel.findOne(
        tenantScope(req, { _id: donnees.customRoleId })
      ).lean();

      if (!role) throw AppError.badRequest("Role personnalise introuvable");

      employe.customRole = role._id;
      employe.role = SHOP_ROLES.CUSTOM;
      employe.permissions = role.permissions;
    } else {
      employe.customRole = null;
    }
    delete donnees.customRoleId;
  }

  const etatAvant = {
    role: employe.role,
    actif: employe.actif,
    gele: employe.gele,
  };

  Object.assign(employe, donnees);

  // Changement de role sans permissions explicites : on applique les defauts
  if (donnees.role && !donnees.permissions && !employe.customRole) {
    employe.permissions = DEFAULT_ROLE_PERMISSIONS[donnees.role] || [];
  }

  /**
   * Un compte gele ou desactive voit ses sessions coupees IMMEDIATEMENT.
   * Sans cela, l'employe resterait connecte jusqu'a l'expiration de son
   * jeton — jusqu'a 15 minutes de trop.
   */
  if (donnees.gele === true || donnees.actif === false) {
    employe.refreshTokens = [];
  }

  await employe.save();

  recordAudit(req, "user.updated", {
    severite: "moyenne",
    cible: "User",
    cibleId: employe._id,
    avant: etatAvant,
    apres: { role: employe.role, actif: employe.actif, gele: employe.gele },
  });

  return success(res, employe);
});

/** POST /users/:id/reset-password — Reinitialisation par l'administrateur. */
const resetPassword = asyncHandler(async (req, res) => {
  const employe = await UserModel.findOne(
    tenantScope(req, { _id: req.validated.params.id })
  ).select("+passwordHash +refreshTokens");

  if (!employe) throw AppError.notFound("Membre introuvable");

  const motDePasseTemporaire = generateTemporaryPassword();

  employe.passwordHash = motDePasseTemporaire;
  employe.doitChangerMotDePasse = true;
  employe.refreshTokens = [];        // coupe les sessions en cours
  employe.tentativesEchouees = 0;
  employe.bloqueJusquA = null;       // debloque un compte verrouille

  await employe.save();

  recordAudit(req, "user.password_reset_by_admin", {
    severite: "haute",
    cible: "User",
    cibleId: employe._id,
  });

  return success(res, {
    message: `Mot de passe reinitialise pour ${employe.nom}.`,
    motDePasseTemporaire,
  });
});

// ══ ROLES PERSONNALISES ═══════════════════════════════════════════════

/** GET /roles — Roles sur mesure + roles predefinis + permissions disponibles. */
const listRoles = asyncHandler(async (req, res) => {
  const roles = await RoleModel.find(tenantScope(req, {}))
    .sort({ nom: 1 })
    .lean();

  return success(res, {
    roles,
    // Affiches en lecture seule dans l'interface, pour reference
    rolesPredefinis: Object.entries(DEFAULT_ROLE_PERMISSIONS).map(
      ([nom, permissions]) => ({ nom, permissions, predefini: true })
    ),
    permissionsDisponibles: PERMISSION_LIST,
  });
});

/** POST /roles — Creation d'un role sur mesure. */
const createRole = asyncHandler(async (req, res) => {
  const existe = await RoleModel.findOne(
    tenantScope(req, { nom: req.validated.body.nom })
  ).lean();

  if (existe) throw AppError.conflict("Un role portant ce nom existe deja");

  const role = await RoleModel.create(
    tenantPayload(req, { ...req.validated.body, creePar: req.user.id })
  );

  recordAudit(req, "role.created", {
    cible: "Role",
    cibleId: role._id,
    apres: { nom: role.nom, permissions: role.permissions },
  });

  return success(res, role, 201);
});

/**
 * PATCH /roles/:id — Modification d'un role.
 * Les permissions des utilisateurs qui le portent sont mises a jour
 * immediatement — sinon ils garderaient d'anciens droits jusqu'a leur
 * prochaine reconnexion.
 */
const updateRole = asyncHandler(async (req, res) => {
  const role = await RoleModel.findOneAndUpdate(
    tenantScope(req, { _id: req.validated.params.id }),
    req.validated.body,
    { new: true, runValidators: true }
  );

  if (!role) throw AppError.notFound("Role introuvable");

  if (req.validated.body.permissions) {
    await UserModel.updateMany(
      tenantScope(req, { customRole: role._id }),
      { permissions: role.permissions }
    );
  }

  recordAudit(req, "role.updated", {
    severite: "moyenne",
    cible: "Role",
    cibleId: role._id,
    apres: { permissions: role.permissions },
  });

  return success(res, role);
});

module.exports = {
  list, invite, update, resetPassword, listRoles, createRole, updateRole,
};
