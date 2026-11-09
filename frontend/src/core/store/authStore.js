import { create } from "zustand";
import apiClient from "@/core/api/client.js";
import { queryClient } from "@/core/queryClient.js";
import { connectSocket, disconnectSocket } from "@/core/socket.js";

const initialSession = {
  accessToken: null,
  user: null,
  shop: null,
  permissions: [],
  isAuthenticated: false,
};

let initializationPromise = null;

export const authStore = create((set, get) => ({
  ...initialSession,
  isInitialized: false,

  setAuth: ({ accessToken, user, shop = null }) => {
    if (!accessToken || !user) {
      throw new Error("Un jeton d’accès et un utilisateur sont requis pour ouvrir une session.");
    }

    const permissions = Array.isArray(user.permissions) ? user.permissions : [];

    queryClient.clear();
    set({
      accessToken,
      user,
      shop,
      permissions,
      isAuthenticated: true,
      isInitialized: true,
    });
    connectSocket(accessToken);
  },

  setAccessToken: (accessToken) => {
    set({ accessToken });

    if (get().isAuthenticated && accessToken) {
      connectSocket(accessToken);
    }
  },

  logout: async ({ notifyServer = true } = {}) => {
    const hadSession = Boolean(get().accessToken);

    set({ ...initialSession, isInitialized: true });
    disconnectSocket();
    queryClient.clear();

    if (notifyServer && hadSession) {
      await apiClient.post("/auth/logout", null, { skipAuthRefresh: true });
    }
  },

  initSession: () => {
    if (!initializationPromise) {
      initializationPromise = (async () => {
        try {
          const { data: refreshResponse } = await apiClient.post(
            "/auth/refresh",
            null,
            { skipAuthRefresh: true },
          );
          const accessToken = refreshResponse?.data?.accessToken;

          if (!accessToken) {
            throw new Error("La réponse de rafraîchissement ne contient pas de jeton.");
          }

          get().setAccessToken(accessToken);

          const { data: profileResponse } = await apiClient.get("/auth/me");
          const profile = profileResponse?.data;

          if (!profile?.utilisateur) {
            throw new Error("La réponse du profil ne contient pas d’utilisateur.");
          }

          get().setAuth({
            accessToken,
            user: profile.utilisateur,
            shop: profile.boutique ?? null,
          });

          return true;
        } catch (error) {
          await get().logout({ notifyServer: false });

          if (error.response?.status === 401) {
            return false;
          }

          throw error;
        } finally {
          set({ isInitialized: true });
          initializationPromise = null;
        }
      })();
    }

    return initializationPromise;
  },
}));
