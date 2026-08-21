/**
 * GET /platform/signup-requests — File d'attente des demandes.
 *
 * Correspond a l'ecran "Demandes en attente" de la console Super-Admin.
 * Par defaut, seules les demandes NON TRAITEES sont affichees — les demandes
 * approuvees ou rejetees restent consultables via le filtre `statut`.
 */
const asyncHandler = require("../../../../../core/async-handler");
const { success, paginationMeta } = require("../../../../../core/response");
const SignupRequestModel = require("../model/signup-request.model");

module.exports = asyncHandler(async (req, res) => {
  const { page, limit, statut, q } = req.validated.query;

  const filtre = {};

  if (statut) {
    filtre.statut = statut;
  } else {
    // Par defaut : uniquement les demandes qui attendent une action
    filtre.statut = { $in: ["pending", "in_review", "info_requested"] };
  }

  // Barre "Rechercher une boutique ou un proprietaire..."
  if (q) {
    filtre.$or = [
      { "boutique.nom": { $regex: q, $options: "i" } },
      { "proprietaire.nomComplet": { $regex: q, $options: "i" } },
      { "proprietaire.email": { $regex: q, $options: "i" } },
    ];
  }

  const [demandes, total] = await Promise.all([
    SignupRequestModel.find(filtre)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SignupRequestModel.countDocuments(filtre),
  ]);

  return success(res, demandes, 200, paginationMeta(page, limit, total));
});
