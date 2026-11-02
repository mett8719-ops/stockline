/**
 * Console Super-Admin — Feature flags.
 *
 * Permet d'activer une fonctionnalite progressivement : globalement, sur
 * certains plans, sur une liste fermee de boutiques (beta), ou sur un
 * pourcentage du parc.
 */
const asyncHandler = require("../../../../../core/async-handler");
const { success } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");

const FeatureFlagModel = require("../model/feature-flag.model");
const ShopModel = require("../../shop/model/shop.model");

/** GET /platform/feature-flags — Liste complete. */
const listFlags = asyncHandler(async (req, res) => {
  const flags = await FeatureFlagModel.find()
    .sort({ environnement: 1, nom: 1 })
    .lean();

  return success(res, flags);
});

/**
 * PUT /platform/feature-flags — Creation ou mise a jour.
 *
 * `upsert` : un seul point d'entree pour creer et modifier, la cle technique
 * servant d'identifiant naturel.
 */
const upsertFlag = asyncHandler(async (req, res) => {
  const { cle } = req.validated.body;

  const flag = await FeatureFlagModel.findOneAndUpdate(
    { cle },
    { ...req.validated.body, modifiePar: req.user.id },
    { upsert: true, new: true, runValidators: true }
  );

  recordAudit(req, "feature_flag.updated", {
    severite: "moyenne",
    cible: "FeatureFlag",
    cibleId: flag._id,
    apres: { cle: flag.cle, actif: flag.actif, strategie: flag.strategie },
  });

  return success(res, flag);
});

/**
 * GET /features — Flags actifs pour la boutique de l'appelant.
 *
 * Appele par le frontend au demarrage pour savoir quelles fonctionnalites
 * afficher. Renvoie un objet simple : { new_dashboard_v2: true, ... }
 */
const myFeatures = asyncHandler(async (req, res) => {
  const flags = await FeatureFlagModel.find({ actif: true });

  const boutique = req.user.shopId
    ? await ShopModel.findById(req.user.shopId).lean()
    : null;

  const actifs = {};
  for (const flag of flags) {
    actifs[flag.cle] = flag.estActifPour(boutique);
  }

  return success(res, actifs);
});

module.exports = { listFlags, upsertFlag, myFeatures };
