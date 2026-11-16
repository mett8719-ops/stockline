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

/** Pays d'Afrique centrale et de l'Ouest pris en charge. */
export const africaCountries = [
  { value: "CG", label: "🇨🇬 Congo (Brazzaville)", dialCode: "+242" },
  { value: "CD", label: "🇨🇩 RDC (Kinshasa)",       dialCode: "+243" },
  { value: "CM", label: "🇨🇲 Cameroun",              dialCode: "+237" },
  { value: "GA", label: "🇬🇦 Gabon",                 dialCode: "+241" },
  { value: "CF", label: "🇨🇫 Centrafrique",          dialCode: "+236" },
  { value: "CI", label: "🇨🇮 Côte d'Ivoire",         dialCode: "+225" },
  { value: "SN", label: "🇸🇳 Sénégal",               dialCode: "+221" },
  { value: "ML", label: "🇲🇱 Mali",                  dialCode: "+223" },
  { value: "BF", label: "🇧🇫 Burkina Faso",          dialCode: "+226" },
  { value: "TG", label: "🇹🇬 Togo",                  dialCode: "+228" },
  { value: "BJ", label: "🇧🇯 Bénin",                 dialCode: "+229" },
  { value: "GN", label: "🇬🇳 Guinée",                dialCode: "+224" },
  { value: "GQ", label: "🇬🇶 Guinée Équatoriale",    dialCode: "+240" },
  { value: "TD", label: "🇹🇩 Tchad",                 dialCode: "+235" },
  { value: "AO", label: "🇦🇴 Angola",                dialCode: "+244" },
  { value: "MG", label: "🇲🇬 Madagascar",            dialCode: "+261" },
  { value: "OTHER", label: "🌍 Autre pays",           dialCode: ""    },
];

/** Opérateurs télécom du Congo Brazzaville avec leur préfixe réseau. */
export const congoOperators = [
  { label: "Airtel Congo",  prefix: "+242 06" },
  { label: "MTN Congo",     prefix: "+242 05" },
  { label: "Airtel Pro",    prefix: "+242 04" },
  { label: "Autre (+242)",  prefix: "+242"    },
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

/**
 * Capitalise la première lettre, laisse le reste intact.
 * Appliqué en temps réel sur les champs nom / ville / description.
 */
export function capitalizeFirst(value) {
  if (!value || value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Caractères autorisés dans les champs de texte (noms, villes, descriptions).
 *
 * ✅ Autorisé  : lettres latines + accents (À-ÿ, œ, Œ, æ, Æ), chiffres,
 *                espaces, tirets, apostrophes, virgules, points, parenthèses,
 *                esperluette (&), slash (/)
 *
 * ❌ Bloqué    : < > { } ; = $ ^ * ` ~ \ | @ % # ! ? " + [ ] (vecteurs
 *                d'injection HTML/SQL/XSS/template)
 */
const SAFE_TEXT_RE = /^[a-zA-ZÀ-ÿœŒæÆ0-9\s\-',.()&/]+$/;

/**
 * Validateur de base pour les champs texte libres.
 * Vérifie la longueur, l'absence de balises HTML et les caractères autorisés.
 */
const safeTextField = (maximum, label) =>
  z
    .string()
    .trim()
    .min(2, `${label} doit contenir au moins 2 caractères.`)
    .max(maximum, `${label} ne peut pas dépasser ${maximum} caractères.`)
    .refine(
      (v) => !/<[^>]*>/.test(v),
      "Les balises HTML ne sont pas autorisées.",
    )
    .refine(
      (v) => SAFE_TEXT_RE.test(v),
      `${label} contient des caractères non autorisés (< > { } ; = $ etc.).`,
    );

const countryValues = africaCountries.map(({ value }) => value);

export const shopSignupSchema = z
  .object({
    nom: safeTextField(120, "Le nom de la boutique"),

    typeActivite: z.enum(businessTypes.map(({ value }) => value), {
      error: "Choisissez le type d'activité de la boutique.",
    }),

    /**
     * Champ conditionnel : obligatoire uniquement si typeActivite === "autre".
     * La règle cross-champ est vérifiée dans le .refine() global ci-dessous.
     */
    autreActivite: z
      .string()
      .trim()
      .max(100, "La description ne peut pas dépasser 100 caractères.")
      .refine(
        (v) => !v || !/<[^>]*>/.test(v),
        "Les balises HTML ne sont pas autorisées.",
      )
      .refine(
        (v) => !v || SAFE_TEXT_RE.test(v),
        "La description contient des caractères non autorisés.",
      )
      .optional(),

    pays: z.enum(countryValues, {
      error: "Sélectionnez votre pays.",
    }),

    ville: safeTextField(80, "La ville"),
  })
  .refine(
    (data) =>
      !(
        data.typeActivite === "autre" &&
        (!data.autreActivite || data.autreActivite.trim().length < 2)
      ),
    {
      message: "Précisez votre type d'activité (au moins 2 caractères).",
      path: ["autreActivite"],
    },
  );

export const ownerSignupSchema = z.object({
  nomComplet: safeTextField(120, "Le nom complet"),

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
