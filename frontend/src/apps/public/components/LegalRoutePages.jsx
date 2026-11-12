import { lazy, Suspense } from "react";

const CguPage = lazy(() => import("../pages/CguPage.jsx"));
const LegalNoticePage = lazy(() => import("../pages/LegalNoticePage.jsx"));
const PrivacyPolicyPage = lazy(
  () => import("../pages/PrivacyPolicyPage.jsx"),
);

function LegalPageFallback() {
  return (
    <main
      aria-label="Chargement de la page légale"
      className="min-h-screen animate-pulse bg-slate-50"
      role="status"
    />
  );
}

function LegalPageSuspense({ children }) {
  return <Suspense fallback={<LegalPageFallback />}>{children}</Suspense>;
}

export function CguRoutePage() {
  return (
    <LegalPageSuspense>
      <CguPage />
    </LegalPageSuspense>
  );
}

export function LegalNoticeRoutePage() {
  return (
    <LegalPageSuspense>
      <LegalNoticePage />
    </LegalPageSuspense>
  );
}

export function PrivacyPolicyRoutePage() {
  return (
    <LegalPageSuspense>
      <PrivacyPolicyPage />
    </LegalPageSuspense>
  );
}
