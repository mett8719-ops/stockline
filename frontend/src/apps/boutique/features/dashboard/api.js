import apiClient from "@/core/api/client.js";

export async function fetchDashboard({ signal } = {}) {
  const { data } = await apiClient.get("/reports/dashboard", { signal });
  return data.data;
}
