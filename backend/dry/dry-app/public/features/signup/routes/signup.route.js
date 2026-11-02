/**
 * Routes PUBLIQUES du parcours d'inscription.
 * Aucune authentification requise — ce sont les seules routes de ce type
 * avec la connexion.
 */
const express = require("express");
const validate = require("../../../../../core/validate");
const { registerRoute } = require("../../../../../core/openapi");
const { publicLimiter } = require("../../../../../core/rate-limit");
const S = require("../model/signup.schema");

const create = require("../controllers/signup-create.controller");
const listPublicPlans = require("../../plan/controllers/plan-public-list.controller");

const router = express.Router();

// ══ POST /public/signup ═══════════════════════════════════════════════
router.post(
  "/signup",
  publicLimiter,   // 5 demandes / heure / IP — anti-spam
  validate({ body: S.createSignupRequestSchema }),
  create
);

registerRoute({
  method: "post",
  path: "/public/signup",
  tags: ["Inscription"],
  security: false,
  summary: "Soumettre une demande de creation de compte boutique",
  description:
    "Formulaire public en 4 etapes. **Aucun compte n'est cree immediatement** : " +
    "la demande part en file d'attente et sera validee par l'equipe Stockline " +
    "sous 24 a 48 heures.\n\n" +
    "Le mot de passe choisi est hache des la soumission, jamais stocke en clair.\n\n" +
    "Limite a 5 demandes par heure et par adresse IP.",
  request: { body: S.createSignupRequestSchema },
  responses: { 201: S.signupResponse },
});

// ══ GET /public/plans ═════════════════════════════════════════════════
router.get("/plans", listPublicPlans);

registerRoute({
  method: "get",
  path: "/public/plans",
  tags: ["Inscription"],
  security: false,
  summary: "Lister les plans tarifaires publies",
  description:
    "Alimente la page de tarifs publique et l'etape 3 du formulaire " +
    "d'inscription. Seuls les plans publies sont visibles.",
  responses: { 200: S.signupResponse },
});

module.exports = router;
