/**
 * Console Super-Admin — Gestion des plans tarifaires.
 *
 * Correspond a l'ecran "Plans tarifaires" : creation de plans personnalises,
 * publication ou masquage, definition des quotas et du selecteur de
 * fonctionnalites.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");

const PlanModel = require("../model/plan.model");
const ShopModel = require("../../shop/model/shop.model");

/** GET /platform/plans — Tous les plans, avec leur nombre de boutiques. */
const listPlans = asyncHandler(async (req, res) => {
  const plans = await PlanModel.find().sort({ ordre: 1, prix: 1 }).lean();

  // Comptage groupe : une seule requete pour tous les plans
  const utilisation = await ShopModel.aggregate([
    { $group: { _id: "$planId", boutiques: { $sum: 1 } } },
  ]);

  const parId = new Map(
    utilisation.map((u) => [String(u._id), u.boutiques])
  );

  return success(
    res,
    plans.map((p) => ({
      ...p,
      nombreBoutiques: parId.get(String(p._id)) || 0,
    }))
  );
});

/** POST /platform/plans — Creation d'un plan personnalise. */
const createPlan = asyncHandler(async (req, res) => {
  const existe = await PlanModel.findOne({ nom: req.validated.body.nom }).lean();
  if (existe) throw AppError.conflict("Un plan porte deja ce nom");

  const plan = await PlanModel.create({
    ...req.validated.body,
    personnalise: true,
    creePar: req.user.id,
  });

  recordAudit(req, "plan.created", {
    severite: "moyenne",
    cible: "Plan",
    cibleId: plan._id,
    apres: { nom: plan.nom, prix: plan.prix },
  });

  return success(res, plan, 201);
});

/**
 * PATCH /platform/plans/:id — Modification, publication ou masquage.
 *
 * Masquer un plan encore utilise demande une confirmation explicite : les
 * abonnements en cours ne sont pas affectes, mais l'operation merite d'etre
 * consciente.
 */
const updatePlan = asyncHandler(async (req, res) => {
  const plan = await PlanModel.findById(req.validated.params.id);
  if (!plan) throw AppError.notFound("Plan introuvable");

  if (req.validated.body.publie === false) {
    const utilise = await ShopModel.countDocuments({
      planId: plan._id,
      statut: "active",
    });

    if (utilise > 0 && req.validated.body.forcer !== true) {
      throw AppError.conflict(
        `${utilise} boutique(s) utilisent ce plan. Le masquer le retirera de ` +
        "la page d'inscription sans affecter les abonnements en cours. " +
        "Renvoyez `forcer: true` pour confirmer."
      );
    }
  }

  const avant = { prix: plan.prix, publie: plan.publie };

  // `forcer` n'est pas un champ du modele : on le retire avant l'affectation
  const { forcer, ...donnees } = req.validated.body;
  Object.assign(plan, donnees);

  await plan.save();

  recordAudit(req, "plan.updated", {
    severite: "moyenne",
    cible: "Plan",
    cibleId: plan._id,
    avant,
    apres: { prix: plan.prix, publie: plan.publie },
  });

  return success(res, plan);
});

module.exports = { listPlans, createPlan, updatePlan };
