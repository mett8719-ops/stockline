import apiClient from "@/core/api/client.js";

export async function fetchInventories({ page = 1, signal } = {}) {
  const { data } = await apiClient.get("/inventories", {
    params: { page, limit: 10 },
    signal,
  });

  return {
    ...data.data,
    pagination: data.meta,
  };
}

export async function fetchInventory(inventoryId, { signal } = {}) {
  const { data } = await apiClient.get(`/inventories/${inventoryId}`, {
    signal,
  });
  return data.data;
}

export async function startInventory() {
  const { data } = await apiClient.post("/inventories");
  return data.data;
}

export async function recordInventoryCount({
  inventoryId,
  produitId,
  quantiteComptee,
}) {
  const { data } = await apiClient.patch(
    `/inventories/${inventoryId}/count`,
    { produitId, quantiteComptee },
  );
  return data.data;
}

export async function closeInventory(inventoryId) {
  const { data } = await apiClient.post(
    `/inventories/${inventoryId}/close`,
  );
  return data.data;
}
