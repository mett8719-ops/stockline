import apiClient from "@/core/api/client.js";
import { validateDocumentsResponse } from "./schemas.js";

export async function getDocuments({ page = 1, limit = 10, type, q } = {}) {
  const params = { page, limit };
  if (type) params.type = type;
  if (q) params.q = q;

  const response = await apiClient.get("/documents", { params });
  return validateDocumentsResponse(response.data?.data, response.data?.meta);
}
