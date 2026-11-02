/** Schemas Zod du module Vente / Caisse (POS). */
const { z } = require("zod");
const {
  objectId, money, positiveQuantity, safeText, paginationQuery, dateRangeQuery,
} = require("../../../../../core/common-schemas");
const { registerSchema } = require("../../../../../core/openapi");
const { PAYMENT_METHODS } = require("../../../../../core/constants");

/** Une ligne du panier. */
const ligneVenteSchema = z.object({
  produitId: objectId,
  quantite: positiveQuantity.openapi({ example: 2 }),
  /**
   * Prix OPTIONNEL : s'il est absent, le prix du catalogue est applique.
   * S'il est fourni (prix negocie), il est verifie cote serveur — jamais
   * accepte tel quel.
   */
  prixUnitaire: money.optional(),
  remise: money.default(0),
});

/** Un mode de paiement utilise. Une vente peut en combiner plusieurs. */
const paiementSchema = z.object({
  mode: z.enum(PAYMENT_METHODS).openapi({ example: "especes" }),
  montant: money,
  reference: z.string().max(80).optional().openapi({
    description: "Reference de transaction Mobile Money le cas echeant",
  }),
});

const createSaleSchema = z
  .object({
    lignes: z.array(ligneVenteSchema).min(1, "Le panier ne peut pas etre vide"),
    clientId: objectId.nullable().optional(),
    paiements: z.array(paiementSchema).min(1, "Au moins un mode de paiement est requis"),
    remiseGlobale: money.default(0),

    montantRemis: money.default(0).openapi({
      description: "Argent effectivement remis par le client (calcul de la monnaie)",
    }),
    notes: safeText(300).optional(),

    // ── Mode hors-ligne ─────────────────────────────────────────────────
    clientOperationId: z.string().max(64).optional().openapi({
      description:
        "Identifiant genere par la caisse. Garantit qu'une vente synchronisee " +
        "plusieurs fois n'est enregistree qu'une seule fois.",
    }),
    dateVente: z.coerce.date().optional().openapi({
      description:
        "Date REELLE de la vente si elle a ete conclue hors ligne. Sans ce " +
        "champ, une vente de 14h synchronisee a 18h apparaitrait a 18h dans " +
        "les rapports.",
    }),
    creeeHorsLigne: z.boolean().default(false),
  })
  .openapi("CreateSale");

const cancelSaleSchema = z
  .object({
    motif: z
      .string()
      .trim()
      .min(5, "Le motif d'annulation est obligatoire")
      .max(300),
  })
  .openapi("CancelSale");

const listSalesQuerySchema = paginationQuery.merge(dateRangeQuery).extend({
  clientId: objectId.optional(),
  caissierId: objectId.optional(),
  statut: z.enum(["payee", "partielle", "credit", "annulee"]).optional(),
});

/** Synchronisation par lot des ventes realisees hors ligne. */
const syncSalesSchema = z
  .object({
    ventes: z.array(createSaleSchema).min(1).max(200),
  })
  .openapi("SyncOfflineSales");

const saleResponse = registerSchema(
  "Sale",
  z.object({
    id: objectId,
    reference: z.string(),
    montantTotal: z.number(),
    monnaieRendue: z.number(),
    beneficeTotal: z.number(),
    statut: z.string(),
    lignes: z.array(z.any()),
    date: z.string(),
  })
);

module.exports = {
  createSaleSchema, cancelSaleSchema, listSalesQuerySchema, syncSalesSchema, saleResponse,
};
