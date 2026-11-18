const { z } = require("zod");
const { safeText } = require("../../../../../core/common-schemas");
const { registerSchema } = require("../../../../../core/openapi");

const updateShopSettingsSchema = z.object({
  nom: safeText(120).min(2, "Le nom de la boutique doit comporter au moins 2 caractères").optional(),
  adresse: safeText(250).optional().nullable(),
  ville: safeText(80).optional().nullable(),
  pays: safeText(80).optional(),
  telephone: z
    .string()
    .trim()
    .max(30, "Numéro de téléphone trop long")
    .refine((v) => !v || /^\+?[0-9\s().-]{6,30}$/.test(v), "Numéro de téléphone invalide")
    .optional()
    .nullable(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Adresse e-mail invalide")
    .optional()
    .nullable(),
  rccm: safeText(80).optional().nullable(),
  devise: z
    .string()
    .trim()
    .default("XAF")
    .refine((d) => d === "XAF" || d.length <= 5, "Code devise invalide"),
  delaiPaiementClient: z.coerce
    .number()
    .int("Le délai de paiement client doit être un nombre entier")
    .min(0, "Le délai de paiement client ne peut pas être négatif")
    .max(365, "Le délai ne peut pas dépasser 365 jours")
    .optional(),
  delaiPaiementFournisseur: z.coerce
    .number()
    .int("Le délai de paiement fournisseur doit être un nombre entier")
    .min(0, "Le délai de paiement fournisseur ne peut pas être négatif")
    .max(365, "Le délai ne peut pas dépasser 365 jours")
    .optional(),
  tauxTva: z.coerce
    .number()
    .min(0, "Le taux de TVA ne peut pas être négatif")
    .max(100, "Le taux de TVA ne peut pas dépasser 100 %")
    .optional(),
  logoUrl: z
    .string()
    .trim()
    .url("L'URL du logo est invalide")
    .optional()
    .nullable(),
});

const shopSettingsResponse = registerSchema(
  "ShopSettingsResponse",
  z.object({
    id: z.string(),
    code: z.string().optional(),
    nom: z.string(),
    typeActivite: z.string().optional(),
    adresse: z.string().nullable().optional(),
    ville: z.string().nullable().optional(),
    pays: z.string().optional(),
    telephone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    rccm: z.string().nullable().optional(),
    devise: z.string().default("XAF"),
    delaiPaiementClient: z.number().default(30),
    delaiPaiementFournisseur: z.number().default(15),
    tauxTva: z.number().default(0),
    logoUrl: z.string().nullable().optional(),
    onboardingTermine: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
);

module.exports = {
  updateShopSettingsSchema,
  shopSettingsResponse,
};
