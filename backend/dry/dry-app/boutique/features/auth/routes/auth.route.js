/**
 * Routes du module Authentification.
 *
 * ══ CHAQUE ROUTE EST DECLAREE DEUX FOIS ══
 *   router.<methode>(...)   → le comportement Express
 *   registerRoute({...})    → l'entree correspondante dans la documentation
 *
 * Les DEUX utilisent les MEMES schemas Zod. La documentation ne peut donc pas
 * devenir obsolete par rapport au code : ajouter un champ au schema le fait
 * apparaitre automatiquement sur /api-docs.
 */
const express = require("express");
const validate = require("../../../../../core/validate");
const { registerRoute } = require("../../../../../core/openapi");
const { authenticate } = require("../../../../../core/authenticate");
const { authLimiter } = require("../../../../../core/rate-limit");
const S = require("../model/auth.schema");

const login = require("../controllers/auth-login.controller");
const refresh = require("../controllers/auth-refresh.controller");
const logout = require("../controllers/auth-logout.controller");
const me = require("../controllers/auth-me.controller");
const changePassword = require("../controllers/auth-change-password.controller");
const forgotPassword = require("../controllers/auth-forgot-password.controller");
const resetPassword = require("../controllers/auth-reset-password.controller");
const completeTour = require("../controllers/auth-complete-tour.controller");

const router = express.Router();

// ══ POST /auth/login ══════════════════════════════════════════════════
router.post("/login", authLimiter, validate({ body: S.loginSchema }), login);

registerRoute({
  method: "post",
  path: "/auth/login",
  tags: ["Authentification"],
  security: false,   // route publique : pas de jeton requis
  summary: "Connexion",
  description:
    "Accepte un email ou un numero de telephone. Depose un cookie httpOnly " +
    "contenant le refresh token (7 jours) et renvoie un access token valable " +
    "15 minutes.\n\n" +
    "Limitee a 8 tentatives par IP toutes les 15 minutes. Le compte est bloque " +
    "15 minutes apres 5 echecs consecutifs.",
  request: { body: S.loginSchema },
  responses: { 200: S.authResponseSchema },
});

// ══ POST /auth/refresh ════════════════════════════════════════════════
router.post("/refresh", refresh);

registerRoute({
  method: "post",
  path: "/auth/refresh",
  tags: ["Authentification"],
  security: false,
  summary: "Renouveler l'access token",
  description:
    "Utilise le cookie `refreshToken`. Applique la rotation des jetons : " +
    "l'ancien est revoque et remplace. La reutilisation d'un jeton deja " +
    "consomme coupe toutes les sessions de l'utilisateur.",
  responses: { 200: S.authResponseSchema },
});

// ══ POST /auth/logout ═════════════════════════════════════════════════
router.post("/logout", logout);

registerRoute({
  method: "post",
  path: "/auth/logout",
  tags: ["Authentification"],
  security: false,
  summary: "Deconnexion",
  description: "Revoque la session courante cote serveur et supprime le cookie.",
  responses: { 200: S.messageResponseSchema },
});

// ══ GET /auth/me ══════════════════════════════════════════════════════
router.get("/me", authenticate, me);

registerRoute({
  method: "get",
  path: "/auth/me",
  tags: ["Authentification"],
  summary: "Profil de l'utilisateur connecte",
  description:
    "Renvoie en un seul appel le profil, la boutique, le plan et les " +
    "permissions effectives. Appele par le frontend au chargement.",
  responses: { 200: S.messageResponseSchema },
});

// ══ POST /auth/change-password ════════════════════════════════════════
router.post(
  "/change-password",
  authenticate,
  validate({ body: S.changePasswordSchema }),
  changePassword
);

registerRoute({
  method: "post",
  path: "/auth/change-password",
  tags: ["Authentification"],
  summary: "Changer son mot de passe",
  description:
    "A la premiere connexion, `motDePasseActuel` n'est pas requis (le flag " +
    "`doitChangerMotDePasse` est actif).\n\n" +
    "Dans tous les cas, toutes les sessions sont revoquees : l'utilisateur " +
    "doit se reconnecter.",
  request: { body: S.changePasswordSchema },
  responses: { 200: S.messageResponseSchema },
});

// ══ POST /auth/forgot-password ════════════════════════════════════════
router.post(
  "/forgot-password",
  authLimiter,
  validate({ body: S.forgotPasswordSchema }),
  forgotPassword
);

registerRoute({
  method: "post",
  path: "/auth/forgot-password",
  tags: ["Authentification"],
  security: false,
  summary: "Demander la reinitialisation du mot de passe",
  description:
    "La reponse est identique que l'adresse existe ou non, pour empecher " +
    "l'enumeration des comptes. Le lien envoye est valable une heure.",
  request: { body: S.forgotPasswordSchema },
  responses: { 200: S.messageResponseSchema },
});

// ══ POST /auth/reset-password ═════════════════════════════════════════
router.post(
  "/reset-password",
  authLimiter,
  validate({ body: S.resetPasswordSchema }),
  resetPassword
);

registerRoute({
  method: "post",
  path: "/auth/reset-password",
  tags: ["Authentification"],
  security: false,
  summary: "Definir un nouveau mot de passe via le lien recu par email",
  request: { body: S.resetPasswordSchema },
  responses: { 200: S.messageResponseSchema },
});

// ══ POST /auth/complete-tour ══════════════════════════════════════════
router.post("/complete-tour", authenticate, completeTour);

registerRoute({
  method: "post",
  path: "/auth/complete-tour",
  tags: ["Authentification"],
  summary: "Marquer la visite guidee de premiere connexion comme terminee",
  responses: { 200: S.messageResponseSchema },
});

module.exports = router;
