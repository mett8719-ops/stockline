import { lazy, Suspense } from "react";

const TreasuryPage = lazy(() => import("./pages/TreasuryPage.jsx"));

export default function TreasuryRoute() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-64 items-center justify-center text-sm text-slate-500">
          Chargement de la trésorerie…
        </main>
      }
    >
      <TreasuryPage />
    </Suspense>
  );
}
