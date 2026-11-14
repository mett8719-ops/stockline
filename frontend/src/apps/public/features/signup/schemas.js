import { z } from "zod";
import { isStrongPassword } from "../../components/password-rules.js";

export const businessTypes = [
  { value: "boutique_detail", label: "Boutique de détail" },
  { value: "depot_grossiste", label: "Dépôt / Grossiste" },
  { value: "supermarche", label: "Supermarché" },
  { value: "pharmacie", label: "Pharmacie" },
  { value: "quincaillerie", label: "Quincaillerie" },
  { value: "autre", label: "Autre activité" },
];

export const congoCities = [
  "Brazzaville",
  "Pointe-Noire",
  "Dolisie",
  "Nkayi",
  "Ouesso",
  "Impfondo",
  "Oyo",
  "Mossendjo",
  "Autre ville",
];

const textWithoutHtml = (maximum, label) =>
  z
    .string()
    .trim()
    .min(2, `${label} doit contenir au moins 2 caractères.`)
    .max(maximum, `${label} ne peut pas dépasser ${maximum} caractères.`)
    .refine((value) => !/<[^>]*>/.test(value), "Les balises HTML ne sont pas autorisées.");

export const shopSignupSchema = z.object({
  nom: textWithoutHtml(120, "Le nom de la boutique"),
  typeActivite: z.enum(
    businessTypes.map(({ value }) => value),
    { error: "Choisissez le type d’activité de la boutique." },
  ),
  ville: textWithoutHtml(80, "La ville"),
});

export const ownerSignupSchema = z.object({
  nomComplet: textWithoutHtml(120, "Le nom complet"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Saisissez une adresse email valide."),
  telephone: z
    .string()
    .trim()
    .max(20, "Le numéro de téléphone ne peut pas dépasser 20 caractères.")
    .refine(
      (value) => value === "" || /^\+?[0-9\s().-]{8,20}$/.test(value),
      "Saisissez un numéro valide, par exemple +242 06 123 45 67.",
    ),
  motDePasse: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(128, "Le mot de passe ne peut pas dépasser 128 caractères.")
    .refine(
      isStrongPassword,
      "Respectez les critères de sécurité affichés sous le champ.",
    ),
});

export function getFieldErrors(error) {
  return error.issues.reduce((errors, issue) => {
    const [field] = issue.path;

    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }

    return errors;
  }, {});
}
