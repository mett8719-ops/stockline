import apiClient from "@/core/api/client.js";

export async function fetchPlatformPlans({ signal } = {}) {
  const { data } = await apiClient.get("/platform/plans", { signal });
  return data.data;
}

export async function fetchPlatformShops({
  page = 1,
  limit = 20,
  q = "",
  signal,
} = {}) {
  const params = { page, limit };
  if (q) params.q = q;

  const { data } = await apiClient.get("/platform/shops", { params, signal });
  return {
    shops: data.data.boutiques,
    pagination: data.meta,
  };
}

export async function updatePlatformPlanQuotas({ planId, quotas }) {
  const { data } = await apiClient.patch(`/platform/plans/${planId}`, {
    quotas,
  });
  return data.data;
}
