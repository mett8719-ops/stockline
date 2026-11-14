import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStockMovement,
  fetchStockAlerts,
  fetchStockMovements,
  fetchStockProducts,
} from "./api.js";

const movementKeys = {
  all: ["stock", "movements"],
  list: (filters) => [...movementKeys.all, filters],
  alerts: ["stock", "alerts"],
  products: ["products"],
};

export function useStockMovements(filters) {
  return useQuery({
    queryKey: movementKeys.list(filters),
    queryFn: ({ signal }) => fetchStockMovements({ ...filters, signal }),
    placeholderData: (previousData) => previousData,
  });
}

export function useStockAlerts() {
  return useQuery({
    queryKey: movementKeys.alerts,
    queryFn: fetchStockAlerts,
  });
}

export function useStockProducts() {
  return useQuery({
    queryKey: movementKeys.products,
    queryFn: fetchStockProducts,
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStockMovement,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: movementKeys.all }),
        queryClient.invalidateQueries({ queryKey: movementKeys.alerts }),
        queryClient.invalidateQueries({ queryKey: movementKeys.products }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
    },
  });
}
