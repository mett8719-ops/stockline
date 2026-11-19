import { useQuery } from "@tanstack/react-query";
import {
  fetchPlatformPlans,
  fetchPlatformShops,
} from "./api.js";

export const platformPlanKeys = {
  all: ["platform", "plans"],
};

const platformShopKeys = {
  all: ["platform", "shops"],
  list: (filters) => [...platformShopKeys.all, filters],
};

export function usePlatformPlans() {
  return useQuery({
    queryKey: platformPlanKeys.all,
    queryFn: fetchPlatformPlans,
  });
}

export function usePlatformShops(filters) {
  return useQuery({
    queryKey: platformShopKeys.list(filters),
    queryFn: ({ signal }) => fetchPlatformShops({ ...filters, signal }),
    placeholderData: (previousData) => previousData,
    enabled: filters.enabled !== false,
  });
}
