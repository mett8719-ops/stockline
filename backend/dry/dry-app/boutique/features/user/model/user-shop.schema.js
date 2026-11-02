/**
 * Schemas Zod du module Utilisateurs & Droits (cote boutique).
 *
 * Ne pas confondre avec `auth.schema.js` : celui-ci concerne la GESTION des
 * employes par l'admin, pas l'authentification.
 */
const { z } = require("zod");
const {
  objectId, email, phone, safeText, permissionList,
} = require("../../../../../core/common-schemas");
const { registerSchema } = require("../../../../../core/openapi");
const { SHOP_ROLES } = require("../../../../../core/constants");

/** Invitation d'un employe par l'administrateur. */
const inviteSchema = z
  .object({
    nom: safeText(120).openapi({ example: "Amina Kasongo" }),
    email,
    telephone: phone.optional(),
    role: z
      .enum([
        SHOP_ROLES.CAISSIER,
        SHOP_ROLES.MAGASINIER,
        SHOP_ROLES.COMPTABLE,
        SHOP_ROLES.ADMIN,
      ])
      .default(SHOP_ROLES.CAISSIER),
    customRoleId: objectId.optional().openapi({
      description: "Si fourni, remplace le role predefini par un role sur mesure",
    }),
    permissions: permissionList.optional(),
  })
  .openapi("InviteEmployee");

const updateUserSchema = z
  .object({
    nom: safeText(120).optional(),
    telephone: phone.optional(),
    role: z.enum(Object.values(SHOP_ROLES)).optional(),
    customRoleId: objectId.nullable().optional(),
    permissions: permissionList.optional(),
    actif: z.boolean().optional(),
    gele: z.boolean().optional(),
    motifGel: safeText(200).optional(),
  })
  .openapi("UpdateEmployee");

/** Creation d'un role sur mesure. */
const createRoleSchema = z
  .object({
    nom: safeText(60).openapi({ example: "Chef de rayon" }),
    description: safeText(250).optional(),
    permissions: permissionList,
    couleur: z.string().max(20).optional(),
  })
  .openapi("CreateCustomRole");

const userResponse = registerSchema(
  "ShopUser",
  z.object({
    id: objectId,
    nom: z.string(),
    email: z.string(),
    role: z.string(),
    permissions: z.array(z.string()),
    actif: z.boolean(),
    gele: z.boolean(),
  })
);

module.exports = {
  inviteSchema, updateUserSchema, createRoleSchema, userResponse,
};
