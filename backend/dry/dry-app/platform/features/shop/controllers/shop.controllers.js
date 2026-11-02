/**
 * Console Super-Admin — Gestion des boutiques (annuaire des tenants).
 *
 * ══════════════════════════════════════════════════════════════════════
 *  RAPPEL DE CONFIDENTIALITE
 * ══════════════════════════════════════════════════════════════════════
 * Ces controleurs n'exposent QUE des METADONNEES DE COMPTE : nom, plan,
 * statut d'abonnement, contact du proprietaire, quotas consommes.
 *
 * AUCUN endpoint de ce module ne renvoie de donnee commerciale : ni produit,
 * ni vente, ni client, ni chiffre d'affaires d'une boutique.
 *
 * Il n'existe volontairement AUCUNE fonction "voir la boutique" ni "se
 * connecter en tant que" — ce serait une violation directe de l'isolation
 * des tenants et de la promesse faite aux clients.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success, paginationMeta } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");
const { sendAccountSuspended } = require("../../../../../core/services/mailer.service");
const { notifyShop } = require("../../../../../core/services/notification.service");
const { SHOP_STATUS, NOTIFICATION_CATEGORIES } = require("../../../../../core/constants");

const ShopModel = require("../model/shop.model");
const PlanModel = require("../../plan-admin/model/plan.model");
const PlatformInvoiceModel = require("../../billing/model/platform-invoice.model");
const AuditLogModel = require("../../audit-log/model/audit-log.model");
const UserModel = require("../../../../boutique/features/auth/model/user.model");

/** GET /platform/shops — Annuaire des tenants. */
const list = asyncHandler(async (req, res) => {
  const { page, limit, statut, planId, q } = req.validated.query;

  const filtre = {};

  // Les demandes non validees n'apparaissent pas dans l'annuaire
  if (statut) filtre.statut = statut;
  else filtre.statut = { $ne: SHOP_STATUS.PENDING };

  if (planId) filtre.planId = planId;

  if (q) {
    filtre.$or = [
      { nom: { $regex: q, $options: "i" } },
      { code: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }

  const [boutiques, total, repartition] = await Promise.all([
    ShopModel.find(filtre)
      .populate("planId", "nom prix quotas")
      .populate("proprietaireId", "nom email telephone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      /**
       * Selection EXPLICITE des champs : on ne renvoie que les metadonnees.
       * Ecrire la liste blanche plutot qu'une liste noire evite qu'un futur
       * champ sensible ajoute au modele soit expose par inadvertance.
       */
      .select(
        "code nom typeActivite ville statut planId proprietaireId compteurs " +
        "dateProchainRenouvellement derniereConnexion createdAt gelJusquA " +
        "motifBannissement motifGel"
      )
      .lean(),

    ShopModel.countDocuments(filtre),

    ShopModel.aggregate([
      { $match: { statut: { $ne: SHOP_STATUS.PENDING } } },
      { $group: { _id: "$planId", total: { $sum: 1 } } },
    ]),
  ]);

  // Jauge de quota affichee dans la colonne "Quota DB"
  const enrichies = boutiques.map((b) => {
    const quotaProduits = b.planId?.quotas?.produits;
    const quotaStockage = b.planId?.quotas?.stockageMo;

    return {
      ...b,
      quotaProduitsPourcent:
        quotaProduits && quotaProduits !== -1
          ? Math.round((b.compteurs.produits / quotaProduits) * 100)
          : 0,
      quotaStockagePourcent:
        quotaStockage && quotaStockage !== -1
          ? Math.round((b.compteurs.stockageMo / quotaStockage) * 100)
          : 0,
    };
  });

  return success(
    res,
    {
      boutiques: enrichies,
      repartitionParPlan: repartition,
      // Bandeau affiche en haut de l'ecran
      avertissementConfidentialite:
        "Donnees protegees / Acces isole. Cette vue affiche uniquement les " +
        "metadonnees de compte. Aucune donnee commerciale n'est accessible " +
        "depuis l'espace administrateur.",
    },
    200,
    paginationMeta(page, limit, total)
  );
});

/** GET /platform/shops/:id — Fiche compte (metadonnees uniquement). */
const getOne = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const boutique = await ShopModel.findById(id)
    .populate("planId", "nom prix devise quotas fonctionnalites")
    .populate("proprietaireId", "nom email telephone derniereConnexion")
    .lean();

  if (!boutique) throw AppError.notFound("Boutique introuvable");

  const [factures, nombreUtilisateurs, journalActions] = await Promise.all([
    PlatformInvoiceModel.find({ shopId: id })
      .sort({ dateEmission: -1 })
      .limit(12)
      .lean(),

    // On compte les utilisateurs, on ne les liste PAS
    UserModel.countDocuments({ shopId: id, actif: true }),

    // Uniquement les actions ADMINISTRATIVES sur la boutique
    AuditLogModel.find({ shopId: id, action: /^shop\./ })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  /**
   * Toute consultation d'un dossier tenant est TRACEE. Meme limitee aux
   * metadonnees, un acces reste un acces : il doit etre auditable.
   */
  recordAudit(req, "shop.viewed_by_platform", {
    cible: "Shop",
    cibleId: id,
    shopId: id,
    severite: "info",
  });

  return success(res, {
    boutique,
    factures,
    nombreUtilisateurs,
    journalActions,
    avertissementConfidentialite:
      "Metadonnees de compte uniquement. Les donnees commerciales de cette " +
      "boutique ne sont pas accessibles depuis la console plateforme.",
  });
});

/**
 * PATCH /platform/shops/:id/status — Geler, degeler, suspendre ou bannir.
 *
 * Le gel peut etre TEMPORAIRE (`dureeHeures` : 24h, 48h...) ou INDEFINI
 * (champ absent). Le bannissement est definitif et exige un motif.
 *
 * Dans tous les cas de restriction, les sessions actives sont coupees
 * IMMEDIATEMENT — sans quoi les employes resteraient connectes jusqu'a
 * l'expiration de leur jeton.
 */
const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { statut, motif, dureeHeures } = req.validated.body;

  const boutique = await ShopModel.findById(id);
  if (!boutique) throw AppError.notFound("Boutique introuvable");

  const statutAvant = boutique.statut;

  switch (statut) {
    case SHOP_STATUS.FROZEN:
      if (!motif) throw AppError.badRequest("Le motif du gel est obligatoire");
      boutique.statut = SHOP_STATUS.FROZEN;
      boutique.motifGel = motif;
      // Absence de duree = gel indefini
      boutique.gelJusquA = dureeHeures
        ? new Date(Date.now() + dureeHeures * 60 * 60 * 1000)
        : null;
      break;

    case SHOP_STATUS.BANNED:
      if (!motif) {
        throw AppError.badRequest("Le motif du bannissement est obligatoire");
      }
      boutique.statut = SHOP_STATUS.BANNED;
      boutique.motifBannissement = motif;
      boutique.banniLe = new Date();
      boutique.banniPar = req.user.id;
      break;

    case SHOP_STATUS.SUSPENDED:
      boutique.statut = SHOP_STATUS.SUSPENDED;
      boutique.motifGel = motif || "Non-paiement de l'abonnement";
      break;

    case SHOP_STATUS.ACTIVE:
      // Reactivation : on efface tous les motifs de restriction
      boutique.statut = SHOP_STATUS.ACTIVE;
      boutique.gelJusquA = null;
      boutique.motifGel = undefined;
      boutique.motifBannissement = undefined;
      break;

    default:
      throw AppError.badRequest("Statut non pris en charge");
  }

  await boutique.save();

  // ── Effets de bord selon le sens du changement ──────────────────────
  const estRestriction = [
    SHOP_STATUS.FROZEN,
    SHOP_STATUS.BANNED,
    SHOP_STATUS.SUSPENDED,
  ].includes(statut);

  if (estRestriction) {
    // Coupe immediatement toutes les sessions de tous les employes
    await UserModel.updateMany({ shopId: id }, { $set: { refreshTokens: [] } });

    const proprietaire = await UserModel.findById(boutique.proprietaireId)
      .select("email")
      .lean();

    if (proprietaire?.email) {
      await sendAccountSuspended({
        to: proprietaire.email,
        shopName: boutique.nom,
        motif: motif || "Non precise",
      });
    }
  } else {
    await notifyShop({
      shopId: id,
      titre: "Acces retabli",
      message: "L'acces a votre espace Stockline a ete retabli.",
      categorie: NOTIFICATION_CATEGORIES.ACCOUNT,
    });
  }

  recordAudit(req, `shop.${statut}`, {
    severite: "haute",
    cible: "Shop",
    cibleId: boutique._id,
    shopId: boutique._id,
    avant: { statut: statutAvant },
    apres: { statut, motif, gelJusquA: boutique.gelJusquA },
  });

  return success(res, {
    message: `Boutique ${boutique.nom} : statut passe de "${statutAvant}" a "${statut}".`,
    boutique: {
      id: boutique._id,
      code: boutique.code,
      nom: boutique.nom,
      statut: boutique.statut,
      gelJusquA: boutique.gelJusquA,
    },
  });
});

/** PATCH /platform/shops/:id/plan — Changement de plan tarifaire. */
const changePlan = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { planId } = req.validated.body;

  const [boutique, plan] = await Promise.all([
    ShopModel.findById(id).populate("planId", "nom"),
    PlanModel.findById(planId).lean(),
  ]);

  if (!boutique) throw AppError.notFound("Boutique introuvable");
  if (!plan) throw AppError.badRequest("Plan tarifaire introuvable");

  const ancienPlan = boutique.planId?.nom;
  boutique.planId = plan._id;
  await boutique.save();

  await notifyShop({
    shopId: id,
    titre: "Votre plan a ete modifie",
    message: `Votre abonnement est desormais le plan ${plan.nom}.`,
    categorie: NOTIFICATION_CATEGORIES.BILLING,
  });

  recordAudit(req, "shop.plan_changed", {
    severite: "haute",
    cible: "Shop",
    cibleId: boutique._id,
    shopId: boutique._id,
    avant: { plan: ancienPlan },
    apres: { plan: plan.nom },
  });

  return success(res, {
    message: `Plan modifie : ${ancienPlan} → ${plan.nom}`,
    boutique,
  });
});

module.exports = { list, getOne, updateStatus, changePlan };
