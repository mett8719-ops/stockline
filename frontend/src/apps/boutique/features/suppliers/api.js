import apiClient from "@/core/api/client.js";
import {
  validateSupplierDetailResponse,
  validateSupplierListResponse,
} from "./schemas.js";

export async function fetchSuppliers({ page, q, signal }) {
  const params = { page, limit: 10 };
  if (q) params.q = q;

  const { data: response } = await apiClient.get("/suppliers", {
    params,
    signal,
  });

  return validateSupplierListResponse(response?.data, response?.meta);
}

export async function fetchSupplier(supplierId, { signal } = {}) {
  const { data: response } = await apiClient.get(
    `/suppliers/${encodeURIComponent(supplierId)}`,
    { signal },
  );
  return validateSupplierDetailResponse(response?.data);
}
