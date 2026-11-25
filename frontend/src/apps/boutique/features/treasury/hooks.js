import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeTreasurySession,
  createTreasuryTransaction,
  getTreasuryExport,
  getTreasuryOverview,
  openTreasurySession,
} from "./api.js";

export function useTreasuryOverview(days = 3) {
  return useQuery({
    queryKey: ["treasury", "overview", days],
    queryFn: () => getTreasuryOverview(days),
  });
}

export function useCreateTreasuryTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTreasuryTransaction,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["treasury"] }),
  });
}

export function useOpenTreasurySession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: openTreasurySession,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["treasury"] }),
  });
}

export function useCloseTreasurySession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeTreasurySession,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["treasury"] }),
  });
}

export function useTreasuryExport() {
  return useMutation({ mutationFn: getTreasuryExport });
}
