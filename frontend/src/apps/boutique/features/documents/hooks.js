import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDocument,
  getDocuments,
  searchDocumentCustomers,
  searchDocumentProducts,
} from "./api.js";

export function useDocuments(filters) {
  return useQuery({
    queryKey: ["documents", filters],
    queryFn: () => getDocuments(filters),
    placeholderData: (previousData) => previousData,
  });
}

export function useDocumentCustomers(query, enabled) {
  return useQuery({
    queryKey: ["documents", "customers", query],
    queryFn: () => searchDocumentCustomers(query),
    enabled: enabled && query.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useDocumentProducts(query, enabled) {
  return useQuery({
    queryKey: ["documents", "products", query],
    queryFn: () => searchDocumentProducts(query),
    enabled: enabled && query.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDocument,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });
}
