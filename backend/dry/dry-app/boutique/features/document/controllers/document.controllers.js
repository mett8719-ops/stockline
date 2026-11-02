/**
 * Controleurs du module Documents commerciaux.
 *
 * Devis, factures et bons de livraison emis par la boutique a SES clients.
 * Numerotation sequentielle par boutique et par type, conversion devis →
 * facture, relances et suivi des impayes.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success, paginationMeta } = require("../../../../../core/response");
const { tenantScope, tenantPayload } = require("../../../../../core/tenant-guard");
const { DOCUMENT_TYPES, DOCUMENT_STATUS } = require("../../../../../core/constants");

const DocumentModel = require("../model/document.model");
const CustomerModel = require("../../customer/model/customer.model");
const ProductModel = require("../../product/model/product.model");

const arrondir = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Calcule les totaux d'un document a partir de ses lignes. */
function calculerTotaux(lignes, remiseGlobale = 0) {
  let sousTotal = 0;
  let montantTva = 0;

  const lignesValorisees = lignes.map((l) => {
    const totalLigne = arrondir(l.prixUnitaire * l.quantite - (l.remise || 0));
    // TVA calculee "en dedans" : le prix affiche est TTC
    const tva = l.tauxTva
      ? arrondir(totalLigne * (l.tauxTva / (100 + l.tauxTva)))
      : 0;

    sousTotal = arrondir(sousTotal + totalLigne);
    montantTva = arrondir(montantTva + tva);

    return { ...l, totalLigne };
  });

  return {
    lignes: lignesValorisees,
    sousTotal,
    montantTva,
    montantTotal: arrondir(sousTotal - remiseGlobale),
  };
}

