import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  Printer,
  ReceiptText,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Badge from "@/components/ui/Badge.jsx";
import Button from "@/components/ui/Button.jsx";
import ErrorState from "@/components/ui/ErrorState.jsx";
import Modal from "@/components/ui/Modal.jsx";
import Skeleton from "@/components/ui/Skeleton.jsx";
import { parseApiError } from "@/core/api/errors.js";
import { formatDate } from "@/core/utils/formatDate.js";
import { formatMoney } from "@/core/utils/formatMoney.js";
import {
  documentStatusLabels,
  documentTypeLabels,
} from "@/core/utils/labels.js";
import {
  useConvertDocumentQuote,
  useDocument,
} from "../hooks.js";
import "../documents-print.css";

const statusVariants = {
  accepte: "info",
  annule: "neutral",
  brouillon: "neutral",
  en_attente: "warning",
  en_retard: "danger",
  expire: "neutral",
  paye: "success",
  refuse: "danger",
};

function DocumentStatus({ status }) {
  return (
    <Badge variant={statusVariants[status] ?? "neutral"}>
      {documentStatusLabels[status] ?? status}
    </Badge>
  );
}

function DetailSkeleton() {
  return (
    <div aria-label="Chargement du document" className="mx-auto max-w-5xl space-y-5">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

function DocumentDetail({ document, onOpenSource }) {
  const documentDate = document.dateValidite ?? document.dateEcheance;

  return (
    <article className="document-print-area mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
      <header className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-start">
        <div>
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            S
          </div>
          <p className="text-sm font-semibold text-slate-900">Stockline</p>
          <p className="mt-1 text-xs text-slate-500">Document commercial</p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {documentTypeLabels[document.type] ?? "Document"}
          </p>
          <h1 className="mt-2 break-all text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {document.numero}
          </h1>
          <div className="mt-3 sm:flex sm:justify-end">
            <DocumentStatus status={document.statut} />
          </div>
        </div>
      </header>

      <section
        aria-label="Informations du document"
        className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2"
      >
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Client
          </h2>
          <p className="mt-2 font-semibold text-slate-900">{document.clientNom}</p>
          {document.clientAdresse && (
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
              {document.clientAdresse}
            </p>
          )}
          {document.clientTelephone && (
            <p className="mt-1 text-sm text-slate-600">
              {document.clientTelephone}
            </p>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:justify-self-end">
          <dt className="text-sm text-slate-500">Date d’émission</dt>
          <dd className="text-right text-sm font-medium text-slate-900">
            <time dateTime={document.dateEmission}>
              {formatDate(document.dateEmission)}
            </time>
          </dd>
          {documentDate && (
            <>
              <dt className="text-sm text-slate-500">
                {document.type === "devis" ? "Valable jusqu’au" : "Échéance"}
              </dt>
              <dd className="text-right text-sm font-medium text-slate-900">
                <time dateTime={documentDate}>{formatDate(documentDate)}</time>
              </dd>
            </>
          )}
          {document.datePaiement && (
            <>
              <dt className="text-sm text-slate-500">Date de paiement</dt>
              <dd className="text-right text-sm font-medium text-slate-900">
                <time dateTime={document.datePaiement}>
                  {formatDate(document.datePaiement)}
                </time>
              </dd>
            </>
          )}
        </dl>
      </section>

      {document.documentSourceId && (
        <p className="border-b border-slate-200 py-4 text-sm text-slate-600">
          Cette facture provient du devis{" "}
          <button
            className="font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
            onClick={() =>
              onOpenSource(
                typeof document.documentSourceId === "string"
                  ? document.documentSourceId
                  : document.documentSourceId._id ??
                      document.documentSourceId.id,
              )
            }
            type="button"
          >
            consulter le devis d’origine
          </button>
        </p>
      )}

      <section aria-label="Lignes du document" className="py-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-3 pr-4" scope="col">Désignation</th>
                <th className="pb-3 px-3 text-right" scope="col">Qté</th>
                <th className="pb-3 px-3 text-right" scope="col">Prix unitaire</th>
                <th className="pb-3 px-3 text-right" scope="col">TVA</th>
                <th className="pb-3 pl-3 text-right" scope="col">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {document.lignes.map((line, index) => (
                <tr key={`${line.designation}-${index}`}>
                  <td className="py-4 pr-4 font-medium text-slate-900">
                    {line.designation}
                    {line.remise > 0 && (
                      <span className="mt-1 block text-xs font-normal text-slate-500">
                        Remise : {formatMoney(line.remise)}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right text-slate-600">
                    {line.quantite}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right text-slate-600">
                    {formatMoney(line.prixUnitaire)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right text-slate-600">
                    {line.tauxTva ?? 0}%
                  </td>
                  <td className="whitespace-nowrap pl-3 py-4 text-right font-semibold text-slate-900">
                    {formatMoney(line.totalLigne)}
                  </td>
                </tr>
              ))}
              {document.lignes.length === 0 && (
                <tr>
                  <td
                    className="py-8 text-center text-slate-500"
                    colSpan={5}
                  >
                    Aucune ligne dans ce document.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="document-summary ml-auto w-full max-w-sm border-t border-slate-200 pt-4">
        <dl className="space-y-3">
          <div className="flex justify-between gap-4 text-sm">
            <dt className="text-slate-500">Sous-total</dt>
            <dd className="font-medium text-slate-900">
              {formatMoney(document.sousTotal)}
            </dd>
          </div>
          {document.remiseGlobale > 0 && (
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-slate-500">Remise globale</dt>
              <dd className="font-medium text-slate-900">
                −{formatMoney(document.remiseGlobale)}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4 text-sm">
            <dt className="text-slate-500">TVA incluse</dt>
            <dd className="font-medium text-slate-900">
              {formatMoney(document.montantTva)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-lg font-bold">
            <dt className="text-slate-900">Total TTC</dt>
            <dd className="text-slate-900">{formatMoney(document.montantTotal)}</dd>
          </div>
          {document.type === "facture" && document.montantPaye > 0 && (
            <>
              <div className="flex justify-between gap-4 text-sm">
                <dt className="text-slate-500">Montant payé</dt>
                <dd className="font-medium text-emerald-700">
                  {formatMoney(document.montantPaye)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <dt className="text-slate-500">Reste à payer</dt>
                <dd className="font-semibold text-slate-900">
                  {formatMoney(document.montantRestant)}
                </dd>
              </div>
            </>
          )}
        </dl>
      </section>

      {document.notes && (
        <section className="mt-8 border-t border-slate-200 pt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes et conditions
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
            {document.notes}
          </p>
        </section>
      )}

      <footer className="mt-10 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
        Document généré avec Stockline · {document.numero}
      </footer>
    </article>
  );
}

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isConfirmingConversion, setIsConfirmingConversion] = useState(false);
  const { data: document, error, isError, isPending, refetch } = useDocument(id);
  const conversion = useConvertDocumentQuote();

  if (isPending) {
    return (
      <main className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <DetailSkeleton />
      </main>
    );
  }

  if (isError || !document) {
    return (
      <main className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white">
          <ErrorState
            description={error ? parseApiError(error).message : "Le document demandé est introuvable."}
            onRetry={refetch}
            title="Impossible de charger le document"
          />
        </div>
      </main>
    );
  }

  const canConvertQuote =
    document.type === "devis" && document.statut === "en_attente";

  async function handleConvert() {
    try {
      const result = await conversion.mutateAsync(id);
      setIsConfirmingConversion(false);
      navigate(`/documents/${encodeURIComponent(result.facture._id ?? result.facture.id)}`, {
        replace: true,
        state: { notice: "Le devis a été converti en facture." },
      });
    } catch {
      setIsConfirmingConversion(false);
    }
  }

  return (
    <main className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl space-y-5">
        {location.state?.notice && (
          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 print:hidden"
            role="status"
          >
            {location.state.notice}
          </div>
        )}
        <nav
          aria-label="Actions sur le document"
          className="flex flex-wrap items-center justify-between gap-3 print:hidden"
        >
          <Button
            onClick={() => navigate("/documents")}
            variant="secondary"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Retour aux documents
          </Button>
          <div className="flex flex-wrap gap-2">
            {canConvertQuote && (
              <Button
                disabled={conversion.isPending}
                onClick={() => setIsConfirmingConversion(true)}
                variant="secondary"
              >
                <ReceiptText aria-hidden="true" className="h-4 w-4" />
                Convertir en facture
              </Button>
            )}
            <Button onClick={() => window.print()} variant="primary">
              <Printer aria-hidden="true" className="h-4 w-4" />
              Imprimer / Enregistrer PDF
            </Button>
          </div>
        </nav>

        {conversion.isError && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden"
            role="alert"
          >
            {parseApiError(conversion.error).message}
          </div>
        )}

        <DocumentDetail
          document={document}
          onOpenSource={(sourceId) =>
            sourceId &&
            navigate(`/documents/${encodeURIComponent(sourceId)}`)
          }
        />
      </div>

      <Modal
        footer={
          <>
            <Button
              disabled={conversion.isPending}
              onClick={() => setIsConfirmingConversion(false)}
              variant="secondary"
            >
              Annuler
            </Button>
            <Button
              isLoading={conversion.isPending}
              onClick={handleConvert}
            >
              Convertir en facture
            </Button>
          </>
        }
        isOpen={isConfirmingConversion}
        onClose={() => {
          if (!conversion.isPending) setIsConfirmingConversion(false);
        }}
        size="sm"
        title="Convertir ce devis ?"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <FileText aria-hidden="true" className="h-5 w-5" />
          </span>
          <p className="text-sm leading-6 text-slate-600">
            Une facture sera créée à partir du devis{" "}
            <strong className="text-slate-900">{document.numero}</strong>. Le devis
            restera consultable et sera marqué comme accepté.
          </p>
        </div>
      </Modal>
    </main>
  );
}
