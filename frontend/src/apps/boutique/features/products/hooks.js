import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProduct,
  deactivateProduct,
  fetchCategories,
  fetchProducts,
  importProducts,
  updateProduct,
} from "./api.js";

const productKeys = {
  all: ["products"],
  list: (filters) => [...productKeys.all, filters],
  categories: ["categories"],
};

export function useProducts(filters) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: ({ signal }) => fetchProducts({ ...filters, signal }),
    placeholderData: (previousData) => previousData,
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: fetchCategories,
  });
}

export function useDeactivateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateProduct,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.categories }),
      ]);
    },
  });
}

export function useSaveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, product }) =>
      productId
        ? updateProduct({ productId, product })
        : createProduct(product),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.categories }),
      ]);
    },
  });
}

export function useImportProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importProducts,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.categories }),
      ]);
    },
  });
}
