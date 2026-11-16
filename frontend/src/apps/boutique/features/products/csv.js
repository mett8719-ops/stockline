import Papa from "papaparse";

const csvColumns = [
  "nom",
  "sku",
  "codeBarre",
  "categorieNom",
  "unite",
  "prixAchat",
  "prixVente",
  "stockActuel",
  "seuilAlerte",
];

const columnAliases = {
  nom: ["nom", "name", "product", "productname"],
  sku: ["sku", "reference", "ref"],
  codeBarre: ["codebarre", "barcode"],
  categorieNom: ["categorienom", "categorie", "category", "categoryname"],
  unite: ["unite", "unit"],
  prixAchat: ["prixachat", "purchaseprice", "costprice"],
  prixVente: ["prixvente", "saleprice", "sellingprice"],
  stockInitial: ["stockinitial", "stockactuel", "initialstock", "currentstock", "stock"],
  seuilAlerte: ["seuilalerte", "stockminimum", "minimumstock", "alertthreshold"],
};

function escapeSpreadsheetFormula(value) {
  if (typeof value !== "string") return value;
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function normalizeHeader(header) {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseNonNegativeNumber(value, fieldLabel, line, errors, { required = false } = {}) {
  const normalized = String(value ?? "").trim().replace(/\s/g, "");

  if (!normalized) {
    if (!required) return 0;
    errors.push({ ligne: line, nom: "", raison: `Le champ « ${fieldLabel} » est requis.` });
    return null;
  }

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  let decimalValue = normalized;

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const groupingSeparator = decimalSeparator === "," ? "." : ",";
    decimalValue = normalized
      .replaceAll(groupingSeparator, "")
      .replace(decimalSeparator, ".");
  } else if (lastComma >= 0) {
    decimalValue = normalized.replace(",", ".");
  }

  const number = Number(decimalValue);

  if (!Number.isFinite(number) || number < 0) {
    errors.push({
      ligne: line,
      nom: "",
      raison: `Le champ « ${fieldLabel} » doit être un nombre positif ou nul.`,
    });
    return null;
  }

  return number;
}

function valueForRow(row, columns, target) {
  const header = columns.find((column) => columnAliases[target].includes(column));
  return header ? row[header] : "";
}

export function parseProductCsv(file) {
  return file.text().then((text) => {
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeHeader,
    });
    const parserErrors = parsed.errors.map((error) => ({
      ligne: (error.row ?? 0) + 2,
      nom: "",
      raison: `Erreur de lecture CSV : ${error.message}`,
    }));

    if (parserErrors.length > 0) {
      return { produits: [], erreurs: parserErrors, totalLignes: parsed.data.length };
    }

    const columns = parsed.meta.fields || [];
    const requiredHeaders = ["nom", "prixAchat", "prixVente"];
    const missingHeaders = requiredHeaders.filter(
      (required) =>
        !columns.some((column) => columnAliases[required].includes(column)),
    );

    if (missingHeaders.length > 0) {
      return {
        produits: [],
        erreurs: [
          {
            ligne: 1,
            nom: "",
            raison: `Colonnes obligatoires manquantes : ${missingHeaders.join(", ")}.`,
          },
        ],
        totalLignes: parsed.data.length,
      };
    }

    const produits = [];
    const erreurs = [];

    parsed.data.forEach((row, index) => {
      const ligne = index + 2;
      const nom = String(valueForRow(row, columns, "nom") ?? "").trim();
      const rowErrors = [];

      if (!nom) {
        rowErrors.push({ ligne, nom: "", raison: "Le nom du produit est obligatoire." });
      } else if (/<[^>]*>/.test(nom) || nom.length > 150) {
        rowErrors.push({
          ligne,
          nom,
          raison: "Le nom doit contenir au maximum 150 caractères et ne pas contenir de balises HTML.",
        });
      }

      const categorieNom = String(
        valueForRow(row, columns, "categorieNom") ?? "",
      ).trim();
      const unite = String(valueForRow(row, columns, "unite") ?? "").trim();

      if (categorieNom.length > 60 || /<[^>]*>/.test(categorieNom)) {
        rowErrors.push({
          ligne,
          nom,
          raison: "La catégorie doit contenir au maximum 60 caractères sans balises HTML.",
        });
      }

      if (unite.length > 20 || /<[^>]*>/.test(unite)) {
        rowErrors.push({
          ligne,
          nom,
          raison: "L’unité doit contenir au maximum 20 caractères sans balises HTML.",
        });
      }

      const prixAchat = parseNonNegativeNumber(
        valueForRow(row, columns, "prixAchat"),
        "prixAchat",
        ligne,
        rowErrors,
        { required: true },
      );
      const prixVente = parseNonNegativeNumber(
        valueForRow(row, columns, "prixVente"),
        "prixVente",
        ligne,
        rowErrors,
        { required: true },
      );
      const stockInitial = parseNonNegativeNumber(
        valueForRow(row, columns, "stockInitial"),
        "stockInitial",
        ligne,
        rowErrors,
      );
      const seuilAlerte = parseNonNegativeNumber(
        valueForRow(row, columns, "seuilAlerte"),
        "seuilAlerte",
        ligne,
        rowErrors,
      );

      if (prixAchat !== null && prixVente !== null && prixVente < prixAchat) {
        rowErrors.push({
          ligne,
          nom,
          raison: "Le prix de vente ne peut pas être inférieur au prix d’achat.",
        });
      }

      if (rowErrors.length > 0) {
        erreurs.push(...rowErrors.map((error) => ({ ...error, nom: error.nom || nom })));
        return;
      }

      const produit = {
        nom,
        prixAchat,
        prixVente,
        stockInitial,
        seuilAlerte,
      };

      for (const field of ["sku", "categorieNom", "unite"]) {
        const value = String(valueForRow(row, columns, field) ?? "").trim();
        if (value) produit[field] = value;
      }

      produits.push({
        ligne,
        produit,
        hasCodeBarre: Boolean(
          String(valueForRow(row, columns, "codeBarre") ?? "").trim(),
        ),
      });
    });

    return { produits, erreurs, totalLignes: parsed.data.length };
  });
}

export function serializeProductsCsv(products) {
  const rows = products.map((product) => ({
    nom: escapeSpreadsheetFormula(product.nom || ""),
    sku: escapeSpreadsheetFormula(product.sku || ""),
    codeBarre: escapeSpreadsheetFormula(product.codeBarre || ""),
    categorieNom: escapeSpreadsheetFormula(product.categorieNom || ""),
    unite: escapeSpreadsheetFormula(product.unite || ""),
    prixAchat: product.prixAchat ?? "",
    prixVente: product.prixVente ?? "",
    stockActuel: product.stockActuel ?? "",
    seuilAlerte: product.seuilAlerte ?? "",
  }));

  return `\uFEFF${Papa.unparse(rows, {
    columns: csvColumns,
    delimiter: ";",
    newline: "\r\n",
  })}`;
}

export function downloadProductsCsv(csv, date = new Date()) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `catalogue-produits-${date.toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
