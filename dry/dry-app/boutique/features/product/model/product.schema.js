/**
 * Schemas Zod du module Produits & Catalogue.
 *
 * POINT IMPORTANT : le schema de mise a jour ne contient PAS `stockActuel`.
 * C'est volontaire — le stock ne se modifie que par un mouvement de stock,
 * jamais par une modification directe du produit. Un champ envoye malgre tout
 * serait simplement ignore par Zod.
 */
const { z } = require("zod");
const {
  money, objectId, safeText, paginationQuery, quantity,
} = require("../../../../../core/common-schemas");
const { registerSchema } = require("../../../../../core/openapi");

const createProductSchema = z
  .object({
    nom: safeText(150).openapi({ example: "Riz local 25kg" }),
    sku: z.string().trim().toUpperCase().max(40).optional(),
    codeBarre: z.string().trim().max(60).optional(),

    // Soit un identifiant existant, soit un nom (la categorie sera creee)
    categorieId: objectId.optional(),
    categorieNom: safeText(60).optional(),

    unite: safeText(20).default("piece").openapi({ example: "sac" }),

    prixAchat: money.openapi({ example: 12000 }),
    prixVente: money.openapi({ example: 15000 }),
    tauxTva: z.coerce.number().min(0).max(100).default(0),

    stockInitial: quantity.default(0).openapi({
      description: "Genere automatiquement un mouvement d'entree trace",
    }),
    seuilAlerte: quantity.min(0).default(0).openapi({ example: 10 }),
    stockMax: quantity.min(0).optional(),

    photoUrl: z.string().url().optional(),
    datePeremption: z.coerce.date().optional(),
    fournisseurId: objectId.optional(),
  })
  /**
   * Regle metier : vendre en dessous du prix d'achat est presque toujours une
   * erreur de saisie. On la bloque a la creation, quitte a la debloquer plus
   * tard si un cas legitime se presente (destockage, promotion).
   */
  .refine((d) => d.prixVente >= d.prixAchat, {
    message: "Le prix de vente ne peut pas etre inferieur au prix d'achat",
    path: ["prixVente"],
  })
  .openapi("CreateProduct");

/** Mise a jour : tous les champs optionnels, sans le stock. */
const updateProductSchema = z
  .object({
    nom: safeText(150).optional(),
    sku: z.string().trim().toUpperCase().max(40).optional(),
    codeBarre: z.string().trim().max(60).optional(),
    categorieId: objectId.optional(),
    categorieNom: safeText(60).optional(),
    unite: safeText(20).optional(),
    prixAchat: money.optional(),
    prixVente: money.optional(),
    tauxTva: z.coerce.number().min(0).max(100).optional(),
    seuilAlerte: quantity.min(0).optional(),
    stockMax: quantity.min(0).optional(),
    photoUrl: z.string().url().optional(),
    datePeremption: z.coerce.date().nullable().optional(),
    fournisseurId: objectId.nullable().optional(),
    actif: z.boolean().optional(),
  })
  .openapi("UpdateProduct");

/** Filtres de la liste catalogue et de la grille POS. */
const listProductsQuerySchema = paginationQuery.extend({
  categorieId: objectId.optional(),
  statutStock: z.enum(["en_stock", "stock_bas", "rupture"]).optional(),
  actif: z.enum(["true", "false"]).optional(),
});

/** Import en masse : le frontend envoie le fichier Excel/CSV deja parse. */
const importProductsSchema = z
  .object({
    produits: z
      .array(
        z.object({
          nom: safeText(150),
          sku: z.string().trim().optional(),
          categorieNom: safeText(60).optional(),
          unite: safeText(20).optional(),
          prixAchat: money,
          prixVente: money,
          stockInitial: quantity.default(0),
          seuilAlerte: quantity.default(0),
        })
      )
      .min(1, "Le fichier ne contient aucune ligne")
      // Plafond : evite qu'un fichier de 50 000 lignes bloque le serveur
      .max(1000, "Maximum 1000 produits par import"),
  })
  .openapi("ImportProducts");

/** Creation d'une categorie. */
const createCategorySchema = z
  .object({
    nom: safeText(60).openapi({ example: "Cereales" }),
    couleur: z.string().max(20).optional(),
    ordre: z.coerce.number().int().optional(),
  })
  .openapi("CreateCategory");

const productResponse = registerSchema(
  "Product",
  z.object({
    id: objectId,
    nom: z.string(),
    sku: z.string().nullable(),
    prixAchat: z.number(),
    prixVente: z.number(),
    marge: z.number(),
    margePourcent: z.number(),
    stockActuel: z.number(),
    statutStock: z.string(),
  })
);

module.exports = {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  importProductsSchema,
  createCategorySchema,
  productResponse,
};
