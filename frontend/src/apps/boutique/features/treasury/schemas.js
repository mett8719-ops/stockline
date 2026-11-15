const PAYMENT_METHODS = new Set([
  "especes",
  "mobile_money",
  "carte",
  "virement",
  "credit",
]);

export function validateTreasuryTransaction(values) {
  const errors = {};

  if (!["recette", "depense"].includes(values.type)) {
    errors.type = "Sélectionnez le type d’opération.";
  }

  if (typeof values.libelle !== "string" || !values.libelle.trim()) {
    errors.libelle = "Le libellé est obligatoire.";
  } else if (values.libelle.trim().length > 200) {
    errors.libelle = "Le libellé ne peut pas dépasser 200 caractères.";
  }

  const amount = Number(values.montant);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.montant = "Saisissez un montant supérieur à zéro.";
  }

  if (!PAYMENT_METHODS.has(values.modePaiement)) {
    errors.modePaiement = "Sélectionnez un mode de paiement valide.";
  }

  if (
    values.categorie != null &&
    (typeof values.categorie !== "string" || values.categorie.length > 60)
  ) {
    errors.categorie = "La catégorie ne peut pas dépasser 60 caractères.";
  }

  return errors;
}

export function validateCashSessionAmount(value, { required = false } = {}) {
  if (typeof value !== "string" || value.trim() === "") {
    return required ? "Saisissez un montant." : "";
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return "Saisissez un montant positif ou nul.";
  }

  return "";
}
