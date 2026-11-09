/**
 * Routeur de l'espace PLATEFORME — console Super-Admin.
 *
 * Toutes ces routes sont reservees au staff Stockline. Aucune ne donne acces
 * aux donnees commerciales d'une boutique : uniquement des metadonnees de
 * compte, de la facturation et des compteurs agreges.
 *
 * DISTINCTION DE DROITS :
 *   platformOnly    → super-admin ET agents de support (consultation)
 *   superAdminOnly  → super-admin seul (actions engageantes)
 */
const express = require("express");
const { z } = require("zod");
const validate = require("../../../core/validate");
const { registerRoute, registerSchema } = require("../../../core/openapi");
const { authenticate } = require("../../../core/authenticate");
const { platformOnly, superAdminOnly } = require("../../../core/authorize");
const {
  idParam, paginationQuery, dateRangeQuery, objectId,
  money, phone, safeText, permissionList,
} = require("../../../core/common-schemas");
const { SHOP_STATUS, BILLING_CYCLE } = require("../../../core/constants");

const shops = require("../features/shop/controllers/shop.controllers");
const analytics = require("../features/analytic/controllers/analytic.controllers");
const billing = require("../features/billing/controllers/billing.controllers");
const plans = require("../features/plan-admin/controllers/plan-admin.controllers");
const flags = require("../features/feature-flag/controllers/feature-flag.controllers");
const settings = require("../features/setting/controllers/setting.controllers");
const signupReview = require("../features/signup-review/routes/signup-review.route");

const router = express.Router();
router.use(authenticate, platformOnly);

const platformResponse = registerSchema(
  "PlatformData",
  z.object({
    kpis: z.any().optional(),
    boutiques: z.any().optional(),
    factures: z.any().optional(),
  })
);

// ══ DEMANDES D'INSCRIPTION ════════════════════════════════════════════
// Le routeur applique deja authenticate + platformOnly
router.use("/signup-requests", signupReview);

// ══ VUE D'ENSEMBLE & ANALYTIQUE ═══════════════════════════════════════
router.get("/overview", analytics.overview);
registerRoute({
  method: "get", path: "/platform/overview", tags: ["Plateforme"],
  summary: "Vue d'ensemble de la plateforme",
  description:
    "Boutiques actives, MRR, utilisateurs actifs sur 30 jours, comptes en " +
    "retard, evolution du MRR sur 7 mois, repartition par plan et activite " +
    "recente.",
  responses: { 200: platformResponse },
});

router.get("/analytics", analytics.usageAnalytics);
registerRoute({
  method: "get", path: "/platform/analytics", tags: ["Plateforme"],
  summary: "Analytique d'usage (agregee et anonymisee)",
  description:
    "Modules les plus et les moins utilises, croissance du parc de tenants, " +
    "taux d'adoption par plan.\n\n" +
    "**Aucune donnee commerciale n'est exposee** : uniquement des compteurs " +
    "de sessions par module.",
  responses: { 200: platformResponse },
});

// ══ ANNUAIRE DES BOUTIQUES ════════════════════════════════════════════
const listShopsQuery = paginationQuery.extend({
  statut: z.enum(Object.values(SHOP_STATUS)).optional(),
  planId: objectId.optional(),
});

router.get("/shops", validate({ query: listShopsQuery }), shops.list);
registerRoute({
  method: "get", path: "/platform/shops", tags: ["Plateforme"],
  summary: "Annuaire des boutiques (metadonnees de compte uniquement)",
  description:
    "Nom, code, plan, statut, contact du proprietaire et quotas consommes.\n\n" +
    "**Aucun produit, aucune vente, aucun client n'est accessible.**",
  request: { query: listShopsQuery },
  responses: { 200: platformResponse },
});

router.get("/shops/:id", validate({ params: idParam }), shops.getOne);
registerRoute({
  method: "get", path: "/platform/shops/{id}", tags: ["Plateforme"],
  summary: "Fiche compte d'une boutique",
  description:
    "Statut d'abonnement, quotas, historique de facturation et journal des " +
    "actions administratives.\n\n" +
    "Chaque consultation est tracee dans le journal d'audit.",
  request: { params: idParam },
  responses: { 200: platformResponse },
});

const updateStatusSchema = z
  .object({
    statut: z.enum([
      SHOP_STATUS.ACTIVE,
      SHOP_STATUS.FROZEN,
      SHOP_STATUS.BANNED,
      SHOP_STATUS.SUSPENDED,
    ]),
    motif: safeText(500).optional().openapi({
      description: "Obligatoire pour un gel ou un bannissement",
    }),
    dureeHeures: z.coerce.number().int().positive().optional().openapi({
      description: "Duree du gel en heures. Absent = gel indefini.",
    }),
  })
  .openapi("UpdateShopStatus");

