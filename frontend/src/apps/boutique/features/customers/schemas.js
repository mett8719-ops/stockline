import { z } from "zod";

const customerCategories = ["particulier", "revendeur", "entreprise"];

export const customerCategoryLabels = {
  particulier: "Particulier",
  revendeur: "Revendeur",
  entreprise: "Entreprise",
};

const customerName = z
  .string()
  .trim()
  .min(1, "Le nom est obligatoire.")
  .max(150, "Le nom ne peut pas dépasser 150 caractères.")
  .refine((value) => !/<[^>]*>/.test(value), "Les balises HTML ne sont pas autorisées.");

export const createCustomerSchema = z.object({
  nom: customerName,
  telephone: z
    .string()
    .trim()
    .max(20, "Le téléphone ne peut pas dépasser 20 caractères.")
    .refine(
      (value) => !value || /^\+?[0-9\s().-]{8,20}$/.test(value),
      "Saisissez un numéro de téléphone valide.",
    )
    .transform((value) => value.replace(/[\s().-]/g, "") || undefined)
    .optional(),
  email: z.preprocess(
    (value) => typeof value === "string" && !value.trim() ? undefined : value,
    z.string().trim().toLowerCase().email("Saisissez une adresse e-mail valide.").optional(),
  ),
  adresse: z
    .string()
    .trim()
    .max(250, "L’adresse ne peut pas dépasser 250 caractères.")
    .refine((value) => !value || !/<[^>]*>/.test(value), "Les balises HTML ne sont pas autorisées.")
    .optional()
    .transform((value) => value || undefined),
  notes: z
    .string()
    .trim()
    .max(500, "Les notes ne peuvent pas dépasser 500 caractères.")
    .refine((value) => !value || !/<[^>]*>/.test(value), "Les balises HTML ne sont pas autorisées.")
    .optional()
    .transform((value) => value || undefined),
  categorie: z.enum(customerCategories),
  plafondCredit: z
    .number()
    .finite("Le plafond de crédit doit être un nombre valide.")
    .nonnegative("Le plafond ne peut pas être négatif.")
    .transform((value) => Math.round(value * 100) / 100),
});

export function getCustomerFieldErrors(error) {
  return error.issues.reduce((errors, issue) => {
    const [field] = issue.path;
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
    return errors;
  }, {});
}
