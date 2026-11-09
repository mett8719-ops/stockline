/**
 * SCRIPT DE SEED — donnees initiales de la plateforme et de demonstration.
 *
 * Cree :
 *   1. les trois plans tarifaires Starter / Pro / Enterprise
 *   2. le compte Super-Admin plateforme
 *   3. quelques feature flags de demonstration
 *   4. les parametres plateforme par defaut
 *   5. une boutique de demonstration active (T001)
 *   6. les comptes boutique : Gerant (admin) et Caissier
 *   7. des categories et produits de demonstration pour tester caisse et stock
 *
 * IDEMPOTENT : le relancer ne cree pas de doublons. Chaque element est cree
 * uniquement s'il n'existe pas deja.
 *
 * Usage : npm run seed
 */
require("dotenv").config({ path: "./config.env" });
require("colors");

const connectDB = require("../core/connect-db");
const {
  PLATFORM_ROLES,
  SHOP_ROLES,
  PERMISSIONS,
  SHOP_STATUS,
  DEFAULT_ROLE_PERMISSIONS,
} = require("../core/constants");

const UserModel = require("../dry-app/boutique/features/auth/model/user.model");
const PlanModel = require("../dry-app/platform/features/plan-admin/model/plan.model");
const FeatureFlagModel = require("../dry-app/platform/features/feature-flag/model/feature-flag.model");
const PlatformSettingsModel = require("../dry-app/platform/features/setting/model/platform-settings.model");
const ShopModel = require("../dry-app/platform/features/shop/model/shop.model");
const CategoryModel = require("../dry-app/boutique/features/category/model/category.model");
const ProductModel = require("../dry-app/boutique/features/product/model/product.model");

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
      PERMISSIONS.DASHBOARD,
      PERMISSIONS.POS,
      PERMISSIONS.PRODUCTS,
      PERMISSIONS.STOCK,
      PERMISSIONS.CUSTOMERS,
      PERMISSIONS.SETTINGS,
      PERMISSIONS.MESSAGING,
      PERMISSIONS.TICKETS,
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
    strategie: "plan",
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
  const emailAdmin = process.env.SEED_SUPERADMIN_EMAIL || "admin@stockline.cg";
  const motDePasseAdmin = process.env.SEED_SUPERADMIN_PASSWORD || "ChangeMoi2026!";

  const adminExistant = await UserModel.findOne({ email: emailAdmin });

  if (adminExistant) {
    console.log(`  Super-Admin ${emailAdmin} : deja present`.gray);
  } else {
    await UserModel.create({
      nom: process.env.SEED_SUPERADMIN_NOM || "Super Administrateur",
      email: emailAdmin,
      passwordHash: motDePasseAdmin,
      role: PLATFORM_ROLES.SUPER_ADMIN,
      shopId: null,
      permissions: Object.values(PERMISSIONS),
      doitChangerMotDePasse: false,
      actif: true,
    });

    console.log(`  Super-Admin cree : ${emailAdmin}`.green.bold);
    console.log(`  Mot de passe     : ${motDePasseAdmin}`.yellow);
  }

  // ══ 3. FEATURE FLAGS ════════════════════════════════════════════════
  for (const donnees of FLAGS) {
    const existant = await FeatureFlagModel.findOne({ cle: donnees.cle });

    if (existant) {
      console.log(`  Flag ${donnees.cle} : deja present`.gray);
      continue;
    }

    const plansCibles =
      donnees.strategie === "plan"
        ? [plansCrees.Pro?._id, plansCrees.Enterprise?._id].filter(Boolean)
        : [];

    await FeatureFlagModel.create({ ...donnees, plansCibles });
    console.log(`  Flag ${donnees.cle} cree`.green);
  }

  // ══ 4. PARAMETRES PLATEFORME ════════════════════════════════════════
  await PlatformSettingsModel.get();
  console.log("  Parametres plateforme initialises".green);

  // ══ 5. BOUTIQUE DEMO ACTIVE (T001) ══════════════════════════════════
  let shopDemo = await ShopModel.findOne({ code: "T001" });

  if (shopDemo) {
    console.log("  Boutique Demo T001 : deja presente".gray);
  } else {
    shopDemo = await ShopModel.create({
      code: "T001",
      nom: "Boutique Démo Brazzaville",
      typeActivite: "boutique_detail",
      adresse: "Avenue de la Paix, Centre-Ville",
      ville: "Brazzaville",
      pays: "Congo",
      telephone: "+242065001122",
      email: "demo@stockline.cg",
      statut: SHOP_STATUS.ACTIVE,
      planId: plansCrees.Pro?._id || plansCrees.Starter?._id,
      cycleFacturation: "mensuel",
      tauxTva: 0,
      devise: "XAF",
    });
    console.log(`  Boutique Demo creee : ${shopDemo.nom} (Code: T001)`.green.bold);
  }

  const shopId = shopDemo._id;

  // ══ 6. COMPTES BOUTIQUE : GERANT & CAISSIER ═════════════════════════
  const gerantEmail = "gerant@stockline.cg";
  const gerantExistant = await UserModel.findOne({ email: gerantEmail });
  if (gerantExistant) {
    console.log(`  Gerant ${gerantEmail} : deja present`.gray);
  } else {
    await UserModel.create({
      nom: "Gérant Démo",
      email: gerantEmail,
      telephone: "+242066000001",
      passwordHash: "Boutique2026!",
      role: SHOP_ROLES.ADMIN,
      shopId: shopId,
      permissions: Object.values(PERMISSIONS),
      doitChangerMotDePasse: false,
      actif: true,
    });
    console.log(`  Compte Gerant cree   : ${gerantEmail} (Mdp: Boutique2026!)`.green);
  }

  const caissierEmail = "caissier@stockline.cg";
  const caissierExistant = await UserModel.findOne({ email: caissierEmail });
  if (caissierExistant) {
    console.log(`  Caissier ${caissierEmail} : deja present`.gray);
  } else {
    await UserModel.create({
      nom: "Caissier Démo",
      email: caissierEmail,
      telephone: "+242066000002",
      passwordHash: "Caissier2026!",
      role: SHOP_ROLES.CAISSIER,
      shopId: shopId,
      permissions: DEFAULT_ROLE_PERMISSIONS[SHOP_ROLES.CAISSIER],
      doitChangerMotDePasse: false,
      actif: true,
    });
    console.log(`  Compte Caissier cree : ${caissierEmail} (Mdp: Caissier2026!)`.green);
  }

  // ══ 7. CATEGORIES ET PRODUITS DE DEMONSTRATION ══════════════════════
  const categoriesDefaut = [
    { nom: "Alimentation", couleur: "#16a34a", ordre: 1 },
    { nom: "Boissons", couleur: "#2563eb", ordre: 2 },
    { nom: "Hygiène", couleur: "#9333ea", ordre: 3 },
  ];

  const mapCategories = {};
  for (const cat of categoriesDefaut) {
    let catDoc = await CategoryModel.findOne({ shopId, nom: cat.nom });
    if (!catDoc) {
      catDoc = await CategoryModel.create({ ...cat, shopId });
      console.log(`  Categorie creee : ${cat.nom}`.green);
    }
    mapCategories[cat.nom] = catDoc._id;
  }

  const produitsDefaut = [
    {
      nom: "Riz Parfumé 25kg",
      sku: "RIZ-25KG",
      codeBarre: "6001001",
      categorieId: mapCategories["Alimentation"],
      categorieNom: "Alimentation",
      unite: "sac",
      prixAchat: 14000,
      prixVente: 17500,
      stockActuel: 45,
      seuilAlerte: 10,
    },
    {
      nom: "Huile Végétale 5L",
      sku: "HUILE-5L",
      codeBarre: "6001002",
      categorieId: mapCategories["Alimentation"],
      categorieNom: "Alimentation",
      unite: "bidon",
      prixAchat: 4500,
      prixVente: 6000,
      stockActuel: 30,
      seuilAlerte: 8,
    },
    {
      nom: "Sucre Roux 1kg",
      sku: "SUCRE-1KG",
      codeBarre: "6001003",
      categorieId: mapCategories["Alimentation"],
      categorieNom: "Alimentation",
      unite: "paquet",
      prixAchat: 800,
      prixVente: 1000,
      stockActuel: 120,
      seuilAlerte: 20,
    },
    {
      nom: "Eau Minérale Mayo 1.5L (Pack x6)",
      sku: "EAU-MAYO-PACK",
      codeBarre: "6001004",
      categorieId: mapCategories["Boissons"],
      categorieNom: "Boissons",
      unite: "pack",
      prixAchat: 2000,
      prixVente: 2800,
      stockActuel: 60,
      seuilAlerte: 15,
    },
    {
      nom: "Savon de Marseille Blanc",
      sku: "SAVON-MARS",
      codeBarre: "6001005",
      categorieId: mapCategories["Hygiène"],
      categorieNom: "Hygiène",
      unite: "piece",
      prixAchat: 350,
      prixVente: 500,
      stockActuel: 200,
      seuilAlerte: 30,
    },
    {
      nom: "Lait Concentré Bonnet Bleu 397g",
      sku: "LAIT-BB-397",
      codeBarre: "6001006",
      categorieId: mapCategories["Alimentation"],
      categorieNom: "Alimentation",
      unite: "boite",
      prixAchat: 600,
      prixVente: 850,
      stockActuel: 8, // En stock bas (seuil à 10) pour tester l'alerte !
      seuilAlerte: 10,
    },
  ];

  for (const prod of produitsDefaut) {
    const existant = await ProductModel.findOne({ shopId, codeBarre: prod.codeBarre });
    if (!existant) {
      await ProductModel.create({ ...prod, shopId });
      console.log(`  Produit cree : ${prod.nom} (${prod.prixVente} XAF)`.green);
    }
  }

  console.log("\nSeed termine avec succes !".cyan.bold);
  console.log("════════════════════════════════════════════════════════════".cyan);
  console.log("COMPTES DE TEST PRETS POUR L'EQUIPE :".yellow.bold);
  console.log("1. Super-Admin Plateforme : admin@stockline.cg  / ChangeMoi2026!");
  console.log("2. Gérant Boutique        : gerant@stockline.cg / Boutique2026!");
  console.log("3. Caissier Boutique      : caissier@stockline.cg / Caissier2026!");
  console.log("════════════════════════════════════════════════════════════".cyan);
  console.log(`Doc API : http://localhost:${process.env.PORT || 4000}/api-docs\n`.green);

  process.exit(0);
})().catch((e) => {
  console.error(`\nEchec du seed : ${e.message}`.red.bold);
  console.error(e.stack);
  process.exit(1);
});
