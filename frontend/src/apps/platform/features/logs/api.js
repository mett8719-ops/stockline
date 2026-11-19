import apiClient from "@/core/api/client.js";
import { logFiltersSchema } from "./schemas.js";

export async function fetchPlatformLogs(filters = {}, { signal } = {}) {
  const parsedFilters = logFiltersSchema.parse(filters);
  const params = {
    page: parsedFilters.page,
    limit: parsedFilters.limit,
  };

  if (parsedFilters.severite) params.severite = parsedFilters.severite;
  if (parsedFilters.action) params.action = parsedFilters.action;
  if (parsedFilters.shopId) params.shopId = parsedFilters.shopId;
  if (parsedFilters.from) params.from = parsedFilters.from;
  if (parsedFilters.to) params.to = parsedFilters.to;

  const { data } = await apiClient.get("/platform/logs", { params, signal });

  return {
    ...data.data,
    pagination: data.meta,
  };
}

export async function blockPlatformIp({ ip, motif }) {
  const { data } = await apiClient.post("/platform/security/block-ip", {
    ip,
    motif,
  });
  return data.data;
}
