import apiClient from "@/core/api/client.js";

export async function fetchStockMovements({
  page = 1,
  q = "",
  type = "",
  signal,
} = {}) {
  const params = { page, limit: 10 };
  if (q) params.q = q;
  if (type) params.type = type;

  const { data } = await apiClient.get("/stock/movements", { params, signal });

  return {
    movements: data.data,
    pagination: data.meta,
  };
}

export async function fetchStockAlerts({ signal } = {}) {
  const { data } = await apiClient.get("/stock/alerts", { signal });
  return data.data;
}

export async function fetchStockProducts({ signal } = {}) {
  const { data } = await apiClient.get("/products", {
    params: { page: 1, limit: 100 },
    signal,
  });
  return data.data;
}

export async function createStockMovement(movement) {
  const { data } = await apiClient.post("/stock/movements", movement);
  return data.data;
}
