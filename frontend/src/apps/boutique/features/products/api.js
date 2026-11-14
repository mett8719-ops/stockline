import apiClient from "@/core/api/client.js";

export async function fetchProducts({
  page,
  q,
  categorieId,
  statutStock,
  signal,
}) {
  const params = { page, limit: 10 };

  if (q) params.q = q;
  if (categorieId) params.categorieId = categorieId;
  if (statutStock) params.statutStock = statutStock;

  const { data } = await apiClient.get("/products", { params, signal });

  return {
    products: data.data,
    pagination: data.meta,
  };
}

export async function fetchCategories({ signal } = {}) {
  const { data } = await apiClient.get("/categories", { signal });
  return data.data;
}

export async function deactivateProduct(productId) {
  const { data } = await apiClient.delete(`/products/${productId}`);
  return data.data;
}

export async function createProduct(product) {
  const { data } = await apiClient.post("/products", product);
  return data.data;
}

export async function updateProduct({ productId, product }) {
  const { data } = await apiClient.patch(`/products/${productId}`, product);
  return data.data;
}
