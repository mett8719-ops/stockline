import {
  CheckCircle2,
  LoaderCircle,
  MessageSquare,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import {
  businessTypeLabels,
  cycleLabels,
  formatSignupDate,
} from "../schemas.js";

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value || "—"}</dd>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      <dl className="divide-y divide-slate-200/60">{children}</dl>
    </section>
  );
}

export default function SignupDetailPanel({
  canApproveOrReject,
  isLoading,
  onApprove,
  onClose,
  onReject,
  onRequestInfo,
  signup,
}) {
  if (!signup && !isLoading) return null;

  const boutique = signup?.boutique ?? {};
  const proprietaire = signup?.proprietaire ?? {};
  const abonnement = signup?.abonnement ?? {};

  const activityLabel =
    boutique.typeActivite === "autre" && boutique.autreActivite
      ? boutique.autreActivite
      : businessTypeLabels[boutique.typeActivite] || boutique.typeActivite || "—";

  const planName =
    abonnement.planNom || abonnement.planId?.nom || "—";
  const cycleLabel = cycleLabels[abonnement.cycle] || abonnement.cycle || "—";

  const isProcessed =
    signup?.statut === "approved" || signup?.statut === "rejected";

  return (
    <aside
      aria-label="Dossier de demande"
      className="flex h-full flex-col border-t border-slate-200 bg-white lg:w-[440px] lg:shrink-0 lg:border-l lg:border-t-0 xl:w-[480px]"
    >
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">
          Dossier de demande
        </h2>
        <button
          aria-label="Fermer le dossier"
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </header>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center p-8 text-slate-500">
          <LoaderCircle aria-hidden="true" className="mr-2 h-5 w-5 animate-spin text-platform-600" />
          <span className="text-sm">Chargement du dossier…</span>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-platform-200 bg-platform-50/70 px-4 py-3 text-xs leading-relaxed text-platform-800">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-platform-600"
            />
            <p>
              <span className="font-semibold">
                Données protégées / Accès isolé
              </span>{" "}
              — Ce dossier ne contient que les informations soumises lors de
              l&apos;inscription.
            </p>
          </div>

          <InfoSection title="Boutique">
            <InfoRow label="Nom" value={boutique.nom} />
            <InfoRow label="Type" value={activityLabel} />
            <InfoRow label="Ville" value={boutique.ville} />
            <InfoRow label="Adresse" value={boutique.adresse} />
          </InfoSection>

          <InfoSection title="Propriétaire">
            <InfoRow label="Nom complet" value={proprietaire.nomComplet} />
            <InfoRow label="Email" value={proprietaire.email} />
            <InfoRow label="Téléphone" value={proprietaire.telephone} />
          </InfoSection>

          <InfoSection title="Plan & Facturation">
            <InfoRow label="Plan choisi" value={planName} />
            <InfoRow label="Cycle" value={cycleLabel} />
            <InfoRow
              label="Date de soumission"
              value={formatSignupDate(signup?.createdAt)}
            />
          </InfoSection>

          {!isProcessed && (
            <div className="space-y-2.5 pt-2">
              {canApproveOrReject && (
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  onClick={onApprove}
                  type="button"
                >
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  Valider et créer le compte
                </button>
              )}

              <button
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-platform-200"
                onClick={onRequestInfo}
                type="button"
              >
                <MessageSquare aria-hidden="true" className="h-4 w-4" />
                Demander des informations complémentaires
              </button>

              {canApproveOrReject && (
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  onClick={onReject}
                  type="button"
                >
                  <XCircle aria-hidden="true" className="h-4 w-4" />
                  Rejeter la demande
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
