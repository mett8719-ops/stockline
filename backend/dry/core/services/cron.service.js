/**
 * SERVICE DE TACHES PLANIFIEES (CRON) — Stockline.
 *
 * Automatise les flux critiques :
 *   1. Boucle de facturation SaaS : passage en retard, relances et suspension
 *   2. Renouvellement automatique : emission de la facture du mois suivant
 *   3. Expiration des devis et factures clients des boutiques
 *   4. Consolidation quotidienne des compteurs d'usage Redis -> MongoDB
 */
const { flushUsageToDatabase } = require("../usage-tracker");
const { sendPaymentReminder } = require("./mailer.service");
const { SHOP_STATUS, BILLING_CYCLE, DOCUMENT_TYPES, DOCUMENT_STATUS } = require("../constants");

const PlatformInvoiceModel = require("../../dry-app/platform/features/billing/model/platform-invoice.model");
const ShopModel = require("../../dry-app/platform/features/shop/model/shop.model");
const PlanModel = require("../../dry-app/platform/features/plan-admin/model/plan.model");
const DocumentModel = require("../../dry-app/boutique/features/document/model/document.model");
const UserModel = require("../../dry-app/boutique/features/auth/model/user.model");
const colors = require("colors");

/**
 * 1. Cycle de facturation SaaS (Plateforme -> Boutiques).
 */
async function cycleFacturationPlateforme() {
  const aujourdhui = new Date();

  try {
    // ── A. Passer les factures echues en "en_retard" et calculer les jours de retard
    const facturesEchues = await PlatformInvoiceModel.find({
      statut: { $in: ["en_attente", "en_retard"] },
      dateEcheance: { $lt: aujourdhui },
    });

    for (const fac of facturesEchues) {
      const msDiff = aujourdhui.getTime() - new Date(fac.dateEcheance).getTime();
      const jours = Math.floor(msDiff / (1000 * 60 * 60 * 24));
      fac.statut = "en_retard";
      fac.joursRetard = jours;
      await fac.save();

      // Suspension automatique apres 7 jours de grace
      if (jours >= 7) {
        const shop = await ShopModel.findById(fac.shopId);
        if (shop && shop.statut === SHOP_STATUS.ACTIVE) {
          shop.statut = SHOP_STATUS.SUSPENDED;
          shop.motifGel = `Abonnement suspendu : facture ${fac.numero} impayee depuis ${jours} jours`;
          await shop.save();
          console.log(`[CRON] Boutique ${shop.nom} (${shop.code}) SUSPENDUE pour impaye.`.red.bold);
        }
      }
    }

    // ── B. Generer automatiquement la prochaine facture a echeance de renouvellement
    const boutiquesARenouveler = await ShopModel.find({
      statut: { $in: [SHOP_STATUS.ACTIVE, SHOP_STATUS.SUSPENDED] },
      dateProchainRenouvellement: { $lte: aujourdhui },
    });

    for (const shop of boutiquesARenouveler) {
      // Verifier s'il n'existe pas deja une facture non payee recente pour cette boutique
      const factureExistante = await PlatformInvoiceModel.findOne({
        shopId: shop._id,
        statut: { $in: ["en_attente", "en_retard"] },
      });

      if (factureExistante) continue; // On attend que la facture en cours soit reglee

      const plan = shop.planId ? await PlanModel.findById(shop.planId) : null;
      if (!plan) continue;

      const multiplicateur = shop.cycleFacturation === BILLING_CYCLE.ANNUAL ? 12 * 0.85 : 1;
      const montant = Math.round(plan.prix * multiplicateur);

      const count = await PlatformInvoiceModel.countDocuments();
      const annee = aujourdhui.getFullYear();
      const numero = `PF-${annee}-${String(count + 1).padStart(4, "0")}`;

      const dateEcheance = new Date(aujourdhui);
      dateEcheance.setDate(dateEcheance.getDate() + 7); // 7 jours pour payer

      const nouvelleFacture = await PlatformInvoiceModel.create({
        numero,
        shopId: shop._id,
        shopNom: shop.nom,
        planId: plan._id,
        planNom: plan.nom,
        periodeLibelle: aujourdhui.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
        periodeDebut: aujourdhui,
        periodeFin: new Date(aujourdhui.getTime() + 30 * 864e5),
        montant,
        devise: shop.devise || "XAF",
        statut: "en_attente",
        dateEmission: aujourdhui,
        dateEcheance,
      });

      console.log(`[CRON] Facture de renouvellement ${nouvelleFacture.numero} generee pour ${shop.nom} (${montant} XAF)`.cyan);
    }
  } catch (err) {
    console.error(`[CRON] Erreur cycleFacturationPlateforme : ${err.message}`.red);
  }
}

/**
 * 2. Expiration automatique des devis et factures clients des boutiques.
 */
async function expirerDocumentsBoutiques() {
  const aujourdhui = new Date();

  try {
    // Expirer les devis dont la date de validite est depassee
    const resDevis = await DocumentModel.updateMany(
      {
        type: DOCUMENT_TYPES.QUOTE,
        statut: { $in: [DOCUMENT_STATUS.DRAFT, DOCUMENT_STATUS.PENDING] },
        dateValidite: { $lt: aujourdhui },
      },
      { $set: { statut: DOCUMENT_STATUS.EXPIRED } }
    );

    // Passer en retard les factures clients impayees dont la date d'echeance est depassee
    const resFactures = await DocumentModel.updateMany(
      {
        type: DOCUMENT_TYPES.INVOICE,
        statut: DOCUMENT_STATUS.PENDING,
        dateEcheance: { $lt: aujourdhui },
      },
      { $set: { statut: DOCUMENT_STATUS.OVERDUE } }
    );

    if (resDevis.modifiedCount > 0 || resFactures.modifiedCount > 0) {
      console.log(
        `[CRON] Documents boutiques mis a jour : ${resDevis.modifiedCount} devis expires, ${resFactures.modifiedCount} factures en retard`.yellow
      );
    }
  } catch (err) {
    console.error(`[CRON] Erreur expirerDocumentsBoutiques : ${err.message}`.red);
  }
}

/**
 * Lancer toutes les taches planifiees quotidiennes.
 */
async function executerTachesQuotidiennes() {
  console.log("\n[CRON] Lancement des taches d'automatisation quotidiennes...".cyan);
  await cycleFacturationPlateforme();
  await expirerDocumentsBoutiques();
  await flushUsageToDatabase();
  console.log("[CRON] Taches quotidiennes executees avec succes.\n".green);
}

/**
 * Demarre la boucle de surveillance en arriere-plan (execute au demarrage puis toutes les 6 heures).
 */
function initCronJobs() {
  // Lancer une premiere passe 5 secondes apres le demarrage du serveur
  setTimeout(() => {
    executerTachesQuotidiennes().catch((e) =>
      console.error(`[CRON] Erreur d'initialisation : ${e.message}`.red)
    );
  }, 5000);

  // Boucle toutes les 6 heures (6 * 60 * 60 * 1000 ms)
  const SIX_HEURES = 6 * 60 * 60 * 1000;
  setInterval(() => {
    executerTachesQuotidiennes().catch((e) =>
      console.error(`[CRON] Erreur periodique : ${e.message}`.red)
    );
  }, SIX_HEURES);

  console.log("  Taches planifiees : Initialisees (facturation, devis, analytique)".green);
}

module.exports = {
  initCronJobs,
  executerTachesQuotidiennes,
  cycleFacturationPlateforme,
  expirerDocumentsBoutiques,
};
