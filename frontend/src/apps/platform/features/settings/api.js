import apiClient from "@/core/api/client.js";

export async function fetchPlatformSettings({ signal } = {}) {
  const { data } = await apiClient.get("/platform/settings", { signal });
  return data.data;
}

export async function patchPlatformSettings(section, values) {
  const { data } = await apiClient.patch("/platform/settings", {
    [section]: values,
  });
  return data.data;
}
