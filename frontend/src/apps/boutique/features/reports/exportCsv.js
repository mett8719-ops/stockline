const salesTotalRows = [
  ["Chiffre d’affaires", "chiffreAffaires"],
  ["Bénéfice", "benefice"],
  ["Nombre de ventes", "nombreVentes"],
  ["Panier moyen", "panierMoyen"],
  ["Marge moyenne (%)", "margeMoyenne"],
];

function escapeCsvValue(value) {
  const source = String(value ?? "");
  const safeValue = /^[\s]*[=+\-@]/.test(source) ? `'${source}` : source;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function csv(rows) {
  return `\uFEFF${rows.map((row) => row.map(escapeCsvValue).join(";")).join("\r\n")}`;
}

export function buildSalesReportCsv(report) {
  if (
    !report ||
    !report.periode ||
    !report.totaux ||
    !Array.isArray(report.topProduits) ||
    !Array.isArray(report.parCaissier) ||
    !Array.isArray(report.parModePaiement)
  ) {
    throw new TypeError("Les données du rapport de ventes sont invalides.");
  }

  const rows = [
    ["Rapport des ventes"],
    ["Début", report.periode.debut],
    ["Fin", report.periode.fin],
    [],
    ["Indicateurs", "Valeur"],
    ...salesTotalRows.map(([label, key]) => [label, report.totaux[key]]),
    [],
    ["Comparatif", "Valeur"],
    ["Chiffre d’affaires période précédente", report.comparatif?.chiffreAffairesPrecedent],
    ["Évolution chiffre d’affaires (%)", report.comparatif?.evolutionChiffreAffaires],
    ["Évolution bénéfice (%)", report.comparatif?.evolutionBenefice],
    [],
    ["Produits les plus vendus"],
    ["Produit", "Quantité vendue", "Chiffre d’affaires", "Bénéfice"],
    ...report.topProduits.map((product) => [
      product.nom,
      product.quantiteVendue,
      product.chiffreAffaires,
      product.benefice,
    ]),
    [],
    ["Ventes par caissier"],
    ["Caissier", "Total", "Nombre de ventes"],
    ...report.parCaissier.map((cashier) => [cashier.nom, cashier.total, cashier.nombre]),
    [],
    ["Paiements par mode"],
    ["Mode", "Total encaissé", "Nombre de paiements"],
    ...report.parModePaiement.map((payment) => [
      payment._id,
      payment.total,
      payment.nombre,
    ]),
  ];

  return csv(rows);
}

export function buildStockReportCsv(report) {
  if (
    !report ||
    !report.valorisation ||
    !Array.isArray(report.parCategorie) ||
    !Array.isArray(report.alertes?.stockBas) ||
    !Array.isArray(report.alertes?.peremption) ||
    !Array.isArray(report.produitsDormants)
  ) {
    throw new TypeError("Les données du rapport de stock sont invalides.");
  }

  const rows = [
    ["Rapport du stock"],
    [],
    ["Valorisation", "Valeur"],
    ["Valeur d’achat", report.valorisation.valeurAchat],
    ["Valeur de vente estimée", report.valorisation.valeurVente],
    ["Marge potentielle", report.valorisation.margePotentielle],
    ["Références", report.valorisation.references],
    ["Unités en stock", report.valorisation.unitesTotales],
    [],
    ["Stock par catégorie"],
    ["Catégorie", "Valeur d’achat", "Références"],
    ...report.parCategorie.map((category) => [
      category._id,
      category.valeur,
      category.references,
    ]),
    [],
    ["Alertes de stock bas"],
    ["Produit", "Stock actuel", "Seuil d’alerte", "Unité", "Catégorie"],
    ...report.alertes.stockBas.map((product) => [
      product.nom,
      product.stockActuel,
      product.seuilAlerte,
      product.unite,
      product.categorieNom,
    ]),
    [],
    ["Produits proches de péremption"],
    ["Produit", "Date de péremption", "Stock actuel", "Unité"],
    ...report.alertes.peremption.map((product) => [
      product.nom,
      product.datePeremption,
      product.stockActuel,
      product.unite,
    ]),
    [],
    ["Produits dormants (sans vente depuis 30 jours)"],
    ["Produit", "Stock actuel", "Prix d’achat", "Unité"],
    ...report.produitsDormants.map((product) => [
      product.nom,
      product.stockActuel,
      product.prixAchat,
      product.unite,
    ]),
  ];

  return csv(rows);
}

export function downloadReportCsv(content, filename) {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("Le téléchargement du rapport est indisponible dans cet environnement.");
  }

  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

