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

/** Pays d'Afrique centrale et de l'Ouest pris en charge avec métadonnées téléphoniques. */
export const africaCountries = [
  { value: "CG", label: "🇨🇬 Congo (Brazzaville)", dialCode: "+242", minDigits: 9, maxDigits: 9, placeholder: "+242 06 123 45 67" },
  { value: "CD", label: "🇨🇩 RDC (Kinshasa)",       dialCode: "+243", minDigits: 9, maxDigits: 9, placeholder: "+243 81 234 56 78" },
  { value: "CM", label: "🇨🇲 Cameroun",              dialCode: "+237", minDigits: 9, maxDigits: 9, placeholder: "+237 6 71 23 45 67" },
  { value: "GA", label: "🇬🇦 Gabon",                 dialCode: "+241", minDigits: 7, maxDigits: 8, placeholder: "+241 77 12 34 56" },
  { value: "CF", label: "🇨🇫 Centrafrique",          dialCode: "+236", minDigits: 8, maxDigits: 8, placeholder: "+236 75 12 34 56" },
  { value: "CI", label: "🇨🇮 Côte d'Ivoire",         dialCode: "+225", minDigits: 10, maxDigits: 10, placeholder: "+225 07 12 34 56 78" },
  { value: "SN", label: "🇸🇳 Sénégal",               dialCode: "+221", minDigits: 9, maxDigits: 9, placeholder: "+221 77 123 45 67" },
  { value: "ML", label: "🇲🇱 Mali",                  dialCode: "+223", minDigits: 8, maxDigits: 8, placeholder: "+223 66 12 34 56" },
  { value: "BF", label: "🇧🇫 Burkina Faso",          dialCode: "+226", minDigits: 8, maxDigits: 8, placeholder: "+226 70 12 34 56" },
  { value: "TG", label: "🇹🇬 Togo",                  dialCode: "+228", minDigits: 8, maxDigits: 8, placeholder: "+228 90 12 34 56" },
  { value: "BJ", label: "🇧🇯 Bénin",                 dialCode: "+229", minDigits: 8, maxDigits: 8, placeholder: "+229 97 12 34 56" },
  { value: "GN", label: "🇬🇳 Guinée",                dialCode: "+224", minDigits: 9, maxDigits: 9, placeholder: "+224 620 12 34 56" },
  { value: "GQ", label: "🇬🇶 Guinée Équatoriale",    dialCode: "+240", minDigits: 9, maxDigits: 9, placeholder: "+240 222 12 34 56" },
  { value: "TD", label: "🇹🇩 Tchad",                 dialCode: "+235", minDigits: 8, maxDigits: 8, placeholder: "+235 66 12 34 56" },
  { value: "AO", label: "🇦🇴 Angola",                dialCode: "+244", minDigits: 9, maxDigits: 9, placeholder: "+244 923 12 34 56" },
  { value: "MG", label: "🇲🇬 Madagascar",            dialCode: "+261", minDigits: 9, maxDigits: 9, placeholder: "+261 34 12 345 67" },
  { value: "OTHER", label: "🌍 Autre pays",           dialCode: "",     minDigits: 6, maxDigits: 15, placeholder: "+33 6 12 34 56 78" },
];

/**
 * Opérateurs télécom du Congo Brazzaville avec leurs préfixes réels :
 * - MTN Congo : 06
 * - Airtel Congo : 05
 * - Airtel Pro / Spécial : 04
 */
