import { authStore } from "@/core/store/authStore.js";

export function useAuth() {
  const accessToken = authStore((state) => state.accessToken);
  const user = authStore((state) => state.user);
  const shop = authStore((state) => state.shop);
  const permissions = authStore((state) => state.permissions);
  const isAuthenticated = authStore((state) => state.isAuthenticated);
  const isInitialized = authStore((state) => state.isInitialized);
  const blockingStatus = authStore((state) => state.blockingStatus);
  const initSession = authStore((state) => state.initSession);
  const logout = authStore((state) => state.logout);

  return {
    accessToken,
    user,
    shop,
    permissions,
    isAuthenticated,
    isInitialized,
    blockingStatus,
    initSession,
    logout,
  };
}
