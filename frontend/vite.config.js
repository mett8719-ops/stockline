/**
 * Configuration Vite.
 *
 * DEUX POINTS IMPORTANTS :
 *
 * 1. L'ALIAS `@` pointe vers src/. Il evite les imports illisibles du type
 *    "../../../../core/api/client" — sur une arborescence a 4 niveaux, c'est
 *    vite ingerable.
 *
 * 2. Le PROXY redirige /api vers le backend en developpement. Le navigateur
 *    croit ainsi que tout vient de la meme origine : plus aucun probleme de
 *    CORS ni de cookie bloque pendant le developpement.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],

      manifest: {
        name: "Stockline — Gestion commerciale",
        short_name: "Stockline",
        description:
          "Gestion commerciale et de stock pour les boutiques d'Afrique centrale",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            /**
             * Catalogue produits : strategie "reseau d'abord, cache en repli".
             * En ligne, on a toujours les prix a jour. Hors ligne, la caisse
             * continue de fonctionner avec le dernier catalogue connu.
             */
            urlPattern: /\/api\/v1\/products/,
            handler: "NetworkFirst",
            options: {
              cacheName: "catalogue-produits",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
            },
          },
          {
            // Police : mise en cache longue duree
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: "CacheFirst",
            options: {
              cacheName: "polices",
              expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(new URL(".", import.meta.url).pathname, "./src"),
    },
  },

  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true,          // indispensable pour les WebSockets
        changeOrigin: true,
      },
    },
  },
});
