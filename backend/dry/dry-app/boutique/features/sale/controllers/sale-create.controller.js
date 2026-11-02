/**
 * POST /sales — Validation d'une vente en caisse.
 *
 * ══ L'OPERATION LA PLUS CRITIQUE DE L'APPLICATION ══
 * Elle touche au stock, a la tresorerie, aux creances clients et au calcul du
 * benefice. Tout est execute dans une TRANSACTION MongoDB : soit l'ensemble
 * reussit, soit rien n'est ecrit.
 *
 * Il ne peut donc JAMAIS exister une vente sans sortie de stock, ni un stock
 * decremente sans vente correspondante — c'est ce qui rend l'inventaire
 * interpretable.
 *
 * ENCHAINEMENT :
 *   1. calcul serveur des lignes et des montants
 *   2. verification et ventilation des paiements
 *   3. controle du client et de son plafond de credit
 *   4. sortie de stock pour chaque ligne
 *   5. creation de la vente
 *   6. mise a jour de la creance client
 *   7. ecriture de la recette en tresorerie
 *
 * IDEMPOTENCE : si `clientOperationId` a deja ete traite (re-synchronisation
 * apres coupure reseau), la vente existante est renvoyee telle quelle.
 */
const mongoose = require("mongoose");
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { tenantScope } = require("../../../../../core/tenant-guard");
const { emitToShop } = require("../../../../../core/services/realtime.service");

const SaleModel = require("../model/sale.model");
const CustomerModel = require("../../customer/model/customer.model");
const CashTransactionModel = require("../../treasury/model/cash-transaction.model");
const CashSessionModel = require("../../treasury/model/cash-session.model");
const StockMovementModel = require("../../stock/model/stock-movement.model");

const saleService = require("../model/sale.service");
const stockService = require("../../stock/model/stock.service");

