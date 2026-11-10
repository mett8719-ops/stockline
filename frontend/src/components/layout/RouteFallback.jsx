import { Navigate, useLocation } from "react-router-dom";
import ComingSoon from "@/components/feedback/ComingSoon.jsx";
import NotFound from "@/components/feedback/NotFound.jsx";
import { useAuth } from "@/core/hooks/useAuth.js";

export default function RouteFallback() {
  const location = useLocation();
  const { isAuthenticated, isInitialized } = useAuth();

  if (location.pathname === "/login") {
    return <ComingSoon />;
  }

  if (!isInitialized) {
    return (
      <main
        aria-label="Chargement de la session"
        className="min-h-screen animate-pulse bg-slate-50"
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
        }}
      />
    );
  }

  return <NotFound />;
}
