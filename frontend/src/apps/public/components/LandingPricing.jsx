import { useState } from "react";
import { ArrowRight, Check, CircleHelp, RefreshCw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { parseApiError } from "@/core/api/errors.js";
import { usePublicPlans } from "../features/landing/hooks.js";

function formatPrice(amount, currency) {
  if (!Number.isFinite(amount) || typeof currency !== "string" || !currency) {
    throw new TypeError("Le prix ou la devise du forfait est invalide.");
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function PlanSkeleton() {
  return (
    <li
      aria-hidden="true"
      className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6"
    >
      <div className="skeleton h-5 w-24" />
      <div className="skeleton mt-4 h-4 w-full" />
      <div className="skeleton mt-8 h-9 w-36" />
      <div className="skeleton mt-3 h-4 w-24" />
      <div className="skeleton mt-7 h-11 w-full rounded-lg" />
      <div className="mt-7 space-y-4">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-4/5" />
      </div>
    </li>
  );
}

function PlanCard({ plan, isAnnual }) {
  const planId = plan._id ?? plan.id;
  const monthlyPrice = plan.prix;
  const discount = isAnnual ? plan.remiseAnnuellePourcent ?? 0 : 0;
  const displayedPrice = Math.round(monthlyPrice * (1 - discount / 100));
  const yearlySavings = Math.round(monthlyPrice * 12 * (discount / 100));
  const features = Array.isArray(plan.fonctionnalitesSupplementaires)
    ? plan.fonctionnalitesSupplementaires
    : [];
  const isPopular = plan.populaire === true;

  if (!planId || typeof plan.nom !== "string" || !plan.nom.trim()) {
    throw new TypeError("Un forfait reçu de l’API ne contient pas son identité.");
  }

  return (
    <li
      className={`relative flex flex-col rounded-2xl border bg-white p-6 ${
        isPopular
          ? "border-brand-600 shadow-[0_15px_45px_-22px_rgba(37,99,235,0.5)] ring-1 ring-brand-600"
          : "border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
      }`}
    >
      {isPopular && (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
          <Sparkles aria-hidden="true" size={13} />
          Le plus populaire
        </span>
      )}

      <h3 className="text-lg font-bold text-slate-900">{plan.nom}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
        {plan.description}
      </p>

      <div className="mt-6">
        <p className="text-3xl font-bold tracking-tight text-slate-900">
          {formatPrice(displayedPrice, plan.devise)}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          par mois{isAnnual ? ", facturé annuellement" : ""}
        </p>
        {isAnnual && discount > 0 && (
          <p className="mt-2 text-xs font-medium text-emerald-700">
            Économisez {formatPrice(yearlySavings, plan.devise)} par an
          </p>
        )}
      </div>

      <Link
        to={`/inscription?plan=${encodeURIComponent(planId)}&cycle=${isAnnual ? "yearly" : "monthly"}`}
        className={`mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
          isPopular
            ? "bg-brand-600 text-white hover:bg-brand-700"
            : "bg-slate-100 text-slate-800 hover:bg-slate-200"
        }`}
      >
        {plan.nom.toLowerCase() === "enterprise"
          ? "Nous contacter"
          : plan.nom.toLowerCase() === "pro"
            ? "Choisir Pro"
            : "Démarrer gratuitement"}
        <ArrowRight aria-hidden="true" size={16} />
      </Link>

      <ul className="mt-7 space-y-3.5 border-t border-slate-100 pt-6">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2.5 text-sm leading-5 text-slate-600"
          >
            <Check
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-emerald-600"
              size={16}
              strokeWidth={2.5}
            />
            <span>{feature}</span>
          </li>
        ))}
        {features.length === 0 && (
          <li className="flex items-start gap-2.5 text-sm text-slate-500">
            <CircleHelp
              aria-hidden="true"
              className="mt-0.5 shrink-0"
              size={16}
            />
            Les détails de ce forfait seront bientôt disponibles.
          </li>
        )}
      </ul>
    </li>
  );
}

export default function LandingPricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const { data: plans, isPending, isError, error, refetch, isFetching } =
    usePublicPlans();
  const apiError = isError ? parseApiError(error) : null;
  const annualDiscounts = plans?.map((plan) => plan.remiseAnnuellePourcent ?? 0);
  const sharedAnnualDiscount =
    annualDiscounts?.length &&
    annualDiscounts.every((discount) => discount === annualDiscounts[0])
      ? annualDiscounts[0]
      : null;

  return (
    <section
      id="tarifs"
      className="scroll-mt-16 bg-white px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold text-brand-600">
            Des offres adaptées à votre activité
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Tarifs clairs, sans surprise
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-500 sm:text-lg">
            Choisissez le forfait qui correspond à votre boutique. Les tarifs
            affichés sont ceux publiés par Stockline.
          </p>

          <div
            aria-label="Cycle de facturation"
            className="mt-7 inline-flex rounded-xl bg-slate-100 p-1"
            role="group"
          >
            <button
              type="button"
              aria-pressed={!isAnnual}
              onClick={() => setIsAnnual(false)}
              className={`min-h-11 rounded-lg px-4 text-sm font-medium transition ${
                !isAnnual
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Mensuel
            </button>
            <button
              type="button"
              aria-pressed={isAnnual}
              onClick={() => setIsAnnual(true)}
              className={`min-h-11 rounded-lg px-4 text-sm font-medium transition ${
                isAnnual
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Annuel{" "}
              {sharedAnnualDiscount > 0 && (
                <span className="ml-1.5 text-xs font-semibold text-emerald-700">
                  −{sharedAnnualDiscount}%
                </span>
              )}
            </button>
          </div>
        </div>

        {isPending && (
          <ul
            aria-label="Chargement des forfaits"
            className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3"
          >
            {Array.from({ length: 3 }, (_, index) => (
              <PlanSkeleton key={index} />
            ))}
          </ul>
        )}

        {isError && (
          <div
            className="mx-auto mt-12 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
            role="alert"
          >
            <h3 className="font-semibold text-red-900">
              Impossible de charger les tarifs
            </h3>
            <p className="mt-2 text-sm text-red-800">{apiError.message}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-red-900 shadow-sm ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
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

        {!isPending && !isError && plans.length === 0 && (
          <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <h3 className="font-semibold text-slate-900">
              Les offres arrivent bientôt
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Aucun forfait n’est actuellement publié.
            </p>
          </div>
        )}

        {!isPending && !isError && plans.length > 0 && (
          <ul className="mt-12 grid items-stretch gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan._id ?? plan.id}
                plan={plan}
                isAnnual={isAnnual}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
