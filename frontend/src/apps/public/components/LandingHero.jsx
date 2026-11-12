import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  Package,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { landingContent } from "../landing.content.js";

const demoProducts = [
  { name: "Riz parfumé 25 kg", detail: "En stock", price: "18 500 FCFA", icon: Package },
  { name: "Huile végétale 5 L", detail: "En stock", price: "6 500 FCFA", icon: Package },
  { name: "Lait concentré", detail: "Stock faible", price: "1 200 FCFA", icon: Package },
];

function ProductPreview() {
  return (
    <div
      id="demo"
      className="relative mx-auto w-full max-w-[560px] scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.28)] sm:p-5"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Aperçu de démonstration</p>
          <p className="mt-1 text-xs text-slate-500">Données fictives · Boutique Démo</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          En activité
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Ventes du jour</p>
          <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">248 500</p>
          <p className="text-[11px] text-slate-500">FCFA</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3">
          <p className="text-xs text-slate-500">Transactions</p>
          <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">36</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
            <TrendingUp aria-hidden="true" size={12} /> Aujourd’hui
          </p>
        </div>
        <div className="col-span-2 rounded-xl bg-emerald-50 p-3 sm:col-span-1">
          <p className="text-xs text-slate-500">Solde de caisse</p>
          <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">184 000</p>
          <p className="text-[11px] text-slate-500">FCFA</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100">
        <div className="flex items-center justify-between bg-slate-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-slate-700">Produits récents</p>
          <span className="text-[11px] text-slate-500">Voir le stock</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {demoProducts.map((product) => (
            <li
              key={product.name}
              className="flex items-center justify-between gap-2 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-brand-600">
                  <product.icon aria-hidden="true" size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-800">{product.name}</p>
                  <p className="text-[11px] text-slate-500">{product.detail}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-slate-700">
                {product.price}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-lg sm:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Check aria-hidden="true" size={17} />
        </span>
        <div>
          <p className="text-xs font-semibold text-slate-800">Stock mis à jour</p>
          <p className="text-[11px] text-slate-500">Après chaque vente</p>
        </div>
      </div>
      <div className="absolute -right-3 top-24 hidden items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-lg sm:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-brand-600">
          <CircleDollarSign aria-hidden="true" size={17} />
        </span>
        <div>
          <p className="text-xs font-semibold text-slate-800">Vente enregistrée</p>
          <p className="text-[11px] text-slate-500">Caisse · À l’instant</p>
        </div>
      </div>
    </div>
  );
}

export default function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden bg-white px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:pb-28 lg:pt-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[540px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/80 via-white to-white"
      />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-xs font-medium text-brand-700 sm:text-sm">
            <TrendingUp aria-hidden="true" size={15} />
            Nouvelle version 2.4 · Inventaire automatisé
          </span>

          <h1 className="mt-7 text-[2.5rem] font-bold leading-[1.12] tracking-[-0.045em] text-slate-900 sm:text-5xl lg:text-[3.25rem]">
            Gérez votre boutique.
            <span className="mt-1 block text-brand-600">Vendez plus vite.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
            Stockline est la plateforme tout-en-un de gestion commerciale conçue
            pour les boutiques, dépôts et supermarchés d’Afrique centrale. Stock,
            caisse, clients, trésorerie — tout en un.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              to="/inscription"
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.65)] transition hover:-translate-y-0.5 hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Créer mon compte gratuitement
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <a
              href="#demo"
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-base font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Voir la démo
              <ChevronDown aria-hidden="true" size={17} />
            </a>
          </div>

          <ul
            className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-3"
            aria-label="Quelques chiffres Stockline"
          >
            {landingContent.metrics.map((metric) => (
              <li key={metric.label} className="text-center">
                <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">{metric.label}</p>
              </li>
            ))}
          </ul>
          {landingContent.FICTIF && (
            <span className="sr-only">Les chiffres de réassurance sont fictifs.</span>
          )}
        </div>

        <div className="mx-auto mt-12 max-w-5xl px-1 sm:mt-16 sm:px-5 lg:mt-20">
          <ProductPreview />
        </div>
        <a
          href="#fonctionnalités"
          className="mx-auto mt-12 hidden w-fit items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-brand-600 sm:flex"
        >
          Découvrir Stockline
          <ArrowDown aria-hidden="true" size={15} />
        </a>
      </div>
      <span className="sr-only">
        L’aperçu de caisse ci-dessus est une illustration et non des données en
        temps réel.
      </span>
    </section>
  );
}
