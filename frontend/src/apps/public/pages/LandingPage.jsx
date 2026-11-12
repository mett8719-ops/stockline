import { lazy, Suspense } from "react";
import LandingHeader from "../components/LandingHeader.jsx";
import LandingHero from "../components/LandingHero.jsx";
import LandingFooter from "../components/LandingFooter.jsx";

const LandingFeatures = lazy(() => import("../components/LandingFeatures.jsx"));
const LandingPricing = lazy(() => import("../components/LandingPricing.jsx"));
const LandingTestimonials = lazy(
  () => import("../components/LandingTestimonials.jsx"),
);

function SectionFallback({ label, className }) {
  return (
    <div
      aria-label={`Chargement de ${label}`}
      className={`animate-pulse bg-slate-50 ${className}`}
      role="status"
    />
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>
        <LandingHero />
        <Suspense
          fallback={<SectionFallback label="nos fonctionnalités" className="min-h-[520px]" />}
        >
          <LandingFeatures />
        </Suspense>
        <Suspense
          fallback={<SectionFallback label="nos tarifs" className="min-h-[680px]" />}
        >
          <LandingPricing />
        </Suspense>
        <Suspense
          fallback={<SectionFallback label="les témoignages" className="min-h-[440px]" />}
        >
          <LandingTestimonials />
        </Suspense>
      </main>
      <LandingFooter />
    </div>
  );
}
