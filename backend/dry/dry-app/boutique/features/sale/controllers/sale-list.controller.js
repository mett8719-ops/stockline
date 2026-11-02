/**
 * GET /sales — Historique des ventes, filtrable.
 *
 * ══ POINT IMPORTANT SUR LES TOTAUX ══
 * Les totaux sont calcules sur TOUTE LA SELECTION, pas seulement sur la page
 * affichee. Un gerant qui filtre sur un mois doit voir le chiffre d'affaires
 * des 400 ventes du mois, pas celui des 20 lignes visibles a l'ecran.
 */
const asyncHandler = require("../../../../../core/async-handler");
const { success, paginationMeta } = require("../../../../../core/response");
const { tenantScope } = require("../../../../../core/tenant-guard");
const SaleModel = require("../model/sale.model");

module.exports = asyncHandler(async (req, res) => {
  const { page, limit, from, to, clientId, caissierId, statut, q } =
    req.validated.query;

  const criteres = {};

  if (clientId) criteres.clientId = clientId;
  if (caissierId) criteres.caissierId = caissierId;

  /**
   * Par defaut, les ventes annulees sont MASQUEES : elles fausseraient la
   * lecture de l'historique. Elles restent accessibles via `statut=annulee`.
   */
  if (statut) criteres.statut = statut;
  else criteres.statut = { $ne: "annulee" };

  if (from || to) {
    criteres.date = {};
    if (from) criteres.date.$gte = from;
    if (to) criteres.date.$lte = to;
  }

  if (q) {
    criteres.$or = [
      { reference: { $regex: q, $options: "i" } },
      { clientNom: { $regex: q, $options: "i" } },
    ];
  }

  const filtre = tenantScope(req, criteres);

  const [ventes, total, totaux] = await Promise.all([
    SaleModel.find(filtre)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    SaleModel.countDocuments(filtre),

    // Agregation sur la selection complete
    SaleModel.aggregate([
      { $match: filtre },
      {
        $group: {
          _id: null,
          chiffreAffaires: { $sum: "$montantTotal" },
          benefice: { $sum: "$beneficeTotal" },
          nombreVentes: { $sum: 1 },
        },
      },
    ]),
  ]);

  return success(
    res,
    {
      ventes,
      totaux: totaux[0] || {
        chiffreAffaires: 0,
        benefice: 0,
        nombreVentes: 0,
      },
    },
    200,
    paginationMeta(page, limit, total)
  );
});
