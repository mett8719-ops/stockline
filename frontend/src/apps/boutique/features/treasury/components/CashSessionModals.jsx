import { useState } from "react";
import { Printer } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { formatDateTime } from "@/core/utils/formatDate.js";
import { formatMoney } from "@/core/utils/formatMoney.js";
import Button from "@/components/ui/Button.jsx";
import Input from "@/components/ui/Input.jsx";
import Modal from "@/components/ui/Modal.jsx";
import { validateCashSessionAmount } from "../schemas.js";

function SessionError({ error }) {
  if (!error) return null;

  return (
    <p
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      role="alert"
    >
      {parseApiError(error).message}
    </p>
  );
}

export function OpenCashSessionModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [openingFund, setOpeningFund] = useState("");
  const [error, setError] = useState("");
  const [requestError, setRequestError] = useState(null);

  function close() {
    if (isSubmitting) return;
    setOpeningFund("");
    setError("");
    setRequestError(null);
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateCashSessionAmount(openingFund);
    setError(validationError);
    setRequestError(null);
    if (validationError) return;

    try {
      await onSubmit({
        fondsOuverture: Number(openingFund || 0),
        caisseNom: "Caisse principale",
      });
      close();
    } catch (submitError) {
      setRequestError(submitError);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Ouvrir la caisse"
      description="Saisissez le montant de départ présent dans le tiroir-caisse."
      size="sm"
      closeOnOverlayClick={!isSubmitting}
      footer={
        <>
          <Button
            variant="secondary"
            className="flex-1"
            disabled={isSubmitting}
            onClick={close}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            form="open-cash-session-form"
            className="flex-1"
            isLoading={isSubmitting}
          >
            Ouvrir la caisse
          </Button>
        </>
      }
    >
      <form
        id="open-cash-session-form"
        className="space-y-4"
        onSubmit={handleSubmit}
        noValidate
      >
        <Input
          autoFocus
          label="Fonds de caisse initial (FCFA)"
          name="fondsOuverture"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={openingFund}
          onChange={(event) => {
            setOpeningFund(event.target.value);
            setError("");
          }}
          placeholder="Ex. 50000"
          error={error}
          disabled={isSubmitting}
        />
        <p className="text-xs leading-5 text-slate-500">
          Le montant et votre identité de caissier seront enregistrés par le
          serveur à l’ouverture.
        </p>
        <SessionError error={requestError} />
      </form>
    </Modal>
  );
}

