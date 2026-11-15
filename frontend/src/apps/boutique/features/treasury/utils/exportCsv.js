const columns = [
  ["Date", "date"],
  ["Libellé", "libelle"],
  ["Catégorie", "categorie"],
  ["Mode de paiement", "modePaiement"],
  ["Débit", "debit"],
  ["Crédit", "credit"],
  ["Auteur", "auteur"],
];

function escapeCsvValue(value) {
  const source = String(value ?? "");
  const text = /^[\s]*[=+\-@]/.test(source) ? `'${source}` : source;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildTreasuryCsv(exportData) {
  if (!Array.isArray(exportData?.lignes) || !exportData?.totaux) {
    throw new TypeError("Les données d’export comptable sont invalides.");
  }

  const rows = [
    columns.map(([label]) => label),
    ...exportData.lignes.map((line) => columns.map(([, key]) => line[key])),
    ["", "", "", "Totaux", exportData.totaux.debit, exportData.totaux.credit, ""],
  ];

  return `\uFEFF${rows.map((row) => row.map(escapeCsvValue).join(";")).join("\r\n")}`;
}

export function downloadTreasuryCsv(exportData, date = new Date()) {
  const csv = buildTreasuryCsv(exportData);
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `stockline-tresorerie-${date.toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
