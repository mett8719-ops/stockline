import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveSignupRequest,
  fetchSignupRequest,
  fetchSignupRequests,
  rejectSignupRequest,
  requestSignupInfo,
} from "./api.js";

export const signupKeys = {
  all: ["platform", "signup-requests"],
  list: (filters) => ["platform", "signup-requests", "list", filters],
  detail: (id) => ["platform", "signup-requests", "detail", id],
};

export function useSignupRequests(filters = {}) {
  return useQuery({
    queryKey: signupKeys.list(filters),
    queryFn: ({ signal }) => fetchSignupRequests(filters, signal),
  });
}

export function useSignupRequest(id) {
  return useQuery({
    queryKey: signupKeys.detail(id),
    queryFn: ({ signal }) => fetchSignupRequest(id, signal),
    enabled: Boolean(id),
  });
}

export function useApproveSignupRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveSignupRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: signupKeys.all });
      queryClient.invalidateQueries({ queryKey: ["platform", "shops"] });
    },
  });
}

export function useRequestSignupInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestSignupInfo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: signupKeys.all });
    },
  });
}

export function useRejectSignupRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectSignupRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: signupKeys.all });
    },
  });
}
