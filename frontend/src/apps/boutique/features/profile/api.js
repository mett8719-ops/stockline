import apiClient from "@/core/api/client.js";

export async function changeOwnPassword(payload) {
  const { data } = await apiClient.post("/auth/change-password", payload);
  return data.data;
}
