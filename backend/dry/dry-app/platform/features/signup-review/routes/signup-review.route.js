/**
 * Routes de TRAITEMENT des demandes — reservees au staff plateforme.
 *
 * Distinction importante :
 *   - un agent de support peut CONSULTER et demander des informations
 *   - seul le Super-Admin peut VALIDER ou REJETER une demande
 * La creation d'un compte client est une decision commerciale, pas une
 * operation de support.
 */
const express = require("express");
const validate = require("../../../../../core/validate");
const { registerRoute } = require("../../../../../core/openapi");
const { authenticate } = require("../../../../../core/authenticate");
const { platformOnly, superAdminOnly } = require("../../../../../core/authorize");
const { idParam } = require("../../../../../core/common-schemas");
const S = require("../../../../public/features/signup/model/signup.schema");

const list = require("../controllers/signup-list.controller");
const getOne = require("../controllers/signup-get-one.controller");
const approve = require("../controllers/signup-approve.controller");
const reject = require("../controllers/signup-reject.controller");
const requestInfo = require("../controllers/signup-request-info.controller");

const router = express.Router();

// Toutes les routes de ce module exigent un compte plateforme
router.use(authenticate, platformOnly);

// ══ GET /platform/signup-requests ═════════════════════════════════════
router.get("/", validate({ query: S.listSignupQuerySchema }), list);

registerRoute({
  method: "get",
  path: "/platform/signup-requests",
  tags: ["Plateforme"],
  summary: "Lister les demandes d'inscription",
  description:
    "Par defaut, seules les demandes non traitees sont affichees " +
    "(`pending`, `in_review`, `info_requested`). Utiliser le filtre `statut` " +
    "pour consulter l'historique des demandes approuvees ou rejetees.",
  request: { query: S.listSignupQuerySchema },
  responses: { 200: S.signupResponse },
});

// ══ GET /platform/signup-requests/:id ═════════════════════════════════
router.get("/:id", validate({ params: idParam }), getOne);

registerRoute({
  method: "get",
  path: "/platform/signup-requests/{id}",
  tags: ["Plateforme"],
  summary: "Consulter le dossier d'une demande",
  description:
    "Passe automatiquement la demande au statut `in_review` a la premiere " +
    "ouverture, pour signaler aux collegues qu'elle est prise en charge.",
  request: { params: idParam },
  responses: { 200: S.signupResponse },
});

// ══ POST /platform/signup-requests/:id/approve ════════════════════════
router.post(
  "/:id/approve",
  superAdminOnly,
  validate({ params: idParam, body: S.approveSchema }),
  approve
);

registerRoute({
  method: "post",
  path: "/platform/signup-requests/{id}/approve",
  tags: ["Plateforme"],
  summary: "Valider la demande et creer le compte boutique",
  description:
    "**Operation transactionnelle.** Cree en une seule fois : la boutique, " +
    "le compte administrateur avec mot de passe temporaire, la premiere " +
    "facture d'abonnement et les categories par defaut selon le type de " +
    "commerce.\n\n" +
    "L'email d'activation est ensuite envoye au proprietaire. Le mot de passe " +
    "temporaire est egalement renvoye dans la reponse, pour transmission " +
    "manuelle si l'email n'arrive pas.\n\n" +
    "Reserve au Super-Admin.",
  request: { params: idParam, body: S.approveSchema },
  responses: { 201: S.signupResponse },
});

// ══ POST /platform/signup-requests/:id/reject ═════════════════════════
router.post(
  "/:id/reject",
  superAdminOnly,
  validate({ params: idParam, body: S.rejectSchema }),
  reject
);

registerRoute({
  method: "post",
  path: "/platform/signup-requests/{id}/reject",
  tags: ["Plateforme"],
  summary: "Rejeter la demande",
  description:
    "Le motif est obligatoire et transmis au demandeur par email. " +
    "Une nouvelle demande reste possible avec la meme adresse.\n\n" +
    "Reserve au Super-Admin.",
  request: { params: idParam, body: S.rejectSchema },
  responses: { 200: S.signupResponse },
});

// ══ POST /platform/signup-requests/:id/request-info ═══════════════════
router.post(
  "/:id/request-info",
  validate({ params: idParam, body: S.requestInfoSchema }),
  requestInfo
);

registerRoute({
  method: "post",
  path: "/platform/signup-requests/{id}/request-info",
  tags: ["Plateforme"],
  summary: "Demander des informations complementaires",
  description:
    "La demande reste dans la file d'attente avec le statut `info_requested`. " +
    "Accessible aux agents de support.",
  request: { params: idParam, body: S.requestInfoSchema },
  responses: { 200: S.signupResponse },
});

module.exports = router;
