import apiClient from "@/core/api/client.js";
import { validateSaleDetail, validateSalesListResponse } from "./schemas.js";

const isSalePayload = (value) => value && typeof value === "object" && !Array.isArray(value);

export async function getSales({ page = 1, limit = 10, from, to, statut, q } = {}) {
  const params = { page, limit };

  if (from) params.from = from;
  if (to) params.to = to;
  if (statut) params.statut = statut;
  if (q) params.q = q;

  const response = await apiClient.get("/sales", { params });
  return validateSalesListResponse(response.data?.data, response.data?.meta);
}

export async function getSale(id) {
  const response = await apiClient.get(`/sales/${encodeURIComponent(id)}`);
  return validateSaleDetail(response.data?.data);
}

export async function cancelSale(id, motif) {
  const response = await apiClient.post(`/sales/${encodeURIComponent(id)}/cancel`, { motif });
  const salePayload = response.data?.data?.vente ?? response.data?.data;

  if (!isSalePayload(salePayload)) {
    throw new TypeError("La réponse d’annulation de vente est invalide.");
  }

  return validateSaleDetail(salePayload);
}
