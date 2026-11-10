import axios from "axios";
import { authStore } from "@/core/store/authStore.js";

const apiUrl = import.meta.env.VITE_API_URL;
const baseURL = `${apiUrl ? apiUrl.replace(/\/+$/, "") : ""}/api/v1`;

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

let refreshPromise = null;
let logoutStarted = false;

apiClient.interceptors.request.use((config) => {
  const accessToken = authStore.getState().accessToken;

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/auth/refresh")
      .then(({ data }) => {
        const accessToken = data?.data?.accessToken;

        if (!accessToken) {
          throw new Error("La réponse de rafraîchissement ne contient pas de jeton.");
        }

        authStore.setState({ accessToken });
        logoutStarted = false;
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function logoutAndRedirect() {
  if (logoutStarted) return;

  logoutStarted = true;
  authStore.getState().logout();

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const errorCode = error.response?.data?.error?.code;

    if (
      error.response?.status !== 401 ||
      errorCode !== "TOKEN_EXPIRED" ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const accessToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      logoutAndRedirect();
      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;
