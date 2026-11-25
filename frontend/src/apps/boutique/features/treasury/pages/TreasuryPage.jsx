import { useState } from "react";
import {
  Download,
  LockKeyhole,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/core/utils/formatDate.js";
import { formatMoney } from "@/core/utils/formatMoney.js";
import { paymentMethodLabels } from "@/core/utils/labels.js";
import { useAuth } from "@/core/hooks/useAuth.js";
import Badge from "@/components/ui/Badge.jsx";
import Button from "@/components/ui/Button.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import ErrorState from "@/components/ui/ErrorState.jsx";
import Skeleton from "@/components/ui/Skeleton.jsx";
import { parseApiError } from "@/core/api/errors.js";
import {
  useCloseTreasurySession,
  useCreateTreasuryTransaction,
  useOpenTreasurySession,
  useTreasuryExport,
  useTreasuryOverview,
} from "../hooks.js";
import TransactionFormModal from "../components/TransactionFormModal.jsx";
import {
  CashClosingReportModal,
  CloseCashSessionModal,
  OpenCashSessionModal,
} from "../components/CashSessionModals.jsx";
import { downloadTreasuryCsv } from "../utils/exportCsv.js";

const periods = [
  { days: 3, label: "3 derniers jours" },
  { days: 7, label: "7 derniers jours" },
  { days: 30, label: "30 derniers jours" },
];

function MetricCard({ label, value, caption, variant = "neutral" }) {
  const styles = {
    neutral: "border-slate-200 bg-white text-slate-900",
    income: "border-emerald-200 bg-emerald-50 text-emerald-700",
    expense: "border-red-200 bg-red-50 text-red-600",
  };
  const labelStyles = {
    neutral: "text-slate-500",
    income: "text-emerald-700",
    expense: "text-red-600",
  };
  const isBalance = variant === "neutral";

  return (
    <article
      className={`rounded-xl border p-5 ${styles[variant]}`}
      aria-label={`${label}: ${formatMoney(value)}`}
    >
      <p className={`mb-2 text-xs font-medium ${labelStyles[variant]}`}>
        {label}
      </p>
      <p
        className={`font-bold tracking-tight ${
          isBalance ? "text-3xl" : "text-2xl"
        }`}
      >
        {formatMoney(value)}
      </p>
      {caption && (
        <p className="mt-1.5 text-xs text-slate-400">{caption}</p>
      )}
    </article>
  );
}

function OperationRow({ operation }) {
  const isIncome = operation.type === "recette";
  const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
  const modePaiement =
    paymentMethodLabels[operation.modePaiement] ??
    operation.modePaiement ??
    "Mode non précisé";

  return (
    <li className="flex items-center gap-3 border-t border-slate-100 px-4 py-3.5 sm:px-5">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isIncome
            ? "bg-emerald-50 text-emerald-600"
            : "bg-red-50 text-red-600"
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">
          {operation.libelle}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{modePaiement}</span>
          {operation.categorie && (
            <>
              <span aria-hidden="true">·</span>
              <span>{operation.categorie}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <time dateTime={operation.date}>
            {formatDateTime(operation.date).split(" ")[1]}
          </time>
        </p>
      </div>
      <p
        className={`shrink-0 text-right text-sm font-semibold ${
          isIncome ? "text-emerald-700" : "text-red-600"
        }`}
      >
        {isIncome ? "+" : "-"}
        {formatMoney(operation.montant)}
      </p>
    </li>
  );
}

function Journal({ journal, isFetching, onRefresh, today }) {
  if (!journal.length) {
    return (
      <EmptyState
        icon={<Wallet className="h-6 w-6" aria-hidden="true" />}
        title="Aucune opération sur cette période"
        description="Les recettes et dépenses enregistrées apparaîtront ici."
      />
    );
  }

  return (
    <div>
      {journal.map((day) => {
        const dayLabel =
          day.jour === today ? "Aujourd’hui" : formatDate(day.jour);

        return (
          <section key={day.jour} aria-label={`Opérations du ${dayLabel}`}>
            <header className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-2.5 text-xs sm:px-5">
              <h3 className="font-medium text-slate-600">{dayLabel}</h3>
              <p className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="text-emerald-700">
                  +{formatMoney(day.recettes)}
                </span>
                <span className="text-red-600">
                  -{formatMoney(day.depenses)}
                </span>
              </p>
            </header>
            <ul>
              {day.operations.map((operation) => (
                <OperationRow
                  key={operation._id ?? `${operation.date}-${operation.libelle}`}
                  operation={operation}
                />
              ))}
            </ul>
          </section>
        );
      })}
      <div className="flex justify-end border-t border-slate-100 px-4 py-3 sm:px-5">
        <Button
          variant="ghost"
          className="!min-h-10"
          isLoading={isFetching}
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Actualiser
        </Button>
      </div>
    </div>
  );
}

function TreasurySkeleton() {
  return (
    <div className="space-y-6" aria-label="Chargement de la trésorerie">
      <div className="grid gap-4 md:grid-cols-3">
        {periods.map((period) => (
          <div
            key={period.days}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-8 w-40" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <Skeleton count={4} />
      </div>
    </div>
  );
}

export default function TreasuryPage() {
  const [selectedPeriod, setSelectedPeriod] = useState(3);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isOpenSessionModalOpen, setIsOpenSessionModalOpen] = useState(false);
  const [isCloseSessionModalOpen, setIsCloseSessionModalOpen] = useState(false);
  const [closingReport, setClosingReport] = useState(null);
  const [exportMessage, setExportMessage] = useState("");
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const { shop } = useAuth();
  const {
    data: overview,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useTreasuryOverview(selectedPeriod);
  const createTransaction = useCreateTreasuryTransaction();
  const openSession = useOpenTreasurySession();
  const closeSession = useCloseTreasurySession();
  const exportTreasury = useTreasuryExport();

  async function handleCreateTransaction(transaction) {
    await createTransaction.mutateAsync(transaction);
  }

  async function handleOpenSession(session) {
    await openSession.mutateAsync(session);
  }

  async function handleCloseSession(session) {
    const result = await closeSession.mutateAsync(session);
    setClosingReport(result);
  }

  async function handleExport() {
    setExportMessage("");
    const end = new Date();
    const start = new Date(end.getTime() - selectedPeriod * 24 * 60 * 60 * 1000);

    try {
      const exportData = await exportTreasury.mutateAsync({
        from: start.toISOString(),
        to: end.toISOString(),
      });
      downloadTreasuryCsv(exportData);
      setExportMessage("Le fichier CSV compatible Excel a été téléchargé.");
    } catch (exportError) {
      setExportMessage(parseApiError(exportError).message);
    }
  }

  const formattedPeriod = overview
    ? `${formatDate(overview.periode.debut)} – ${formatDate(overview.periode.fin)}`
    : "";
  const apiError = isError ? parseApiError(error) : null;
  const cashLocation = [
    overview?.sessionCaisse?.caisseNom || "Caisse principale",
    shop?.ville,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Trésorerie</h2>
          <p className="mt-1 text-sm text-slate-500">
            Suivi de caisse et des flux financiers
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {overview?.sessionCaisse ? (
            <Button
              variant="secondary"
              onClick={() => setIsCloseSessionModalOpen(true)}
            >
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              Clôture de caisse
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setIsOpenSessionModalOpen(true)}
            >
              <Wallet className="h-4 w-4" aria-hidden="true" />
              Ouvrir la caisse
            </Button>
          )}
          <Button onClick={() => setIsTransactionModalOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Enregistrer
          </Button>
        </div>
      </header>

      {isPending && <TreasurySkeleton />}

      {isError && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <ErrorState
            title="Impossible de charger la trésorerie"
            description={apiError.message}
            onRetry={() => refetch()}
          />
        </div>
      )}

      {!isPending && !isError && overview && (
        <>
          <section
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Indicateurs de trésorerie"
          >
            <MetricCard
              label="Solde de caisse"
              value={overview.soldeCaisse}
              caption={cashLocation}
            />
            <MetricCard
              label="Total recettes (période)"
              value={overview.periode.totalRecettes}
              variant="income"
            />
            <MetricCard
              label="Total dépenses (période)"
              value={overview.periode.totalDepenses}
              variant="expense"
            />
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="font-semibold text-slate-900">Journal de caisse</h2>
                {formattedPeriod && (
                  <p className="mt-1 text-xs text-slate-500">{formattedPeriod}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="!min-h-11"
                  isLoading={exportTreasury.isPending}
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Exporter CSV
                </Button>
                <Badge variant={isFetching ? "warning" : "success"}>
                  {isFetching ? "Actualisation…" : "À jour"}
                </Badge>
                <label className="sr-only" htmlFor="treasury-period">
                  Période du journal
                </label>
                <select
                  id="treasury-period"
                  value={selectedPeriod}
                  onChange={(event) =>
                    setSelectedPeriod(Number(event.target.value))
                  }
                  className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  {periods.map((period) => (
                    <option key={period.days} value={period.days}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>
            </header>
            <Journal
              journal={overview.journal}
              isFetching={isFetching}
              onRefresh={() => refetch()}
              today={today}
            />
            {exportMessage && (
              <p
                className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600"
                role="status"
              >
                {exportMessage}
              </p>
            )}
          </section>
          {overview.sessionCaisse && (
            <aside className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-semibold">Session de caisse ouverte</p>
              <p className="mt-1 text-emerald-800">
                {overview.sessionCaisse.caisseNom || "Caisse principale"}
                {overview.sessionCaisse.ouvertParNom
                  ? ` · ouverte par ${overview.sessionCaisse.ouvertParNom}`
                  : ""}
                {overview.sessionCaisse.ouverteLe
                  ? ` · depuis le ${formatDateTime(overview.sessionCaisse.ouverteLe)}`
                  : ""}
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Fonds initial :{" "}
                {formatMoney(overview.sessionCaisse.fondsOuverture)}
              </p>
            </aside>
          )}
        </>
      )}

      {exportMessage && !overview && (
        <p className="text-sm text-slate-600" role="status">
          {exportMessage}
        </p>
      )}

      <OpenCashSessionModal
        isOpen={isOpenSessionModalOpen}
        onClose={() => setIsOpenSessionModalOpen(false)}
        onSubmit={handleOpenSession}
        isSubmitting={openSession.isPending}
      />
      <CloseCashSessionModal
        isOpen={isCloseSessionModalOpen}
        onClose={() => setIsCloseSessionModalOpen(false)}
        session={overview?.sessionCaisse}
        onSubmit={handleCloseSession}
        isSubmitting={closeSession.isPending}
      />
      <CashClosingReportModal
        report={closingReport?.rapport}
        session={closingReport?.session}
        onClose={() => setClosingReport(null)}
      />
      <TransactionFormModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSubmit={handleCreateTransaction}
        isSubmitting={createTransaction.isPending}
      />
    </div>
  );
}
