/**
 * Espace BOUTIQUE — Gestion de l'abonnement et paiement autonome par le commercant.
 *
 * Permet a une boutique (meme suspendue pour non-paiement) de :
 *   1. Consulter son plan actuel, ses quotas et ses factures de plateforme
 *   2. Declencher le paiement de sa facture par Mobile Money pour se reactiver
 *   3. Suivre en direct la validation du paiement sur son telephone
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");
const paiement = require("../../../../../core/services/payment/payment.interface");
const { PAYMENT_STATUS, SHOP_STATUS, BILLING_CYCLE } = require("../../../../../core/constants");

const ShopModel = require("../../../../platform/features/shop/model/shop.model");
const PlanModel = require("../../../../platform/features/plan-admin/model/plan.model");
const PlatformInvoiceModel = require("../../../../platform/features/billing/model/platform-invoice.model");
const PaymentModel = require("../../../../platform/features/billing/model/payment.model");

/**
 * GET /subscription — Informations sur l'abonnement et factures en attente.
 */
const getMySubscription = asyncHandler(async (req, res) => {
  const shop = await ShopModel.findById(req.shopId).lean();
  if (!shop) throw AppError.notFound("Boutique introuvable");

  const [plan, factures] = await Promise.all([
    shop.planId ? PlanModel.findById(shop.planId).lean() : null,
    PlatformInvoiceModel.find({ shopId: req.shopId })
      .sort({ dateEmission: -1 })
      .limit(12)
      .lean(),
  ]);

  const factureEnAttente = factures.find((f) => ["en_attente", "en_retard"].includes(f.statut));

  return success(res, {
    boutique: {
      id: shop._id,
      code: shop.code,
      nom: shop.nom,
      statut: shop.statut,
      cycleFacturation: shop.cycleFacturation,
      dateProchainRenouvellement: shop.dateProchainRenouvellement,
    },
    plan: plan || { nom: "Aucun plan", prix: 0 },
    factureEnAttente: factureEnAttente || null,
    historiqueFactures: factures,
  });
});

/**
 * POST /subscription/pay — Lancer le paiement de son abonnement par Mobile Money.
 */
const payMySubscription = asyncHandler(async (req, res) => {
  const { invoiceId, telephone, operateur } = req.body;

  if (!telephone) {
    throw AppError.badRequest("Le numero de telephone Mobile Money est obligatoire");
  }

  const shop = await ShopModel.findById(req.shopId);
  if (!shop) throw AppError.notFound("Boutique introuvable");

  let invoice = null;
  if (invoiceId) {
    invoice = await PlatformInvoiceModel.findOne({ _id: invoiceId, shopId: req.shopId });
  } else {
    // Si invoiceId n'est pas fourni, chercher la plus ancienne facture impayee
    invoice = await PlatformInvoiceModel.findOne({
      shopId: req.shopId,
      statut: { $in: ["en_attente", "en_retard"] },
    }).sort({ dateEcheance: 1 });
  }

  if (!invoice) {
    throw AppError.badRequest("Aucune facture impayee trouvee pour cette boutique");
  }

  if (invoice.statut === "paye") {
    throw AppError.badRequest("Cette facture est deja reglee");
  }

  // Creer l'enregistrement de paiement
  const payment = await PaymentModel.create({
    shopId: shop._id,
    shopNom: shop.nom,
    invoiceId: invoice._id,
    montant: invoice.montant,
    devise: invoice.devise || "XAF",
    moyen: operateur === "airtel" ? "airtel_money" : "mtn_momo",
    statut: PAYMENT_STATUS.PENDING,
    referenceClient: telephone,
    initiePar: req.user.id,
  });

  // Appel de l'agregateur de paiement
  const resultatPaiement = await paiement.initierPaiement({
    montant: invoice.montant,
    telephone,
    operateur: operateur || "mtn",
    referenceInterne: payment._id.toString(),
    motif: `Abonnement Stockline ${shop.nom} - ${invoice.numero}`,
    clientNom: shop.nom,
  });

  payment.referencePasserelle = resultatPaiement.referencePasserelle;
  payment.reponsePasserelle = resultatPaiement;
  await payment.save();

  // Si le paiement est confirme immediatement (ex: mode simulation/test)
  if (resultatPaiement.statut === PAYMENT_STATUS.SUCCESS) {
    await finaliserPaiementAbonnement(invoice, shop, payment);
  }

  await recordAudit(req, {
    action: "SUBSCRIPTION_PAYMENT_INITIATED",
    cible: "shop",
    cibleId: shop._id,
    details: {
      montant: invoice.montant,
      factureId: invoice._id,
      paymentId: payment._id,
      statut: payment.statut,
    },
  });

  return success(
    res,
    {
      paymentId: payment._id,
      statut: payment.statut,
      instructions: "Veuillez valider le paiement sur votre telephone.",
      montant: invoice.montant,
      devise: invoice.devise,
    },
    201
  );
});

