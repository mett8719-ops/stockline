/**
 * Schemas Zod reutilisables par tous les modules.
 * Centraliser ces briques evite que chaque developpeur valide un telephone ou
 * un montant a sa maniere.
 */
const { z } = require("zod");
const { PERMISSION_LIST } = require("./constants");

/** Identifiant MongoDB (24 caracteres hexadecimaux). */
const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Identifiant invalide");

/** Parametre de route `:id`. */
const idParam = z.object({ id: objectId });

/**
 * Numero de telephone. Calibre pour l'Afrique centrale.
 * Accepte "+242 06 123 45 67" comme "24206123456 7" et normalise en chiffres.
 */
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s().-]{8,20}$/, "Numero de telephone invalide")
  .transform((v) => v.replace(/[\s().-]/g, ""));

const email = z.string().trim().toLowerCase().email("Adresse email invalide");

/**
 * Mot de passe fort — aligne sur l'indicateur de force du formulaire
 * d'inscription (8 caracteres min., majuscule, chiffre, caractere special).
 */
const strongPassword = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caracteres")
  .max(128, "Mot de passe trop long")
  .regex(/[A-Z]/, "Le mot de passe doit contenir une majuscule")
  .regex(/[a-z]/, "Le mot de passe doit contenir une minuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre")
  .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir un caractere special");

/**
 * Montant monetaire : positif, arrondi a 2 decimales.
 * L'arrondi est SYSTEMATIQUE : sans lui, 0.1 + 0.2 donne 0.30000000000000004
 * en JavaScript, et les totaux de caisse finissent par diverger.
 */
const money = z.coerce
  .number()
  .nonnegative("Le montant ne peut pas etre negatif")
  .finite("Montant invalide")
  .transform((v) => Math.round(v * 100) / 100);

const quantity = z.coerce.number().finite("Quantite invalide");
const positiveQuantity = z.coerce
  .number()
  .positive("La quantite doit etre superieure a zero");

/**
 * Pagination standard, appliquee a TOUTES les listes.
 * `limit` est plafonne a 100 : empeche un client de demander 50 000 produits
 * d'un coup et de saturer le serveur.
 */
const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),               // ex. "-createdAt"
  q: z.string().trim().max(120).optional(),  // recherche instantanee
});

/** Filtre par plage de dates (rapports, historiques, journaux). */
const dateRangeQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** Liste de permissions (creation d'un role personnalise). */
const permissionList = z
  .array(z.enum(PERMISSION_LIST))
  .min(1, "Au moins une permission est requise");

/**
 * Texte court nettoye. Le refus des balises HTML est une protection XSS de
 * base : un nom de produit ne contient jamais de `<script>`.
 */
const safeText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => !/<[^>]*>/.test(v), "Les balises HTML ne sont pas autorisees");

module.exports = {
  objectId, idParam, phone, email, strongPassword,
  money, quantity, positiveQuantity,
  paginationQuery, dateRangeQuery, permissionList, safeText,
};
