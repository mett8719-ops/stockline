import { useQuery } from "@tanstack/react-query";
import { getDocuments } from "./api.js";

export function useDocuments(filters) {
  return useQuery({
    queryKey: ["documents", filters],
    queryFn: () => getDocuments(filters),
    placeholderData: (previousData) => previousData,
  });
}
