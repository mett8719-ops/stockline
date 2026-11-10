import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/core/hooks/useAuth.js";
import { authStore } from "@/core/store/authStore.js";

const SHOP_STATUS_MESSAGES = {
  SHOP_FROZEN: "Cette boutique est temporairement gelée.",
  SHOP_BANNED: "L’accès à cette boutique a été suspendu.",
  SHOP_SUSPENDED: "L’abonnement de cette boutique est suspendu.",
};

function SessionLoading() {
  return (
    <main
      aria-label="Chargement de la session"
      className="min-h-screen animate-pulse bg-slate-50"
    >
      <div className="mx-auto mt-24 h-8 max-w-sm rounded bg-slate-200" />
      <div className="mx-auto mt-4 h-4 max-w-xs rounded bg-slate-200" />
    </main>
  );
}

export function ShopStatusBlocked({ status }) {
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || "support@stockline.cg";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section
        aria-labelledby="shop-status-title"
        className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow"
      >
        <h1 id="shop-status-title" className="text-2xl font-bold text-slate-900">
          Accès à la boutique indisponible
        </h1>
        <p className="mt-3 text-slate-600">
          {status.message || SHOP_STATUS_MESSAGES[status.code]}
        </p>
        <a
          className="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
          href={`mailto:${supportEmail}`}
        >
          Contacter le support
        </a>
      </section>
    </main>
  );
}

export function ApplicationStatusGuard({ children }) {
  const blockingStatus = authStore((state) => state.blockingStatus);

  return blockingStatus ? (
    <ShopStatusBlocked status={blockingStatus} />
  ) : (
    children
  );
}

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isInitialized } = useAuth();
  const blockingStatus = authStore((state) => state.blockingStatus);

  if (blockingStatus) {
    return <ShopStatusBlocked status={blockingStatus} />;
  }

  if (!isInitialized) {
    return <SessionLoading />;
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

  return children || <Outlet />;
}
