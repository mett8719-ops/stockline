/** Schemas Zod du module Tresorerie. */
const { z } = require("zod");
const {
  money, safeText, paginationQuery, dateRangeQuery, objectId,
} = require("../../../../../core/common-schemas");
const { registerSchema } = require("../../../../../core/openapi");
const { PAYMENT_METHODS } = require("../../../../../core/constants");

/** Saisie manuelle d'une recette ou d'une depense. */
const createTransactionSchema = z
  .object({
    type: z.enum(["recette", "depense"]),
    libelle: safeText(200).openapi({ example: "Loyer boutique" }),
    montant: money.refine((v) => v > 0, "Le montant doit etre superieur a zero"),
    modePaiement: z.enum(PAYMENT_METHODS).default("especes"),
    categorie: safeText(60).optional().openapi({
      example: "loyer",
      description: "marchandises, loyer, transport, salaires, divers...",
    }),
    notes: safeText(500).optional(),
  })
  .openapi("CreateCashTransaction");

const openSessionSchema = z
  .object({
    caisseNom: safeText(80).optional(),
    fondsOuverture: money.default(0).openapi({
      description: "Fonds de caisse present dans le tiroir a l'ouverture",
    }),
  })
  .openapi("OpenCashSession");

const closeSessionSchema = z
  .object({
    fondsComptes: money.openapi({
      description: "Montant physiquement compte dans le tiroir a la fermeture",
    }),
    notes: safeText(500).optional(),
  })
  .openapi("CloseCashSession");

const treasuryResponse = registerSchema(
  "TreasuryOverview",
  z.object({
    soldeCaisse: z.number(),
    periode: z.any(),
    journal: z.array(z.any()),
  })
);

module.exports = {
  createTransactionSchema, openSessionSchema, closeSessionSchema, treasuryResponse,
};
