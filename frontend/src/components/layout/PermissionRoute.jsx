import { Outlet } from "react-router-dom";
import { usePermission } from "@/core/hooks/usePermission.js";

export function AccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <section aria-labelledby="access-denied-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">
          Accès refusé
        </p>
        <h1
          id="access-denied-title"
          className="mt-3 text-3xl font-bold text-slate-900"
        >
          Droits insuffisants
        </h1>
        <p className="mt-2 text-slate-600">
          Votre compte ne dispose pas des autorisations nécessaires pour
          consulter cette page.
        </p>
      </section>
    </main>
  );
}

export default function PermissionRoute({ permission, children }) {
  const hasPermission = usePermission(permission);

  if (!hasPermission) {
    return <AccessDenied />;
  }

  return children || <Outlet />;
}
