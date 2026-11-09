import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ApplicationStatusGuard } from "@/components/layout/ProtectedRoute.jsx";
import { authStore } from "@/core/store/authStore.js";
import { queryClient } from "@/core/queryClient.js";
import router from "@/router.jsx";
import "./index.css";

void authStore.getState().initSession().catch((error) => {
  console.error("Échec de la restauration de session.", error);
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ApplicationStatusGuard>
        <RouterProvider router={router} />
      </ApplicationStatusGuard>
    </QueryClientProvider>
  </StrictMode>,
);
