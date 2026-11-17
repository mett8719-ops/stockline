import apiClient from "@/core/api/client.js";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateSalesReport(data) {
  if (
    !isRecord(data) ||
    !isRecord(data.periode) ||
    !isRecord(data.totaux) ||
    !isRecord(data.comparatif) ||
    !Array.isArray(data.topProduits) ||
    !Array.isArray(data.parCaissier) ||
    !Array.isArray(data.parModePaiement)
  ) {
    throw new TypeError("La réponse du rapport de ventes est invalide.");
  }

  for (const field of ["chiffreAffaires", "benefice", "nombreVentes", "panierMoyen", "margeMoyenne"]) {
    if (typeof data.totaux[field] !== "number" || !Number.isFinite(data.totaux[field])) {
      throw new TypeError(`Le rapport de ventes contient une valeur invalide (${field}).`);
    }
  }

  return data;
}

function validateStockReport(data) {
  if (
    !isRecord(data) ||
    !isRecord(data.valorisation) ||
    !Array.isArray(data.parCategorie) ||
    !isRecord(data.alertes) ||
    !Array.isArray(data.alertes.stockBas) ||
    !Array.isArray(data.alertes.peremption) ||
    !Array.isArray(data.produitsDormants)
  ) {
    throw new TypeError("La réponse du rapport de stock est invalide.");
  }

  for (const field of ["valeurAchat", "valeurVente", "margePotentielle", "references", "unitesTotales"]) {
    if (typeof data.valorisation[field] !== "number" || !Number.isFinite(data.valorisation[field])) {
      throw new TypeError(`Le rapport de stock contient une valeur invalide (${field}).`);
    }
  }

  return data;
}

export async function getSalesReport({ from, to }) {
  const response = await apiClient.get("/reports/sales", {
    params: { from, to },
  });
  return validateSalesReport(response.data?.data);
}

export async function getStockReport() {
  const response = await apiClient.get("/reports/stock");
  return validateStockReport(response.data?.data);
}
