import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPlatformSettings,
  patchPlatformSettings,
} from "./api.js";
import {
  platformPlanKeys,
  usePlatformPlans,
} from "../shared/hooks.js";
import { updatePlatformPlanQuotas } from "../shared/api.js";

const platformSettingsKeys = {
  all: ["platform", "settings"],
};

export function usePlatformSettings() {
  return useQuery({
    queryKey: platformSettingsKeys.all,
    queryFn: fetchPlatformSettings,
  });
}

export function useSavePlatformSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ section, values }) =>
      patchPlatformSettings(section, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: platformSettingsKeys.all,
      });
    },
  });
}

export function useSavePlanQuotas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePlatformPlanQuotas,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: platformPlanKeys.all });
    },
  });
}

export { usePlatformPlans };
