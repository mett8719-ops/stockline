import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDocument,
  convertDocumentQuote,
  getDocument,
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

export function useDocument(id) {
  return useQuery({
    queryKey: ["documents", "detail", id],
    queryFn: () => getDocument(id),
    enabled: Boolean(id),
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

export function useConvertDocumentQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: convertDocumentQuote,
    onSuccess: (result) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["documents"] }),
        queryClient.setQueryData(
          ["documents", "detail", result.facture._id ?? result.facture.id],
          result.facture,
        ),
        queryClient.invalidateQueries({
          queryKey: ["documents", "detail", result.devis.id ?? result.devis._id],
        }),
      ]),
  });
}
