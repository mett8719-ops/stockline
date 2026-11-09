/**
 * Console Super-Admin — Parametres plateforme et journaux de securite.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success, paginationMeta } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");
const mongoose = require("mongoose");

const PlatformSettingsModel = require("../model/platform-settings.model");
const AuditLogModel = require("../../audit-log/model/audit-log.model");
const UserModel = require("../../../../boutique/features/auth/model/user.model");

/** GET /platform/settings — Configuration globale. */
const getSettings = asyncHandler(async (req, res) => {
  const parametres = await PlatformSettingsModel.get();
  return success(res, parametres);
});

/** PATCH /platform/settings — Modification. */
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

/** GET /platform/logs — Ecran "Journaux & Securite". */
const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, severite, action, shopId, from, to } = req.validated.query;

  const filtre = {};
  if (severite) filtre.severite = severite;
  if (action) filtre.action = { $regex: action, $options: "i" };
  if (shopId) filtre.shopId = shopId;

  if (from || to) {
    filtre.createdAt = {};
    if (from) filtre.createdAt.$gte = new Date(from);
    if (to) filtre.createdAt.$lte = new Date(to);
  }

  const [logs, total, alertes24h, comptesBloques, parametres] = await Promise.all([
    AuditLogModel.find(filtre)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    AuditLogModel.countDocuments(filtre),

    AuditLogModel.find({
      severite: "haute",
      createdAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    UserModel.countDocuments({
      verrouilleJusquA: { $gt: new Date() },
    }),

    PlatformSettingsModel.get(),
  ]);

  return success(
    res,
    {
      logs,
      alertesSecurite24h: alertes24h,
      ipsBloquees: parametres.ipsBloquees || [],
      santeInfrastructure: {
        api: {
          statut: "operationnel",
          memoireMo: Math.round(process.memoryUsage().rss / 1048576),
        },
        baseDeDonnees: {
          statut: mongoose.connection.readyState === 1 ? "operationnel" : "degrade",
        },
        comptesTemporairementBloques: comptesBloques,
        demarreDepuis: `${Math.floor(process.uptime() / 3600)}h`,
      },
    },
    200,
    paginationMeta(page, limit, total)
  );
});

/**
 * POST /platform/security/block-ip — Bloquer definitivement une adresse IP.
 */
const blockIp = asyncHandler(async (req, res) => {
  const { ip, motif } = req.body;
  if (!ip) throw AppError.badRequest("L'adresse IP est obligatoire");

  const parametres = await PlatformSettingsModel.get();
  if (!parametres.ipsBloquees.includes(ip)) {
    parametres.ipsBloquees.push(ip);
    await parametres.save();

    await recordAudit(req, "ip.blocked", {
      severite: "haute",
      cible: "Security",
      details: { ip, motif: motif || "Blocage definitif manuel par Super-Admin" },
    });
  }

  return success(res, { message: `L'adresse IP ${ip} a ete bloquee definitivement.`, ipsBloquees: parametres.ipsBloquees });
});

/**
 * DELETE /platform/security/block-ip/:ip — Debloquer une adresse IP.
 */
const unblockIp = asyncHandler(async (req, res) => {
  const { ip } = req.params;
  const parametres = await PlatformSettingsModel.get();

  parametres.ipsBloquees = parametres.ipsBloquees.filter((blocked) => blocked !== ip);
  await parametres.save();

  await recordAudit(req, "ip.unblocked", {
    severite: "moyenne",
    cible: "Security",
    details: { ip },
  });

  return success(res, { message: `L'adresse IP ${ip} a ete debloquee.`, ipsBloquees: parametres.ipsBloquees });
});

module.exports = {
  getSettings,
  updateSettings,
  listAuditLogs,
  blockIp,
  unblockIp,
};
