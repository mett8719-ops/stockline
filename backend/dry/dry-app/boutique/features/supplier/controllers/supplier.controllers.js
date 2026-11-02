/**
 * Controleurs du module Fournisseurs.
 *
 * Structure symetrique du module Clients, mais le solde represente ici une
 * DETTE de la boutique.
 *
 * L'action cle est `createPurchase` : la reception de marchandise, qui genere
 * les entrees de stock, augmente la dette et enregistre la depense — le tout
 * dans une transaction.
 */
const mongoose = require("mongoose");
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success, paginationMeta } = require("../../../../../core/response");
const { tenantScope, tenantPayload } = require("../../../../../core/tenant-guard");
const { recordAudit } = require("../../../../../core/audit");

const SupplierModel = require("../model/supplier.model");
const PurchaseModel = require("../model/purchase.model");
const PaymentEntryModel = require("../../customer/model/payment-entry.model");
const CashTransactionModel = require("../../treasury/model/cash-transaction.model");
const stockService = require("../../stock/model/stock.service");

const arrondir = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** GET /suppliers — Liste avec total des dettes. */
const list = asyncHandler(async (req, res) => {
  const { page, limit, q } = req.validated.query;

  const criteres = { actif: true };
  if (q) criteres.nom = { $regex: q, $options: "i" };

  const filtre = tenantScope(req, criteres);

  const [fournisseurs, total, dettes] = await Promise.all([
    SupplierModel.find(filtre)
      // Les fournisseurs a payer en premier
      .sort({ soldeDu: -1, nom: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean({ virtuals: true }),

    SupplierModel.countDocuments(filtre),

    SupplierModel.aggregate([
      { $match: tenantScope(req, { actif: true, soldeDu: { $gt: 0 } }) },
      { $group: { _id: null, total: { $sum: "$soldeDu" }, nombre: { $sum: 1 } } },
    ]),
  ]);

  return success(
    res,
    { fournisseurs, dettes: dettes[0] || { total: 0, nombre: 0 } },
    200,
    paginationMeta(page, limit, total)
  );
});

/** GET /suppliers/:id — Fiche avec historiques commandes et paiements. */
const getOne = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const fournisseur = await SupplierModel.findOne(tenantScope(req, { _id: id }))
    .lean({ virtuals: true });

  if (!fournisseur) throw AppError.notFound("Fournisseur introuvable");

  const [commandes, paiements] = await Promise.all([
    PurchaseModel.find(tenantScope(req, { fournisseurId: id }))
      .sort({ dateCommande: -1 })
      .limit(20)
      .lean(),

    PaymentEntryModel.find(
      tenantScope(req, { tiersId: id, sens: "fournisseur" })
    )
      .sort({ date: -1 })
      .limit(20)
      .lean(),
  ]);

  return success(res, {
    ...fournisseur,
    historiqueCommandes: commandes,
    historiquePaiements: paiements,
  });
});

const create = asyncHandler(async (req, res) => {
  const fournisseur = await SupplierModel.create(
    tenantPayload(req, req.validated.body)
  );
  return success(res, fournisseur, 201);
});

const update = asyncHandler(async (req, res) => {
  const fournisseur = await SupplierModel.findOneAndUpdate(
    tenantScope(req, { _id: req.validated.params.id }),
    req.validated.body,
    { new: true, runValidators: true }
  );

  if (!fournisseur) throw AppError.notFound("Fournisseur introuvable");
  return success(res, fournisseur);
});

/**
 * POST /suppliers/:id/purchases — Reception de marchandise.
 *
 * ══ OPERATION TRANSACTIONNELLE ══
 *   1. creation du bon d'achat
 *   2. ENTREE de stock pour chaque ligne
 *   3. augmentation de la dette fournisseur (part non reglee)
 *   4. depense en tresorerie (part reglee comptant)
 *
 * Sans transaction, un echec en cours de route laisserait du stock entre sans
 * dette correspondante — ou l'inverse.
 */
