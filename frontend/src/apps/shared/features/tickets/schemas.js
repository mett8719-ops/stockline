import { z } from "zod";

export const ticketSchema = z.object({
  sujet: z.string().trim().min(1, "Le sujet est obligatoire.").max(200),
  description: z
    .string()
    .trim()
    .min(10, "La description doit contenir au moins 10 caractères.")
    .max(4000),
  categorie: z.enum(["technique", "facturation", "formation", "quota", "autre"]),
  priorite: z.enum(["basse", "normale", "haute", "urgente"]),
  niveau: z.enum(["interne", "plateforme"]).optional(),
});

export const ticketReplySchema = z.object({
  texte: z.string().trim().min(1, "Écris une réponse avant de l’envoyer.").max(4000),
});
