function roundMoney(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function numberValue(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string" || value.trim() === "") return Number.NaN;
  return Number(value);
}

function previewNumber(value) {
  const parsed = numberValue(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeTotals(lines, globalDiscount = 0) {
  let subtotal = 0;
  let taxAmount = 0;

  const valuedLines = lines.map((line) => {
    const unitPrice = previewNumber(line.prixUnitaire);
    const quantity = previewNumber(line.quantite);
    const discount = previewNumber(line.remise || 0);
    const taxRate = previewNumber(line.tauxTva || 0);
    const lineTotal = roundMoney(unitPrice * quantity - discount);
    const lineTax = taxRate > 0 && taxRate <= 100
      ? roundMoney(lineTotal * (taxRate / (100 + taxRate)))
      : 0;

    subtotal = roundMoney(subtotal + lineTotal);
    taxAmount = roundMoney(taxAmount + lineTax);

    return { ...line, totalLigne: lineTotal, montantTva: lineTax };
  });

  const discount = previewNumber(globalDiscount || 0);
  return {
    lignes: valuedLines,
    sousTotal: subtotal,
    montantTva: taxAmount,
    remiseGlobale: discount,
    montantTotal: roundMoney(subtotal - discount),
  };
}

export function validateDocumentDraft(values) {
  const errors = {};

  if (!["devis", "facture"].includes(values.type)) {
    errors.type = "Choisissez un devis ou une facture.";
  }

  if (!values.clientId && !values.clientNom?.trim()) {
    errors.client = "Sélectionnez un client ou saisissez son nom.";
  } else if (values.clientNom?.trim().length > 150) {
    errors.client = "Le nom du client ne peut pas dépasser 150 caractères.";
  } else if (/<[^>]*>/.test(values.clientNom ?? "")) {
    errors.client = "Les balises HTML ne sont pas autorisées dans le nom du client.";
  }

  if (!Array.isArray(values.lignes) || values.lignes.length === 0) {
    errors.lignes = "Ajoutez au moins un produit ou une prestation.";
  } else {
    values.lignes.forEach((line, index) => {
      const prefix = `lignes.${index}`;
      if (typeof line.designation !== "string" || !line.designation.trim()) {
        errors[`${prefix}.designation`] = "La désignation est obligatoire.";
      } else if (line.designation.trim().length > 200) {
        errors[`${prefix}.designation`] = "La désignation est limitée à 200 caractères.";
      } else if (/<[^>]*>/.test(line.designation)) {
        errors[`${prefix}.designation`] = "Les balises HTML ne sont pas autorisées.";
      }

      const quantity = numberValue(line.quantite);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        errors[`${prefix}.quantite`] = "Saisissez une quantité supérieure à zéro.";
      }

      const unitPrice = numberValue(line.prixUnitaire);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        errors[`${prefix}.prixUnitaire`] = "Saisissez un prix positif ou nul.";
      }
      if (
        Number.isFinite(unitPrice) &&
        Number.isFinite(quantity) &&
        !Number.isFinite(unitPrice * quantity)
      ) {
        errors[`${prefix}.prixUnitaire`] = "Le montant de cette ligne est trop élevé.";
      }

      const taxRate = numberValue(line.tauxTva || 0);
      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
        errors[`${prefix}.tauxTva`] = "La TVA doit être comprise entre 0 et 100 %.";
      }

      const discount = numberValue(line.remise || 0);
      if (
        !Number.isFinite(discount) ||
        discount < 0 ||
        (Number.isFinite(unitPrice) &&
          Number.isFinite(quantity) &&
          discount > unitPrice * quantity)
      ) {
        errors[`${prefix}.remise`] = "La remise doit être positive et ne peut dépasser le montant de la ligne.";
      }
    });
  }

  const totals = computeTotals(values.lignes ?? [], values.remiseGlobale || 0);
  const globalDiscount = numberValue(values.remiseGlobale || 0);
  if (
    !Number.isFinite(globalDiscount) ||
    globalDiscount < 0 ||
    globalDiscount > totals.sousTotal
  ) {
    errors.remiseGlobale = "La remise globale ne peut pas dépasser le sous-total.";
  }

  if (values.dateEmission && !Number.isFinite(Date.parse(values.dateEmission))) {
    errors.dateEmission = "Saisissez une date d’émission valide.";
  }

  if (values.dateEcheance && !Number.isFinite(Date.parse(values.dateEcheance))) {
    errors.dateEcheance = "Saisissez une date d’échéance valide.";
  } else if (
    values.dateEmission &&
    values.dateEcheance &&
    Date.parse(values.dateEcheance) < Date.parse(values.dateEmission)
  ) {
    errors.dateEcheance = "L’échéance ne peut pas précéder la date d’émission.";
  }

  if (typeof values.notes !== "string" || values.notes.length > 1000) {
    errors.notes = "Les notes ne peuvent pas dépasser 1 000 caractères.";
  } else if (/<[^>]*>/.test(values.notes)) {
    errors.notes = "Les balises HTML ne sont pas autorisées dans les notes.";
  }

  return errors;
}
