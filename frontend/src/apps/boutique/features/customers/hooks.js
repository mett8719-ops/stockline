import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCustomer,
  fetchCustomer,
  fetchCustomers,
  recordCustomerPayment,
} from "./api.js";

const customerKeys = {
  all: ["customers"],
  list: (filters) => [...customerKeys.all, "list", filters],
  detail: (customerId) => [...customerKeys.all, "detail", customerId],
};

export function useCustomers(filters) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: ({ signal }) => fetchCustomers({ ...filters, signal }),
    placeholderData: (previousData) => previousData,
  });
}

export function useCustomer(customerId) {
  return useQuery({
    queryKey: customerKeys.detail(customerId),
    queryFn: ({ signal }) => fetchCustomer(customerId, { signal }),
    enabled: Boolean(customerId),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useRecordCustomerPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordCustomerPayment,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: customerKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["reports", "dashboard"] }),
      ]);
    },
  });
}
