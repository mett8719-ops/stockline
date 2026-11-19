import { useEffect, useState } from "react";
import { AlertCircle, Flag, Pencil, RefreshCw } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useAuth } from "@/core/hooks/useAuth.js";
import FlagTargetingDialog from "../components/FlagTargetingDialog.jsx";
import { useFeatureFlags, useUpsertFeatureFlag } from "../hooks.js";
import { usePlatformPlans } from "../../shared/hooks.js";

const environmentPresentation = {
  production: {
    label: "Production",
    className: "bg-emerald-50 text-emerald-700",
  },
  staging: {
    label: "Staging",
    className: "bg-amber-50 text-amber-700",
  },
};

function getId(item) {
  return String(item?._id || item?.id || item);
}

function targetingLabel(flag, plansById) {
  switch (flag.strategie) {
    case "plan": {
      const names = (flag.plansCibles || [])
        .map((planId) => plansById.get(getId(planId)))
        .filter(Boolean);
      return names.length > 0
        ? names.join(" + ")
        : `${(flag.plansCibles || []).length} plan(s)`;
    }
    case "beta":
      return `Bêta · ${(flag.boutiquesCibles || []).length} boutique(s)`;
    case "pourcentage":
      return `${Number(flag.pourcentageDeploiement) || 0}%`;
    default:
      return "Tous les tenants";
  }
}

function FeatureFlagSkeleton() {
  return (
    <div aria-label="Chargement des feature flags" className="divide-y divide-slate-100" role="status">
      <span className="sr-only">Chargement des feature flags…</span>
      {Array.from({ length: 5 }, (_, index) => (
        <div className="space-y-2 px-4 py-4 sm:px-5" key={index}>
          <div className="flex items-center gap-2">
            <div className="skeleton h-4 w-44" />
            <div className="skeleton h-4 w-16" />
          </div>
          <div className="skeleton h-3 w-3/4" />
          <div className="skeleton h-3 w-36" />
        </div>
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(onDismiss, 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      className={`fixed right-4 top-4 z-[70] max-w-sm rounded-lg px-4 py-3 text-sm shadow-lg ${
        toast.type === "error"
          ? "bg-red-700 text-white"
          : "bg-emerald-700 text-white"
      }`}
      role={toast.type === "error" ? "alert" : "status"}
    >
      {toast.message}
    </div>
  );
}

export default function FeatureFlagsPage() {
  const { user } = useAuth();
  const canWrite = user?.role === "super_admin";
  const flagsQuery = useFeatureFlags();
  const plansQuery = usePlatformPlans();
  const upsertMutation = useUpsertFeatureFlag();
  const [dialogFlag, setDialogFlag] = useState(null);
  const [toast, setToast] = useState(null);
  const [mutationError, setMutationError] = useState("");
  const flags = flagsQuery.data || [];
  const plansById = new Map(
    (plansQuery.data || []).map((plan) => [getId(plan), plan.nom]),
  );

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  async function toggleFlag(flag) {
    if (!canWrite) return;
    setMutationError("");

    try {
      await upsertMutation.mutateAsync({
        cle: flag.cle,
        nom: flag.nom,
        description: flag.description || "",
        environnement: flag.environnement,
        actif: !flag.actif,
        strategie: flag.strategie || "global",
        plansCibles: (flag.plansCibles || []).map(getId),
        boutiquesCibles: (flag.boutiquesCibles || []).map(getId),
        pourcentageDeploiement: Number(flag.pourcentageDeploiement) || 0,
      });
      showToast(`« ${flag.nom} » ${flag.actif ? "désactivé" : "activé"}.`);
    } catch (error) {
      setMutationError(parseApiError(error).message);
    }
  }

  function handleTargetSaved(message) {
    setDialogFlag(null);
    showToast(message);
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Feature Flags</h2>
        <p className="mt-1 text-sm text-slate-500">
          Activez ou désactivez des fonctionnalités pour tout ou partie des tenants.
        </p>
      </header>

      {mutationError && (
        <div
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{mutationError}</span>
        </div>
      )}

      <div className="card overflow-hidden">
        {flagsQuery.isPending ? (
          <FeatureFlagSkeleton />
        ) : flagsQuery.isError ? (
          <div className="p-5">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p>Impossible de charger les feature flags : {parseApiError(flagsQuery.error).message}</p>
                <button
                  className="mt-2 inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                  onClick={() => flagsQuery.refetch()}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                  Réessayer
                </button>
              </div>
            </div>
          </div>
        ) : flags.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Flag aria-hidden="true" className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="mt-3 text-sm font-semibold text-slate-800">
              Aucun feature flag
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Les fonctionnalités configurées apparaîtront ici.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {flags.map((flag) => {
              const environment =
                environmentPresentation[flag.environnement] ||
                environmentPresentation.staging;
              return (
                <li
                  className={`flex min-h-[72px] items-center justify-between gap-3 px-4 py-3 transition sm:px-5 ${
                    flag.actif ? "bg-white" : "bg-slate-50/70"
                  }`}
                  key={flag._id || flag.cle}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {flag.nom}
                      </h3>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${environment.className}`}>
                        {environment.label}
                      </span>
                    </div>
                    {flag.description && (
                      <p className="mt-1 text-xs text-slate-500">
                        {flag.description}
                      </p>
                    )}
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-slate-400">
                      <span>{flag.cle}</span>
                      <span aria-hidden="true">·</span>
                      <span>Ciblage : {targetingLabel(flag, plansById)}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      aria-label={`Modifier le ciblage de ${flag.nom}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-platform-700 focus:outline-none focus:ring-2 focus:ring-platform-200 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
                      disabled={!canWrite || upsertMutation.isPending}
                      onClick={() => setDialogFlag(flag)}
                      title={
                        canWrite
                          ? "Modifier le ciblage"
                          : "Réservé au Super-Admin"
                      }
                      type="button"
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                      <span className="hidden sm:inline">Ciblage</span>
                    </button>
                    <button
                      aria-checked={Boolean(flag.actif)}
                      aria-label={`${flag.actif ? "Désactiver" : "Activer"} ${flag.nom}`}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-platform-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
                        flag.actif ? "bg-platform-600" : "bg-slate-300"
                      }`}
                      disabled={!canWrite || upsertMutation.isPending}
                      onClick={() => toggleFlag(flag)}
                      role="switch"
                      title={
                        canWrite
                          ? flag.actif
                            ? "Désactiver ce flag"
                            : "Activer ce flag"
                          : "Réservé au Super-Admin"
                      }
                      type="button"
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          flag.actif ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Toast onDismiss={() => setToast(null)} toast={toast} />
      {dialogFlag && (
        <FlagTargetingDialog
          flag={dialogFlag}
          onClose={() => setDialogFlag(null)}
          onSaved={handleTargetSaved}
        />
      )}
    </section>
  );
}
