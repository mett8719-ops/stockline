/**
 * Controleurs du module Clients.
 *
 * Le point sensible est `recordPayment` : il touche a la creance du client, a
 * l'historique des versements, a une facture eventuelle et a la tresorerie.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success, paginationMeta } = require("../../../../../core/response");
const { tenantScope, tenantPayload } = require("../../../../../core/tenant-guard");
const { recordAudit } = require("../../../../../core/audit");

const CustomerModel = require("../model/customer.model");
const PaymentEntryModel = require("../model/payment-entry.model");
const SaleModel = require("../../sale/model/sale.model");
const DocumentModel = require("../../document/model/document.model");
const CashTransactionModel = require("../../treasury/model/cash-transaction.model");

const arrondir = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** GET /customers — Liste avec badge d'impaye et total des creances. */
const list = asyncHandler(async (req, res) => {
  const { page, limit, q, categorie, impayes } = req.validated.query;

  const criteres = { actif: true };
  if (categorie) criteres.categorie = categorie;
  if (impayes === "true") criteres.soldeCredit = { $gt: 0 };

  if (q) {
    criteres.$or = [
      { nom: { $regex: q, $options: "i" } },
      { telephone: { $regex: q, $options: "i" } },
    ];
  }

  const filtre = tenantScope(req, criteres);

  const [clients, total, totalCreances] = await Promise.all([
    CustomerModel.find(filtre)
      // Les clients qui doivent le plus apparaissent en premier
      .sort({ soldeCredit: -1, nom: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean({ virtuals: true }),

    CustomerModel.countDocuments(filtre),

    // Total des creances de la boutique, toutes pages confondues
    CustomerModel.aggregate([
      { $match: tenantScope(req, { actif: true, soldeCredit: { $gt: 0 } }) },
      { $group: { _id: null, total: { $sum: "$soldeCredit" }, nombre: { $sum: 1 } } },
    ]),
  ]);

  return success(
    res,
    {
      clients,
      creances: totalCreances[0] || { total: 0, nombre: 0 },
    },
    200,
    paginationMeta(page, limit, total)
  );
});

/** GET /customers/:id — Fiche complete avec historiques. */
const getOne = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const client = await CustomerModel.findOne(tenantScope(req, { _id: id }))
    .lean({ virtuals: true });

  if (!client) throw AppError.notFound("Client introuvable");

  // Trois requetes en parallele plutot qu'en sequence
  const [achats, versements, facturesImpayees] = await Promise.all([
    SaleModel.find(
      tenantScope(req, { clientId: id, statut: { $ne: "annulee" } })
    )
      .sort({ date: -1 })
      .limit(20)
      .select("reference date montantTotal montantCredit statut")
      .lean(),

    PaymentEntryModel.find(tenantScope(req, { tiersId: id, sens: "client" }))
      .sort({ date: -1 })
      .limit(20)
      .lean(),

    DocumentModel.find(
      tenantScope(req, {
        clientId: id,
        type: "facture",
        statut: { $in: ["en_attente", "en_retard"] },
      })
    )
      .select("numero montantTotal montantRestant dateEcheance statut")
      .lean(),
  ]);

  return success(res, {
    ...client,
    historiqueAchats: achats,
    historiquePaiements: versements,
    facturesImpayees,
  });
});

/** POST /customers — Creation. */
const create = asyncHandler(async (req, res) => {
  const donnees = req.validated.body;

  /**
   * Verification du doublon par telephone : en caisse, c'est l'identifiant
   * naturel d'un client. Deux fiches pour la meme personne fausseraient le
   * suivi de sa creance.
   */
  if (donnees.telephone) {
    const existe = await CustomerModel.findOne(
      tenantScope(req, { telephone: donnees.telephone })
    ).lean();

    if (existe) {
      throw AppError.conflict(
        `Un client existe deja avec ce numero : ${existe.nom}`
      );
    }
  }

  const client = await CustomerModel.create(tenantPayload(req, donnees));
  return success(res, client, 201);
});

/** PATCH /customers/:id — Modification. */
const update = asyncHandler(async (req, res) => {
  const client = await CustomerModel.findOneAndUpdate(
    tenantScope(req, { _id: req.validated.params.id }),
    req.validated.body,
    { new: true, runValidators: true }
  );

  if (!client) throw AppError.notFound("Client introuvable");
  return success(res, client);
});

/**
 * POST /customers/:id/payments — Enregistrement d'un versement.
 *
 * Correspond au bouton "Enregistrer un versement" de la fiche client.
 *
 * QUATRE EFFETS :
 *   1. reduction de la creance du client
 *   2. ligne dans l'historique des paiements (avec le solde apres)
 *   3. solde de la facture rattachee, si `documentId` est fourni
 *   4. recette en tresorerie
 *
 * Le solde ne peut jamais devenir negatif : un versement superieur a la
 * creance est refuse.
 */
const recordPayment = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { montant, modePaiement, libelle, documentId } = req.validated.body;

  const client = await CustomerModel.findOne(tenantScope(req, { _id: id }));
  if (!client) throw AppError.notFound("Client introuvable");

  if (montant > client.soldeCredit) {
    throw AppError.badRequest(
      `Le versement (${montant}) depasse le solde du (${client.soldeCredit}).`
    );
  }

  // ── 1. Reduction de la creance ──────────────────────────────────────
  client.soldeCredit = arrondir(client.soldeCredit - montant);
  await client.save();

  // ── 2. Ligne d'historique ───────────────────────────────────────────
  const versement = await PaymentEntryModel.create(
    tenantPayload(req, {
      sens: "client",
      tiersId: client._id,
      tiersModel: "boutique-customer",
      tiersNom: client.nom,
      libelle: libelle || "Versement client",
      montant,
      modePaiement,
      soldeApres: client.soldeCredit,   // reconstitue l'historique
      documentId,
      auteurId: req.user.id,
      auteurNom: req.user.nom,
    })
  );

  // ── 3. Solde de la facture rattachee ────────────────────────────────
  if (documentId) {
    const facture = await DocumentModel.findOne(
      tenantScope(req, { _id: documentId })
    );

    if (facture) {
      facture.montantPaye = arrondir(facture.montantPaye + montant);
      facture.montantRestant = arrondir(facture.montantTotal - facture.montantPaye);

      if (facture.montantRestant <= 0) {
        facture.statut = "paye";
        facture.datePaiement = new Date();
      }
      await facture.save();
    }
  }

  // ── 4. Recette en tresorerie ────────────────────────────────────────
  await CashTransactionModel.create(
    tenantPayload(req, {
      type: "recette",
      libelle: `Versement ${client.nom}`,
      montant,
      modePaiement,
      categorie: "creances",
      origineType: "versement_client",
      origineId: versement._id,
      auteurId: req.user.id,
      auteurNom: req.user.nom,
    })
  );

  recordAudit(req, "customer.payment_recorded", {
    cible: "Customer",
    cibleId: client._id,
    apres: { montant, soldeApres: client.soldeCredit },
  });

  return success(
    res,
    {
      versement,
      client: {
        id: client._id,
        nom: client.nom,
        soldeCredit: client.soldeCredit,
      },
    },
    201
  );
});

module.exports = { list, getOne, create, update, recordPayment };
