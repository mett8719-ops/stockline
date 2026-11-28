import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelSale, getSale, getSales } from "./api.js";

export function useSalesHistory(filters = {}) {
  return useQuery({
    queryKey: ["sales", "history", filters],
    queryFn: () => getSales(filters),
    staleTime: 30_000,
  });
}

export function useSaleDetail(id) {
  return useQuery({
    queryKey: ["sales", "detail", id],
    queryFn: () => getSale(id),
    enabled: Boolean(id),
  });
}

export function useCancelSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, motif }) => cancelSale(id, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}
