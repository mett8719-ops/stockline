import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTicket,
  fetchTicket,
  fetchTickets,
  replyToTicket,
  updateTicketStatus,
} from "./api.js";

const ticketKeys = {
  all: ["tickets"],
  scope: (scopeKey) => [...ticketKeys.all, scopeKey],
  list: (scopeKey, filters) => [...ticketKeys.scope(scopeKey), "list", filters],
  detail: (scopeKey, ticketId) => [
    ...ticketKeys.scope(scopeKey),
    "detail",
    ticketId,
  ],
};

export function useTickets(scopeKey, filters) {
  return useQuery({
    queryKey: ticketKeys.list(scopeKey, filters),
    queryFn: ({ signal }) => fetchTickets({ ...filters, signal }),
    placeholderData: (previousData) => previousData,
  });
}

export function useTicket(scopeKey, ticketId) {
  return useQuery({
    queryKey: ticketKeys.detail(scopeKey, ticketId),
    queryFn: ({ signal }) => fetchTicket(ticketId, { signal }),
    enabled: Boolean(ticketId),
  });
}

function useTicketMutation(mutationFn) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (_ticket, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ticketKeys.scope(variables.scopeKey),
      });
    },
  });
}

export function useCreateTicket() {
  return useTicketMutation(({ ticket }) => createTicket(ticket));
}

export function useReplyToTicket() {
  return useTicketMutation(replyToTicket);
}

export function useUpdateTicketStatus() {
  return useTicketMutation(updateTicketStatus);
}