/** GET /documents — Liste avec les 4 indicateurs de l'ecran. */
const list = asyncHandler(async (req, res) => {
  const { page, limit, type, statut, clientId, q, from, to } = req.validated.query;

  const criteres = {};
  if (type) criteres.type = type;
  if (statut) criteres.statut = statut;
  if (clientId) criteres.clientId = clientId;

  if (from || to) {
    criteres.dateEmission = {};
    if (from) criteres.dateEmission.$gte = from;
    if (to) criteres.dateEmission.$lte = to;
  }

  if (q) {
    criteres.$or = [
      { numero: { $regex: q, $options: "i" } },
      { clientNom: { $regex: q, $options: "i" } },
    ];
  }

  const filtre = tenantScope(req, criteres);

  const [documents, total, stats, devisEnCours] = await Promise.all([
    DocumentModel.find(filtre)
      .sort({ dateEmission: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    DocumentModel.countDocuments(filtre),

    // Indicateurs calcules sur TOUTES les factures, pas la page affichee
    DocumentModel.aggregate([
      { $match: tenantScope(req, { type: DOCUMENT_TYPES.INVOICE }) },
      {
        $group: {
          _id: null,
          totalFacture: { $sum: "$montantTotal" },
          totalEncaisse: { $sum: "$montantPaye" },
          montantImpaye: {
            $sum: {
              $cond: [
                { $in: ["$statut", ["en_attente", "en_retard"]] },
                "$montantRestant",
                0,
              ],
            },
          },
        },
      },
    ]),

    DocumentModel.countDocuments(
      tenantScope(req, {
        type: DOCUMENT_TYPES.QUOTE,
        statut: DOCUMENT_STATUS.PENDING,
      })
    ),
  ]);

  const s = stats[0] || { totalFacture: 0, totalEncaisse: 0, montantImpaye: 0 };

  return success(
    res,
    {
      documents,
      indicateurs: {
        totalFacture: s.totalFacture,
        montantImpaye: s.montantImpaye,
        devisEnCours,
        tauxEncaissement:
          s.totalFacture > 0
            ? Math.round((s.totalEncaisse / s.totalFacture) * 100)
            : 0,
      },
    },
    200,
    paginationMeta(page, limit, total)
  );
});

/** GET /documents/:id */
const getOne = asyncHandler(async (req, res) => {
  const document = await DocumentModel.findOne(
    tenantScope(req, { _id: req.validated.params.id })
  ).lean();

  if (!document) throw AppError.notFound("Document introuvable");
  return success(res, document);
});

/** POST /documents — Creation d'un devis, d'une facture ou d'un BL. */
const create = asyncHandler(async (req, res) => {
  const {
    type, clientId, clientNom, lignes, remiseGlobale,
    dateEmission, dateEcheance, notes,
  } = req.validated.body;

  // Rattachement au fichier clients si un identifiant est fourni
  let client = null;
  if (clientId) {
    client = await CustomerModel.findOne(
      tenantScope(req, { _id: clientId })
    ).lean();

    if (!client) throw AppError.badRequest("Client introuvable");
  }

  /**
   * Verification que les produits references appartiennent bien a la boutique.
   * Sans ce controle, un client malveillant pourrait facturer un produit
   * appartenant a une autre boutique en forgeant son identifiant.
   */
  const idsProduits = lignes.map((l) => l.produitId).filter(Boolean);

  if (idsProduits.length) {
    const trouves = await ProductModel.countDocuments(
      tenantScope(req, { _id: { $in: idsProduits } })
    );

    if (trouves !== new Set(idsProduits.map(String)).size) {
      throw AppError.badRequest(
        "Un ou plusieurs produits references sont introuvables"
      );
    }
  }

  const totaux = calculerTotaux(lignes, remiseGlobale || 0);

  const document = await DocumentModel.create(
    tenantPayload(req, {
      type,
      numero: await DocumentModel.genererNumero(req.user.shopId, type),
      clientId: client?._id || null,
      // Copies figees : le document reste lisible si la fiche client change
      clientNom: client?.nom || clientNom,
      clientAdresse: client?.adresse,
      clientTelephone: client?.telephone,
      ...totaux,
      remiseGlobale: remiseGlobale || 0,
      montantRestant: totaux.montantTotal,
      statut: DOCUMENT_STATUS.PENDING,
      dateEmission: dateEmission || new Date(),
      dateEcheance,
      notes,
      auteurId: req.user.id,
      auteurNom: req.user.nom,
    })
  );

  return success(res, document, 201);
});

/**
 * POST /documents/:id/convert — Conversion d'un devis en facture.
 * Le devis est CONSERVE et lie a la facture creee : tracabilite complete.
 */
const convertQuote = asyncHandler(async (req, res) => {
  const devis = await DocumentModel.findOne(
    tenantScope(req, {
      _id: req.validated.params.id,
      type: DOCUMENT_TYPES.QUOTE,
    })
  );

  if (!devis) throw AppError.notFound("Devis introuvable");
  if (devis.statut === DOCUMENT_STATUS.EXPIRED) {
    throw AppError.badRequest("Ce devis est expire");
  }

  const echeance = new Date();
  echeance.setDate(echeance.getDate() + 30);   // 30 jours par defaut

  const facture = await DocumentModel.create(
    tenantPayload(req, {
      type: DOCUMENT_TYPES.INVOICE,
      numero: await DocumentModel.genererNumero(
        req.user.shopId,
        DOCUMENT_TYPES.INVOICE
      ),
      clientId: devis.clientId,
      clientNom: devis.clientNom,
      clientAdresse: devis.clientAdresse,
      clientTelephone: devis.clientTelephone,
      lignes: devis.lignes,
      sousTotal: devis.sousTotal,
      montantTva: devis.montantTva,
      remiseGlobale: devis.remiseGlobale,
      montantTotal: devis.montantTotal,
      montantRestant: devis.montantTotal,
      statut: DOCUMENT_STATUS.PENDING,
      dateEmission: new Date(),
      dateEcheance: echeance,
      documentSourceId: devis._id,   // lien vers le devis d'origine
      notes: devis.notes,
      auteurId: req.user.id,
      auteurNom: req.user.nom,
    })
  );

  devis.statut = DOCUMENT_STATUS.ACCEPTED;
  await devis.save();

  return success(
    res,
    { facture, devis: { id: devis._id, statut: devis.statut } },
    201
  );
});

/** PATCH /documents/:id/status — Changement de statut. */
const updateStatus = asyncHandler(async (req, res) => {
  const document = await DocumentModel.findOne(
    tenantScope(req, { _id: req.validated.params.id })
  );

  if (!document) throw AppError.notFound("Document introuvable");

  document.statut = req.validated.body.statut;

  // Marquer "paye" solde automatiquement le document
  if (document.statut === DOCUMENT_STATUS.PAID) {
    document.datePaiement = new Date();
    document.montantPaye = document.montantTotal;
    document.montantRestant = 0;
  }

  await document.save();
  return success(res, document);
});

/** POST /documents/:id/reminder — Relance par email. */
const sendReminder = asyncHandler(async (req, res) => {
  const { sendMail, layout } = require("../../../../../core/services/mailer.service");

  const document = await DocumentModel.findOne(
    tenantScope(req, { _id: req.validated.params.id })
  );

  if (!document) throw AppError.notFound("Document introuvable");

  const client = document.clientId
    ? await CustomerModel.findOne(
        tenantScope(req, { _id: document.clientId })
      ).lean()
    : null;

  if (!client?.email) {
    throw AppError.badRequest("Aucune adresse email connue pour ce client");
  }

  await sendMail({
    to: client.email,
    subject: `Rappel — Facture ${document.numero}`,
    text: `Montant restant du : ${document.montantRestant}`,
    html: layout(
      `Bonjour ${client.nom},`,
      `<p style="color:#4b5563;font-size:14px;line-height:1.6">
         Nous vous rappelons que la facture <strong>${document.numero}</strong>
         d'un montant de <strong>${document.montantRestant} ${req.shop?.devise || "XAF"}</strong>
         arrive a echeance le
         ${new Date(document.dateEcheance).toLocaleDateString("fr-FR")}.
       </p>`
    ),
  });

  document.relancesEnvoyees += 1;
  document.derniereRelance = new Date();
  await document.save();

  return success(res, { message: `Relance envoyee a ${client.email}` });
});

module.exports = {
  list, getOne, create, convertQuote, updateStatus, sendReminder,
};
