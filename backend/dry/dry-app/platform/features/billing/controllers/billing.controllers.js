/**
 * Console Super-Admin — Abonnements, facturation et encaissement Mobile Money.
 *
 * Ce module n'appelle JAMAIS une passerelle directement : il passe par
 * l'abstraction `payment.interface`. Changer d'agregateur ne demande aucune
 * modification ici.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success, paginationMeta } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");
const { sendPaymentReminder } = require("../../../../../core/services/mailer.service");
const paiement = require("../../../../../core/services/payment/payment.interface");
const { PAYMENT_STATUS, SHOP_STATUS } = require("../../../../../core/constants");

const PlatformInvoiceModel = require("../model/platform-invoice.model");
const PaymentModel = require("../model/payment.model");
const ShopModel = require("../../shop/model/shop.model");
const UserModel = require("../../../../boutique/features/auth/model/user.model");
const colors = require("colors");

/** GET /platform/billing — Ecran "Abonnements & Facturation". */
const billingOverview = asyncHandler(async (req, res) => {
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);

  const [mrr, impayes, renouvellements, comptesEnRetard, dernieresFactures] =
    await Promise.all([
      PlatformInvoiceModel.aggregate([
        { $match: { statut: "paye", dateEmission: { $gte: debutMois } } },
        { $group: { _id: null, total: { $sum: "$montant" } } },
      ]),

      PlatformInvoiceModel.aggregate([
        { $match: { statut: { $in: ["en_attente", "en_retard"] } } },
        { $group: { _id: null, total: { $sum: "$montant" }, nombre: { $sum: 1 } } },
      ]),

      ShopModel.countDocuments({
        statut: SHOP_STATUS.ACTIVE,
        dateProchainRenouvellement: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 30 * 864e5),
        },
      }),

      PlatformInvoiceModel.find({ statut: "en_retard" })
        .sort({ dateEcheance: 1 })
        .limit(10)
        .select("shopNom montant devise dateEcheance shopId")
        .lean(),

      PlatformInvoiceModel.find().sort({ dateEmission: -1 }).limit(10).lean(),
    ]);

  const mrrValeur = mrr[0]?.total || 0;

  return success(res, {
    kpis: {
      mrr: mrrValeur,
      arrEstime: mrrValeur * 12,
      renouvellementsAVenir: renouvellements,
      impayes: impayes[0] || { total: 0, nombre: 0 },
    },
    comptesEnRetard: comptesEnRetard.map((f) => ({
      ...f,
      joursRetard: Math.max(
        0,
        Math.floor((Date.now() - new Date(f.dateEcheance)) / 864e5)
      ),
    })),
    dernieresFactures,
    // Etat des passerelles, pour l'encadre de supervision
    passerellesPaiement: paiement.listerPasserelles(),
  });
});

