/**
 * Console Super-Admin — Vue d'ensemble et analytique d'usage.
 *
 * ══ CONFIDENTIALITE ══
 * Le MRR affiche provient des factures d'abonnement emises PAR Stockline :
 * c'est le revenu de LA PLATEFORME, pas celui des boutiques.
 *
 * L'analytique d'usage repose uniquement sur des COMPTEURS AGREGES (nombre de
 * sessions par module). Aucun montant commercial, aucun contenu de boutique
 * n'est jamais expose ici.
 */
const asyncHandler = require("../../../../../core/async-handler");
const { success } = require("../../../../../core/response");
const { SHOP_STATUS, PERMISSION_LIST } = require("../../../../../core/constants");

const ShopModel = require("../../shop/model/shop.model");
const PlanModel = require("../../plan-admin/model/plan.model");
const PlatformInvoiceModel = require("../../billing/model/platform-invoice.model");
const SignupRequestModel = require("../../signup-review/model/signup-request.model");
const UsageEventModel = require("../model/usage-event.model");
const AuditLogModel = require("../../audit-log/model/audit-log.model");
const UserModel = require("../../../../boutique/features/auth/model/user.model");
const TicketModel = require("../../../../shared/features/ticket/model/ticket.model");

/** GET /platform/overview — Ecran "Vue d'ensemble". */
const overview = asyncHandler(async (req, res) => {
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);

  const debutMoisPrecedent = new Date(debutMois);
  debutMoisPrecedent.setMonth(debutMoisPrecedent.getMonth() - 1);

  const il30Jours = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    boutiquesActives, nouvellesCeMois, mrr, mrrPrecedent, utilisateursActifs,
    comptesEnRetard, demandesEnAttente, ticketsOuverts, repartitionPlans,
    evolutionMrr, activiteRecente,
  ] = await Promise.all([
    ShopModel.countDocuments({ statut: SHOP_STATUS.ACTIVE }),

    ShopModel.countDocuments({
      statut: SHOP_STATUS.ACTIVE,
      createdAt: { $gte: debutMois },
    }),

    // Revenu recurrent mensuel : factures PAYEES du mois en cours
    PlatformInvoiceModel.aggregate([
      { $match: { statut: "paye", dateEmission: { $gte: debutMois } } },
      { $group: { _id: null, total: { $sum: "$montant" } } },
    ]),

    PlatformInvoiceModel.aggregate([
      {
        $match: {
          statut: "paye",
          dateEmission: { $gte: debutMoisPrecedent, $lt: debutMois },
        },
      },
      { $group: { _id: null, total: { $sum: "$montant" } } },
    ]),

    // Utilisateurs de boutique connectes sur les 30 derniers jours
    UserModel.countDocuments({
      shopId: { $ne: null },
      derniereConnexion: { $gte: il30Jours },
    }),

    PlatformInvoiceModel.countDocuments({ statut: "en_retard" }),

    SignupRequestModel.countDocuments({
      statut: { $in: ["pending", "in_review", "info_requested"] },
    }),

    TicketModel.countDocuments({
      niveau: "plateforme",
      statut: { $in: ["ouvert", "en_cours"] },
    }),

    // Repartition par plan, avec jointure pour recuperer le nom
    ShopModel.aggregate([
      { $match: { statut: SHOP_STATUS.ACTIVE } },
      { $group: { _id: "$planId", total: { $sum: 1 } } },
      {
        $lookup: {
          from: "platform-plans",
          localField: "_id",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
      { $project: { plan: "$plan.nom", total: 1, prix: "$plan.prix" } },
      { $sort: { total: -1 } },
    ]),

    // Courbe d'evolution du MRR sur 7 mois
    PlatformInvoiceModel.aggregate([
      {
        $match: {
          statut: "paye",
          dateEmission: {
            $gte: new Date(Date.now() - 210 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$dateEmission" } },
          total: { $sum: "$montant" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Fil "Activite recente" de l'ecran
    AuditLogModel.find({
      action: {
        $in: ["signup.approved", "shop.frozen", "shop.banned", "billing.paid"],
      },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const mrrActuel = mrr[0]?.total || 0;
  const mrrAvant = mrrPrecedent[0]?.total || 0;

  return success(res, {
    kpis: {
      boutiquesActives: { valeur: boutiquesActives, nouvellesCeMois },
      mrr: {
        valeur: mrrActuel,
        evolution:
          mrrAvant > 0
            ? Math.round(((mrrActuel - mrrAvant) / mrrAvant) * 100)
            : 0,
      },
      utilisateursActifs30j: utilisateursActifs,
      comptesEnRetard,
    },
    // Encadre "Actions rapides" de l'ecran
    actionsRapides: {
      demandesEnAttente,
      comptesEnRetard,
      supportOuvert: ticketsOuverts,
    },
    repartitionParPlan: repartitionPlans,
    evolutionMrr: evolutionMrr.map((m) => ({ mois: m._id, montant: m.total })),
    activiteRecente,
  });
});

/**
 * GET /platform/analytics — Ecran "Analytique d'usage".
 *
 * Modules les plus et les moins utilises, croissance du parc, adoption par
 * plan. Uniquement des donnees agregees et anonymisees.
 */
const usageAnalytics = asyncHandler(async (req, res) => {
  const jours = Number(req.query.jours) || 30;

  const depuis = new Date(Date.now() - jours * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [usageParModule, croissance, plans] = await Promise.all([
    UsageEventModel.aggregate([
      { $match: { jour: { $gte: depuis } } },
      { $group: { _id: "$module", sessions: { $sum: "$sessions" } } },
      { $sort: { sessions: -1 } },
    ]),

    ShopModel.aggregate([
      { $match: { statut: { $ne: SHOP_STATUS.PENDING } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          nouvelles: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),

    PlanModel.find({ publie: true }).select("nom fonctionnalites").lean(),
  ]);

  /**
   * Les modules JAMAIS utilises n'apparaissent pas dans l'agregation. On les
   * ajoute explicitement avec zero : c'est precisement l'objectif de cet
   * ecran — identifier les fonctionnalites sous-utilisees pour orienter la
   * roadmap produit.
   */
  const presents = new Set(usageParModule.map((m) => m._id));

  const complet = [
    ...usageParModule,
    ...PERMISSION_LIST.filter((m) => !presents.has(m)).map((m) => ({
      _id: m,
      sessions: 0,
    })),
  ];

  // Taux d'adoption par plan, sur les modules cles
  const modulesCles = ["pos", "products", "stock", "treasury"];
  const adoption = [];

  for (const plan of plans) {
    const boutiquesDuPlan = await ShopModel.countDocuments({
      planId: plan._id,
      statut: SHOP_STATUS.ACTIVE,
    });

    adoption.push({
      plan: plan.nom,
      boutiques: boutiquesDuPlan,
      modules: modulesCles.map((m) => ({
        module: m,
        inclus: plan.fonctionnalites?.includes(m) || false,
      })),
    });
  }

  let cumul = 0;

  return success(res, {
    periodeJours: jours,
    modulesLesPlusUtilises: complet.slice(0, 20),
    modulesSousUtilises: [...complet]
      .sort((a, b) => a.sessions - b.sessions)
      .slice(0, 5),
    croissanceTenants: croissance.map((c) => {
      cumul += c.nouvelles;
      return { mois: c._id, nouvelles: c.nouvelles, totalActifs: cumul };
    }),
    adoptionParPlan: adoption,
    avertissementConfidentialite:
      "Donnees agregees et anonymisees — aucune donnee commerciale n'est exposee.",
  });
});

module.exports = { overview, usageAnalytics };
