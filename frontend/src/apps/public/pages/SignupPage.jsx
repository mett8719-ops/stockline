import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Store } from "lucide-react";
import { Link } from "react-router-dom";
import PasswordStrength from "../components/PasswordStrength.jsx";
import SignupStepper from "../features/signup/components/SignupStepper.jsx";
import {
  businessTypes,
  congoCities,
  getFieldErrors,
  ownerSignupSchema,
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
  const step = useSignupStore((state) => state.step);
  const boutique = useSignupStore((state) => state.boutique);
  const proprietaire = useSignupStore((state) => state.proprietaire);
  const setBoutique = useSignupStore((state) => state.setBoutique);
  const setProprietaire = useSignupStore((state) => state.setProprietaire);
  const setStep = useSignupStore((state) => state.setStep);
  const [shopValues, setShopValues] = useState(boutique);
  const [ownerValues, setOwnerValues] = useState(proprietaire);
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");

  function updateShopField(field, value) {
    const updatedShopValues = { ...shopValues, [field]: value };
    setShopValues(updatedShopValues);
    setBoutique(updatedShopValues);
    setFieldErrors((errors) => ({ ...errors, [field]: "" }));
    setFormError("");
  }

  function updateOwnerField(field, value) {
    const updatedOwnerValues = { ...ownerValues, [field]: value };
    setOwnerValues(updatedOwnerValues);
    setProprietaire(updatedOwnerValues);
    setFieldErrors((errors) => ({ ...errors, [field]: "" }));
    setFormError("");
  }

  function continueToOwner(event) {
    event.preventDefault();
    const result = shopSignupSchema.safeParse(shopValues);

    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }

    setBoutique(result.data);
    setShopValues(result.data);
    setFieldErrors({});
    setStep(2);
  }

  function continueToPlan(event) {
    event.preventDefault();
    const result = ownerSignupSchema.safeParse({
      ...ownerValues,
      motDePasse: password,
    });

    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
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
  }

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
              Créez votre compte boutique
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Quelques informations suffisent pour soumettre votre demande à
              l’équipe Stockline.
            </p>
          </div>

          <div className="grid sm:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:border-b-0 sm:border-r sm:px-6 sm:py-8">
              <SignupProgress currentStep={step} />
              <div className="hidden sm:block">
                <SignupStepper currentStep={step} />
              </div>
            </aside>

            <section
              aria-labelledby="signup-step-title"
              className="px-5 py-6 sm:px-8 sm:py-8"
            >
              {step === 1 ? (
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
                    <div>
                      <label
                        className="text-sm font-medium text-slate-800"
                        htmlFor="shop-name"
                      >
                        Nom de la boutique
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
                          updateShopField("nom", event.target.value)
                        }
                        placeholder="Ex. Boutique Maman Grâce"
                        required
                        value={shopValues.nom}
                      />
                      <FieldError id="shop-name-error" message={fieldErrors.nom} />
                    </div>

                    <div>
                      <label
                        className="text-sm font-medium text-slate-800"
                        htmlFor="shop-type"
                      >
                        Type d’activité
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
                        onChange={(event) =>
                          updateShopField("typeActivite", event.target.value)
                        }
                        required
                        value={shopValues.typeActivite}
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

                    <div>
                      <label
                        className="text-sm font-medium text-slate-800"
                        htmlFor="shop-city"
                      >
                        Ville
                      </label>
                      <select
                        aria-describedby={fieldErrors.ville ? "shop-city-error" : undefined}
                        aria-invalid={Boolean(fieldErrors.ville)}
                        className={`${inputClassName} ${
                          fieldErrors.ville ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""
                        }`}
                        id="shop-city"
                        onChange={(event) =>
                          updateShopField("ville", event.target.value)
                        }
                        required
                        value={shopValues.ville}
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
                      <FieldError id="shop-city-error" message={fieldErrors.ville} />
                    </div>

                    {formError && (
                      <p className="text-sm text-red-700" role="alert">
                        {formError}
                      </p>
                    )}

                    <div className="flex justify-end border-t border-slate-100 pt-5">
                      <button
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                        type="submit"
                      >
                        Continuer
                        <ArrowRight aria-hidden="true" size={16} />
                      </button>
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
                    <div>
                      <label
                        className="text-sm font-medium text-slate-800"
                        htmlFor="owner-name"
                      >
                        Nom complet
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
                          updateOwnerField("nomComplet", event.target.value)
                        }
                        placeholder="Ex. Grâce Mbuyi"
                        required
                        value={ownerValues.nomComplet}
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
                        Adresse email
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
                        value={ownerValues.email}
                      />
                      <FieldError id="owner-email-error" message={fieldErrors.email} />
                    </div>

                    <div>
                      <label
                        className="text-sm font-medium text-slate-800"
                        htmlFor="owner-phone"
                      >
                        Téléphone{" "}
                        <span className="font-normal text-slate-500">(facultatif)</span>
                      </label>
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
                        onChange={(event) =>
                          updateOwnerField("telephone", event.target.value)
                        }
                        placeholder="+242 06 123 45 67"
                        type="tel"
                        value={ownerValues.telephone}
                      />
                      <FieldError
                        id="owner-phone-error"
                        message={fieldErrors.telephone}
                      />
                    </div>

                    <div>
                      <label
                        className="text-sm font-medium text-slate-800"
                        htmlFor="owner-password"
                      >
                        Mot de passe
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

                    <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
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
                      <button
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                        type="submit"
                      >
                        Continuer
                        <ArrowRight aria-hidden="true" size={16} />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    Étape {step} · Prochainement
                  </p>
                  <h2
                    className="mt-2 text-xl font-bold text-slate-900"
                    id="signup-step-title"
                  >
                    La suite du parcours arrive bientôt
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Les étapes de sélection du forfait et de confirmation seront
                    disponibles dans la suite du parcours d’inscription.
                  </p>
                  <button
                    className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setStep(2);
                      setFormError("");
                    }}
                    type="button"
                  >
                    <ArrowLeft aria-hidden="true" size={16} />
                    Retour aux coordonnées
                  </button>
                </>
              )}
            </section>
          </div>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          En continuant, vous pourrez consulter nos{" "}
          <Link className="font-medium text-brand-700 hover:underline" to="/cgu">
            conditions générales d’utilisation
          </Link>{" "}
          à l’étape de confirmation.
        </p>
      </div>
    </main>
  );
}
