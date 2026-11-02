/**
 * Console Super-Admin — Parametres plateforme et journaux de securite.
 */
const asyncHandler = require("../../../../../core/async-handler");
const { success, paginationMeta } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");
const mongoose = require("mongoose");

const PlatformSettingsModel = require("../model/platform-settings.model");
const AuditLogModel = require("../../audit-log/model/audit-log.model");
const UserModel = require("../../../../boutique/features/auth/model/user.model");

/** GET /platform/settings — Configuration globale. */
const getSettings = asyncHandler(async (req, res) => {
  // La methode statique cree le document au premier appel si besoin
  const parametres = await PlatformSettingsModel.get();
  return success(res, parametres);
});

/**
 * PATCH /platform/settings — Modification.
 *
 * Fusion SUPERFICIELLE par section : envoyer uniquement `emails` ne doit pas
 * effacer la section `general`. Une affectation directe ecraserait tout.
 */
const updateSettings = asyncHandler(async (req, res) => {
  const parametres = await PlatformSettingsModel.get();

  for (const [section, valeurs] of Object.entries(req.validated.body)) {
    if (parametres[section] && typeof valeurs === "object") {
      Object.assign(parametres[section], valeurs);
    }
  }

  parametres.modifiePar = req.user.id;
  await parametres.save();

  recordAudit(req, "platform_settings.updated", {
    severite: "haute",
    cible: "PlatformSettings",
    apres: Object.keys(req.validated.body),
  });

  return success(res, parametres);
});

/**
 * GET /platform/logs — Ecran "Journaux & Securite".
 *
 * Renvoie le journal d'audit filtrable, les alertes de securite des dernieres
 * 24 heures, et l'etat de sante de l'infrastructure.
 */
const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, severite, action, shopId, from, to } = req.validated.query;

  const filtre = {};
  if (severite) filtre.severite = severite;
  if (action) filtre.action = { $regex: action, $options: "i" };
  if (shopId) filtre.shopId = shopId;

  if (from || to) {
    filtre.createdAt = {};
    if (from) filtre.createdAt.$gte = from;
    if (to) filtre.createdAt.$lte = to;
  }

  const [journaux, total, alertesSecurite, comptesBloques] = await Promise.all([
    AuditLogModel.find(filtre)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    AuditLogModel.countDocuments(filtre),

    // Alertes de securite des dernieres 24 heures
    AuditLogModel.find({
      severite: "haute",
      action: {
        $in: [
          "auth.login.failed",
          "auth.account.locked",
          "auth.refresh.reuse_detected",
        ],
      },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),

    UserModel.countDocuments({ bloqueJusquA: { $gt: new Date() } }),
  ]);

  return success(
    res,
    {
      journaux,
      alertesSecurite,
      // Encadre "Sante de l'infrastructure"
      santeInfrastructure: {
        api: {
          statut: "operationnel",
          memoireMo: Math.round(process.memoryUsage().rss / 1048576),
        },
        baseDeDonnees: {
          // readyState 1 = connecte
          statut:
            mongoose.connection.readyState === 1 ? "operationnel" : "degrade",
        },
        comptesTemporairementBloques: comptesBloques,
        demarreDepuis: `${Math.floor(process.uptime() / 3600)}h`,
      },
    },
    200,
    paginationMeta(page, limit, total)
  );
});

module.exports = { getSettings, updateSettings, listAuditLogs };
