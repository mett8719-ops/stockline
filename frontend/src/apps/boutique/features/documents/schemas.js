function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertAmount(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`La réponse des documents contient un montant invalide (${name}).`);
  }
}

function assertDate(value, name, optional = false) {
  if (optional && (value === null || value === undefined || value === "")) {
    return;
  }

  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new TypeError(`La réponse des documents contient une date invalide (${name}).`);
  }
}

export function validateDocumentsResponse(data, meta) {
  if (!isRecord(data) || !Array.isArray(data.documents)) {
    throw new TypeError("La réponse de la liste des documents est invalide.");
  }

  const { indicateurs } = data;
  if (!isRecord(indicateurs)) {
    throw new TypeError("La réponse des documents ne contient pas d’indicateurs valides.");
  }

  assertAmount(indicateurs.totalFacture, "totalFacture");
  assertAmount(indicateurs.montantImpaye, "montantImpaye");
  assertAmount(indicateurs.devisEnCours, "devisEnCours");
  assertAmount(indicateurs.tauxEncaissement, "tauxEncaissement");

  if (
    indicateurs.devisEnCours < 0 ||
    indicateurs.tauxEncaissement < 0 ||
    indicateurs.tauxEncaissement > 100
  ) {
    throw new TypeError("Les indicateurs des documents contiennent une valeur hors limites.");
  }

  for (const document of data.documents) {
    if (
      !isRecord(document) ||
      typeof (document._id ?? document.id) !== "string" ||
      typeof document.numero !== "string" ||
      typeof document.type !== "string" ||
      typeof document.clientNom !== "string" ||
      typeof document.statut !== "string"
    ) {
      throw new TypeError("Un document de la liste est invalide.");
    }

    assertDate(document.dateEmission, "dateEmission");
    assertDate(document.dateEcheance, "dateEcheance", true);
    assertAmount(document.montantTotal, "montantTotal");
    assertAmount(document.montantRestant, "montantRestant");
  }

  if (
    !isRecord(meta) ||
    !Number.isInteger(meta.page) ||
    !Number.isInteger(meta.totalPages) ||
    !Number.isInteger(meta.total) ||
    meta.page < 1 ||
    meta.totalPages < 1 ||
    meta.total < 0
  ) {
    throw new TypeError("Les informations de pagination des documents sont invalides.");
  }

  return { documents: data.documents, indicateurs, meta };
}

export function validateDocumentDetail(document) {
  if (
    !isRecord(document) ||
    typeof (document._id ?? document.id) !== "string" ||
    typeof document.numero !== "string" ||
    !["devis", "facture", "recu", "bon_livraison"].includes(document.type) ||
    typeof document.clientNom !== "string" ||
    ![
      "brouillon",
      "en_attente",
      "paye",
      "en_retard",
      "accepte",
      "refuse",
      "expire",
      "annule",
    ].includes(document.statut) ||
    !Array.isArray(document.lignes)
  ) {
    throw new TypeError("La réponse du détail du document est invalide.");
  }

  assertDate(document.dateEmission, "dateEmission");
  assertDate(document.dateEcheance, "dateEcheance", true);
  assertDate(document.dateValidite, "dateValidite", true);
  assertDate(document.datePaiement, "datePaiement", true);

  for (const field of [
    "sousTotal",
    "montantTva",
    "remiseGlobale",
    "montantTotal",
    "montantPaye",
    "montantRestant",
  ]) {
    assertAmount(document[field], field);
  }

  for (const line of document.lignes) {
    if (
      !isRecord(line) ||
      typeof line.designation !== "string" ||
      typeof line.quantite !== "number" ||
      !Number.isFinite(line.quantite) ||
      typeof line.prixUnitaire !== "number" ||
      !Number.isFinite(line.prixUnitaire)
    ) {
      throw new TypeError("Une ligne du document est invalide.");
    }

    assertAmount(line.totalLigne, "totalLigne");
    if (line.tauxTva !== undefined) assertAmount(line.tauxTva, "tauxTva");
    if (line.remise !== undefined) assertAmount(line.remise, "remise");
  }

  if (
    document.documentSourceId != null &&
    typeof document.documentSourceId !== "string" &&
    !isRecord(document.documentSourceId)
  ) {
    throw new TypeError("Le lien vers le document source est invalide.");
  }

  return document;
}

export function validateDocumentConversion(result) {
  if (
    !isRecord(result) ||
    !isRecord(result.devis) ||
    typeof (result.devis.id ?? result.devis._id) !== "string" ||
    result.devis.statut !== "accepte"
  ) {
    throw new TypeError("La réponse de conversion du devis est invalide.");
  }

  validateDocumentDetail(result.facture);
  if (result.facture.type !== "facture") {
    throw new TypeError("La conversion du devis n’a pas généré une facture.");
  }

  return result;
}
