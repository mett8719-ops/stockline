import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  PhoneCall,
  Sparkles,
  Store,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { parseApiError } from "@/core/api/errors.js";
import PasswordStrength from "../components/PasswordStrength.jsx";
import { isStrongPassword } from "../components/password-rules.js";
import { usePublicPlans } from "../features/landing/hooks.js";
import { createSignupRequest } from "../features/signup/api.js";
import SignupPlanStep from "../features/signup/components/SignupPlanStep.jsx";
import SignupReviewStep from "../features/signup/components/SignupReviewStep.jsx";
import SignupStepper from "../features/signup/components/SignupStepper.jsx";
import {
  africaCountries,
  businessTypes,
  capitalizeFirst,
  congoCities,
  congoOperators,
  formatPhoneInput,
  getFieldErrors,
  isValidPhone,
  ownerSignupSchema,
  SAFE_TEXT_RE,
  signupRequestSchema,
  shopSignupSchema,
} from "../features/signup/schemas.js";
import { useSignupStore } from "../features/signup/store.js";

const inputClassName =
  "mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-blue-100";

function FieldError({ id, message }) {
  if (!message) return null;

  return (
    <p className="mt-1.5 text-xs text-red-700" id={id} role="alert">
      {message}
    </p>
  );
}

function SignupProgress({ currentStep }) {
  return (
    <div className="mb-6 sm:hidden">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>Étape {currentStep} sur 4</span>
        <span>{Math.round((currentStep / 4) * 100)} %</span>
      </div>
      <div
        aria-label={`Étape ${currentStep} sur 4`}
        aria-valuemax={4}
        aria-valuemin={1}
        aria-valuenow={currentStep}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
      >
        <span
          className="block h-full rounded-full bg-brand-600 transition-all"
          style={{ width: `${(currentStep / 4) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function SignupPage() {
  const [searchParams] = useSearchParams();
  const step = useSignupStore((state) => state.step);
  const boutique = useSignupStore((state) => state.boutique);
  const proprietaire = useSignupStore((state) => state.proprietaire);
  const abonnement = useSignupStore((state) => state.abonnement);
  const setBoutique = useSignupStore((state) => state.setBoutique);
  const setProprietaire = useSignupStore((state) => state.setProprietaire);
  const setAbonnement = useSignupStore((state) => state.setAbonnement);
  const setStep = useSignupStore((state) => state.setStep);
  const resetSignup = useSignupStore((state) => state.resetSignup);
  const {
    data: plans = [],
    isPending: arePlansPending,
    isFetching: arePlansFetching,
    isError: hasPlansError,
    error: plansError,
    refetch: refetchPlans,
  } = usePublicPlans({ enabled: step === 3 || step === 4 });

  const [shopValues, setShopValues] = useState({
    pays: "CG",
    autreActivite: "",
    ...boutique,
  });
  const [ownerValues, setOwnerValues] = useState(proprietaire);
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cguAcceptees, setCguAcceptees] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const subscriptionTouched = useRef(false);
  const querySelectionApplied = useRef(false);

  // Gestion de la saisie personnalisée si ville = "Autre ville"
  const isCongo = (shopValues.pays || "CG") === "CG";
  const [isCustomCity, setIsCustomCity] = useState(
    () => isCongo && Boolean(shopValues.ville) && !congoCities.slice(0, -1).includes(shopValues.ville)
  );

  function updateShopField(field, value) {
    const updated = { ...shopValues, [field]: value };
    setShopValues(updated);
    setBoutique(updated);
    setFieldErrors((errors) => ({ ...errors, [field]: "" }));
    setFormError("");
  }

  function updateOwnerField(field, value) {
    const updated = { ...ownerValues, [field]: value };
    setOwnerValues(updated);
    setProprietaire(updated);
    setFieldErrors((errors) => ({ ...errors, [field]: "" }));
    setFormError("");
  }

  function applyPhonePrefix(prefix) {
    const currentNumber = ownerValues.telephone || "";
    // Extrait les chiffres locaux déjà tapés
    const cleanDigits = currentNumber.replace(/\D/g, "");
    let nationalPart = "";
    if (cleanDigits.startsWith("242")) {
      nationalPart = cleanDigits.slice(3);
    } else {
      nationalPart = cleanDigits;
    }
    // Si la partie locale commence déjà par le même code réseau (ex. 06), on la conserve
    const targetDigits = (prefix.replace(/\D/g, "").slice(3) || "");
    if (nationalPart.startsWith(targetDigits)) {
      nationalPart = nationalPart.slice(targetDigits.length);
    }
    const candidate = `${prefix} ${nationalPart}`.trim();
    const formatted = formatPhoneInput(candidate, shopValues.pays || "CG");
    updateOwnerField("telephone", formatted);
  }

  // Validation dynamique de l'Étape 1 (Boutique)
  const isStep1Valid = Boolean(
    shopValues.nom?.trim().length >= 2 &&
    SAFE_TEXT_RE.test(shopValues.nom?.trim()) &&
    shopValues.typeActivite &&
    (shopValues.typeActivite !== "autre" || (shopValues.autreActivite?.trim().length >= 2 && SAFE_TEXT_RE.test(shopValues.autreActivite?.trim()))) &&
    shopValues.pays &&
    shopValues.ville?.trim().length >= 2 &&
    SAFE_TEXT_RE.test(shopValues.ville?.trim())
  );

  // Validation dynamique de l'Étape 2 (Propriétaire)
  const isStep2Valid = Boolean(
    ownerValues.nomComplet?.trim().length >= 2 &&
    SAFE_TEXT_RE.test(ownerValues.nomComplet?.trim()) &&
    ownerValues.email?.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerValues.email?.trim()) &&
    isStrongPassword(password) &&
    isValidPhone(ownerValues.telephone, shopValues.pays || "CG")
  );

  useEffect(() => {
    if (
      querySelectionApplied.current ||
      (step !== 3 && step !== 4) ||
      arePlansPending ||
      hasPlansError
    ) {
      return;
    }

    querySelectionApplied.current = true;
    const requestedPlan = searchParams.get("plan");
    const requestedCycle = searchParams.get("cycle");
    const changes = {};

    if (
      !abonnement.planId &&
      requestedPlan &&
      plans.some((plan) => String(plan._id ?? plan.id) === requestedPlan)
    ) {
      changes.planId = requestedPlan;
    }

    if (
      !subscriptionTouched.current &&
      (requestedCycle === "monthly" || requestedCycle === "yearly")
    ) {
      changes.cycle = requestedCycle;
    }

    if (Object.keys(changes).length > 0) {
      setAbonnement(changes);
    }
  }, [
    abonnement.planId,
    arePlansPending,
    hasPlansError,
    plans,
    searchParams,
    setAbonnement,
    step,
  ]);

  function continueToOwner(event) {
    event.preventDefault();
    if (!isStep1Valid || isSubmitting) return;

    setIsSubmitting(true);
    const result = shopSignupSchema.safeParse(shopValues);

    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      setIsSubmitting(false);
      return;
    }

    setBoutique(result.data);
    setShopValues(result.data);
    setFieldErrors({});
    setStep(2);
    setIsSubmitting(false);
  }

  function continueToPlan(event) {
    event.preventDefault();
    if (!isStep2Valid || isSubmitting) return;

    setIsSubmitting(true);
    const result = ownerSignupSchema.safeParse({
      ...ownerValues,
      motDePasse: password,
      pays: shopValues.pays || "CG",
    });

    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      setIsSubmitting(false);
      return;
    }

    setProprietaire(result.data);
    setOwnerValues({
      nomComplet: result.data.nomComplet,
      email: result.data.email,
      telephone: result.data.telephone,
    });
    setFieldErrors({});
    setFormError("");
    setStep(3);
    setIsSubmitting(false);
  }

  function updateSubscription(changes) {
    if ("cycle" in changes || "planId" in changes) {
      subscriptionTouched.current = true;
    }
    setAbonnement(changes);
    setFormError("");
  }

  async function submitSignup() {
    if (isSubmitting || !cguAcceptees) return;

    const boutiqueRequest = { ...shopValues };
    if (boutiqueRequest.typeActivite !== "autre") {
      delete boutiqueRequest.autreActivite;
    }

    const request = {
      boutique: boutiqueRequest,
      proprietaire: {
        ...ownerValues,
        telephone: ownerValues.telephone?.trim() || undefined,
        motDePasse: password,
      },
      abonnement,
      cguAcceptees,
    };
    const result = signupRequestSchema.safeParse(request);

    if (!result.success) {
      setFormError(
        result.error.issues[0]?.message ??
          "Vérifiez les informations de votre demande.",
      );
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const response = await createSignupRequest(result.data);
      setSuccessData(response);
      setPassword("");
      setCguAcceptees(false);
      resetSignup();
    } catch (error) {
      const apiError = parseApiError(error);
      setFormError(apiError.message);

      if (error?.response?.status === 409) {
        setStep(2);
        setFieldErrors({});
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedCountry = africaCountries.find((c) => c.value === (shopValues.pays || "CG"));
  const selectedPlan = plans.find(
    (plan) => String(plan._id ?? plan.id) === abonnement.planId,
  );
  const displayedStep = successData ? 4 : step;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-600 transition hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          to="/"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Retour à l’accueil
        </Link>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_-24px_rgba(15,23,42,0.28)]">
          <div className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8">
            <Link
              aria-label="Stockline, accueil"
              className="inline-flex items-center gap-2.5 text-slate-900"
              to="/"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Store aria-hidden="true" size={18} />
              </span>
              <span className="text-lg font-bold tracking-tight">Stockline</span>
            </Link>
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {successData ? "Demande envoyée" : "Créez votre compte boutique"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              {successData
                ? "Votre demande d’inscription a bien été transmise à l’équipe Stockline."
                : "Quelques informations suffisent pour soumettre votre demande à l’équipe Stockline."}
            </p>
          </div>

          <div className="grid sm:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:border-b-0 sm:border-r sm:px-6 sm:py-8">
              <SignupProgress currentStep={displayedStep} />
              <div className="hidden sm:block">
                <SignupStepper currentStep={displayedStep} />
              </div>
            </aside>

            <section
              aria-labelledby="signup-step-title"
              className="px-5 py-6 sm:px-8 sm:py-8"
            >
              {successData ? (
                <div aria-live="polite" className="py-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 aria-hidden="true" size={27} />
                  </div>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Confirmation
                  </p>
                  <h2
                    className="mt-2 text-xl font-bold text-slate-900"
                    id="signup-step-title"
                  >
                    Votre demande a bien été reçue
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {successData.message}
                  </p>
                  <p className="mt-3 text-sm text-slate-600">
                    Un suivi sera envoyé à{" "}
                    <span className="font-semibold text-slate-900">
                      {ownerValues.email}
                    </span>
                    .
                  </p>
                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Prochaines étapes
                    </h3>
                    <ol className="mt-3 space-y-3">
                      {successData.prochainesEtapes.map((nextStep, index) => (
                        <li
                          className="flex gap-3 text-sm leading-5 text-slate-600"
                          key={nextStep}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-brand-700 ring-1 ring-slate-200">
                            {index + 1}
                          </span>
                          {nextStep}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <Link
                    className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    to="/"
                  >
                    Retour à l’accueil
                    <ArrowRight aria-hidden="true" size={16} />
                  </Link>
                </div>
              ) : step === 1 ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    Étape 1 · Boutique
                  </p>
                  <h2
                    className="mt-2 text-xl font-bold text-slate-900"
                    id="signup-step-title"
                  >
                    Parlez-nous de votre boutique
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Ces informations permettront à notre équipe de préparer
                    l’examen de votre demande.
                  </p>

                  <form
                    className="mt-7 space-y-5"
                    noValidate
                    onSubmit={continueToOwner}
                  >
                    {/* Nom de la boutique avec majuscule automatique */}
                    <div>
                      <label
                        className="text-sm font-medium text-slate-800"
                        htmlFor="shop-name"
                      >
                        Nom de la boutique <span className="text-red-500">*</span>
                      </label>
                      <input
                        aria-describedby={fieldErrors.nom ? "shop-name-error" : undefined}
                        aria-invalid={Boolean(fieldErrors.nom)}
                        autoComplete="organization"
                        className={`${inputClassName} ${
                          fieldErrors.nom ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""
                        }`}
                        id="shop-name"
                        maxLength={120}
                        onChange={(event) =>
                          updateShopField("nom", capitalizeFirst(event.target.value))
                        }
                        placeholder="Ex. Boutique Maman Grâce"
                        required
                        value={shopValues.nom || ""}
                      />
                      <FieldError id="shop-name-error" message={fieldErrors.nom} />
                    </div>

                    {/* Choix du pays d'activité */}
                    <div>
                      <label
                        className="flex items-center gap-1.5 text-sm font-medium text-slate-800"
                        htmlFor="shop-country"
                      >
                        <Globe aria-hidden="true" className="text-slate-500" size={15} />
                        Pays d’implantation <span className="text-red-500">*</span>
                      </label>
                      <select
                        aria-describedby={fieldErrors.pays ? "shop-country-error" : undefined}
                        aria-invalid={Boolean(fieldErrors.pays)}
                        className={`${inputClassName} ${
                          fieldErrors.pays ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""
                        }`}
                        id="shop-country"
                        onChange={(event) => {
                          const newPays = event.target.value;
                          updateShopField("pays", newPays);
                          if (newPays !== "CG") {
                            setIsCustomCity(true);
                            updateShopField("ville", "");
                          } else {
                            setIsCustomCity(false);
                            updateShopField("ville", "Brazzaville");
                          }
                        }}
                        value={shopValues.pays || "CG"}
                      >
                        {africaCountries.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <FieldError id="shop-country-error" message={fieldErrors.pays} />
                    </div>

                    {/* Type d'activité */}
                    <div>
                      <label
                        className="text-sm font-medium text-slate-800"
                        htmlFor="shop-type"
                      >
                        Type d’activité <span className="text-red-500">*</span>
                      </label>
                      <select
                        aria-describedby={
                          fieldErrors.typeActivite ? "shop-type-error" : undefined
                        }
                        aria-invalid={Boolean(fieldErrors.typeActivite)}
                        className={`${inputClassName} ${
                          fieldErrors.typeActivite
                            ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                            : ""
                        }`}
                        id="shop-type"
                        onChange={(event) => {
                          updateShopField("typeActivite", event.target.value);
                          if (event.target.value !== "autre") {
                            updateShopField("autreActivite", "");
                          }
                        }}
                        required
                        value={shopValues.typeActivite || ""}
                      >
                        <option disabled value="">
                          Sélectionnez votre activité
                        </option>
                        {businessTypes.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <FieldError
                        id="shop-type-error"
                        message={fieldErrors.typeActivite}
                      />
                    </div>

                    {/* Champ dynamique si Type d'activité = "autre" */}
                    {shopValues.typeActivite === "autre" && (
                      <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-3.5 transition-all">
                        <label
                          className="flex items-center gap-1.5 text-sm font-medium text-brand-900"
                          htmlFor="shop-other-type"
                        >
                          <Sparkles aria-hidden="true" className="text-brand-600" size={15} />
                          Précisez votre activité <span className="text-red-500">*</span>
                        </label>
                        <p className="mt-0.5 text-xs text-brand-700">
                          Décrivez la spécialité de votre commerce (ex. Salon de coiffure, Boulangerie, Atelier de couture...).
                        </p>
                        <input
                          aria-describedby={fieldErrors.autreActivite ? "shop-other-type-error" : undefined}
                          aria-invalid={Boolean(fieldErrors.autreActivite)}
                          className={`${inputClassName} mt-2 bg-white`}
                          id="shop-other-type"
                          maxLength={100}
                          onChange={(event) =>
                            updateShopField("autreActivite", capitalizeFirst(event.target.value))
                          }
                          placeholder="Ex. Salon de coiffure & esthétique"
                          required
                          value={shopValues.autreActivite || ""}
                        />
                        <FieldError id="shop-other-type-error" message={fieldErrors.autreActivite} />
                      </div>
                    )}

                    {/* Ville */}
                    <div>
                      <label
                        className="text-sm font-medium text-slate-800"
                        htmlFor="shop-city"
                      >
                        Ville <span className="text-red-500">*</span>
                      </label>
                      {isCongo && !isCustomCity ? (
                        <select
                          aria-describedby={fieldErrors.ville ? "shop-city-error" : undefined}
                          aria-invalid={Boolean(fieldErrors.ville)}
                          className={`${inputClassName} ${
                            fieldErrors.ville ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""
                          }`}
                          id="shop-city"
                          onChange={(event) => {
                            const val = event.target.value;
                            if (val === "Autre ville") {
                              setIsCustomCity(true);
                              updateShopField("ville", "");
                            } else {
                              updateShopField("ville", val);
                            }
                          }}
                          required
                          value={shopValues.ville || ""}
                        >
                          <option disabled value="">
                            Sélectionnez une ville du Congo
                          </option>
                          {congoCities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div>
                          <input
                            aria-describedby={fieldErrors.ville ? "shop-city-error" : undefined}
                            aria-invalid={Boolean(fieldErrors.ville)}
                            className={`${inputClassName} ${
                              fieldErrors.ville ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""
                            }`}
                            id="shop-city"
                            maxLength={80}
                            onChange={(event) =>
                              updateShopField("ville", capitalizeFirst(event.target.value))
                            }
                            placeholder={isCongo ? "Ex. Kinkala, Gamboma, Djambala..." : "Ex. Kinshasa, Douala, Libreville..."}
                            required
                            value={shopValues.ville || ""}
                          />
                          {isCongo && (
                            <button
                              className="mt-1.5 text-xs text-brand-700 underline hover:text-brand-800"
                              onClick={() => {
                                setIsCustomCity(false);
                                updateShopField("ville", "Brazzaville");
                              }}
                              type="button"
                            >
                              ← Choisir dans la liste des principales villes
                            </button>
                          )}
                        </div>
                      )}
                      <FieldError id="shop-city-error" message={fieldErrors.ville} />
                    </div>

                    {formError && (
                      <p className="text-sm text-red-700" role="alert">
                        {formError}
                      </p>
                    )}

                    <div className="flex flex-col items-end gap-2 border-t border-slate-100 pt-5">
                      <button
                        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                          !isStep1Valid || isSubmitting
                            ? "cursor-not-allowed opacity-50 hover:bg-brand-600"
                            : ""
                        }`}
                        disabled={!isStep1Valid || isSubmitting}
                        type="submit"
                      >
                        Continuer
                        <ArrowRight aria-hidden="true" size={16} />
                      </button>
                      {!isStep1Valid && (
                        <p className="text-xs text-slate-400">
                          Remplissez tous les champs obligatoires (*) pour continuer
                        </p>
                      )}
                    </div>
                  </form>
                </>
              ) : step === 2 ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    Étape 2 · Propriétaire
                  </p>
                  <h2
                    className="mt-2 text-xl font-bold text-slate-900"
                    id="signup-step-title"
                  >
                    Vos coordonnées
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Indiquez les coordonnées de la personne responsable du
                    compte de la boutique.
                  </p>

                  <form
                    className="mt-7 space-y-5"
                    noValidate
                    onSubmit={continueToPlan}
                  >
                    {/* Nom complet avec 1ère lettre majuscule */}
                    <div>
                      <label
                        className="text-sm font-medium text-slate-800"
                        htmlFor="owner-name"
                      >
                        Nom complet <span className="text-red-500">*</span>
                      </label>
                      <input
                        aria-describedby={
                          fieldErrors.nomComplet ? "owner-name-error" : undefined
                        }
                        aria-invalid={Boolean(fieldErrors.nomComplet)}
                        autoComplete="name"
                        className={`${inputClassName} ${
                          fieldErrors.nomComplet
                            ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                            : ""
                        }`}
                        id="owner-name"
                        maxLength={120}
                        onChange={(event) =>
                          updateOwnerField("nomComplet", capitalizeFirst(event.target.value))
                        }
                        placeholder="Ex. Grâce Mbuyi"
                        required
                        value={ownerValues.nomComplet || ""}
                      />
                      <FieldError
                        id="owner-name-error"
                        message={fieldErrors.nomComplet}
                      />
                    </div>

                    <div>
                      <label
                        className="text-sm font-medium text-slate-800"
                        htmlFor="owner-email"
                      >
                        Adresse email <span className="text-red-500">*</span>
                      </label>
                      <input
                        aria-describedby={fieldErrors.email ? "owner-email-error" : undefined}
                        aria-invalid={Boolean(fieldErrors.email)}
                        autoComplete="email"
                        className={`${inputClassName} ${
                          fieldErrors.email
                            ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                            : ""
                        }`}
                        id="owner-email"
                        onChange={(event) =>
                          updateOwnerField("email", event.target.value)
                        }
                        placeholder="vous@exemple.cg"
                        required
                        type="email"
                        value={ownerValues.email || ""}
                      />
                      <FieldError id="owner-email-error" message={fieldErrors.email} />
                    </div>

                    {/* Téléphone : filtrage sans lettres et formatage par pays */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          className="text-sm font-medium text-slate-800"
                          htmlFor="owner-phone"
                        >
                          Téléphone{" "}
                          <span className="font-normal text-slate-500">(facultatif)</span>
                        </label>
                        <span className="text-[11px] text-slate-400">
                          {selectedCountry?.label || "Afrique"}
                        </span>
                      </div>
                      <input
                        aria-describedby={
                          fieldErrors.telephone ? "owner-phone-error" : undefined
                        }
                        aria-invalid={Boolean(fieldErrors.telephone)}
                        autoComplete="tel"
                        className={`${inputClassName} ${
                          fieldErrors.telephone
                            ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                            : ""
                        }`}
                        id="owner-phone"
                        inputMode="tel"
                        maxLength={20}
                        onChange={(event) => {
                          const formatted = formatPhoneInput(event.target.value, shopValues.pays || "CG");
                          updateOwnerField("telephone", formatted);
                        }}
                        placeholder={selectedCountry?.placeholder || "+242 06 123 45 67"}
                        type="tel"
                        value={ownerValues.telephone || ""}
                      />
                      <FieldError
                        id="owner-phone-error"
                        message={fieldErrors.telephone}
                      />

                      {/* Raccourcis opérateurs réels : MTN 06, Airtel 05, Airtel Pro 04 */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <PhoneCall aria-hidden="true" size={12} />
                          Opérateurs :
                        </span>
                        {isCongo ? (
                          congoOperators.map(({ label, prefix }) => (
                            <button
                              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 transition hover:bg-brand-50 hover:border-brand-300 hover:text-brand-800"
                              key={label}
                              onClick={() => applyPhonePrefix(prefix)}
                              type="button"
                            >
                              {label} ({prefix})
                            </button>
                          ))
                        ) : selectedCountry?.dialCode ? (
                          <button
                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 transition hover:bg-brand-50 hover:border-brand-300 hover:text-brand-800"
                            onClick={() => applyPhonePrefix(selectedCountry.dialCode)}
                            type="button"
                          >
                            Indicatif ({selectedCountry.dialCode})
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <label
                        className="text-sm font-medium text-slate-800"
                        htmlFor="owner-password"
                      >
                        Mot de passe <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          aria-describedby={
                            fieldErrors.motDePasse
                              ? "owner-password-error"
                              : "owner-password-help"
                          }
                          aria-invalid={Boolean(fieldErrors.motDePasse)}
                          autoComplete="new-password"
                          className={`${inputClassName} pr-12 ${
                            fieldErrors.motDePasse
                              ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                            : ""
                          }`}
                          id="owner-password"
                          maxLength={128}
                          onChange={(event) => {
                            setPassword(event.target.value);
                            setFieldErrors((errors) => ({
                              ...errors,
                              motDePasse: "",
                            }));
                            setFormError("");
                          }}
                          placeholder="Choisissez un mot de passe sécurisé"
                          required
                          type={isPasswordVisible ? "text" : "password"}
                          value={password}
                        />
                        <button
                          aria-label={
                            isPasswordVisible
                              ? "Masquer le mot de passe"
                              : "Afficher le mot de passe"
                          }
                          className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
                          onClick={() =>
                            setIsPasswordVisible((visible) => !visible)
                          }
                          type="button"
                        >
                          {isPasswordVisible ? (
                            <EyeOff aria-hidden="true" size={18} />
                          ) : (
                            <Eye aria-hidden="true" size={18} />
                          )}
                        </button>
                      </div>
                      <FieldError
                        id="owner-password-error"
                        message={fieldErrors.motDePasse}
                      />
                      <div id="owner-password-help">
                        <PasswordStrength password={password} />
                      </div>
                    </div>

                    {formError && (
                      <p className="text-sm text-amber-800" role="status">
                        {formError}
                      </p>
                    )}

                    <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
                      <button
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                        onClick={() => {
                          setStep(1);
                          setFieldErrors({});
                          setFormError("");
                        }}
                        type="button"
                      >
                        <ArrowLeft aria-hidden="true" size={16} />
                        Retour
                      </button>
                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                            !isStep2Valid || isSubmitting
                              ? "cursor-not-allowed opacity-50 hover:bg-brand-600"
                              : ""
                          }`}
                          disabled={!isStep2Valid || isSubmitting}
                          type="submit"
                        >
                          Continuer
                          <ArrowRight aria-hidden="true" size={16} />
                        </button>
                        {!isStep2Valid && (
                          <p className="text-xs text-slate-400">
                            Complétez les coordonnées et sécurisez le mot de passe pour continuer
                          </p>
                        )}
                      </div>
                    </div>
                  </form>
                </>
              ) : step === 3 ? (
                <SignupPlanStep
                  cycle={abonnement.cycle}
                  error={plansError}
                  isFetching={arePlansFetching}
                  isError={hasPlansError}
                  isPending={arePlansPending}
                  jourPrelevement={abonnement.jourPrelevement}
                  onBack={() => {
                    setFormError("");
                    setStep(2);
                  }}
                  onChange={updateSubscription}
                  onContinue={() => {
                    setFormError("");
                    setStep(4);
                  }}
                  planId={abonnement.planId}
                  plans={plans}
                  refetch={refetchPlans}
                />
              ) : step === 4 && selectedPlan ? (
                <SignupReviewStep
                  abonnement={abonnement}
                  boutique={shopValues}
                  cguAcceptees={cguAcceptees}
                  cycle={abonnement.cycle}
                  errorMessage={formError}
                  isSubmitting={isSubmitting}
                  jourPrelevement={abonnement.jourPrelevement}
                  onAcceptTerms={setCguAcceptees}
                  onBack={() => {
                    setFormError("");
                    setStep(3);
                  }}
                  onEdit={(targetStep) => {
                    setFormError("");
                    setStep(targetStep);
                  }}
                  onSubmit={submitSignup}
                  plan={selectedPlan}
                  proprietaire={ownerValues}
                />
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    Étape {step} · Forfait
                  </p>
                  <h2
                    className="mt-2 text-xl font-bold text-slate-900"
                    id="signup-step-title"
                  >
                    Sélectionnez un forfait disponible
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Le forfait sélectionné n’est plus disponible. Revenez à
                    l’étape précédente pour en choisir un autre.
                  </p>
                  <button
                    className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setStep(3);
                      setFormError("");
                    }}
                    type="button"
                  >
                    <ArrowLeft aria-hidden="true" size={16} />
                    Choisir un forfait
                  </button>
                </>
              )}
            </section>
          </div>
        </div>

        {!successData && (
          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            En continuant, vous pourrez consulter nos{" "}
            <Link
              className="font-medium text-brand-700 hover:underline"
              to="/cgu"
            >
              conditions générales d’utilisation
            </Link>{" "}
            à l’étape de confirmation.
          </p>
        )}
      </div>
    </main>
  );
}
