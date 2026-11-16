import { z } from "zod";

export const inventoryCountSchema = z.object({
  produitId: z.string().min(1, "Produit invalide."),
  quantiteComptee: z
    .number()
    .finite("Saisissez une quantité valide.")
    .min(0, "La quantité ne peut pas être négative."),
});
