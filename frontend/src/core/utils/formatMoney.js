const formatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

export function formatMoney(amount) {
  if (
    (typeof amount !== "number" && typeof amount !== "string") ||
    (typeof amount === "string" && amount.trim() === "")
  ) {
    throw new TypeError("Le montant doit être un nombre ou une chaîne numérique.");
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    throw new RangeError("Le montant doit être un nombre fini.");
  }

  return `${formatter.format(numericAmount)} FCFA`;
}
