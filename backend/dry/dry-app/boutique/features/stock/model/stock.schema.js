/** Schemas Zod du module Stock & Mouvements. */
const { z } = require("zod");
const {
  objectId, safeText, paginationQuery, positiveQuantity, quantity, dateRangeQuery,
} = require("../../../../../core/common-schemas");
const { registerSchema } = require("../../../../../core/openapi");
const { STOCK_MOVEMENT_TYPES } = require("../../../../../core/constants");

const createMovementSchema = z
  .object({
    produitId: objectId,
    type: z.enum([
      STOCK_MOVEMENT_TYPES.IN,      // entree
      STOCK_MOVEMENT_TYPES.OUT,     // sortie
      STOCK_MOVEMENT_TYPES.ADJUST,  // ajustement
    ]),
    quantite: positiveQuantity.openapi({ example: 20 }),

    quantiteCible: quantity.optional().openapi({
      description:
        "Uniquement pour un ajustement : stock FINAL souhaite (et non la variation)",
    }),

    raison: safeText(200).openapi({ example: "Livraison fournisseur" }),

    clientOperationId: z.string().max(64).optional().openapi({
      description:
        "Identifiant genere par le client. Garantit qu'un mouvement " +
        "synchronise deux fois n'est enregistre qu'une seule fois.",
    }),
  })
  .openapi("CreateStockMovement");

const listMovementsQuerySchema = paginationQuery.merge(dateRangeQuery).extend({
  produitId: objectId.optional(),
  type: z.enum(Object.values(STOCK_MOVEMENT_TYPES)).optional(),
});

const movementResponse = registerSchema(
  "StockMovement",
  z.object({
    id: objectId,
    produitNom: z.string(),
    type: z.string(),
    quantite: z.number(),
    stockAvant: z.number(),
    stockApres: z.number(),
    raison: z.string(),
    auteurNom: z.string(),
    createdAt: z.string(),
  })
);

module.exports = {
  createMovementSchema, listMovementsQuerySchema, movementResponse,
};
