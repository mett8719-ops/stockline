import apiClient from "@/core/api/client.js";

export async function completeGuidedTour() {
  const response = await apiClient.post("/auth/complete-tour");
  const result = response.data?.data;

  if (typeof result?.message !== "string") {
    throw new TypeError("La réponse de fin de visite guidée est invalide.");
  }

  return result;
}
