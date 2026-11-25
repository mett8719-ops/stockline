import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTreasuryTransaction,
  getTreasuryOverview,
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
