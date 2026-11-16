import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleUserRound,
  CreditCard,
  LoaderCircle,
  Store,
} from "lucide-react";
import { Link } from "react-router-dom";
import { africaCountries, businessTypes } from "../schemas.js";

function SummarySection({ title, icon: Icon, onEdit, editLabel, children }) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon aria-hidden="true" className="text-brand-600" size={17} />
          {title}
        </h3>
        <button
          className="min-h-11 shrink-0 rounded-md px-2 text-xs font-semibold text-brand-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
          onClick={onEdit}
          type="button"
        >
          Modifier {editLabel}
        </button>
      </div>
      <dl className="mt-3 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
        {children}
      </dl>
    </section>
  );
}

function SummaryValue({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-slate-800">
        {children || "Non renseigné"}
      </dd>
    </div>
  );
}

function formatPrice(amount, currency) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SignupReviewStep({
  boutique,
  proprietaire,
  plan,
  cycle,
  jourPrelevement,
  cguAcceptees,
  errorMessage,
  isSubmitting,
  onAcceptTerms,
  onEdit,
  onSubmit,
  onBack,
}) {
  const typeLabel = businessTypes.find(
    ({ value }) => value === boutique.typeActivite,
  )?.label;
  const countryLabel = africaCountries.find(
    ({ value }) => value === boutique.pays,
  )?.label;
  const discount =
    cycle === "yearly" ? plan.remiseAnnuellePourcent ?? 0 : 0;
  const annualPrice = Math.round(
    plan.prix * 12 * (1 - discount / 100),
  );
  const monthlyPrice = cycle === "yearly" ? annualPrice / 12 : plan.prix;

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
        Étape 4 · Confirmation
      </p>
      <h2
        className="mt-2 text-xl font-bold text-slate-900"
        id="signup-step-title"
      >
        Vérifiez votre demande
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Vérifiez les informations avant de les transmettre à l’équipe Stockline
        pour examen.
      </p>

      <div className="mt-6 space-y-4">
        <SummarySection
          editLabel="la boutique"
          icon={Store}
          onEdit={() => onEdit(1)}
          title="Votre boutique"
        >
          <SummaryValue label="Nom">{boutique.nom}</SummaryValue>
          <SummaryValue label="Activité">
            {boutique.typeActivite === "autre"
              ? boutique.autreActivite
              : typeLabel}
          </SummaryValue>
          <SummaryValue label="Pays">{countryLabel}</SummaryValue>
          <SummaryValue label="Ville">{boutique.ville}</SummaryValue>
        </SummarySection>

        <SummarySection
          editLabel="les coordonnées"
          icon={CircleUserRound}
          onEdit={() => onEdit(2)}
          title="Propriétaire"
        >
          <SummaryValue label="Nom">{proprietaire.nomComplet}</SummaryValue>
          <SummaryValue label="Email">{proprietaire.email}</SummaryValue>
          <SummaryValue label="Téléphone">
            {proprietaire.telephone || "Non renseigné"}
          </SummaryValue>
        </SummarySection>

        <SummarySection
          editLabel="le forfait"
          icon={CreditCard}
          onEdit={() => onEdit(3)}
          title="Forfait et facturation"
        >
          <SummaryValue label="Forfait">{plan.nom}</SummaryValue>
          <SummaryValue label="Cycle">
            {cycle === "yearly" ? "Annuel" : "Mensuel"}
          </SummaryValue>
          <SummaryValue label="Prix indicatif">
            {formatPrice(monthlyPrice, plan.devise)} par mois
            {cycle === "yearly" ? " (facturé annuellement)" : ""}
          </SummaryValue>
          {cycle === "yearly" && discount > 0 && (
            <SummaryValue label="Économie annuelle indicative">
              {formatPrice(plan.prix * 12 - annualPrice, plan.devise)}
            </SummaryValue>
          )}
          {cycle === "yearly" && (
            <SummaryValue label="Total annuel indicatif">
              {formatPrice(annualPrice, plan.devise)}
            </SummaryValue>
          )}
          <SummaryValue label="Jour de prélèvement souhaité">
            {jourPrelevement === 1
              ? "Le 1er du mois"
              : `Le ${jourPrelevement} du mois`}
          </SummaryValue>
        </SummarySection>
      </div>

      {errorMessage && (
        <p
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-700">
          <input
            checked={cguAcceptees}
            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            onChange={(event) => onAcceptTerms(event.target.checked)}
            required
            type="checkbox"
          />
          <span>
            J’ai lu et j’accepte les{" "}
            <Link
              className="font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
              rel="noreferrer"
              target="_blank"
              to="/cgu"
            >
              conditions générales d’utilisation
            </Link>
            .
          </span>
        </label>
        <p className="ml-7 mt-1.5 text-xs text-slate-500">
          L’acceptation est obligatoire pour envoyer votre demande.
        </p>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
        <CalendarDays
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-slate-400"
          size={15}
        />
        L’envoi soumet une demande à l’équipe Stockline. Votre boutique ne sera
        pas créée avant sa validation.
      </p>

      <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50"
          disabled={isSubmitting}
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Retour au forfait
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!cguAcceptees || isSubmitting}
          onClick={onSubmit}
          type="button"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
              Envoi en cours…
            </>
          ) : (
            <>
              Envoyer ma demande
              <ArrowRight aria-hidden="true" size={16} />
            </>
          )}
        </button>
      </div>
    </>
  );
}
