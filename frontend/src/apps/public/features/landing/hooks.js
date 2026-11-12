import { useQuery } from "@tanstack/react-query";
import { getPublicPlans } from "./api.js";

export function usePublicPlans() {
  return useQuery({
    queryKey: ["public-plans"],
    queryFn: getPublicPlans,
  });
}
