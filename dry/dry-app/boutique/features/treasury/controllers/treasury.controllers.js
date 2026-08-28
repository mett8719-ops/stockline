/**
 * Controleurs du module Tresorerie.
 *
 * Solde de caisse temps reel, journal groupe par jour, sessions de caisse
 * (ouverture / cloture avec detection d'ecart) et export comptable.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success, paginationMeta } = require("../../../../../core/response");
const { tenantScope, tenantPayload } = require("../../../../../core/tenant-guard");
const { recordAudit } = require("../../../../../core/audit");

const CashTransactionModel = require("../model/cash-transaction.model");
const CashSessionModel = require("../model/cash-session.model");
const SaleModel = require("../../sale/model/sale.model");

const arrondir = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * GET /treasury — Solde, totaux de periode et journal groupe par jour.
 *
 * Reproduit exactement l'ecran Tresorerie : le journal est regroupe par
 * journee avec un sous-total de recettes et de depenses pour chaque jour.
 */
const overview = asyncHandler(async (req, res) => {
  const { from, to, page, limit } = req.validated.query;

  // Par defaut : les 3 derniers jours (comme le selecteur de l'interface)
  const debut = from || new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const fin = to || new Date();

  const filtrePeriode = tenantScope(req, { date: { $gte: debut, $lte: fin } });

  const [totaux, soldeGlobal, transactions, total, sessionOuverte] =
    await Promise.all([
      // Totaux de la periode selectionnee
      CashTransactionModel.aggregate([
        { $match: filtrePeriode },
        { $group: { _id: "$type", total: { $sum: "$montant" } } },
      ]),

      /**
       * Solde de caisse DEPUIS TOUJOURS (recettes - depenses).
       * C'est le montant affiche en gros en haut de l'ecran : il ne depend
       * pas de la periode filtree.
       */
      CashTransactionModel.aggregate([
        { $match: tenantScope(req, {}) },
        { $group: { _id: "$type", total: { $sum: "$montant" } } },
      ]),

      CashTransactionModel.find(filtrePeriode)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      CashTransactionModel.countDocuments(filtrePeriode),

      CashSessionModel.findOne(tenantScope(req, { statut: "ouverte" })).lean(),
    ]);

  const parType = (agg) => ({
    recettes: agg.find((t) => t._id === "recette")?.total || 0,
    depenses: agg.find((t) => t._id === "depense")?.total || 0,
  });

  const periode = parType(totaux);
  const global = parType(soldeGlobal);

  // ── Regroupement du journal par journee ─────────────────────────────
  const journalParJour = transactions.reduce((acc, t) => {
    const cle = new Date(t.date).toISOString().slice(0, 10);

    if (!acc[cle]) {
      acc[cle] = { jour: cle, recettes: 0, depenses: 0, operations: [] };
    }

    if (t.type === "recette") {
      acc[cle].recettes = arrondir(acc[cle].recettes + t.montant);
    } else {
      acc[cle].depenses = arrondir(acc[cle].depenses + t.montant);
    }

    acc[cle].operations.push(t);
    return acc;
  }, {});

  return success(
    res,
    {
      soldeCaisse: arrondir(global.recettes - global.depenses),
      periode: {
        debut,
        fin,
        totalRecettes: periode.recettes,
        totalDepenses: periode.depenses,
        solde: arrondir(periode.recettes - periode.depenses),
      },
      sessionCaisse: sessionOuverte,
      journal: Object.values(journalParJour).sort((a, b) =>
        b.jour.localeCompare(a.jour)
      ),
    },
    200,
    paginationMeta(page, limit, total)
  );
});

/** POST /treasury/transactions — Saisie manuelle. */
const createTransaction = asyncHandler(async (req, res) => {
  // Rattachement a la session de caisse ouverte, si elle existe
  const sessionOuverte = await CashSessionModel.findOne(
    tenantScope(req, { statut: "ouverte" })
  ).lean();

  const transaction = await CashTransactionModel.create(
    tenantPayload(req, {
      ...req.validated.body,
      origineType: "manuel",
      sessionCaisseId: sessionOuverte?._id,
      auteurId: req.user.id,
      auteurNom: req.user.nom,
    })
  );

  return success(res, transaction, 201);
});

/** POST /treasury/sessions/open — Ouverture de caisse. */
const openSession = asyncHandler(async (req, res) => {
  const dejaOuverte = await CashSessionModel.findOne(
    tenantScope(req, { statut: "ouverte" })
  ).lean();

  if (dejaOuverte) {
    throw AppError.conflict(
      "Une session de caisse est deja ouverte. Cloturez-la d'abord."
    );
  }

  const session = await CashSessionModel.create(
    tenantPayload(req, {
      reference: `CAISSE-${new Date().toISOString().slice(0, 10)}-${Date.now().toString().slice(-4)}`,
      caisseNom: req.validated.body.caisseNom || "Caisse principale",
      fondsOuverture: req.validated.body.fondsOuverture || 0,
      ouvertePar: req.user.id,
      ouvertParNom: req.user.nom,
    })
  );

  return success(res, session, 201);
});

