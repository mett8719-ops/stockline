import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFeatureFlags, upsertFeatureFlag } from "./api.js";

const featureFlagKeys = {
  all: ["platform", "feature-flags"],
};

export function useFeatureFlags() {
  return useQuery({
    queryKey: featureFlagKeys.all,
    queryFn: fetchFeatureFlags,
  });
}

export function useUpsertFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertFeatureFlag,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: featureFlagKeys.all });
    },
  });
}
