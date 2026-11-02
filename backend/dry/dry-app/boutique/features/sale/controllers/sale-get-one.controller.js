/**
 * GET /sales/:id — Detail d'une vente et donnees du recu.
 *
 * Utilise pour reimprimer un ticket ou consulter le detail depuis
 * l'historique.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { tenantScope } = require("../../../../../core/tenant-guard");
const SaleModel = require("../model/sale.model");

module.exports = asyncHandler(async (req, res) => {
  const vente = await SaleModel.findOne(
    tenantScope(req, { _id: req.validated.params.id })
  ).lean();

  if (!vente) throw AppError.notFound("Vente introuvable");

  return success(res, {
    ...vente,
    // Structure prete pour la reimpression du ticket
    recu: {
      reference: vente.reference,
      date: vente.date,
      caissier: vente.caissierNom,
      client: vente.clientNom || "Client de passage",
      lignes: vente.lignes.map((l) => ({
        designation: l.produitNom,
        quantite: l.quantite,
        unite: l.unite,
        prixUnitaire: l.prixUnitaire,
        total: l.totalLigne,
      })),
      sousTotal: vente.sousTotal,
      remise: vente.remiseGlobale,
      montantTotal: vente.montantTotal,
      montantRemis: vente.montantRemis,
      monnaieRendue: vente.monnaieRendue,
      paiements: vente.paiements,
      statut: vente.statut,
    },
  });
});
