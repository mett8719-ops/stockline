import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useCustomer } from "../hooks.js";
import { customerCategoryLabels } from "../schemas.js";

const moneyFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const paymentMethodLabels = {
  especes: "Espèces",
  mobile_money: "Mobile money",
  carte: "Carte bancaire",
  virement: "Virement",
  credit: "Crédit",
};

function formatMoney(value) {
  return `${moneyFormat.format(Number(value) || 0)} FCFA`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

function SummaryCard({ icon: Icon, label, value, tone = "brand" }) {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    brand: "bg-brand-50 text-brand-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function HistorySection({ children, count, icon: Icon, title }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <Icon aria-hidden="true" className="h-4 w-4 text-slate-500" />
          {title}
        </h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {count}
        </span>
      </header>
      {children}
    </section>
  );
}

function EmptyHistory({ children }) {
  return <p className="px-5 py-8 text-center text-sm text-slate-500">{children}</p>;
}

function HistoryTable({ columns, rows, rowKey }) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th className={`px-5 py-3 ${column.align === "right" ? "text-right" : ""}`} key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={row[rowKey] || `${row.date || "row"}-${index}`}>
              {columns.map((column) => (
                <td
                  className={`px-5 py-3.5 text-slate-700 ${column.align === "right" ? "text-right" : ""}`}
                  key={column.key}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadingDetail() {
  return (
    <div aria-label="Chargement de la fiche client" className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="skeleton h-7 w-40" />
      <div className="skeleton h-32 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { customerId } = useParams();
  const customerQuery = useCustomer(customerId);

  if (customerQuery.isPending) return <LoadingDetail />;

  if (customerQuery.error) {
    return (
      <main className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900" to="/customers">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Retour aux clients
        </Link>
        <div className="mt-8 flex flex-col items-center rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle aria-hidden="true" className="h-5 w-5" />
          </span>
          <h1 className="mt-4 font-semibold text-slate-900">Fiche client indisponible</h1>
          <p className="mt-1 text-sm text-slate-500">{parseApiError(customerQuery.error).message}</p>
          <button
            className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => customerQuery.refetch()}
            type="button"
          >
            Réessayer
          </button>
        </div>
      </main>
    );
  }

  const customer = customerQuery.data;
  const balance = Number(customer.soldeCredit) || 0;
  const creditLimit = Number(customer.plafondCredit) || 0;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900" to="/customers">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Retour aux clients
      </Link>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg font-bold text-brand-700">
              {customer.nom.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{customer.nom}</h1>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {customerCategoryLabels[customer.categorie] || "Particulier"}
                </span>
                {balance > 0 && (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                    Impayé : {formatMoney(balance)}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                {customer.telephone && (
                  <a className="inline-flex items-center gap-1.5 hover:text-brand-700" href={`tel:${customer.telephone}`}>
                    <Phone aria-hidden="true" className="h-4 w-4 text-slate-400" />
                    {customer.telephone}
                  </a>
                )}
                {customer.email && (
                  <a className="inline-flex items-center gap-1.5 hover:text-brand-700" href={`mailto:${customer.email}`}>
                    <Mail aria-hidden="true" className="h-4 w-4 text-slate-400" />
                    {customer.email}
                  </a>
                )}
                {customer.adresse && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                    {customer.adresse}
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="shrink-0 text-sm text-slate-500">
            Client depuis le {formatDate(customer.createdAt)}
          </p>
        </div>
        {customer.notes && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{customer.notes}</p>
          </div>
        )}
      </section>

      <section aria-label="Résumé du compte client" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          icon={CircleDollarSign}
          label="Solde dû"
          tone={balance > 0 ? "amber" : "emerald"}
          value={formatMoney(balance)}
        />
        <SummaryCard
          icon={ShoppingBag}
          label="Achats cumulés"
          value={formatMoney(customer.totalAchats)}
        />
        <SummaryCard
          icon={Wallet}
          label="Plafond de crédit"
          value={creditLimit > 0 ? formatMoney(creditLimit) : "Aucune limite définie"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <HistorySection
          count={customer.historiqueAchats.length}
          icon={ShoppingBag}
          title="Achats récents"
        >
          {customer.historiqueAchats.length ? (
            <HistoryTable
              columns={[
                { key: "reference", label: "Référence", render: (sale) => sale.reference || "Vente" },
                { key: "date", label: "Date", render: (sale) => formatDate(sale.date) },
                { key: "montantTotal", label: "Total", align: "right", render: (sale) => formatMoney(sale.montantTotal) },
                { key: "montantCredit", label: "À crédit", align: "right", render: (sale) => formatMoney(sale.montantCredit) },
              ]}
              rowKey="_id"
              rows={customer.historiqueAchats}
            />
          ) : <EmptyHistory>Aucun achat enregistré.</EmptyHistory>}
        </HistorySection>

        <HistorySection
          count={customer.historiquePaiements.length}
          icon={Wallet}
          title="Versements récents"
        >
          {customer.historiquePaiements.length ? (
            <HistoryTable
              columns={[
                { key: "libelle", label: "Libellé", render: (payment) => payment.libelle || "Versement client" },
                { key: "date", label: "Date", render: (payment) => formatDate(payment.date) },
                { key: "modePaiement", label: "Mode", render: (payment) => paymentMethodLabels[payment.modePaiement] || payment.modePaiement || "—" },
                { key: "montant", label: "Montant", align: "right", render: (payment) => formatMoney(payment.montant) },
              ]}
              rowKey="_id"
              rows={customer.historiquePaiements}
            />
          ) : <EmptyHistory>Aucun versement enregistré.</EmptyHistory>}
        </HistorySection>

        <HistorySection
          count={customer.facturesImpayees.length}
          icon={ReceiptText}
          title="Factures impayées"
        >
          {customer.facturesImpayees.length ? (
            <HistoryTable
              columns={[
                { key: "numero", label: "Facture", render: (invoice) => invoice.numero || "—" },
                { key: "dateEcheance", label: "Échéance", render: (invoice) => (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                    {formatDate(invoice.dateEcheance)}
                  </span>
                ) },
                { key: "montantRestant", label: "Reste dû", align: "right", render: (invoice) => (
                  <span className="font-semibold text-amber-700">{formatMoney(invoice.montantRestant)}</span>
                ) },
              ]}
              rowKey="_id"
              rows={customer.facturesImpayees}
            />
          ) : <EmptyHistory>Aucune facture impayée.</EmptyHistory>}
        </HistorySection>
      </div>
    </main>
  );
}
