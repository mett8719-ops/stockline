import apiClient from "@/core/api/client.js";

export async function fetchFeatureFlags({ signal } = {}) {
  const { data } = await apiClient.get("/platform/feature-flags", { signal });
  return data.data;
}

export async function upsertFeatureFlag(flag) {
  const { data } = await apiClient.put("/platform/feature-flags", flag);
  return data.data;
}