router.patch(
  "/shops/:id/status",
  superAdminOnly,
  validate({ params: idParam, body: updateStatusSchema }),
  shops.updateStatus
);
registerRoute({
  method: "patch", path: "/platform/shops/{id}/status", tags: ["Plateforme"],
  summary: "Geler, degeler, suspendre ou bannir une boutique",
  description:
    "Coupe immediatement toutes les sessions actives de la boutique et " +
    "notifie son proprietaire par email.\n\n" +
    "Le gel peut etre temporaire (`dureeHeures`) ou indefini. Le bannissement " +
    "exige un motif.\n\n" +
    "Journalise en severite haute. Reserve au Super-Admin.",
  request: { params: idParam, body: updateStatusSchema },
  responses: { 200: platformResponse },
});

router.patch(
  "/shops/:id/plan",
  superAdminOnly,
  validate({ params: idParam, body: z.object({ planId: objectId }) }),
  shops.changePlan
);
registerRoute({
  method: "patch", path: "/platform/shops/{id}/plan", tags: ["Plateforme"],
  summary: "Changer le plan tarifaire d'une boutique",
  request: { params: idParam },
  responses: { 200: platformResponse },
});

// ══ FACTURATION ═══════════════════════════════════════════════════════
router.get("/billing", billing.billingOverview);
registerRoute({
  method: "get", path: "/platform/billing", tags: ["Plateforme"],
  summary: "Abonnements & facturation (MRR, ARR, impayes, passerelles)",
  description:
    "Le MRR provient des factures d'abonnement emises par Stockline : c'est " +
    "le revenu de la plateforme, pas celui des boutiques.",
  responses: { 200: platformResponse },
});

const listInvoicesQuery = paginationQuery.merge(dateRangeQuery).extend({
  shopId: objectId.optional(),
  planId: objectId.optional(),
  statut: z.enum(["en_attente", "paye", "en_retard", "annule"]).optional(),
});

router.get("/invoices", validate({ query: listInvoicesQuery }), billing.listInvoices);
registerRoute({
  method: "get", path: "/platform/invoices", tags: ["Plateforme"],
  summary: "Factures d'abonnement emises aux boutiques",
  request: { query: listInvoicesQuery },
  responses: { 200: platformResponse },
});

const chargeSchema = z
  .object({
    factureId: objectId,
    telephone: phone.openapi({
      example: "+242 06 123 4567",
      description: "Numero Mobile Money du payeur",
    }),
    operateur: z.enum(["mtn_cg", "airtel_cg"]).optional(),
  })
  .openapi("InitiatePayment");

router.post(
  "/billing/charge",
  superAdminOnly,
  validate({ body: chargeSchema }),
  billing.initiatePayment
);
registerRoute({
  method: "post", path: "/platform/billing/charge", tags: ["Plateforme"],
  summary: "Declencher un paiement Mobile Money",
  description:
    "Le client recoit une invite sur son telephone et valide avec son code " +
    "PIN. Le resultat arrive par notification ; l'endpoint de statut sert de " +
    "sondage de secours.\n\n" +
    "La passerelle utilisee depend de `PAYMENT_PROVIDER`. Les identifiants " +
    "marchand ne quittent jamais le serveur.",
  request: { body: chargeSchema },
  responses: { 201: platformResponse },
});

router.get(
  "/billing/payments/:id/status",
  validate({ params: idParam }),
  billing.checkPaymentStatus
);
registerRoute({
  method: "get", path: "/platform/billing/payments/{id}/status", tags: ["Plateforme"],
  summary: "Verifier le statut d'une transaction Mobile Money",
  request: { params: idParam },
  responses: { 200: platformResponse },
});

router.post("/invoices/:id/remind", validate({ params: idParam }), billing.sendReminder);
registerRoute({
  method: "post", path: "/platform/invoices/{id}/remind", tags: ["Plateforme"],
  summary: "Relancer un impaye par email",
  request: { params: idParam },
  responses: { 200: platformResponse },
});

// ══ PLANS TARIFAIRES ══════════════════════════════════════════════════
const planSchema = z
  .object({
    nom: safeText(60).openapi({ example: "Business" }),
    description: safeText(250).optional(),
    prix: money,
    cycle: z.enum(Object.values(BILLING_CYCLE)).default("monthly"),
    quotas: z
      .object({
        boutiques: z.coerce.number().int().default(1),
        utilisateurs: z.coerce.number().int().default(3),
        produits: z.coerce.number().int().default(500),
        stockageMo: z.coerce.number().int().default(500),
      })
      .partial()
      .optional()
      .openapi({ description: "-1 signifie illimite" }),
    fonctionnalites: permissionList.optional(),
    fonctionnalitesSupplementaires: z.array(safeText(80)).max(30).optional(),
    publie: z.boolean().default(false),
    populaire: z.boolean().default(false),
    ordre: z.coerce.number().int().default(0),
  })
  .openapi("CreatePlan");

router.get("/plans", plans.listPlans);
registerRoute({
  method: "get", path: "/platform/plans", tags: ["Plateforme"],
  summary: "Lister tous les plans avec leur nombre de boutiques",
  responses: { 200: platformResponse },
});

router.post("/plans", superAdminOnly, validate({ body: planSchema }), plans.createPlan);
registerRoute({
  method: "post", path: "/platform/plans", tags: ["Plateforme"],
  summary: "Creer un plan tarifaire personnalise",
  request: { body: planSchema },
  responses: { 201: platformResponse },
});