module.exports = asyncHandler(async (req, res) => {
  const donnees = req.validated.body;
  const { arrondir } = saleService;

  // ══ IDEMPOTENCE HORS-LIGNE ════════════════════════════════════════
  if (donnees.clientOperationId) {
    const dejaEnregistree = await SaleModel.findOne(
      tenantScope(req, { clientOperationId: donnees.clientOperationId })
    ).lean();

    if (dejaEnregistree) {
      // On renvoie 200 et non 201 : rien n'a ete cree cette fois-ci
      return success(res, { vente: dejaEnregistree, dejaSynchronisee: true }, 200);
    }
  }

  const session = await mongoose.startSession();
  let venteCreee = null;
  let alertesStock = [];

  try {
    await session.withTransaction(async () => {
      // ══ 1. CALCUL SERVEUR DES LIGNES ═══════════════════════════════
      const { lignes, sousTotal, montantTva, beneficeTotal } =
        await saleService.calculerLignes(req, donnees.lignes, session);

      const remiseGlobale = donnees.remiseGlobale || 0;
      const montantTotal = arrondir(sousTotal - remiseGlobale);

      if (montantTotal < 0) {
        throw AppError.badRequest(
          "La remise globale depasse le montant de la vente"
        );
      }

      // ══ 2. PAIEMENTS ═══════════════════════════════════════════════
      const { montantPaye, montantCredit, monnaieRendue, statut } =
        saleService.calculerPaiements({
          paiements: donnees.paiements,
          montantTotal,
          montantRemis: donnees.montantRemis,
          clientId: donnees.clientId,
        });

      // ══ 3. CLIENT ET PLAFOND DE CREDIT ═════════════════════════════
      let client = null;

      if (donnees.clientId) {
        client = await CustomerModel.findOne(
          tenantScope(req, { _id: donnees.clientId })
        ).session(session);

        if (!client) throw AppError.badRequest("Client introuvable");

        // Controle du plafond, s'il est defini (0 = pas de limite)
        if (montantCredit > 0 && client.plafondCredit > 0) {
          const nouveauSolde = client.soldeCredit + montantCredit;

          if (nouveauSolde > client.plafondCredit) {
            throw AppError.badRequest(
              `Plafond de credit depasse pour ${client.nom} : ` +
              `${nouveauSolde} / ${client.plafondCredit} autorise(s)`
            );
          }
        }
      }

      const reference = await SaleModel.genererReference(req.user.shopId);

      // Session de caisse ouverte, si le gerant en utilise une
      const sessionCaisse = await CashSessionModel.findOne(
        tenantScope(req, { statut: "ouverte" })
      )
        .session(session)
        .lean();

      // ══ 4. SORTIE DE STOCK ═════════════════════════════════════════
      // Le service verifie TOUTES les lignes avant d'en appliquer une seule
      alertesStock = await stockService.appliquerSortiesVente(req, lignes, {
        referenceLibelle: `Vente caisse ${reference}`,
        session,
      });

      // ══ 5. CREATION DE LA VENTE ════════════════════════════════════
      const [vente] = await SaleModel.create(
        [{
          shopId: req.user.shopId,
          reference,
          clientId: client?._id || null,
          clientNom: client?.nom,
          lignes,
          sousTotal,
          remiseGlobale,
          montantTva,
          montantTotal,
          paiements: donnees.paiements,
          montantPaye,
          montantRemis: donnees.montantRemis || 0,
          monnaieRendue,
          montantCredit,
          beneficeTotal,
          statut,
          caissierId: req.user.id,
          caissierNom: req.user.nom,
          sessionCaisseId: sessionCaisse?._id,
          clientOperationId: donnees.clientOperationId,
          creeeHorsLigne: donnees.creeeHorsLigne || false,
          synchroniseeLe: donnees.creeeHorsLigne ? new Date() : undefined,
          date: donnees.dateVente || new Date(),
        }],
        { session }
      );

      venteCreee = vente;

      /**
       * Les mouvements de stock ont ete crees AVANT la vente (on ne connait
       * son identifiant qu'apres). On les rattache maintenant, pour que la
       * fiche produit puisse renvoyer vers la vente d'origine.
       */
      await StockMovementModel.updateMany(
        {
          shopId: req.user.shopId,
          referenceLibelle: `Vente caisse ${reference}`,
        },
        { referenceId: vente._id },
        { session }
      );

      // ══ 6. MISE A JOUR DU CLIENT ═══════════════════════════════════
      if (client) {
        client.soldeCredit = arrondir(client.soldeCredit + montantCredit);
        client.totalAchats = arrondir(client.totalAchats + montantTotal);
        client.nombreAchats += 1;
        client.dernierAchat = new Date();
        // 1 point de fidelite par tranche de 1000 depensee
        client.pointsFidelite += Math.floor(montantTotal / 1000);
        await client.save({ session });
      }

      // ══ 7. RECETTE EN TRESORERIE ═══════════════════════════════════
      // Seule la part REGLEE entre en caisse ; le credit ne rentre pas
      if (montantPaye > 0) {
        await CashTransactionModel.create(
          [{
            shopId: req.user.shopId,
            type: "recette",
            libelle: `Vente ${reference}`,
            montant: montantPaye,
            modePaiement:
              donnees.paiements.find((p) => p.mode !== "credit")?.mode || "especes",
            categorie: "ventes",
            origineType: "vente",
            origineId: vente._id,
            sessionCaisseId: sessionCaisse?._id,
            auteurId: req.user.id,
            auteurNom: req.user.nom,
          }],
          { session }
        );
      }
    });
  } finally {
    await session.endSession();
  }

  // Rafraichit le tableau de bord des autres postes en temps reel
  emitToShop(req.user.shopId, "sale:created", {
    reference: venteCreee.reference,
    montantTotal: venteCreee.montantTotal,
    caissier: req.user.nom,
  });

  return success(
    res,
    {
      vente: venteCreee,
      /**
       * Donnees du recu, pretes a afficher dans la modale "Vente validee !"
       * et a envoyer a l'imprimante thermique.
       */
      recu: {
        reference: venteCreee.reference,
        date: venteCreee.date,
        lignes: venteCreee.lignes.map((l) => ({
          designation: l.produitNom,
          quantite: l.quantite,
          total: l.totalLigne,
        })),
        montantTotal: venteCreee.montantTotal,
        monnaieRendue: venteCreee.monnaieRendue,
        modePaiement: venteCreee.paiements.map((p) => p.mode).join(" + "),
      },
      alertesStock,
    },
    201
  );
});
