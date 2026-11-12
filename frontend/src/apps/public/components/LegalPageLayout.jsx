import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import LandingFooter from "./LandingFooter.jsx";
import LandingHeader from "./LandingHeader.jsx";

export default function LegalPageLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main className="px-5 py-12 sm:px-8 sm:py-16">
        <article className="mx-auto max-w-3xl">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Retour à l’accueil
          </Link>
          <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h1>
          <p
            role="note"
            className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
          >
            Document de travail à compléter et à faire valider par Stockline
            avant toute publication. Il ne constitue pas un avis juridique.
          </p>
          <div className="legal-copy mt-8 space-y-8 text-sm leading-7 text-slate-600 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-slate-900">
            {children}
          </div>
        </article>
      </main>
      <LandingFooter />
    </div>
  );
}