/**
 * POST /treasury/sessions/close — Cloture de caisse ("Z de caisse").
 *
 * ══ POINT DELICAT : SEULES LES ESPECES COMPTENT ══
 * Le fonds theorique = fonds d'ouverture + especes encaissees - depenses.
 *
 * Un paiement Mobile Money n'est PAS dans le tiroir : l'inclure fausserait
 * completement l'ecart et rendrait la cloture ininterpretable. C'est l'erreur
 * la plus frequente sur ce type de fonctionnalite.
 */
const closeSession = asyncHandler(async (req, res) => {
  const { fondsComptes, notes } = req.validated.body;

  const session = await CashSessionModel.findOne(
    tenantScope(req, { statut: "ouverte" })
  );

  if (!session) throw AppError.notFound("Aucune session de caisse ouverte");

  const [mouvements, ventes, ventilation] = await Promise.all([
    CashTransactionModel.aggregate([
      { $match: tenantScope(req, { sessionCaisseId: session._id }) },
      { $group: { _id: "$type", total: { $sum: "$montant" }, nombre: { $sum: 1 } } },
    ]),

    SaleModel.aggregate([
      {
        $match: tenantScope(req, {
          sessionCaisseId: session._id,
          statut: { $ne: "annulee" },
        }),
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$montantTotal" },
          nombre: { $sum: 1 },
          benefice: { $sum: "$beneficeTotal" },
        },
      },
    ]),

    // Ventilation par mode de paiement — `$unwind` eclate le tableau paiements
    SaleModel.aggregate([
      {
        $match: tenantScope(req, {
          sessionCaisseId: session._id,
          statut: { $ne: "annulee" },
        }),
      },
      { $unwind: "$paiements" },
      {
        $group: {
          _id: "$paiements.mode",
          total: { $sum: "$paiements.montant" },
        },
      },
    ]),
  ]);

  const recettes = mouvements.find((m) => m._id === "recette")?.total || 0;
  const depenses = mouvements.find((m) => m._id === "depense")?.total || 0;

  // SEULES les especes sont dans le tiroir
  const especes = ventilation.find((v) => v._id === "especes")?.total || 0;

  const fondsTheorique = arrondir(
    session.fondsOuverture + especes - depenses
  );

  session.totalRecettes = recettes;
  session.totalDepenses = depenses;
  session.totalVentes = ventes[0]?.total || 0;
  session.nombreVentes = ventes[0]?.nombre || 0;
  session.ventilationParMode = Object.fromEntries(
    ventilation.map((v) => [v._id, v.total])
  );
  session.fondsTheorique = fondsTheorique;
  session.fondsComptes = fondsComptes;
  session.ecart = arrondir(fondsComptes - fondsTheorique);
  session.statut = "fermee";
  session.fermeeLe = new Date();
  session.fermeePar = req.user.id;
  session.notes = notes;

  await session.save();

  /**
   * Tout ecart de caisse est audite. Au-dela d'un seuil, la severite passe en
   * "haute" : un manquant important doit remonter dans les alertes.
   */
  if (session.ecart !== 0) {
    recordAudit(req, "cash_session.discrepancy", {
      severite: Math.abs(session.ecart) > 10000 ? "haute" : "moyenne",
      cible: "CashSession",
      cibleId: session._id,
      apres: {
        ecart: session.ecart,
        theorique: fondsTheorique,
        compte: fondsComptes,
      },
    });
  }

  return success(res, {
    session,
    // Structure prete a imprimer : le "Z de caisse"
    rapport: {
      fondsOuverture: session.fondsOuverture,
      totalVentes: session.totalVentes,
      nombreVentes: session.nombreVentes,
      ventilationParMode: session.ventilationParMode,
      totalDepenses: depenses,
      fondsTheorique,
      fondsComptes,
      ecart: session.ecart,
      interpretation:
        session.ecart === 0
          ? "Caisse juste"
          : session.ecart > 0
          ? "Excedent de caisse"
          : "Manquant de caisse",
    },
  });
});

/**
 * GET /treasury/export — Export comptable de la periode.
 * Format debit / credit, importable dans un tableur ou un logiciel comptable.
 */
const exportAccounting = asyncHandler(async (req, res) => {
  const { from, to } = req.validated.query;

  const transactions = await CashTransactionModel.find(
    tenantScope(req, {
      date: { $gte: from || new Date(0), $lte: to || new Date() },
    })
  )
    .sort({ date: 1 })   // ordre chronologique pour un journal comptable
    .lean();

  const lignes = transactions.map((t) => ({
    date: new Date(t.date).toISOString().slice(0, 10),
    libelle: t.libelle,
    categorie: t.categorie || "",
    modePaiement: t.modePaiement,
    debit: t.type === "depense" ? t.montant : 0,
    credit: t.type === "recette" ? t.montant : 0,
    auteur: t.auteurNom || "",
  }));

  return success(res, {
    lignes,
    totaux: {
      debit: arrondir(lignes.reduce((s, l) => s + l.debit, 0)),
      credit: arrondir(lignes.reduce((s, l) => s + l.credit, 0)),
    },
  });
});

module.exports = {
  overview, createTransaction, openSession, closeSession, exportAccounting,
};
