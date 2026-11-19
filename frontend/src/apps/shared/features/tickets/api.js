import apiClient from "@/core/api/client.js";

export async function fetchTickets({
  page = 1,
  limit = 10,
  q = "",
  statut = "",
  signal,
} = {}) {
  const params = { page, limit };
  if (q) params.q = q;
  if (statut) params.statut = statut;

  const { data } = await apiClient.get("/tickets", { params, signal });

  return {
    tickets: data.data.tickets,
    compteurs: data.data.compteurs,
    avertissementConfidentialite: data.data.avertissementConfidentialite,
    pagination: data.meta,
  };
}

export async function fetchTicket(ticketId, { signal } = {}) {
  const { data } = await apiClient.get(`/tickets/${ticketId}`, { signal });
  return data.data;
}

export async function createTicket(ticket) {
  const { data } = await apiClient.post("/tickets", ticket);
  return data.data;
}

export async function replyToTicket({ ticketId, texte }) {
  const { data } = await apiClient.post(`/tickets/${ticketId}/reply`, {
    texte,
  });
  return data.data;
}

export async function updateTicketStatus({ ticketId, statut }) {
  const { data } = await apiClient.patch(`/tickets/${ticketId}/status`, {
    statut,
  });
  return data.data;
}
