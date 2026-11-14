import { lazy, Suspense } from "react";

const SignupPage = lazy(() => import("../pages/SignupPage.jsx"));

export default function SignupRoutePage() {
  return (
    <Suspense
      fallback={
        <main
          aria-label="Chargement du formulaire d’inscription"
          className="min-h-screen animate-pulse bg-slate-50"
          role="status"
        />
      }
    >
      <SignupPage />
    </Suspense>
  );
}