/**
 * GET /subscription/payment-status/:paymentId — Verification du statut d'un paiement en cours.
 */
const checkPaymentStatus = asyncHandler(async (req, res) => {
  const payment = await PaymentModel.findOne({
    _id: req.params.paymentId,
    shopId: req.shopId,
  });

  if (!payment) throw AppError.notFound("Paiement introuvable");

  // Si deja regle, retourner le statut
  if (payment.statut === PAYMENT_STATUS.SUCCESS) {
    return success(res, { statut: payment.statut, regle: true });
  }

  // Interroger la passerelle
  if (payment.referencePasserelle) {
    const maj = await paiement.verifierStatut(payment.referencePasserelle);

    if (maj.statut === PAYMENT_STATUS.SUCCESS && payment.statut !== PAYMENT_STATUS.SUCCESS) {
      payment.statut = PAYMENT_STATUS.SUCCESS;
      payment.datePaiement = new Date();
      await payment.save();

      const [invoice, shop] = await Promise.all([
        PlatformInvoiceModel.findById(payment.invoiceId),
        ShopModel.findById(payment.shopId),
      ]);

      if (invoice && shop) {
        await finaliserPaiementAbonnement(invoice, shop, payment);
      }
    } else if (maj.statut === PAYMENT_STATUS.FAILED) {
      payment.statut = PAYMENT_STATUS.FAILED;
      payment.motifEchec = maj.motifEchec || "Paiement refuse ou expire";
      await payment.save();
    }
  }

  return success(res, {
    statut: payment.statut,
    regle: payment.statut === PAYMENT_STATUS.SUCCESS,
  });
});

/**
 * Met a jour la facture et reactive la boutique apres encaissement reussi.
 */
async function finaliserPaiementAbonnement(invoice, shop, payment) {
  invoice.statut = "paye";
  invoice.datePaiement = new Date();
  invoice.referencePaiement = payment._id.toString();
  await invoice.save();

  // Reactiver la boutique si elle etait suspendue
  const etaitSuspendue = shop.statut === SHOP_STATUS.SUSPENDED;
  shop.statut = SHOP_STATUS.ACTIVE;

  // Calculer la prochaine date de renouvellement
  const baseDate =
    shop.dateProchainRenouvellement && shop.dateProchainRenouvellement > new Date()
      ? new Date(shop.dateProchainRenouvellement)
      : new Date();

  if (shop.cycleFacturation === BILLING_CYCLE.YEARLY || shop.cycleFacturation === BILLING_CYCLE.ANNUAL) {
    baseDate.setFullYear(baseDate.getFullYear() + 1);
  } else {
    baseDate.setMonth(baseDate.getMonth() + 1);
  }

  shop.dateProchainRenouvellement = baseDate;
  await shop.save();

  if (etaitSuspendue) {
    console.log(`[ABONNEMENT] Boutique ${shop.nom} (${shop.code}) REACTIVEE avec succes.`.green.bold);
  }
}

module.exports = {
  getMySubscription,
  payMySubscription,
  checkPaymentStatus,
  finaliserPaiementAbonnement,
};
