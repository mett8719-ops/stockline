/**
 * Schemas Zod du module Authentification.
 *
 * RAPPEL DU PRINCIPE : ces schemas servent A LA FOIS a valider les requetes
 * entrantes ET a generer la documentation OpenAPI. Un seul schema ecrit, une
 * documentation qui ne peut pas se desynchroniser du code.
 *
 * La methode .openapi() ajoute exemples et descriptions, visibles directement
 * sur /api-docs.
 */
const { z } = require("zod");
const {
  email, phone, strongPassword, objectId,
} = require("../../../../../core/common-schemas");
const { registerSchema } = require("../../../../../core/openapi");

/** Connexion : accepte indifferemment un email ou un numero de telephone. */
const loginSchema = z
  .object({
    identifiant: z
      .string()
      .trim()
      .min(3, "Email ou telephone requis")
      .openapi({
        example: "directeur@boutique.cg",
        description: "Adresse email ou numero de telephone",
      }),
    motDePasse: z
      .string()
      .min(1, "Mot de passe requis")
      .openapi({ example: "MonMotDePasse123!" }),
  })
  .openapi("LoginRequest");

/**
 * Changement de mot de passe.
 * `motDePasseActuel` est optionnel : a la premiere connexion, l'utilisateur
 * vient de saisir son mot de passe temporaire pour se connecter, on ne le lui
 * redemande pas.
 */
const changePasswordSchema = z
  .object({
    motDePasseActuel: z
      .string()
      .min(1)
      .optional()
      .openapi({
        description:
          "Requis sauf a la premiere connexion (mot de passe temporaire)",
      }),
    nouveauMotDePasse: strongPassword,
    confirmation: z.string(),
  })
  .refine((d) => d.nouveauMotDePasse === d.confirmation, {
    message: "Les deux mots de passe ne correspondent pas",
    path: ["confirmation"],
  })
  .openapi("ChangePasswordRequest");

const forgotPasswordSchema = z.object({ email }).openapi("ForgotPasswordRequest");

const resetPasswordSchema = z
  .object({
    token: z.string().min(20),
    nouveauMotDePasse: strongPassword,
  })
  .openapi("ResetPasswordRequest");

/** Forme de la reponse apres une connexion reussie. */
const authResponseSchema = registerSchema(
  "AuthResponse",
  z.object({
    accessToken: z.string(),
    utilisateur: z.object({
      id: objectId,
      nom: z.string(),
      email: z.string(),
      role: z.string(),
      shopId: objectId.nullable(),
      permissions: z.array(z.string()),
      doitChangerMotDePasse: z.boolean(),
      aTermineVisiteGuidee: z.boolean(),
    }),
    boutique: z
      .object({
        id: objectId,
        nom: z.string(),
        code: z.string(),
        statut: z.string(),
        devise: z.string(),
        onboardingTermine: z.boolean(),
      })
      .nullable(),
  })
);

/** Reponse generique du module (profil, messages de confirmation). */
const messageResponseSchema = registerSchema(
  "AuthMessage",
  z.object({
    message: z.string().optional(),
    utilisateur: z.any().optional(),
    boutique: z.any().optional(),
  })
);

module.exports = {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  authResponseSchema,
  messageResponseSchema,
};
