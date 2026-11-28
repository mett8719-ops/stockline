function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`La réponse des ventes contient un montant invalide (${name}).`);
  }
}

function assertString(value, name, optional = false) {
  if (optional && (value == null || value === "")) {
    return;
  }

  if (typeof value !== "string") {
    throw new TypeError(`La réponse des ventes contient une valeur invalide (${name}).`);
  }
}

function assertDate(value, name, optional = false) {
  if (optional && (value == null || value === "")) {
    return;
  }

  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`La réponse des ventes contient une date invalide (${name}).`);
  }
}

function validateSaleBase(sale) {
  if (!isRecord(sale)) {
    throw new TypeError("Une vente de la liste est invalide.");
  }

  const saleId = sale._id ?? sale.id;
  if (typeof saleId !== "string") {
    throw new TypeError("Une vente doit posséder un identifiant valide.");
  }

  assertString(sale.reference, "reference");
  assertString(sale.statut, "statut");
  assertDate(sale.date, "date");
  assertNumber(sale.montantTotal, "montantTotal");

  if (sale.montantPaye !== undefined) {
    assertNumber(sale.montantPaye, "montantPaye");
  }

  if (sale.montantRemis !== undefined) {
    assertNumber(sale.montantRemis, "montantRemis");
  }

  if (sale.beneficeTotal !== undefined) {
    assertNumber(sale.beneficeTotal, "beneficeTotal");
  }

  if (sale.clientNom !== undefined) {
    assertString(sale.clientNom, "clientNom", true);
  }

  return sale;
}

export function validateSalesListResponse(data, meta) {
  if (!isRecord(data) || !Array.isArray(data.ventes)) {
    throw new TypeError("La réponse de la liste des ventes est invalide.");
  }

  if (!isRecord(data.totaux)) {
    throw new TypeError("La réponse des ventes n’a pas de totaux valides.");
  }

  assertNumber(data.totaux.chiffreAffaires, "chiffreAffaires");
  assertNumber(data.totaux.benefice, "benefice");
  assertNumber(data.totaux.nombreVentes, "nombreVentes");

  const ventes = data.ventes.map((sale) => validateSaleBase(sale));

  if (
    !isRecord(meta) ||
    !Number.isInteger(meta.page) ||
    !Number.isInteger(meta.limit) ||
    !Number.isInteger(meta.total) ||
    !Number.isInteger(meta.totalPages) ||
    meta.page < 1 ||
    meta.limit < 1 ||
    meta.total < 0 ||
    meta.totalPages < 1
  ) {
    throw new TypeError("Les informations de pagination des ventes sont invalides.");
  }

  return { ventes, totals: data.totaux, meta };
}

export function validateSaleDetail(sale) {
  const validatedSale = validateSaleBase(sale);

  if (!Array.isArray(validatedSale.lignes)) {
    throw new TypeError("Le détail d’une vente doit contenir des lignes valides.");
  }

  for (const line of validatedSale.lignes) {
    if (!isRecord(line)) {
      throw new TypeError("Une ligne de vente est invalide.");
    }

    assertString(line.produitNom, "produitNom");
    assertNumber(line.quantite, "quantite");
    assertNumber(line.prixUnitaire, "prixUnitaire");
    assertNumber(line.totalLigne, "totalLigne");
  }

  return validatedSale;
}
