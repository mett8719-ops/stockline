import { lazy, Suspense } from "react";

const DevUiPage = lazy(() => import("@/apps/public/pages/DevUiPage.jsx"));

export default function DevUiRoute() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
          Chargement de la vitrine UI…
        </main>
      }
    >
      <DevUiPage />
    </Suspense>
  );
}
