/**
 * Schemas Zod du parcours d'inscription public en 4 etapes.
 * Ils correspondent exactement aux champs du formulaire :
 *   Etape 1 Boutique · Etape 2 Proprietaire · Etape 3 Plan · Etape 4 Recapitulatif
 */
const { z } = require("zod");
const {
  email, phone, strongPassword, objectId, safeText, paginationQuery,
} = require("../../../../../core/common-schemas");
const { registerSchema } = require("../../../../../core/openapi");
const {
  BUSINESS_TYPES, BILLING_CYCLE, SIGNUP_STATUS,
} = require("../../../../../core/constants");

/** Corps soumis a la validation finale du formulaire public. */
const createSignupRequestSchema = z
  .object({
    // ── Etape 1 : Boutique ────────────────────────────────────────────
    boutique: z.object({
      nom: safeText(120).openapi({ example: "Superette Mama Grace" }),
      typeActivite: z
        .enum(BUSINESS_TYPES)
        .openapi({ example: "supermarche" }),
      adresse: safeText(250).optional(),
      ville: safeText(80).openapi({ example: "Brazzaville" }),
    }),

    // ── Etape 2 : Proprietaire ────────────────────────────────────────
    proprietaire: z.object({
      nomComplet: safeText(120).openapi({ example: "Grace Mbuyi" }),
      email,
      telephone: phone.optional(),
      motDePasse: strongPassword,
    }),

    // ── Etape 3 : Plan & facturation ──────────────────────────────────
    abonnement: z.object({
      planId: objectId,
      cycle: z.enum(Object.values(BILLING_CYCLE)).default("monthly"),
      jourPrelevement: z.coerce.number().int().min(1).max(28).default(1),
    }),

    /**
     * `literal(true)` : la case DOIT etre cochee. Envoyer `false` declenche
     * un message d'erreur explicite plutot qu'un rejet silencieux.
     */
    cguAcceptees: z.literal(true, {
      errorMap: () => ({
        message: "Vous devez accepter les conditions generales d'utilisation",
      }),
    }),
  })
  .openapi("CreateSignupRequest");

/** Filtres de la file d'attente cote Super-Admin. */
const listSignupQuerySchema = paginationQuery.extend({
  statut: z.enum(Object.values(SIGNUP_STATUS)).optional(),
});

/** Validation d'une demande — le Super-Admin peut corriger le plan. */
const approveSchema = z
  .object({
    planId: objectId
      .optional()
      .openapi({ description: "Permet de corriger le plan avant validation" }),
    messageBienvenue: safeText(500).optional(),
  })
  .openapi("ApproveSignupRequest");

const rejectSchema = z
  .object({
    motif: z
      .string()
      .trim()
      .min(5, "Le motif doit etre explicite")
      .max(500)
      .openapi({ example: "Informations de contact non verifiables" }),
  })
  .openapi("RejectSignupRequest");

const requestInfoSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(10, "Precisez les informations attendues")
      .max(1000),
  })
  .openapi("RequestInfoSchema");

const signupResponse = registerSchema(
  "SignupRequest",
  z.object({
    id: objectId,
    boutique: z.any(),
    proprietaire: z.any(),
    abonnement: z.any(),
    statut: z.string(),
    createdAt: z.string(),
  })
);

module.exports = {
  createSignupRequestSchema,
  listSignupQuerySchema,
  approveSchema,
  rejectSchema,
  requestInfoSchema,
  signupResponse,
};
