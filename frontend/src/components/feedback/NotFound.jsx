import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          Erreur 404
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Page introuvable
        </h1>
        <p className="mt-2 text-slate-600">
          La page demandée n’existe pas ou a été déplacée.
        </p>
        <Link
          className="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
          to="/"
        >
          Retour à l’accueil
        </Link>
      </div>
    </main>
  );
}
