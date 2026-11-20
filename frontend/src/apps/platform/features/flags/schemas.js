import { z } from "zod";

export const featureFlagSchema = z.object({
  cle: z.string().regex(/^[a-z0-9_]+$/, "La clé doit utiliser des minuscules et des underscores."),
  nom: z.string().trim().min(1, "Le nom du flag est obligatoire.").max(120),
  description: z.string().trim().max(500).optional().default(""),
  environnement: z.enum(["production", "staging"]),
  actif: z.boolean(),
  strategie: z.enum(["global", "plan", "beta", "pourcentage"]),
  plansCibles: z.array(z.string()),
  boutiquesCibles: z.array(z.string()),
  pourcentageDeploiement: z.number().min(0).max(100),
});
