function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertAmount(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`La réponse fournisseur contient un montant invalide (${field}).`);
  }
}

function assertOptionalDate(value, field) {
  if (value === null || value === undefined || value === "") return;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`La réponse fournisseur contient une date invalide (${field}).`);
  }
}

function assertOptionalText(value, field) {
  if (value !== null && value !== undefined && typeof value !== "string") {
    throw new TypeError(`La réponse fournisseur contient un texte invalide (${field}).`);
  }
}

function assertSupplier(supplier) {
  if (
    !isRecord(supplier) ||
    typeof (supplier._id ?? supplier.id) !== "string" ||
    typeof supplier.nom !== "string" ||
    typeof supplier.soldeDu !== "number" ||
    !Number.isFinite(supplier.soldeDu) ||
    typeof supplier.totalAchats !== "number" ||
    !Number.isFinite(supplier.totalAchats)
  ) {
    throw new TypeError("La réponse contient un fournisseur invalide.");
  }

  for (const field of ["contactNom", "telephone", "email", "adresse", "notes"]) {
    assertOptionalText(supplier[field], field);
  }
}

function assertPagination(meta) {
  if (
    !isRecord(meta) ||
    !Number.isInteger(meta.page) ||
    !Number.isInteger(meta.totalPages) ||
    !Number.isInteger(meta.total) ||
    meta.page < 1 ||
    meta.totalPages < 1 ||
    meta.total < 0
  ) {
    throw new TypeError("Les informations de pagination des fournisseurs sont invalides.");
  }
}

export function validateSupplierListResponse(data, meta) {
  if (!isRecord(data) || !Array.isArray(data.fournisseurs) || !isRecord(data.dettes)) {
    throw new TypeError("La réponse de la liste des fournisseurs est invalide.");
  }

  assertAmount(data.dettes.total, "dettes.total");
  if (!Number.isInteger(data.dettes.nombre) || data.dettes.nombre < 0) {
    throw new TypeError("La réponse contient un nombre de dettes invalide.");
  }

  data.fournisseurs.forEach(assertSupplier);
  assertPagination(meta);
  return { fournisseurs: data.fournisseurs, dettes: data.dettes, meta };
}

export function validateSupplierDetailResponse(supplier) {
  assertSupplier(supplier);

  if (
    !Array.isArray(supplier.historiqueCommandes) ||
    !Array.isArray(supplier.historiquePaiements) ||
    (supplier.produitsHabituels !== undefined && !Array.isArray(supplier.produitsHabituels))
  ) {
    throw new TypeError("La fiche fournisseur contient des historiques invalides.");
  }

  assertOptionalDate(supplier.derniereCommande, "derniereCommande");
  assertOptionalDate(supplier.createdAt, "createdAt");
  if (
    supplier.produitsHabituels?.some((product) => typeof product !== "string")
  ) {
    throw new TypeError("La fiche fournisseur contient un produit habituel invalide.");
  }

  for (const purchase of supplier.historiqueCommandes) {
    if (
      !isRecord(purchase) ||
      typeof (purchase._id ?? purchase.id) !== "string" ||
      !Array.isArray(purchase.lignes)
    ) {
      throw new TypeError("La fiche fournisseur contient une commande invalide.");
    }

    assertAmount(purchase.montantTotal, "commande.montantTotal");
    assertAmount(purchase.montantPaye, "commande.montantPaye");
    assertAmount(purchase.montantRestant, "commande.montantRestant");
    assertOptionalDate(purchase.dateCommande, "commande.dateCommande");
    assertOptionalDate(purchase.dateLivraison, "commande.dateLivraison");

    for (const line of purchase.lignes) {
      if (!isRecord(line)) {
        throw new TypeError("La fiche fournisseur contient une ligne de commande invalide.");
      }
      assertAmount(line.quantite, "ligne.quantite");
      assertAmount(line.prixAchat, "ligne.prixAchat");
      assertAmount(line.totalLigne, "ligne.totalLigne");
    }
  }

  for (const payment of supplier.historiquePaiements) {
    if (!isRecord(payment)) {
      throw new TypeError("La fiche fournisseur contient un paiement invalide.");
    }
    assertAmount(payment.montant, "paiement.montant");
    assertOptionalDate(payment.date, "paiement.date");
    assertOptionalText(payment.libelle, "paiement.libelle");
  }

  return supplier;
}
