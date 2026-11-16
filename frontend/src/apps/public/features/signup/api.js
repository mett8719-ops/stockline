import apiClient from "@/core/api/client.js";

export async function createSignupRequest(request) {
  const response = await apiClient.post("/public/signup", request, {
    skipAuthRefresh: true,
  });
  const result = response.data?.data;

  if (
    typeof result?.id !== "string" ||
    typeof result?.message !== "string" ||
    !Array.isArray(result?.prochainesEtapes) ||
    !result.prochainesEtapes.every((item) => typeof item === "string")
  ) {
    throw new TypeError("La réponse de confirmation d’inscription est invalide.");
  }

  return result;
}
