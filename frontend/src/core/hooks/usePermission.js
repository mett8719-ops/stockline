import { authStore } from "@/core/store/authStore.js";

export function usePermission(permission) {
  return authStore(
    (state) =>
      state.user?.role === "admin" || state.permissions.includes(permission),
  );
}