const createPurchase = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { lignes, montantPaye = 0, modePaiement, notes } = req.validated.body;

  const fournisseur = await SupplierModel.findOne(tenantScope(req, { _id: id }));
  if (!fournisseur) throw AppError.notFound("Fournisseur introuvable");

  const session = await mongoose.startSession();
  let achatCree = null;

  try {
    await session.withTransaction(async () => {
      // ── Valorisation des lignes ─────────────────────────────────────
      const lignesValorisees = lignes.map((l) => ({
        ...l,
        totalLigne: arrondir(l.prixAchat * l.quantite),
      }));

      const montantTotal = arrondir(
        lignesValorisees.reduce((s, l) => s + l.totalLigne, 0)
      );

      if (montantPaye > montantTotal) {
        throw AppError.badRequest(
          "Le montant paye depasse le total de la commande"
        );
      }

      const montantRestant = arrondir(montantTotal - montantPaye);

      // ── Reference sequentielle ACH-2026-0001 ────────────────────────
      const derniere = await PurchaseModel.findOne(tenantScope(req, {}))
        .sort({ createdAt: -1 })
        .select("reference")
        .session(session)
        .lean();

      const numero = derniere
        ? Number(derniere.reference.split("-")[2]) + 1
        : 1;
      const reference = `ACH-${new Date().getFullYear()}-${String(numero).padStart(4, "0")}`;

      // ── 1. Bon d'achat ──────────────────────────────────────────────
      const [achat] = await PurchaseModel.create(
        [{
          shopId: req.user.shopId,
          reference,
          fournisseurId: fournisseur._id,
          fournisseurNom: fournisseur.nom,
          lignes: lignesValorisees,
          montantTotal,
          montantPaye,
          montantRestant,
          statut: "livre",
          statutPaiement:
            montantRestant <= 0 ? "paye" : montantPaye > 0 ? "partiel" : "non_paye",
          dateLivraison: new Date(),
          auteurId: req.user.id,
          auteurNom: req.user.nom,
          notes,
        }],
        { session }
      );
      achatCree = achat;

      // ── 2. Entrees de stock ─────────────────────────────────────────
      for (const ligne of lignesValorisees) {
        await stockService.enregistrerMouvement(req, {
          produitId: ligne.produitId,
          type: "entree",
          quantite: ligne.quantite,
          raison: `Livraison ${fournisseur.nom}`,
          referenceType: "achat",
          referenceId: achat._id,
          referenceLibelle: reference,
          session,
        });
      }

      // ── 3. Dette fournisseur ────────────────────────────────────────
      fournisseur.soldeDu = arrondir(fournisseur.soldeDu + montantRestant);
      fournisseur.totalAchats = arrondir(fournisseur.totalAchats + montantTotal);
      fournisseur.derniereCommande = new Date();
      await fournisseur.save({ session });

      // ── 4. Depense en tresorerie ────────────────────────────────────
      if (montantPaye > 0) {
        await CashTransactionModel.create(
          [{
            shopId: req.user.shopId,
            type: "depense",
            libelle: `Achat ${reference} — ${fournisseur.nom}`,
            montant: montantPaye,
            modePaiement: modePaiement || "especes",
            categorie: "marchandises",
            origineType: "achat",
            origineId: achat._id,
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

  return success(
    res,
    {
      achat: achatCree,
      fournisseur: {
        id: fournisseur._id,
        nom: fournisseur.nom,
        soldeDu: fournisseur.soldeDu,
      },
    },
    201
  );
});

/** POST /suppliers/:id/payments — Paiement echelonne d'une dette. */
const recordPayment = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { montant, modePaiement, libelle } = req.validated.body;

  const fournisseur = await SupplierModel.findOne(tenantScope(req, { _id: id }));
  if (!fournisseur) throw AppError.notFound("Fournisseur introuvable");

  if (montant > fournisseur.soldeDu) {
    throw AppError.badRequest(
      `Le paiement (${montant}) depasse la dette (${fournisseur.soldeDu}).`
    );
  }

  fournisseur.soldeDu = arrondir(fournisseur.soldeDu - montant);
  await fournisseur.save();

  const paiement = await PaymentEntryModel.create(
    tenantPayload(req, {
      sens: "fournisseur",
      tiersId: fournisseur._id,
      tiersModel: "boutique-supplier",
      tiersNom: fournisseur.nom,
      libelle: libelle || "Paiement fournisseur",
      montant,
      modePaiement,
      soldeApres: fournisseur.soldeDu,
      auteurId: req.user.id,
      auteurNom: req.user.nom,
    })
  );

  await CashTransactionModel.create(
    tenantPayload(req, {
      type: "depense",
      libelle: `Paiement ${fournisseur.nom}`,
      montant,
      modePaiement,
      categorie: "marchandises",
      origineType: "paiement_fournisseur",
      origineId: paiement._id,
      auteurId: req.user.id,
      auteurNom: req.user.nom,
    })
  );

  recordAudit(req, "supplier.payment_recorded", {
    cible: "Supplier",
    cibleId: fournisseur._id,
    apres: { montant, soldeApres: fournisseur.soldeDu },
  });

  return success(
    res,
    {
      paiement,
      fournisseur: {
        id: fournisseur._id,
        nom: fournisseur.nom,
        soldeDu: fournisseur.soldeDu,
      },
    },
    201
  );
});

module.exports = { list, getOne, create, update, createPurchase, recordPayment };
