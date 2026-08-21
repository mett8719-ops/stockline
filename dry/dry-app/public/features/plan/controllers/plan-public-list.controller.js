/**
 * GET /public/plans — Plans tarifaires publies.
 *
 * Alimente la section "Tarifs clairs, sans surprise" de la page publique ET
 * l'etape 3 du formulaire d'inscription.
 *
 * ══ POINT DE SECURITE ══
 * Seuls les plans `publie: true` sont renvoyes, et on selectionne uniquement
 * les champs publics. Les informations internes (auteur du plan, nombre de
 * boutiques abonnees, plans masques) ne sortent jamais de la console admin.
 */
const asyncHandler = require("../../../../../core/async-handler");
const { success } = require("../../../../../core/response");
const PlanModel = require("../../../../platform/features/plan-admin/model/plan.model");

module.exports = asyncHandler(async (req, res) => {
  const plans = await PlanModel.find({ publie: true })
    .sort({ ordre: 1, prix: 1 })
    .select(
      "nom description prix devise cycle remiseAnnuellePourcent quotas " +
      "fonctionnalites fonctionnalitesSupplementaires populaire"
    )
    .lean();

  return success(res, plans);
});
