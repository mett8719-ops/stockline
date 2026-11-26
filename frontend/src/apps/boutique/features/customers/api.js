import apiClient from "@/core/api/client.js";

export async function fetchCustomers({ page, q, categorie, impayes, signal }) {
  const params = { page, limit: 10 };
  if (q) params.q = q;
  if (categorie) params.categorie = categorie;
  if (impayes) params.impayes = "true";

  const { data: response } = await apiClient.get("/customers", {
    params,
    signal,
  });
  const result = response?.data;
  const pagination = response?.meta;

  if (
    !Array.isArray(result?.clients) ||
    !Number.isInteger(pagination?.page) ||
    !Number.isInteger(pagination?.totalPages) ||
    !Number.isInteger(pagination?.total) ||
    !Number.isFinite(result?.creances?.total) ||
    !Number.isInteger(result?.creances?.nombre)
  ) {
    throw new TypeError("La réponse de la liste des clients est invalide.");
  }

  return { clients: result.clients, creances: result.creances, pagination };
}

export async function fetchCustomer(customerId, { signal } = {}) {
  const { data: response } = await apiClient.get(
    `/customers/${encodeURIComponent(customerId)}`,
    { signal },
  );
  const customer = response?.data;

  if (
    !customer ||
    typeof customer !== "object" ||
    typeof customer.nom !== "string" ||
    !Array.isArray(customer.historiqueAchats) ||
    !Array.isArray(customer.historiquePaiements) ||
    !Array.isArray(customer.facturesImpayees)
  ) {
    throw new TypeError("La réponse de la fiche client est invalide.");
  }

  return customer;
}

export async function createCustomer(customer) {
  const { data: response } = await apiClient.post("/customers", customer);
  const result = response?.data;

  if (!result || typeof result.nom !== "string") {
    throw new TypeError("La réponse de création du client est invalide.");
  }

  return result;
}

export async function recordCustomerPayment({ customerId, payment }) {
  const { data: response } = await apiClient.post(
    `/customers/${encodeURIComponent(customerId)}/payments`,
    payment,
  );
  const result = response?.data;

  if (
    !result?.versement ||
    typeof result.versement !== "object" ||
    !result.client ||
    typeof result.client.id !== "string" ||
    typeof result.client.nom !== "string" ||
    !Number.isFinite(result.client.soldeCredit)
  ) {
    throw new TypeError("La réponse d’enregistrement du versement est invalide.");
  }

  return result;
}
