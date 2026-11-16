import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchInventories,
  fetchInventory,
  recordInventoryCount,
  startInventory,
} from "./api.js";

const inventoryKeys = {
  all: ["inventories"],
  lists: () => [...inventoryKeys.all, "list"],
  list: (page) => [...inventoryKeys.lists(), page],
  detail: (inventoryId) => [...inventoryKeys.all, "detail", inventoryId],
};

export function useInventories(page) {
  return useQuery({
    queryKey: inventoryKeys.list(page),
    queryFn: ({ signal }) => fetchInventories({ page, signal }),
    placeholderData: (previousData) => previousData,
  });
}

export function useInventory(inventoryId) {
  return useQuery({
    queryKey: inventoryKeys.detail(inventoryId),
    queryFn: ({ signal }) => fetchInventory(inventoryId, { signal }),
    enabled: Boolean(inventoryId),
  });
}

export function useStartInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startInventory,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
  });
}

export function useRecordInventoryCount(inventoryId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordInventoryCount,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: inventoryKeys.detail(inventoryId),
        }),
      ]);
    },
  });
}
