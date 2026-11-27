import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Package,
  Truck,
  Wallet,
} from "lucide-react";
import Badge from "@/components/ui/Badge.jsx";
import Button from "@/components/ui/Button.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import ErrorState from "@/components/ui/ErrorState.jsx";
import Skeleton from "@/components/ui/Skeleton.jsx";
import { parseApiError } from "@/core/api/errors.js";
import { formatDate } from "@/core/utils/formatDate.js";
import { formatMoney } from "@/core/utils/formatMoney.js";
import { paymentMethodLabels } from "@/core/utils/labels.js";
import { useSupplier } from "../hooks.js";

const purchaseStatusLabels = {
  commande: "Commandée",
  partiellement_livre: "Partiellement livrée",
  livre: "Livrée",
  annule: "Annulée",
};

const paymentStatusLabels = {
  non_paye: "Non payée",
  partiel: "Partiellement payée",
  paye: "Payée",
};

const paymentStatusVariants = {
  non_paye: "danger",
  partiel: "warning",
  paye: "success",
};

function SummaryCard({ icon: Icon, label, value, tone = "neutral" }) {
  const tones = {
    neutral: "border-slate-200 bg-white text-slate-900",
    warning: "border-amber-100 bg-amber-50 text-amber-800",
  };

  return (
    <article className={`rounded-xl border p-4 shadow-sm sm:p-5 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon aria-hidden="true" className="h-5 w-5 shrink-0 opacity-70" />
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
    </article>
  );
}

function SectionHeader({ icon: Icon, title, count }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <Icon aria-hidden="true" className="h-4 w-4 text-slate-500" />
        {title}
      </h2>
      <Badge>{count}</Badge>
    </header>
  );
}

function SupplierDetailSkeleton() {
  return (
    <div aria-label="Chargement de la fiche fournisseur" className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Skeleton className="h-6 w-36" />
      <Skeleton className="h-36 w-full" variant="rectangular" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton className="h-24 w-full" key={index} variant="rectangular" />
        ))}
      </div>
    </div>
  );
}

function PurchaseStatus({ status }) {
  const variant = status === "livre" ? "success" : status === "annule" ? "neutral" : "info";
  return <Badge variant={variant}>{purchaseStatusLabels[status] ?? status}</Badge>;
}

function PaymentStatus({ status }) {
  return (
    <Badge variant={paymentStatusVariants[status] ?? "neutral"}>
      {paymentStatusLabels[status] ?? status}
    </Badge>
  );
}

function PurchaseLines({ lines }) {
  if (!lines.length) {
    return <p className="px-4 py-3 text-sm text-slate-500">Aucune ligne détaillée pour cette commande.</p>;
  }

  return (
    <div className="overflow-x-auto border-t border-slate-100 bg-slate-50/70">
      <table className="w-full min-w-[500px] text-left text-xs">
        <thead className="text-slate-500">
          <tr>
            <th className="px-4 py-2.5 font-medium" scope="col">Produit</th>
            <th className="px-4 py-2.5 text-right font-medium" scope="col">Quantité</th>
            <th className="px-4 py-2.5 text-right font-medium" scope="col">Prix d’achat</th>
            <th className="px-4 py-2.5 text-right font-medium" scope="col">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lines.map((line, index) => (
            <tr key={`${line.produitId ?? line.produitNom ?? "ligne"}-${index}`}>
              <td className="px-4 py-2.5 font-medium text-slate-700">{line.produitNom || "Produit"}</td>
              <td className="px-4 py-2.5 text-right text-slate-600">{line.quantite}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-600">{formatMoney(line.prixAchat)}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-slate-800">{formatMoney(line.totalLigne)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SupplierDetailPage() {
  const { supplierId } = useParams();
  const supplierQuery = useSupplier(supplierId);
  const supplier = supplierQuery.data;
  const debt = supplier?.soldeDu ?? 0;
  const queryError = supplierQuery.error
    ? parseApiError(supplierQuery.error).message
    : "";

  if (supplierQuery.isPending) return <SupplierDetailSkeleton />;

  if (supplierQuery.isError && !supplier) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900"
          to="/suppliers"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Retour aux fournisseurs
        </Link>
        <ErrorState
          description={queryError}
          onRetry={() => supplierQuery.refetch()}
          title="Fiche fournisseur indisponible"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900"
        to="/suppliers"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Retour aux fournisseurs
      </Link>

      {supplierQuery.isError && (
        <div
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          <span>Impossible d’actualiser les données. Les informations affichées peuvent être périmées.</span>
          <Button
            className="min-h-9 px-3 py-1.5 text-xs"
            onClick={() => supplierQuery.refetch()}
            variant="secondary"
          >
            Réessayer
          </Button>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"
            >
              <Truck className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{supplier.nom}</h1>
                {debt > 0 ? (
                  <Badge variant="warning">Dette : {formatMoney(debt)}</Badge>
                ) : (
                  <Badge variant="success">Solde réglé</Badge>
                )}
              </div>
              {supplier.contactNom && (
                <p className="mt-2 text-sm font-medium text-slate-700">{supplier.contactNom}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                {supplier.telephone && <span>{supplier.telephone}</span>}
                {supplier.email && <span>{supplier.email}</span>}
                {supplier.adresse && <span>{supplier.adresse}</span>}
              </div>
            </div>
          </div>
          <p className="shrink-0 text-sm text-slate-500">
            Fournisseur depuis le {supplier.createdAt ? formatDate(supplier.createdAt) : "—"}
          </p>
        </div>

        {supplier.produitsHabituels?.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Produits habituels
            </p>
            <div className="flex flex-wrap gap-2">
              {supplier.produitsHabituels.map((product) => (
                <Badge className="font-medium" key={product} variant="neutral">{product}</Badge>
              ))}
            </div>
          </div>
        )}

        {supplier.notes && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{supplier.notes}</p>
          </div>
        )}
      </section>

      <section aria-label="Résumé du compte fournisseur" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          icon={CircleDollarSign}
          label="Dette en cours"
          tone={debt > 0 ? "warning" : "neutral"}
          value={formatMoney(debt)}
        />
        <SummaryCard
          icon={Package}
          label="Achats cumulés"
          value={formatMoney(supplier.totalAchats)}
        />
        <SummaryCard
          icon={CalendarDays}
          label="Dernière commande"
          value={supplier.derniereCommande ? formatDate(supplier.derniereCommande) : "Aucune commande"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            count={supplier.historiqueCommandes.length}
            icon={ClipboardList}
            title="Commandes récentes"
          />
          {supplier.historiqueCommandes.length === 0 ? (
            <EmptyState
              description="Les commandes enregistrées auprès de ce fournisseur apparaîtront ici."
              icon={<Package aria-hidden="true" className="h-6 w-6" />}
              title="Aucune commande"
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {supplier.historiqueCommandes.map((purchase) => (
                <article className="p-4 sm:p-5" key={purchase._id ?? purchase.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{purchase.reference || "Commande fournisseur"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Commandée le {purchase.dateCommande ? formatDate(purchase.dateCommande) : "—"}
                        {purchase.dateLivraison && ` · Livrée le ${formatDate(purchase.dateLivraison)}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {purchase.statut && <PurchaseStatus status={purchase.statut} />}
                      {purchase.statutPaiement && <PaymentStatus status={purchase.statutPaiement} />}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="mt-1 font-semibold text-slate-900">{formatMoney(purchase.montantTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Payé</p>
                      <p className="mt-1 font-medium text-slate-700">{formatMoney(purchase.montantPaye)}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-xs text-slate-500">Reste dû</p>
                      <p className={`mt-1 font-semibold ${purchase.montantRestant > 0 ? "text-amber-700" : "text-slate-700"}`}>
                        {formatMoney(purchase.montantRestant)}
                      </p>
                    </div>
                  </div>
                  <details className="mt-3 rounded-lg border border-slate-200">
                    <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-brand-700 outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
                      Détail des articles ({purchase.lignes.length})
                    </summary>
                    <PurchaseLines lines={purchase.lignes} />
                  </details>
                  {purchase.notes && (
                    <p className="mt-3 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Note : </span>{purchase.notes}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            count={supplier.historiquePaiements.length}
            icon={Wallet}
            title="Paiements échelonnés"
          />
          {supplier.historiquePaiements.length === 0 ? (
            <EmptyState
              description="Les règlements effectués auprès de ce fournisseur apparaîtront ici."
              icon={<Wallet aria-hidden="true" className="h-6 w-6" />}
              title="Aucun paiement enregistré"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                  <tr>
                    <th className="px-4 py-3 sm:px-5" scope="col">Paiement</th>
                    <th className="px-4 py-3" scope="col">Date</th>
                    <th className="px-4 py-3" scope="col">Mode</th>
                    <th className="px-4 py-3 text-right sm:px-5" scope="col">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplier.historiquePaiements.map((payment, index) => (
                    <tr className="text-slate-600" key={payment._id ?? payment.id ?? `${payment.date}-${index}`}>
                      <td className="px-4 py-4 font-medium text-slate-800 sm:px-5">
                        {payment.libelle || "Paiement fournisseur"}
                        {Number.isFinite(payment.soldeApres) && (
                          <p className="mt-1 text-xs font-normal text-slate-500">
                            Dette après paiement : {formatMoney(payment.soldeApres)}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {payment.date ? formatDate(payment.date) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {paymentMethodLabels[payment.modePaiement] ?? payment.modePaiement ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-slate-900 sm:px-5">
                        {formatMoney(payment.montant)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
