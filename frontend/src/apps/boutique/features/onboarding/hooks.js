import { useMutation } from "@tanstack/react-query";
import { authStore } from "@/core/store/authStore.js";
import { completeGuidedTour } from "./api.js";

export function useCompleteGuidedTour(onCompleted) {
  return useMutation({
    mutationFn: completeGuidedTour,
    onSuccess: () => {
      authStore.getState().markGuidedTourComplete();
      onCompleted?.();
    },
  });
}