export const congoOperators = [
  { label: "MTN Congo",     prefix: "+242 06" },
  { label: "Airtel Congo",  prefix: "+242 05" },
  { label: "Airtel Pro",    prefix: "+242 04" },
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
 * Capitalise la première lettre de chaque mot ou phrase.
 */
export function capitalizeFirst(value) {
  if (!value || value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Caractères autorisés dans les champs de texte.
 * Bloque strictement tout caractère d'injection (< > { } ; = $ ^ * ` ~ \ | @ % # ! ? " + [ ]).
 */
export const SAFE_TEXT_RE = /^[a-zA-ZÀ-ÿœŒæÆ0-9\s\-',.()&/]+$/;

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

/**
 * Nettoie et formate la saisie téléphonique en temps réel :
 * - Supprime strictement toutes les lettres et caractères bizarres.
 * - Autorise uniquement `+` en position 0, des chiffres et des espaces de lisibilité.
 * - Bloque la saisie au-delà de la longueur maximale du pays sélectionné.
 */
export function formatPhoneInput(rawInput, countryCode = "CG") {
  if (!rawInput) return "";

  // 1. Filtrer les caractères interdits (pas de lettres, pas de symboles bizarres)
  let val = rawInput.replace(/[^0-9+\s]/g, "");

  // Le '+' n'est autorisé qu'au début
  const hasLeadingPlus = val.startsWith("+");
  val = val.replace(/\+/g, "");
  if (hasLeadingPlus) {
    val = "+" + val;
  }

  const country = africaCountries.find((c) => c.value === countryCode) || africaCountries[0];
  const dial = country.dialCode; // ex: "+242"

  // Si c'est le Congo
  if (countryCode === "CG") {
    // Si commence par +242 ou 242
    const cleanDigits = val.replace(/\D/g, "");
    if (cleanDigits.startsWith("242")) {
      const nationalDigits = cleanDigits.slice(3, 3 + 9); // Max 9 chiffres après 242
      let formatted = "+242";
      if (nationalDigits.length > 0) formatted += " " + nationalDigits.slice(0, 2);
      if (nationalDigits.length > 2) formatted += " " + nationalDigits.slice(2, 5);
      if (nationalDigits.length > 5) formatted += " " + nationalDigits.slice(5, 7);
      if (nationalDigits.length > 7) formatted += " " + nationalDigits.slice(7, 9);
      return formatted;
    } else {
      // Saisie locale (ex: 06 694 19 99) : max 9 chiffres
      const localDigits = cleanDigits.slice(0, 9);
      let formatted = "";
      if (localDigits.length > 0) formatted += localDigits.slice(0, 2);
      if (localDigits.length > 2) formatted += " " + localDigits.slice(2, 5);
      if (localDigits.length > 5) formatted += " " + localDigits.slice(5, 7);
      if (localDigits.length > 7) formatted += " " + localDigits.slice(7, 9);
      return formatted;
    }
  }

  // Autres pays avec indicatif
  if (dial && val.startsWith(dial)) {
    const rawDigits = val.slice(dial.length).replace(/\D/g, "");
    const maxDigits = country.maxDigits || 10;
    const capped = rawDigits.slice(0, maxDigits);
    return `${dial} ${capped}`.trim();
  }

  // Plafonner les chiffres bruts
  const maxAllowedDigits = (country.maxDigits || 10) + 4;
  const digitsOnly = val.replace(/\D/g, "");
  if (digitsOnly.length > maxAllowedDigits) {
    val = (hasLeadingPlus ? "+" : "") + digitsOnly.slice(0, maxAllowedDigits);
  }

  return val;
}

/**
 * Valide la structure du numéro de téléphone en fonction du pays.
 */
export function isValidPhone(phone, countryCode = "CG") {
  if (!phone || phone.trim() === "") return true; // facultatif

  const trimmed = phone.trim();

  // Ne doit contenir aucune lettre
  if (/[a-zA-Z]/.test(trimmed)) return false;

  const cleanDigits = trimmed.replace(/\D/g, "");

  if (countryCode === "CG") {
    // Congo : 9 chiffres locaux (ex: 066941999) ou 12 chiffres avec 242 (242 066941999)
    if (cleanDigits.startsWith("242")) {
      const national = cleanDigits.slice(3);
      // Doit avoir 9 chiffres (commençant par 06, 05, 04, 02) ou 8 chiffres sans le zéro
      return (
        (national.length === 9 && /^(06|05|04|02)\d{7}$/.test(national)) ||
        (national.length === 8 && /^(6|5|4|2)\d{7}$/.test(national))
      );
    }
    // Saisie locale sans indicatif
    return (
      (cleanDigits.length === 9 && /^(06|05|04|02)\d{7}$/.test(cleanDigits)) ||
      (cleanDigits.length === 8 && /^(6|5|4|2)\d{7}$/.test(cleanDigits))
    );
  }

  const country = africaCountries.find((c) => c.value === countryCode);
  const min = country?.minDigits || 6;
  const max = (country?.maxDigits || 12) + 4; // marge pour indicatif
  return cleanDigits.length >= min && cleanDigits.length <= max;
}

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
      (v) => !v || !/[a-zA-Z]/.test(v),
      "Le numéro de téléphone ne doit pas contenir de lettres.",
    )
    .optional(),

  motDePasse: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(128, "Le mot de passe ne peut pas dépasser 128 caractères.")
    .refine(
      isStrongPassword,
      "Respectez les critères de sécurité affichés sous le champ.",
    ),
  pays: z.enum(countryValues, {
    error: "Sélectionnez votre pays.",
  }),
}).superRefine((owner, context) => {
  if (owner.telephone && !isValidPhone(owner.telephone, owner.pays)) {
    const countryLabel =
      africaCountries.find(({ value }) => value === owner.pays)?.label ??
      "de téléphone";

    context.addIssue({
      code: "custom",
      message: `Numéro ${countryLabel} invalide.`,
      path: ["telephone"],
    });
  }
});

export const signupRequestSchema = z.object({
  boutique: shopSignupSchema,
  proprietaire: z.object({
    nomComplet: safeTextField(120, "Le nom complet"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Saisissez une adresse email valide."),
    telephone: z
      .string()
      .max(20, "Le numéro de téléphone ne peut pas dépasser 20 caractères.")
      .optional(),
    motDePasse: z
      .string()
      .min(8)
      .max(128)
      .refine(
        isStrongPassword,
        "Le mot de passe ne respecte pas les critères requis.",
      ),
  }),
  abonnement: z.object({
    planId: z.string().regex(/^[0-9a-f]{24}$/i, "Choisissez un forfait valide."),
    cycle: z.enum(["monthly", "yearly"]),
    jourPrelevement: z.number().int().min(1).max(28),
  }),
  cguAcceptees: z.literal(true, {
    error: "Vous devez accepter les conditions générales d’utilisation.",
  }),
}).superRefine((request, context) => {
  const { telephone } = request.proprietaire;
  const countryCode = request.boutique.pays;

  if (telephone && !isValidPhone(telephone, countryCode)) {
    const countryLabel =
      africaCountries.find(({ value }) => value === countryCode)?.label ??
      "de téléphone";

    context.addIssue({
      code: "custom",
      message: `Numéro ${countryLabel} invalide.`,
      path: ["proprietaire", "telephone"],
    });
  }
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
