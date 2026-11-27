import { useQuery } from "@tanstack/react-query";
import { fetchSupplier, fetchSuppliers } from "./api.js";

const supplierKeys = {
  all: ["suppliers"],
  list: (filters) => [...supplierKeys.all, "list", filters],
  detail: (supplierId) => [...supplierKeys.all, "detail", supplierId],
};

export function useSuppliers(filters) {
  return useQuery({
    queryKey: supplierKeys.list(filters),
    queryFn: ({ signal }) => fetchSuppliers({ ...filters, signal }),
    placeholderData: (previousData) => previousData,
  });
}

export function useSupplier(supplierId) {
  return useQuery({
    queryKey: supplierKeys.detail(supplierId),
    queryFn: ({ signal }) => fetchSupplier(supplierId, { signal }),
    enabled: Boolean(supplierId),
  });
}
