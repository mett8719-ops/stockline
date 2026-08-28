/**
 * SCRIPT DE SEED — donnees initiales de la plateforme.
 *
 * Cree :
 *   1. le compte Super-Admin (a partir des variables SEED_*)
 *   2. les trois plans tarifaires Starter / Pro / Enterprise
 *   3. quelques feature flags de demonstration
 *   4. les parametres plateforme par defaut
 *
 * IDEMPOTENT : le relancer ne cree pas de doublons. Chaque element est cree
 * uniquement s'il n'existe pas deja.
 *
 * Usage : npm run seed
 */
require("dotenv").config({ path: "./config.env" });
require("colors");

const connectDB = require("../core/connect-db");
const { PLATFORM_ROLES, PERMISSIONS } = require("../core/constants");

const UserModel = require("../dry-app/boutique/features/auth/model/user.model");
const PlanModel = require("../dry-app/platform/features/plan-admin/model/plan.model");
const FeatureFlagModel = require("../dry-app/platform/features/feature-flag/model/feature-flag.model");
const PlatformSettingsModel = require("../dry-app/platform/features/setting/model/platform-settings.model");

/** Les trois plans de la page tarifaire. */
const PLANS = [
  {
    nom: "Starter",
    description: "Pour les petites boutiques qui demarrent.",
    prix: 15000,
    ordre: 1,
    publie: true,
    quotas: { boutiques: 1, utilisateurs: 3, produits: 500, stockageMo: 500 },
    fonctionnalites: [
      PERMISSIONS.DASHBOARD, PERMISSIONS.POS, PERMISSIONS.PRODUCTS,
      PERMISSIONS.STOCK, PERMISSIONS.CUSTOMERS, PERMISSIONS.SETTINGS,
      PERMISSIONS.MESSAGING, PERMISSIONS.TICKETS,
    ],
    fonctionnalitesSupplementaires: [
      "1 boutique / 1 caisse",
      "Jusqu'a 500 produits",
      "Gestion de stock de base",
      "Vente + recus",
      "Rapports mensuels",
      "Support par email",
    ],
  },
  {
    nom: "Pro",
    description: "La solution complete pour les boutiques actives.",
    prix: 45000,
    ordre: 2,
    publie: true,
    populaire: true,
    // -1 = illimite
    quotas: { boutiques: 3, utilisateurs: 10, produits: -1, stockageMo: 5000 },
    fonctionnalites: Object.values(PERMISSIONS),
    fonctionnalitesSupplementaires: [
      "Jusqu'a 3 boutiques",
      "Produits illimites",
      "Stock & inventaire complet",
      "Caisse multi-postes",
      "Clients, Fournisseurs",
      "Tresorerie & rapports avances",
      "Factures PDF",
      "Support prioritaire",
    ],
  },
  {
    nom: "Enterprise",
    description: "Pour les reseaux de distribution et supermarches.",
    prix: 120000,
    ordre: 3,
    publie: true,
    quotas: { boutiques: -1, utilisateurs: -1, produits: -1, stockageMo: 50000 },
    fonctionnalites: Object.values(PERMISSIONS),
    fonctionnalitesSupplementaires: [
      "Boutiques illimitees",
      "Utilisateurs illimites",
      "Tout le plan Pro",
      "API & integrations tierces",
      "Tableau de bord multi-sites",
      "Gestionnaire de compte dedie",
      "Formation & accompagnement inclus",
    ],
  },
];

/** Feature flags de demarrage. */
const FLAGS = [
  {
    cle: "invoice_pdf_export",
    nom: "Export PDF des factures",
    description: "Permet aux boutiques d'exporter leurs factures au format PDF.",
    environnement: "production",
    actif: true,
    strategie: "global",
  },
  {
    cle: "barcode_scanner_web",
    nom: "Scanner code-barres (Web)",
    description: "Active le scan via camera du navigateur dans la caisse.",
    environnement: "production",
    actif: true,
    strategie: "plan",   // les plans cibles seront renseignes ci-dessous
  },
  {
    cle: "offline_mode",
    nom: "Mode hors-ligne",
    description: "Permet la vente sans connexion, avec synchronisation differee.",
    environnement: "staging",
    actif: false,
    strategie: "beta",
  },
];

(async () => {
  await connectDB();
  console.log("\nDemarrage du seed...".cyan.bold);

  // ══ 1. PLANS TARIFAIRES ═════════════════════════════════════════════
  const plansCrees = {};

  for (const donnees of PLANS) {
    let plan = await PlanModel.findOne({ nom: donnees.nom });

    if (plan) {
      console.log(`  Plan ${donnees.nom} : deja present`.gray);
    } else {
      plan = await PlanModel.create(donnees);
      console.log(`  Plan ${donnees.nom} cree (${donnees.prix} XAF/mois)`.green);
    }

    plansCrees[donnees.nom] = plan;
  }

  // ══ 2. COMPTE SUPER-ADMIN ═══════════════════════════════════════════
  const emailAdmin = process.env.SEED_SUPERADMIN_EMAIL;
  const motDePasseAdmin = process.env.SEED_SUPERADMIN_PASSWORD;

  if (!emailAdmin || !motDePasseAdmin) {
    console.warn(
      "  SEED_SUPERADMIN_EMAIL ou SEED_SUPERADMIN_PASSWORD manquant — compte non cree".yellow
    );
  } else {
    const existant = await UserModel.findOne({ email: emailAdmin });

    if (existant) {
      console.log(`  Super-Admin ${emailAdmin} : deja present`.gray);
    } else {
      await UserModel.create({
        nom: process.env.SEED_SUPERADMIN_NOM || "Super Administrateur",
        email: emailAdmin,
        // Le hook pre-save du modele hache automatiquement
        passwordHash: motDePasseAdmin,
        role: PLATFORM_ROLES.SUPER_ADMIN,
        shopId: null,                  // compte plateforme : pas de boutique
        permissions: Object.values(PERMISSIONS),
        doitChangerMotDePasse: true,   // changement force a la 1re connexion
        actif: true,
      });

      console.log(`  Super-Admin cree : ${emailAdmin}`.green.bold);
      console.log(`  Mot de passe     : ${motDePasseAdmin}`.yellow);
      console.log("  A changer imperativement a la premiere connexion".yellow);
    }
  }

  // ══ 3. FEATURE FLAGS ════════════════════════════════════════════════
  for (const donnees of FLAGS) {
    const existant = await FeatureFlagModel.findOne({ cle: donnees.cle });

    if (existant) {
      console.log(`  Flag ${donnees.cle} : deja present`.gray);
      continue;
    }

    // Le scanner est reserve aux plans Pro et Enterprise
    const plansCibles =
      donnees.strategie === "plan"
        ? [plansCrees.Pro?._id, plansCrees.Enterprise?._id].filter(Boolean)
        : [];

    await FeatureFlagModel.create({ ...donnees, plansCibles });
    console.log(`  Flag ${donnees.cle} cree`.green);
  }

  // ══ 4. PARAMETRES PLATEFORME ════════════════════════════════════════
  // La methode statique cree le document avec les valeurs par defaut
  await PlatformSettingsModel.get();
  console.log("  Parametres plateforme initialises".green);

  console.log("\nSeed termine.".cyan.bold);
  console.log(`Connexion : ${`http://localhost:${process.env.PORT || 4000}/api-docs`.green}\n`);

  process.exit(0);
})().catch((e) => {
  console.error(`\nEchec du seed : ${e.message}`.red.bold);
  console.error(e.stack);
  process.exit(1);
});