export function CloseCashSessionModal({
  isOpen,
  onClose,
  session,
  onSubmit,
  isSubmitting = false,
}) {
  const [countedFund, setCountedFund] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [requestError, setRequestError] = useState(null);

  function close() {
    if (isSubmitting) return;
    setCountedFund("");
    setNotes("");
    setError("");
    setRequestError(null);
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateCashSessionAmount(countedFund, {
      required: true,
    });
    setError(validationError);
    setRequestError(null);
    if (validationError) return;

    try {
      await onSubmit({
        fondsComptes: Number(countedFund),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      close();
    } catch (submitError) {
      setRequestError(submitError);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Clôturer la caisse"
      description="Comptez les espèces présentes dans le tiroir pour établir le Z de caisse."
      size="sm"
      closeOnOverlayClick={!isSubmitting}
      footer={
        <>
          <Button
            variant="secondary"
            className="flex-1"
            disabled={isSubmitting}
            onClick={close}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            form="close-cash-session-form"
            variant="danger"
            className="flex-1"
            isLoading={isSubmitting}
          >
            Clôturer et générer le Z
          </Button>
        </>
      }
    >
      <form
        id="close-cash-session-form"
        className="space-y-4"
        onSubmit={handleSubmit}
        noValidate
      >
        <dl className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">Caisse</dt>
            <dd className="font-medium text-slate-900">
              {session?.caisseNom || "Caisse principale"}
            </dd>
          </div>
          {session?.ouvertParNom && (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Ouverte par</dt>
              <dd className="font-medium text-slate-900">
                {session.ouvertParNom}
              </dd>
            </div>
          )}
          {session?.ouverteLe && (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-600">Heure d’ouverture</dt>
              <dd className="font-medium text-slate-900">
                {formatDateTime(session.ouverteLe)}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">Fonds initial</dt>
            <dd className="font-semibold text-slate-900">
              {formatMoney(session?.fondsOuverture ?? 0)}
            </dd>
          </div>
        </dl>
        <Input
          autoFocus
          label="Montant réel compté (FCFA)"
          name="fondsComptes"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={countedFund}
          onChange={(event) => {
            setCountedFund(event.target.value);
            setError("");
          }}
          placeholder="Ex. 125000"
          required
          error={error}
          disabled={isSubmitting}
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-800">
            Notes (facultatif)
          </span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            rows={2}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:bg-slate-100"
          />
        </label>
        <SessionError error={requestError} />
      </form>
    </Modal>
  );
}

function ReportAmount({ label, value, emphasis = false }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd
        className={`text-right text-sm ${
          emphasis ? "font-bold text-slate-900" : "font-medium text-slate-800"
        }`}
      >
        {formatMoney(value)}
      </dd>
    </div>
  );
}

export function CashClosingReportModal({ report, session, onClose }) {
  if (!report) return null;

  const differenceClass =
    report.ecart === 0
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : report.ecart > 0
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-800";

  return (
    <Modal
      isOpen={Boolean(report)}
      onClose={onClose}
      title="Z de caisse"
      description="Rapport de clôture de la session."
      size="md"
      className="print:!max-w-none print:!border-0 print:!shadow-none"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end print:hidden">
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Imprimer / Enregistrer PDF
          </Button>
        </div>
      }
    >
      <div className="z-report space-y-4">
        <header className="border-b border-slate-200 pb-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Stockline · Rapport de clôture
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {session?.caisseNom || "Caisse principale"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Référence : {session?.reference || "—"}
          </p>
        </header>
        <dl>
          <ReportAmount label="Fonds d’ouverture" value={report.fondsOuverture} />
          <ReportAmount label="Total des ventes" value={report.totalVentes} />
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2">
            <dt className="text-sm text-slate-600">Nombre de ventes</dt>
            <dd className="text-sm font-medium text-slate-800">
              {report.nombreVentes}
            </dd>
          </div>
          {Object.entries(report.ventilationParMode).map(([mode, amount]) => (
            <ReportAmount
              key={mode}
              label={`Paiements · ${paymentMethodLabels[mode] ?? mode}`}
              value={amount}
            />
          ))}
          <ReportAmount label="Total des dépenses" value={report.totalDepenses} />
          <ReportAmount
            label="Fonds théorique"
            value={report.fondsTheorique}
            emphasis
          />
          <ReportAmount label="Fonds réellement compté" value={report.fondsComptes} />
        </dl>
        <div
          className={`rounded-lg border px-4 py-3 ${differenceClass}`}
          role="status"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold">Écart de caisse</span>
            <span className="text-lg font-bold">
              {report.ecart > 0 ? "+" : ""}
              {formatMoney(report.ecart)}
            </span>
          </div>
          <p className="mt-1 text-sm">{report.interpretation}</p>
        </div>
        {session?.fermeeLe && (
          <p className="text-right text-xs text-slate-500">
            Clôturée le {formatDateTime(session.fermeeLe)}
            {session.fermeeParNom ? ` par ${session.fermeeParNom}` : ""}
          </p>
        )}
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          [role="dialog"], [role="dialog"] * { visibility: visible !important; }
          [role="dialog"] {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
          }
          .z-report { padding: 1.5rem !important; color: #0f172a !important; }
          @page { margin: 12mm; }
        }
      `}</style>
    </Modal>
  );
}
