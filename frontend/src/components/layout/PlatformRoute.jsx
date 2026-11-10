import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/core/hooks/useAuth.js";
import { AccessDenied } from "@/components/layout/PermissionRoute.jsx";

export default function PlatformRoute({ children }) {
  const location = useLocation();
  const { user, isAuthenticated, isInitialized } = useAuth();

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

  if (user?.role !== "super_admin") {
    return <AccessDenied />;
  }

  return children || <Outlet />;
}
