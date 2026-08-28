/**
 * POST /sales/:id/cancel — Annulation d'une vente.
 *
 * ══ ACTION HAUTEMENT SENSIBLE ══
 * Reservee a l'administrateur de la boutique (voir la route) et
 * systematiquement journalisee en severite haute.
 *
 * ══ ON N'EFFACE JAMAIS LA VENTE ══
 * Elle reste dans l'historique avec le statut `annulee`, son motif et son
 * auteur. Effacer une vente rendrait impossible toute verification comptable
 * a posteriori — et faciliterait le detournement.
 *
 * TROIS OPERATIONS COMPENSATOIRES, dans une transaction :
 *   1. restitution du stock (mouvements d'entree traces)
 *   2. annulation de la creance client
 *   3. contre-ecriture en tresorerie
 */
const mongoose = require("mongoose");
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { tenantScope } = require("../../../../../core/tenant-guard");
const { recordAudit } = require("../../../../../core/audit");

const SaleModel = require("../model/sale.model");
const CustomerModel = require("../../customer/model/customer.model");
const CashTransactionModel = require("../../treasury/model/cash-transaction.model");
const stockService = require("../../stock/model/stock.service");

module.exports = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { motif } = req.validated.body;

  const vente = await SaleModel.findOne(tenantScope(req, { _id: id }));
  if (!vente) throw AppError.notFound("Vente introuvable");

  if (vente.statut === "annulee") {
    throw AppError.conflict("Cette vente est deja annulee");
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // ══ 1. RESTITUTION DU STOCK ════════════════════════════════════
      // Chaque ligne genere une ENTREE tracee avec le motif d'annulation
      await stockService.annulerSortiesVente(req, vente.lignes, {
        referenceId: vente._id,
        referenceLibelle: `vente ${vente.reference}`,
        session,
      });

      // ══ 2. ANNULATION DE LA CREANCE CLIENT ═════════════════════════
      if (vente.clientId && vente.montantCredit > 0) {
        await CustomerModel.updateOne(
          { _id: vente.clientId, shopId: req.user.shopId },
          {
            $inc: {
              soldeCredit: -vente.montantCredit,
              totalAchats: -vente.montantTotal,
              nombreAchats: -1,
            },
          },
          { session }
        );
      }

      // ══ 3. CONTRE-ECRITURE EN TRESORERIE ═══════════════════════════
      /**
       * On cree une DEPENSE compensatoire plutot que de supprimer la recette
       * d'origine. Le journal de caisse doit refleter tous les mouvements
       * reellement survenus, y compris les corrections.
       */
      if (vente.montantPaye > 0) {
        await CashTransactionModel.create(
          [{
            shopId: req.user.shopId,
            type: "depense",
            libelle: `Annulation vente ${vente.reference}`,
            montant: vente.montantPaye,
            categorie: "annulation",
            origineType: "vente",
            origineId: vente._id,
            auteurId: req.user.id,
            auteurNom: req.user.nom,
            notes: motif,
          }],
          { session }
        );
      }

      // ══ 4. MARQUAGE DE LA VENTE ════════════════════════════════════
      vente.statut = "annulee";
      vente.annuleeLe = new Date();
      vente.annuleePar = req.user.id;
      vente.motifAnnulation = motif;
      await vente.save({ session });
    });
  } finally {
    await session.endSession();
  }

  recordAudit(req, "sale.cancelled", {
    severite: "haute",
    cible: "Sale",
    cibleId: vente._id,
    avant: {
      reference: vente.reference,
      montantTotal: vente.montantTotal,
      statut: "payee",
    },
    apres: { statut: "annulee", motif },
  });

  return success(res, {
    message: `Vente ${vente.reference} annulee. Le stock a ete restitue.`,
    vente,
  });
});
