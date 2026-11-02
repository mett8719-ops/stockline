/** Routes du module Utilisateurs & Droits (boutique). */
const express = require("express");
const validate = require("../../../../../core/validate");
const { registerRoute } = require("../../../../../core/openapi");
const { authorizeRoles, requirePermission } = require("../../../../../core/authorize");
const { trackUsage } = require("../../../../../core/usage-tracker");
const { idParam } = require("../../../../../core/common-schemas");
const { PERMISSIONS, SHOP_ROLES } = require("../../../../../core/constants");
const S = require("../model/user-shop.schema");
const c = require("../controllers/user-shop.controllers");

const router = express.Router();
router.use(requirePermission(PERMISSIONS.USERS), trackUsage("users"));

router.get("/", c.list);
registerRoute({
  method: "get", path: "/users", tags: ["Utilisateurs"], permissions: ["users"],
  summary: "Lister les membres de l'equipe",
  responses: { 200: S.userResponse },
});

router.post("/", authorizeRoles(SHOP_ROLES.ADMIN), validate({ body: S.inviteSchema }), c.invite);
registerRoute({
  method: "post", path: "/users", tags: ["Utilisateurs"], permissions: ["users"],
  summary: "Inviter un employe (administrateur uniquement)",
  description:
    "Verifie le quota du plan, genere un mot de passe temporaire et l'envoie " +
    "par email.\n\n" +
    "L'employe devra changer ce mot de passe a sa premiere connexion. Le mot " +
    "de passe est aussi renvoye dans la reponse, pour transmission de vive " +
    "voix si l'employe n'a pas d'email consultable.",
  request: { body: S.inviteSchema },
  responses: { 201: S.userResponse },
});

router.patch(
  "/:id",
  authorizeRoles(SHOP_ROLES.ADMIN),
  validate({ params: idParam, body: S.updateUserSchema }),
  c.update
);
registerRoute({
  method: "patch", path: "/users/{id}", tags: ["Utilisateurs"], permissions: ["users"],
  summary: "Modifier un employe (role, permissions, gel, activation)",
  description:
    "Deux garde-fous : un admin ne peut pas modifier son propre role, et la " +
    "boutique doit conserver au moins un administrateur actif.\n\n" +
    "Geler ou desactiver un compte coupe ses sessions immediatement.",
  request: { params: idParam, body: S.updateUserSchema },
  responses: { 200: S.userResponse },
});

router.post(
  "/:id/reset-password",
  authorizeRoles(SHOP_ROLES.ADMIN),
  validate({ params: idParam }),
  c.resetPassword
);
registerRoute({
  method: "post", path: "/users/{id}/reset-password", tags: ["Utilisateurs"], permissions: ["users"],
  summary: "Reinitialiser le mot de passe d'un employe",
  description:
    "Genere un nouveau mot de passe temporaire, coupe les sessions en cours " +
    "et debloque un compte verrouille par tentatives echouees.",
  request: { params: idParam },
  responses: { 200: S.userResponse },
});

// ══ ROUTEUR ROLES PERSONNALISES ═══════════════════════════════════════
const roleRouter = express.Router();
roleRouter.use(requirePermission(PERMISSIONS.USERS));

roleRouter.get("/", c.listRoles);
registerRoute({
  method: "get", path: "/roles", tags: ["Utilisateurs"], permissions: ["users"],
  summary: "Lister les roles personnalises et les 14 permissions disponibles",
  responses: { 200: S.userResponse },
});

roleRouter.post("/", authorizeRoles(SHOP_ROLES.ADMIN), validate({ body: S.createRoleSchema }), c.createRole);
registerRoute({
  method: "post", path: "/roles", tags: ["Utilisateurs"], permissions: ["users"],
  summary: "Creer un role personnalise",
  description:
    "Compose librement les 14 permissions modulaires. Exemple : " +
    '"Chef de rayon" = produits + stock + inventaire, sans acces a la caisse ' +
    "ni a la tresorerie.",
  request: { body: S.createRoleSchema },
  responses: { 201: S.userResponse },
});

roleRouter.patch(
  "/:id",
  authorizeRoles(SHOP_ROLES.ADMIN),
  validate({ params: idParam, body: S.createRoleSchema.partial() }),
  c.updateRole
);
registerRoute({
  method: "patch", path: "/roles/{id}", tags: ["Utilisateurs"], permissions: ["users"],
  summary: "Modifier un role personnalise",
  description:
    "Les permissions des utilisateurs portant ce role sont mises a jour " +
    "immediatement, sans attendre leur reconnexion.",
  request: { params: idParam },
  responses: { 200: S.userResponse },
});

module.exports = { router, roleRouter };