router.patch(
  "/plans/:id",
  superAdminOnly,
  validate({
    params: idParam,
    body: planSchema.partial().extend({ forcer: z.boolean().optional() }),
  }),
  plans.updatePlan
);
registerRoute({
  method: "patch", path: "/platform/plans/{id}", tags: ["Plateforme"],
  summary: "Modifier, publier ou masquer un plan",
  description:
    "Masquer un plan encore utilise necessite `forcer: true`. Les abonnements " +
    "en cours ne sont pas affectes.",
  request: { params: idParam },
  responses: { 200: platformResponse },
});

// ══ FEATURE FLAGS ═════════════════════════════════════════════════════
const flagSchema = z
  .object({
    cle: z
      .string()
      .regex(/^[a-z0-9_]+$/, "Format attendu : minuscules et underscores")
      .openapi({ example: "new_dashboard_v2" }),
    nom: safeText(120),
    description: safeText(500).optional(),
    environnement: z.enum(["production", "staging"]).default("staging"),
    actif: z.boolean().default(false),
    strategie: z.enum(["global", "plan", "beta", "pourcentage"]).default("global"),
    plansCibles: z.array(objectId).optional(),
    boutiquesCibles: z.array(objectId).optional(),
    pourcentageDeploiement: z.coerce.number().min(0).max(100).default(0),
  })
  .openapi("UpsertFeatureFlag");

router.get("/feature-flags", flags.listFlags);
registerRoute({
  method: "get", path: "/platform/feature-flags", tags: ["Plateforme"],
  summary: "Lister les feature flags",
  responses: { 200: platformResponse },
});

router.put("/feature-flags", superAdminOnly, validate({ body: flagSchema }), flags.upsertFlag);
registerRoute({
  method: "put", path: "/platform/feature-flags", tags: ["Plateforme"],
  summary: "Creer ou mettre a jour un feature flag",
  description:
    "Strategies : `global` (tous), `plan` (certains plans), `beta` (liste " +
    "fermee de boutiques) ou `pourcentage` (deploiement progressif " +
    "deterministe — une meme boutique obtient toujours le meme resultat).",
  request: { body: flagSchema },
  responses: { 200: platformResponse },
});

// ══ PARAMETRES PLATEFORME ═════════════════════════════════════════════
const settingsSchema = z
  .object({
    general: z
      .object({
        nomPlateforme: safeText(120),
        urlPrincipale: z.string().url(),
        emailSupport: z.string().email(),
        emailFacturation: z.string().email(),
        deviseParDefaut: z.string().max(5),
        fuseauHoraire: z.string().max(60),
      })
      .partial()
      .optional(),
    emails: z
      .object({
        serveurSmtp: z.string().max(120),
        portSmtp: z.coerce.number().int(),
        expediteurParDefaut: z.string().max(150),
        emailBienvenue: z.boolean(),
        emailRappelPaiement: z.boolean(),
        emailSuspension: z.boolean(),
        alertesSysteme: z.boolean(),
      })
      .partial()
      .optional(),
    facturation: z
      .object({
        delaiGraceJours: z.coerce.number().int().min(0).max(90),
        joursRelance: z.array(z.coerce.number().int()).max(6),
        suspensionAutomatique: z.boolean(),
      })
      .partial()
      .optional(),
  })
  .openapi("UpdatePlatformSettings");

router.get("/settings", settings.getSettings);
registerRoute({
  method: "get", path: "/platform/settings", tags: ["Plateforme"],
  summary: "Configuration globale de la plateforme",
  responses: { 200: platformResponse },
});

router.patch("/settings", superAdminOnly, validate({ body: settingsSchema }), settings.updateSettings);
registerRoute({
  method: "patch", path: "/platform/settings", tags: ["Plateforme"],
  summary: "Modifier la configuration (general, emails, facturation)",
  description:
    "Fusion par section : envoyer uniquement `emails` n'efface pas la " +
    "section `general`.",
  request: { body: settingsSchema },
  responses: { 200: platformResponse },
});

// ══ JOURNAUX & SECURITE ═══════════════════════════════════════════════
const logsQuery = paginationQuery.merge(dateRangeQuery).extend({
  severite: z.enum(["info", "moyenne", "haute"]).optional(),
  action: z.string().max(60).optional(),
  shopId: objectId.optional(),
});

router.get("/logs", validate({ query: logsQuery }), settings.listAuditLogs);
registerRoute({
  method: "get", path: "/platform/logs", tags: ["Plateforme"],
  summary: "Journaux d'audit, alertes de securite et sante de l'infrastructure",
  description:
    "Filtrable par severite, type d'action, boutique et periode.\n\n" +
    "Inclut les alertes de securite des dernieres 24 heures et l'etat des " +
    "services (API, base de donnees, comptes bloques).",
  request: { query: logsQuery },
  responses: { 200: platformResponse },
});

// -- BLOCAGE IP DEFINITIF ----------------------------------------------
router.post('/security/block-ip', superAdminOnly, settings.blockIp);
router.delete('/security/block-ip/:ip', superAdminOnly, settings.unblockIp);

module.exports = router;
