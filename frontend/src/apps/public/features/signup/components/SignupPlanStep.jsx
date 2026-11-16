import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";

function formatPrice(amount, currency) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function PlanLoading() {
  return (
    <ul
      aria-label="Chargement des forfaits"
      className="grid gap-4 sm:grid-cols-2"
      role="status"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <li
          aria-hidden="true"
          className="animate-pulse rounded-xl border border-slate-200 p-4"
          key={index}
        >
          <div           className="h-5 w-28 rounded bg-slate-200" />
          <div className="mt-4 h-7 w-36 rounded bg-slate-200" />
          <div className="mt-4 h-4 w-full rounded bg-slate-200" />
          <div className="mt-2 h-4 w-4/5 rounded bg-slate-200" />
        </li>
      ))}
    </ul>
  );
}

function PlanCard({ plan, cycle, selected, onSelect }) {
  const price = plan.prix;
  const discount = cycle === "yearly" ? plan.remiseAnnuellePourcent ?? 0 : 0;
  const annualPrice = Math.round(price * 12 * (1 - discount / 100));
  const monthlyPrice =
    cycle === "yearly" ? annualPrice / 12 : price;
  const annualSavings = price * 12 - annualPrice;
  const features = plan.fonctionnalitesSupplementaires ?? [];
  const id = plan._id ?? plan.id;

  return (
    <li>
      <button
        aria-pressed={selected}
        className={`relative h-full w-full rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
          selected
            ? "border-brand-600 bg-blue-50/60 ring-2 ring-blue-100"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
        onClick={() => onSelect(id)}
        type="button"
      >
        {plan.populaire && (
          <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-brand-800">
            <Sparkles aria-hidden="true" size={12} />
            Le plus populaire
          </span>
        )}
        <span className="flex items-start justify-between gap-3">
          <span>
            <span className="block text-base font-semibold text-slate-900">
              {plan.nom}
            </span>
            <span className="mt-1 block min-h-10 text-xs leading-5 text-slate-500">
              {plan.description}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              selected
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-300 bg-white"
            }`}
          >
            {selected && <Check size={13} strokeWidth={3} />}
          </span>
        </span>

        <span className="mt-4 block">
          <span className="block text-2xl font-bold tracking-tight text-slate-900">
            {formatPrice(monthlyPrice, plan.devise)}
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            par mois{cycle === "yearly" ? ", facturé annuellement" : ""}
          </span>
          {cycle === "yearly" && discount > 0 && (
            <span className="mt-1.5 block text-xs font-medium text-emerald-700">
              Économisez {formatPrice(annualSavings, plan.devise)} par an
            </span>
          )}
          {cycle === "yearly" && (
            <span className="mt-1 block text-xs text-slate-500">
              Soit {formatPrice(annualPrice, plan.devise)} par an
            </span>
          )}
        </span>

        <span className="mt-4 block border-t border-slate-200/80 pt-3">
          {features.length > 0 ? (
            <span className="space-y-2">
              {features.slice(0, 4).map((feature) => (
                <span
                  className="flex items-start gap-2 text-xs leading-5 text-slate-600"
                  key={feature}
                >
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-emerald-600"
                    size={14}
                  />
                  {feature}
                </span>
              ))}
            </span>
          ) : (
            <span className="flex items-start gap-2 text-xs text-slate-500">
              <CircleHelp aria-hidden="true" size={14} />
              Détails du forfait disponibles après sélection.
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

export default function SignupPlanStep({
  plans,
  isPending,
  isFetching,
  isError,
  error,
  refetch,
  planId,
  cycle,
  jourPrelevement,
  onChange,
  onContinue,
  onBack,
}) {
  const [fieldError, setFieldError] = useState("");
  const apiError = isError ? parseApiError(error) : null;
  const selectedPlan = plans?.find(
    (plan) => String(plan._id ?? plan.id) === planId,
  );

  function continueToReview() {
    if (!selectedPlan) {
      setFieldError("Sélectionnez un forfait avant de continuer.");
      return;
    }

    setFieldError("");
    onContinue();
  }

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
        Étape 3 · Forfait
      </p>
      <h2
        className="mt-2 text-xl font-bold text-slate-900"
        id="signup-step-title"
      >
        Choisissez votre forfait
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Les offres et tarifs sont chargés depuis les forfaits publiés par
        Stockline.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div
          aria-label="Cycle de facturation"
          className="inline-flex rounded-lg bg-slate-100 p-1"
          role="group"
        >
          <button
            aria-pressed={cycle === "monthly"}
            className={`min-h-11 rounded-md px-3.5 text-sm font-medium transition ${
              cycle === "monthly"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => onChange({ cycle: "monthly" })}
            type="button"
          >
            Mensuel
          </button>
          <button
            aria-pressed={cycle === "yearly"}
            className={`min-h-11 rounded-md px-3.5 text-sm font-medium transition ${
              cycle === "yearly"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => onChange({ cycle: "yearly" })}
            type="button"
          >
            Annuel
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Les remises annuelles sont celles définies pour chaque offre.
        </p>
      </div>

      <div className="mt-5">
        {isPending && <PlanLoading />}

        {isError && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 p-4"
            role="alert"
          >
            <p className="text-sm font-semibold text-red-900">
              Impossible de charger les forfaits
            </p>
            <p className="mt-1 text-sm text-red-800">{apiError.message}</p>
            <button
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-red-900 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-60"
              disabled={isFetching}
              onClick={() => void refetch()}
              type="button"
            >
              <RefreshCw
                aria-hidden="true"
                className={isFetching ? "animate-spin" : ""}
                size={15}
              />
              Réessayer
            </button>
          </div>
        )}

        {!isPending && !isError && plans?.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-sm font-semibold text-slate-900">
              Aucun forfait disponible pour le moment
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Revenez plus tard ou contactez l’équipe Stockline.
            </p>
          </div>
        )}

        {!isPending && !isError && plans?.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard
                cycle={cycle}
                key={plan._id ?? plan.id}
                onSelect={(nextPlanId) => {
                  setFieldError("");
                  onChange({ planId: nextPlanId });
                }}
                plan={plan}
                selected={String(plan._id ?? plan.id) === planId}
              />
            ))}
          </ul>
        )}
      </div>

      {selectedPlan && (
        <div className="mt-6">
          <label
            className="text-sm font-medium text-slate-800"
            htmlFor="signup-debit-day"
          >
            Jour de prélèvement souhaité
          </label>
          <select
            className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-4 focus:ring-blue-100 sm:max-w-xs"
            id="signup-debit-day"
            onChange={(event) =>
              onChange({ jourPrelevement: Number(event.target.value) })
            }
            value={jourPrelevement}
          >
            {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
              <option key={day} value={day}>
                {day === 1 ? "Le 1er du mois" : `Le ${day} du mois`}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">
            Vous pourrez choisir un jour entre le 1er et le 28 pour éviter les
            dates qui n’existent pas tous les mois.
          </p>
        </div>
      )}

      {fieldError && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {fieldError}
        </p>
      )}

      <div className="mt-7 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Retour aux coordonnées
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending || isFetching || isError || !plans?.length}
          onClick={continueToReview}
          type="button"
        >
          Récapitulatif
          <ArrowRight aria-hidden="true" size={16} />
        </button>
      </div>
    </>
  );
}
