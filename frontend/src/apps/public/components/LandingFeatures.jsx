import {
  BarChart3,
  Boxes,
  HandCoins,
  Package,
  ReceiptText,
  Truck,
} from "lucide-react";

const features = [
  {
    title: "Produits & Stock",
    description: "Catalogue complet, alertes de rupture et inventaire.",
    icon: Package,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Vente / Caisse POS",
    description: "Caisse tactile rapide, espèces, Mobile Money et crédit.",
    icon: ReceiptText,
    color: "bg-violet-50 text-violet-600",
  },
  {
    title: "Clients & Créances",
    description: "Historique des achats, soldes impayés et suivi client.",
    icon: HandCoins,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Fournisseurs",
    description: "Suivi des soldes dus, livraisons et approvisionnements.",
    icon: Truck,
    color: "bg-amber-50 text-amber-600",
  },
  {
    title: "Trésorerie",
    description: "Recettes, dépenses et solde de caisse en un seul endroit.",
    icon: Boxes,
    color: "bg-cyan-50 text-cyan-700",
  },
  {
    title: "Rapports & Analytics",
    description: "Indicateurs d’activité, tendances et rapports de vente.",
    icon: BarChart3,
    color: "bg-rose-50 text-rose-600",
  },
];

export default function LandingFeatures() {
  return (
    <section
      id="fonctionnalités"
      className="scroll-mt-16 bg-slate-50 px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold text-brand-600">
            Modules intégrés
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Tout ce dont votre boutique a besoin
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-500 sm:text-lg">
            Six modules métier conçus pour les commerces d’Afrique centrale,
            réunis dans une seule interface.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-6">
          {features.map(({ title, description, icon: Icon, color }) => (
            <li
              key={title}
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}
              >
                <Icon aria-hidden="true" size={23} strokeWidth={1.8} />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
