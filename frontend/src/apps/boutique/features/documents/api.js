import apiClient from "@/core/api/client.js";
import {
  validateDocumentConversion,
  validateDocumentDetail,
  validateDocumentsResponse,
} from "./schemas.js";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function getDocuments({ page = 1, limit = 10, type, q } = {}) {
  const params = { page, limit };
  if (type) params.type = type;
  if (q) params.q = q;

  const response = await apiClient.get("/documents", { params });
  return validateDocumentsResponse(response.data?.data, response.data?.meta);
}

export async function searchDocumentCustomers(q) {
  const response = await apiClient.get("/customers", {
    params: { page: 1, limit: 8, q },
  });
  const customers = response.data?.data?.clients;

  if (
    !Array.isArray(customers) ||
    customers.some(
      (customer) =>
        !isRecord(customer) ||
        typeof (customer._id ?? customer.id) !== "string" ||
        typeof customer.nom !== "string",
    )
  ) {
    throw new TypeError("La réponse de recherche des clients est invalide.");
  }

  return customers;
}

export async function searchDocumentProducts(q) {
  const response = await apiClient.get("/products", {
    params: { page: 1, limit: 8, q },
  });
  const products = response.data?.data;

  if (
    !Array.isArray(products) ||
    products.some(
      (product) =>
        !isRecord(product) ||
        typeof (product._id ?? product.id) !== "string" ||
        typeof product.nom !== "string" ||
        typeof product.prixVente !== "number" ||
        !Number.isFinite(product.prixVente) ||
        (product.tauxTva !== undefined &&
          (typeof product.tauxTva !== "number" ||
            !Number.isFinite(product.tauxTva))),
    )
  ) {
    throw new TypeError("La réponse de recherche des produits est invalide.");
  }

  return products;
}

export async function createDocument(document) {
  const response = await apiClient.post("/documents", document);
  const createdDocument = response.data?.data;

  if (
    !isRecord(createdDocument) ||
    typeof (createdDocument._id ?? createdDocument.id) !== "string" ||
    typeof createdDocument.numero !== "string" ||
    createdDocument.type !== document.type ||
    typeof createdDocument.clientNom !== "string" ||
    !Number.isFinite(createdDocument.montantTotal)
  ) {
    throw new TypeError("La réponse de création du document est invalide.");
  }

  return createdDocument;
}

export async function getDocument(id) {
  const response = await apiClient.get(`/documents/${encodeURIComponent(id)}`);
  return validateDocumentDetail(response.data?.data);
}

export async function convertDocumentQuote(id) {
  const response = await apiClient.post(
    `/documents/${encodeURIComponent(id)}/convert`,
  );
  return validateDocumentConversion(response.data?.data);
}
