import { apiClient } from "@/core/api/client.js";

export async function fetchSignupRequests(params = {}, signal) {
  const { data } = await apiClient.get("/platform/signup-requests", {
    params,
    signal,
  });

  return {
    items: Array.isArray(data?.data) ? data.data : [],
    meta: data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function fetchSignupRequest(id, signal) {
  const { data } = await apiClient.get(
    `/platform/signup-requests/${encodeURIComponent(id)}`,
    { signal },
  );
  return data?.data ?? null;
}

export async function approveSignupRequest({ id, planId, messageBienvenue }) {
  const body = {};
  if (planId) body.planId = planId;
  if (messageBienvenue) body.messageBienvenue = messageBienvenue;

  const { data } = await apiClient.post(
    `/platform/signup-requests/${encodeURIComponent(id)}/approve`,
    body,
  );
  return data?.data ?? null;
}

export async function requestSignupInfo({ id, message }) {
  const { data } = await apiClient.post(
    `/platform/signup-requests/${encodeURIComponent(id)}/request-info`,
    { message },
  );
  return data?.data ?? null;
}

export async function rejectSignupRequest({ id, motif }) {
  const { data } = await apiClient.post(
    `/platform/signup-requests/${encodeURIComponent(id)}/reject`,
    { motif },
  );
  return data?.data ?? null;
}
