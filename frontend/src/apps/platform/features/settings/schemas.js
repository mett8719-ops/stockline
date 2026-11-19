import { z } from "zod";

export const generalSettingsSchema = z.object({
  nomPlateforme: z.string().trim().min(1, "Le nom de la plateforme est obligatoire.").max(120),
  urlPrincipale: z.string().url("Saisis une URL valide."),
  emailSupport: z.string().email("Saisis une adresse email valide."),
  emailFacturation: z.string().email("Saisis une adresse email valide."),
  deviseParDefaut: z.string().min(1).max(5),
  fuseauHoraire: z.string().min(1).max(60),
});

export const emailSettingsSchema = z.object({
  serveurSmtp: z.string().max(120),
  portSmtp: z.number().int().min(1).max(65535),
  expediteurParDefaut: z.string().max(150),
  emailBienvenue: z.boolean(),
  emailRappelPaiement: z.boolean(),
  emailSuspension: z.boolean(),
  alertesSysteme: z.boolean(),
});

export const planQuotasSchema = z.object({
  boutiques: z.number().int().min(-1),
  produits: z.number().int().min(-1),
  utilisateurs: z.number().int().min(-1),
  stockageMo: z.number().int().min(-1),
});
