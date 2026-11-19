import { z } from "zod";

export const logFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  severite: z.enum(["", "info", "moyenne", "haute"]).default(""),
  action: z.string().trim().max(60).default(""),
  shopId: z
    .union([z.literal(""), z.string().regex(/^[0-9a-fA-F]{24}$/)])
    .default(""),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const blockPlatformIpSchema = z.object({
  ip: z.string().trim().min(1, "L’adresse IP est obligatoire.").max(45),
  motif: z.string().trim().max(500).optional().default(""),
});
