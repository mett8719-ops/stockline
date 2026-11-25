import { z } from "zod";

export const paymentModes = [
  { value: "especes", label: "Espèces" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "carte", label: "Carte bancaire" },
  { value: "virement", label: "Virement" },
];

export function createPaymentSchema(maxAmount) {
  return z.object({
    montant: z
      .number()
      .finite("Saisissez un montant valide.")
      .max(Math.round(maxAmount * 100) / 100, "Le montant ne peut pas dépasser le solde dû.")
      .transform((value) => Math.round(value * 100) / 100)
      .refine((value) => value > 0, "Le montant doit être supérieur à zéro."),
    modePaiement: z.enum(paymentModes.map(({ value }) => value)),
  });
}

export function getPaymentFieldErrors(error) {
  return error.issues.reduce((errors, issue) => {
    const [field] = issue.path;
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
    return errors;
  }, {});
}
