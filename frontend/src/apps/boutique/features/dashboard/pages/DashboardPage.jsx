import { Suspense, lazy, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Box,
  Download,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { parseApiError } from "@/core/api/errors.js";
import { useAuth } from "@/core/hooks/useAuth.js";
import { useDashboard } from "../hooks.js";

const SalesChart = lazy(() => import("../components/SalesChart.jsx"));

const currencyFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});
const numberFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const longDateFormat = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

const paymentLabels = {
  especes: "Espèces",
  mobile_money: "Mobile Money",
  carte: "Carte",
  credit: "Crédit",
  virement: "Virement",
  cheque: "Chèque",
};

function formatCurrency(value) {
  return `${currencyFormat.format(Number(value) || 0)} CDF`;
}

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getGreeting(date) {
  const hour = date.getHours();
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

function getPaymentLabel(payments) {
  if (!Array.isArray(payments) || payments.length === 0) return "—";
  const labels = [
    ...new Set(
      payments.map((payment) => paymentLabels[payment.mode] || payment.mode),
    ),
  ];
  return labels.join(" + ");
}

function getSaleStatus(status) {
  if (status === "payee") return { label: "Payée", className: "bg-emerald-50 text-emerald-700" };
  if (status === "annulee") return { label: "Annulée", className: "bg-red-50 text-red-700" };
  return { label: "En attente", className: "bg-amber-50 text-amber-700" };
}

function getChartData(rows = [], today) {
  const valuesByDay = new Map(rows.map((row) => [row.jour, row]));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = getLocalDateKey(date);
    const row = valuesByDay.get(key);

    return {
      jour: key,
      label: dateFormat.format(date).replace(".", ""),
      ventes: Number(row?.ventes) || 0,
      benefice: Number(row?.benefice) || 0,
    };
  });
}

function KpiCard({ label, value, note, tone, icon: Icon, trend }) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };
  const noteClasses = {
    positive: "text-emerald-600",
    negative: "text-red-600",
    neutral: "text-slate-500",
  };
  const Trend = trend === "down" ? TrendingDown : TrendingUp;

  return (
    <article className="card min-w-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-800">
        {value}
      </p>
      <p className={`mt-1 flex min-h-5 items-center gap-1 text-xs ${noteClasses[note?.tone || "neutral"]}`}>
        {note?.trend && <Trend aria-hidden="true" className="h-3.5 w-3.5" />}
        {note?.text || "\u00a0"}
      </p>
    </article>
  );
}

