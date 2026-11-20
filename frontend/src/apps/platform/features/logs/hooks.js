import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { blockPlatformIp, fetchPlatformLogs } from "./api.js";

const platformLogKeys = {
  all: ["platform", "logs"],
  list: (filters) => [...platformLogKeys.all, filters],
};

export function usePlatformLogs(filters) {
  return useQuery({
    queryKey: platformLogKeys.list(filters),
    queryFn: ({ signal }) => fetchPlatformLogs(filters, { signal }),
    placeholderData: (previousData) => previousData,
  });
}

export function useBlockPlatformIp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: blockPlatformIp,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: platformLogKeys.all });
    },
  });
}