/** GET /platform/invoices — Ecran "Factures boutiques". */
const listInvoices = asyncHandler(async (req, res) => {
  const { page, limit, shopId, statut, planId, from, to, q } = req.validated.query;

  const filtre = {};
  if (shopId) filtre.shopId = shopId;
  if (statut) filtre.statut = statut;
  if (planId) filtre.planId = planId;

  if (from || to) {
    filtre.dateEmission = {};
    if (from) filtre.dateEmission.$gte = from;
    if (to) filtre.dateEmission.$lte = to;
  }

  if (q) {
    filtre.$or = [
      { numero: { $regex: q, $options: "i" } },
      { shopNom: { $regex: q, $options: "i" } },
    ];
  }

  const [factures, total, totaux] = await Promise.all([
    PlatformInvoiceModel.find(filtre)
      .sort({ dateEmission: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    PlatformInvoiceModel.countDocuments(filtre),

    PlatformInvoiceModel.aggregate([
      { $match: filtre },
      { $group: { _id: "$statut", total: { $sum: "$montant" } } },
    ]),
  ]);

  const parStatut = totaux.reduce((acc, t) => ({ ...acc, [t._id]: t.total }), {});

  return success(
    res,
    {
      factures,
      // Les 4 cartes en haut de l'ecran
      totaux: {
        selection: Object.values(parStatut).reduce((s, v) => s + v, 0),
        encaisse: parStatut.paye || 0,
        enAttente: parStatut.en_attente || 0,
        enRetard: parStatut.en_retard || 0,
      },
    },
    200,
    paginationMeta(page, limit, total)
  );
});

/**
 * POST /platform/billing/charge — Declenchement d'un paiement Mobile Money.
 *
 * La transaction est enregistree AVANT l'appel a la passerelle : meme si notre
 * serveur tombe juste apres, on garde la trace de la tentative et on peut la
 * reconcilier plus tard.
 */
const initiatePayment = asyncHandler(async (req, res) => {
  const { factureId, telephone, operateur } = req.validated.body;

  const facture = await PlatformInvoiceModel.findById(factureId);
  if (!facture) throw AppError.notFound("Facture introuvable");
  if (facture.statut === "paye") {
    throw AppError.conflict("Cette facture est deja reglee");
  }

  const boutique = await ShopModel.findById(facture.shopId)
    .select("nom proprietaireId")
    .lean();

  const proprietaire = await UserModel.findById(boutique?.proprietaireId)
    .select("nom")
    .lean();

  // ── Enregistrement AVANT l'appel externe ────────────────────────────
  const transaction = await PaymentModel.create({
    shopId: facture.shopId,
    factureId: facture._id,
    montant: facture.montant,
    devise: facture.devise,
    // On ne conserve que les 4 derniers chiffres
    telephoneMasque: `***${String(telephone).slice(-4)}`,
    statut: PAYMENT_STATUS.PENDING,
    initiePar: req.user.id,
  });

  const resultat = await paiement.requestToPay({
    phoneNumber: telephone,
    amount: facture.montant,
    callbackInfo: transaction._id.toString(),   // notre reference interne
    description: `Abonnement Stockline ${facture.periodeLibelle || ""}`,
    firstName: proprietaire?.nom?.split(" ")[0],
    lastName: proprietaire?.nom?.split(" ").slice(1).join(" "),
    operateur,
  });

  transaction.reference = resultat.reference;
  transaction.callbackInfo = transaction._id.toString();
  transaction.statut = resultat.status;
  transaction.fournisseur = resultat.provider;
  transaction.reponseBrute = resultat.raw;
  await transaction.save();

  facture.paiementId = transaction._id;
  await facture.save();

  recordAudit(req, "billing.payment_initiated", {
    severite: "moyenne",
    cible: "PlatformInvoice",
    cibleId: facture._id,
    shopId: facture.shopId,
    apres: {
      montant: facture.montant,
      reference: resultat.reference,
      passerelle: resultat.provider,
    },
  });

  return success(
    res,
    {
      message:
        "Demande de paiement envoyee. Le client doit valider avec son code PIN.",
      paiement: {
        id: transaction._id,
        reference: transaction.reference,
        statut: transaction.statut,
        montant: transaction.montant,
        passerelle: resultat.provider,
      },
    },
    201
  );
});

/**
 * POST /public/payments/callback — Notification de la passerelle.
 *
 * ══ ROUTE PUBLIQUE, NON AUTHENTIFIEE ══
 * On ne fait JAMAIS confiance au corps de la requete : le statut reel est
 * systematiquement re-verifie aupres de la passerelle avant de marquer une
 * facture comme payee.
 *
 * On repond toujours 200, meme en cas de transaction inconnue : sinon la
 * passerelle relancerait indefiniment.
 */
const paymentCallback = asyncHandler(async (req, res) => {
  const verification = await paiement.verifyCallback(req.body, req.headers);

  const transaction = await PaymentModel.findOne({
    $or: [
      { _id: verification.callbackInfo },
      { reference: verification.reference },
    ],
  });

  if (!transaction) {
    console.warn(
      `Callback pour une transaction inconnue : ${verification.reference}`.yellow
    );
    return success(res, { recu: true });
  }

  // Idempotence : un callback peut arriver plusieurs fois
  if (transaction.statut === PAYMENT_STATUS.SUCCESS) {
    return success(res, { recu: true, dejaTraite: true });
  }

  transaction.statut = verification.status;
  transaction.verifieLe = new Date();
  transaction.reponseBrute = verification.raw;
  await transaction.save();

  // ── Paiement confirme : on prolonge l'abonnement ────────────────────
  if (verification.status === PAYMENT_STATUS.SUCCESS) {
    const facture = await PlatformInvoiceModel.findById(transaction.factureId);

    if (facture && facture.statut !== "paye") {
      facture.statut = "paye";
      facture.datePaiement = new Date();
      await facture.save();

      const boutique = await ShopModel.findById(facture.shopId);

      if (boutique) {
        const prochain = new Date(
          boutique.dateProchainRenouvellement || Date.now()
        );

        if (boutique.cycleFacturation === "yearly") {
          prochain.setFullYear(prochain.getFullYear() + 1);
        } else {
          prochain.setMonth(prochain.getMonth() + 1);
        }

        boutique.dateProchainRenouvellement = prochain;

        // Reactivation automatique si le compte etait suspendu
        if (boutique.statut === SHOP_STATUS.SUSPENDED) {
          boutique.statut = SHOP_STATUS.ACTIVE;
          boutique.motifGel = undefined;
        }

        await boutique.save();
      }

      const {
        notifyShop, notifyPlatform,
      } = require("../../../../../core/services/notification.service");

      await notifyShop({
        shopId: facture.shopId,
        titre: "Paiement recu",
        message: `Votre abonnement a ete renouvele. Facture ${facture.numero} reglee.`,
        categorie: "facturation",
      });

      await notifyPlatform({
        titre: "Paiement recu",
        message: `${facture.shopNom} — ${facture.montant} ${facture.devise} (${facture.planNom})`,
        categorie: "facturation",
      });
    }
  }

  return success(res, { recu: true });
});

/** GET /platform/billing/payments/:id/status — Sondage de secours. */
const checkPaymentStatus = asyncHandler(async (req, res) => {
  const transaction = await PaymentModel.findById(req.validated.params.id);
  if (!transaction) throw AppError.notFound("Paiement introuvable");

  // On ne re-interroge que si le statut est encore en attente
  if (transaction.statut === PAYMENT_STATUS.PENDING && transaction.reference) {
    const { status } = await paiement.getPaymentStatus(
      transaction.reference,
      transaction.fournisseur
    );

    transaction.statut = status;
    transaction.verifieLe = new Date();
    transaction.tentativesVerification += 1;
    await transaction.save();
  }

  return success(res, {
    id: transaction._id,
    statut: transaction.statut,
    montant: transaction.montant,
    verifieLe: transaction.verifieLe,
  });
});

/** POST /platform/invoices/:id/remind — Relance manuelle d'un impaye. */
const sendReminder = asyncHandler(async (req, res) => {
  const facture = await PlatformInvoiceModel.findById(req.validated.params.id);
  if (!facture) throw AppError.notFound("Facture introuvable");

  const boutique = await ShopModel.findById(facture.shopId)
    .select("nom proprietaireId")
    .lean();

  const proprietaire = await UserModel.findById(boutique?.proprietaireId)
    .select("email")
    .lean();

  if (!proprietaire?.email) {
    throw AppError.badRequest("Aucune adresse email connue pour ce compte");
  }

  const joursRetard = Math.max(
    0,
    Math.floor((Date.now() - new Date(facture.dateEcheance)) / 864e5)
  );

  await sendPaymentReminder({
    to: proprietaire.email,
    shopName: boutique.nom,
    montant: facture.montant,
    devise: facture.devise,
    joursRetard,
    lienPaiement: `${(process.env.CORS_ORIGIN || "").split(",")[0]}/abonnement`,
  });

  facture.relancesEnvoyees += 1;
  facture.derniereRelance = new Date();
  await facture.save();

  return success(res, { message: `Relance envoyee a ${proprietaire.email}` });
});

module.exports = {
  billingOverview, listInvoices, initiatePayment,
  paymentCallback, checkPaymentStatus, sendReminder,
};