function exportDashboard(data) {
  const rows = [
    ["Rapport du tableau de bord", longDateFormat.format(new Date())],
    [],
    ["Indicateur", "Valeur"],
    ["Ventes du jour", data.kpis.ventesJour.valeur],
    ["Bénéfice du jour", data.kpis.beneficeJour.valeur],
    ["Valeur du stock", data.kpis.valeurStock.valeur],
    ["Créances clients", data.kpis.creancesClients.valeur],
    [],
    ["Date", "Ventes", "Bénéfice"],
    ...data.courbeSemaine.map((row) => [row.jour, row.ventes, row.benefice]),
    [],
    ["Référence", "Heure", "Caissier", "Montant", "Paiement", "Statut"],
    ...data.dernieresVentes.map((sale) => [
      sale.reference,
      timeFormat.format(new Date(sale.date)),
      sale.caissierNom,
      sale.montantTotal,
      getPaymentLabel(sale.paiements),
      sale.statut,
    ]),
  ];
  const csv = `\uFEFF${rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
        .join(";"),
    )
    .join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `rapport-tableau-de-bord-${getLocalDateKey(new Date())}.csv`;
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function LoadingDashboard() {
  return (
    <div aria-label="Chargement du tableau de bord" className="space-y-6" role="status">
      <span className="sr-only">Chargement du tableau de bord…</span>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="card h-36 p-5" key={index}>
            <div className="skeleton h-4 w-32" />
            <div className="skeleton mt-5 h-7 w-40" />
            <div className="skeleton mt-3 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="card h-80 xl:col-span-2" />
        <div className="card h-80" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, shop } = useAuth();
  const dashboardQuery = useDashboard();
  const data = dashboardQuery.data;
  const [now] = useState(() => new Date());
  const chartData = useMemo(
    () => getChartData(data?.courbeSemaine, now),
    [data?.courbeSemaine, now],
  );
  const greeting = getGreeting(now);

  if (dashboardQuery.isPending) return <LoadingDashboard />;

  if (dashboardQuery.isError && !data) {
    return (
      <section className="card p-8 text-center">
        <p className="font-medium text-slate-900">
          Impossible de charger le tableau de bord.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {parseApiError(dashboardQuery.error).message}
        </p>
        <button
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          onClick={() => dashboardQuery.refetch()}
          type="button"
        >
          Réessayer
        </button>
      </section>
    );
  }

  const kpis = data.kpis;
  const alerts = Array.isArray(data.alertesStock) ? data.alertesStock : [];
  const sales = Array.isArray(data.dernieresVentes) ? data.dernieresVentes : [];
  const todayLabel = longDateFormat.format(now);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-900">
            {greeting}, {user?.roleLibelle || "Directeur"} 👋
          </h2>
          <p className="mt-1 text-sm capitalize text-slate-500">
            {shop?.nom || "Ma boutique"} · {todayLabel}
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-50 px-4 text-sm font-medium text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
          disabled={dashboardQuery.isFetching}
          onClick={() => exportDashboard(data)}
          type="button"
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Exporter le rapport
        </button>
      </header>

      {dashboardQuery.isError && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          Actualisation impossible : {parseApiError(dashboardQuery.error).message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="Ventes du jour"
          note={{
            text: `${kpis.ventesJour.evolution >= 0 ? "+" : ""}${kpis.ventesJour.evolution}% vs hier`,
            tone: kpis.ventesJour.evolution >= 0 ? "positive" : "negative",
            trend: kpis.ventesJour.evolution >= 0 ? "up" : "down",
          }}
          tone="blue"
          value={formatCurrency(kpis.ventesJour.valeur)}
        />
        <KpiCard
          icon={TrendingUp}
          label="Bénéfice du jour"
          note={{
            text: `${kpis.beneficeJour.evolution >= 0 ? "+" : ""}${kpis.beneficeJour.evolution}% vs hier`,
            tone: kpis.beneficeJour.evolution >= 0 ? "positive" : "negative",
            trend: kpis.beneficeJour.evolution >= 0 ? "up" : "down",
          }}
          tone="green"
          value={formatCurrency(kpis.beneficeJour.valeur)}
        />
        <KpiCard
          icon={Box}
          label="Valeur du stock"
          note={{
            text: `${numberFormat.format(kpis.valeurStock.nombreReferences)} références`,
            tone: "neutral",
          }}
          tone="amber"
          value={formatCurrency(kpis.valeurStock.valeur)}
        />
        <KpiCard
          icon={Wallet}
          label="Créances clients"
          note={{
            text: `${numberFormat.format(kpis.creancesClients.nombreClients)} client${kpis.creancesClients.nombreClients === 1 ? "" : "s"} en crédit`,
            tone: kpis.creancesClients.nombreClients ? "negative" : "neutral",
            trend: kpis.creancesClients.nombreClients ? "down" : undefined,
          }}
          tone="red"
          value={formatCurrency(kpis.creancesClients.valeur)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section aria-labelledby="weekly-sales-title" className="card min-w-0 p-5 xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900" id="weekly-sales-title">
                Ventes de la semaine
              </h3>
              <p className="mt-1 text-xs capitalize text-slate-500">
                {chartData.length > 0
                  ? `Du ${chartData[0].label} au ${chartData[6].label}`
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-3 bg-blue-600" />
                Ventes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-3 bg-emerald-600" />
                Bénéfice
              </span>
            </div>
          </div>
          <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-slate-50" />}>
            <SalesChart data={chartData} formatCurrency={formatCurrency} />
          </Suspense>
        </section>

        <section aria-labelledby="low-stock-title" className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900" id="low-stock-title">
              Alertes stock bas
            </h3>
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
              {alerts.length}
            </span>
          </div>
          {alerts.length ? (
            <ul className="mt-4 space-y-2">
              {alerts.map((product) => (
                <li
                  className="flex items-center justify-between gap-3 rounded-lg bg-amber-50/80 px-3 py-3"
                  key={product.id || product._id}
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-800">{product.nom}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Min. {numberFormat.format(Number(product.seuilAlerte) || 0)} {product.unite || ""}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-amber-700">
                    {numberFormat.format(Number(product.stockActuel) || 0)} {product.unite || ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-lg bg-emerald-50 px-3 py-4 text-sm text-emerald-700">
              Aucun produit sous le seuil d’alerte.
            </p>
          )}
          <Link
            className="mt-4 flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
            to="/stock"
          >
            Voir tout le stock <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </section>
      </div>

      <section aria-labelledby="recent-sales-title" className="card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900" id="recent-sales-title">
            Dernières ventes du jour
          </h3>
          <Link
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            to="/pos"
          >
            Nouvelle vente <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="border-b border-slate-100 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium" scope="col">Réf.</th>
                <th className="px-5 py-3 font-medium" scope="col">Heure</th>
                <th className="px-5 py-3 font-medium" scope="col">Caissier</th>
                <th className="px-5 py-3 font-medium" scope="col">Montant</th>
                <th className="px-5 py-3 font-medium" scope="col">Paiement</th>
                <th className="px-5 py-3 font-medium" scope="col">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.length ? (
                sales.map((sale) => {
                  const status = getSaleStatus(sale.statut);
                  const saleDate = new Date(sale.date);

                  return (
                    <tr className="hover:bg-slate-50" key={sale.id || sale._id || sale.reference}>
                      <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-900">
                        {sale.reference || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                        {Number.isNaN(saleDate.getTime()) ? "—" : timeFormat.format(saleDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">
                        {sale.caissierNom || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-900">
                        {formatCurrency(sale.montantTotal)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                        {getPaymentLabel(sale.paiements)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan={6}>
                    Aucune vente enregistrée aujourd’hui.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="sr-only">
          Tableau des ventes comprenant leur référence, heure, caissier, montant, mode de paiement et statut.
        </p>
      </section>
    </section>
  );
}
