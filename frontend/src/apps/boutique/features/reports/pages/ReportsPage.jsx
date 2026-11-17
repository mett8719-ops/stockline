import { BarChart3, Package, ShoppingBag } from "lucide-react";
import ExportReportButton from "../components/ExportReportButton.jsx";

export default function ReportsPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-700">Pilotage boutique</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
              <BarChart3 className="h-6 w-6 text-brand-600" aria-hidden="true" />
              Rapports
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Exportez les indicateurs de ventes sur une période ou la situation actuelle du stock.
            </p>
          </div>
          <ExportReportButton />
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-900">Rapport des ventes</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Chiffre d’affaires, bénéfice, panier moyen, comparatif, produits vendus,
              caissiers et modes de paiement pour la période choisie.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Package className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-slate-900">Rapport du stock</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Valorisation, catégories, alertes de stock bas, produits proches de
              péremption et références dormantes.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
