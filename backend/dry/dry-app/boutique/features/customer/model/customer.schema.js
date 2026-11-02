/**
 * Schemas Zod des modules Clients ET Fournisseurs.
 *
 * Regroupes ici car les deux modules sont symetriques et partagent le meme
 * schema de versement (`recordPaymentSchema`).
 */
const { z } = require("zod");
const {
  objectId, money, phone, email, safeText, paginationQuery,
  positiveQuantity,
} = require("../../../../../core/common-schemas");
const { registerSchema } = require("../../../../../core/openapi");
const { PAYMENT_METHODS } = require("../../../../../core/constants");

// ══ CLIENTS ═══════════════════════════════════════════════════════════

const createCustomerSchema = z
  .object({
    nom: safeText(150).openapi({ example: "Hotel Metropol" }),
    telephone: phone.optional(),
    email: email.optional(),
    adresse: safeText(250).optional(),
    categorie: z
      .enum(["particulier", "revendeur", "entreprise"])
      .default("particulier"),
    plafondCredit: money.default(0).openapi({
      description: "0 = aucune limite de credit definie",
    }),
    notes: safeText(500).optional(),
  })
  .openapi("CreateCustomer");

const updateCustomerSchema = createCustomerSchema
  .partial()
  .extend({ actif: z.boolean().optional() });

const listCustomersQuerySchema = paginationQuery.extend({
  categorie: z.enum(["particulier", "revendeur", "entreprise"]).optional(),
  impayes: z.enum(["true", "false"]).optional().openapi({
    description: "true = uniquement les clients ayant un solde impaye",
  }),
});

/** Versement client OU paiement fournisseur — meme structure. */
const recordPaymentSchema = z
  .object({
    montant: money.refine((v) => v > 0, "Le montant doit etre superieur a zero"),
    modePaiement: z.enum(PAYMENT_METHODS).default("especes"),
    libelle: safeText(200).optional(),
    reference: z.string().max(80).optional(),
    documentId: objectId.optional().openapi({
      description: "Rattache le versement a une facture precise (soldee si couverte)",
    }),
  })
  .openapi("RecordPayment");

// ══ FOURNISSEURS ══════════════════════════════════════════════════════

const createSupplierSchema = z
  .object({
    nom: safeText(150).openapi({ example: "BRALIMA (Brasseries)" }),
    contactNom: safeText(120).optional().openapi({ example: "Directeur Commercial" }),
    telephone: phone.optional(),
    email: email.optional(),
    adresse: safeText(250).optional(),
    produitsHabituels: z.array(safeText(80)).max(30).default([]),
    notes: safeText(500).optional(),
  })
  .openapi("CreateSupplier");

const updateSupplierSchema = createSupplierSchema
  .partial()
  .extend({ actif: z.boolean().optional() });

/** Reception de marchandise. */
const createPurchaseSchema = z
  .object({
    lignes: z
      .array(
        z.object({
          produitId: objectId,
          quantite: positiveQuantity,
          prixAchat: money,
        })
      )
      .min(1, "La commande doit contenir au moins une ligne"),

    montantPaye: money.default(0).openapi({
      description:
        "Part reglee comptant. Le reste alimente automatiquement la dette fournisseur.",
    }),
    modePaiement: z.enum(PAYMENT_METHODS).optional(),
    notes: safeText(500).optional(),
  })
  .openapi("CreatePurchase");

// ══ REPONSES ══════════════════════════════════════════════════════════

const customerResponse = registerSchema(
  "Customer",
  z.object({
    id: objectId,
    nom: z.string(),
    telephone: z.string().nullable(),
    soldeCredit: z.number(),
    totalAchats: z.number(),
    aImpaye: z.boolean(),
  })
);

const supplierResponse = registerSchema(
  "Supplier",
  z.object({
    id: objectId,
    nom: z.string(),
    soldeDu: z.number(),
    totalAchats: z.number(),
    aDette: z.boolean(),
  })
);

module.exports = {
  createCustomerSchema, updateCustomerSchema, listCustomersQuerySchema,
  recordPaymentSchema,
  createSupplierSchema, updateSupplierSchema, createPurchaseSchema,
  customerResponse, supplierResponse,
};
