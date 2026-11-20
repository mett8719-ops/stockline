import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Globe2,
  Mail,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useAuth } from "@/core/hooks/useAuth.js";
import {
  usePlatformPlans,
  useSavePlanQuotas,
  usePlatformSettings,
  useSavePlatformSettings,
} from "../hooks.js";
import {
  emailSettingsSchema,
  generalSettingsSchema,
  planQuotasSchema,
} from "../schemas.js";

const fieldClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-platform-500 focus:ring-2 focus:ring-platform-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const tabOptions = [
  { value: "general", label: "Général", icon: Settings2 },
  { value: "emails", label: "Emails & Notifications", icon: Mail },
  { value: "quotas", label: "Limites & Quotas", icon: Globe2 },
];

const generalFields = [
  { name: "nomPlateforme", label: "Nom de la plateforme", type: "text" },
  { name: "urlPrincipale", label: "URL principale", type: "url" },
  { name: "emailSupport", label: "Email support", type: "email" },
  { name: "emailFacturation", label: "Email de facturation", type: "email" },
];

const emailFields = [
  { name: "serveurSmtp", label: "Serveur SMTP", type: "text" },
  { name: "portSmtp", label: "Port SMTP", type: "number" },
  { name: "expediteurParDefaut", label: "Expéditeur par défaut", type: "text" },
];

const emailToggles = [
  { name: "emailBienvenue", label: "Email de bienvenue (activation compte)" },
  { name: "emailRappelPaiement", label: "Email de rappel de paiement" },
  { name: "emailSuspension", label: "Email de suspension de compte" },
  { name: "alertesSysteme", label: "Alertes système (erreurs critiques)" },
];

const quotaFields = [
  { key: "boutiques", label: "Boutiques" },
  { key: "produits", label: "Produits" },
  { key: "utilisateurs", label: "Utilisateurs" },
  { key: "stockageMo", label: "Stockage", storage: true },
];

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
      className={`fixed right-4 top-4 z-[70] max-w-sm rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
        toast.type === "error" ? "bg-red-700" : "bg-emerald-700"
      }`}
      role={toast.type === "error" ? "alert" : "status"}
    >
      {toast.message}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <section aria-label="Chargement des paramètres plateforme" className="space-y-5" role="status">
      <span className="sr-only">Chargement des paramètres…</span>
      <div className="skeleton h-10 w-full max-w-lg rounded-lg" />
      <div className="card max-w-3xl space-y-5 p-5 sm:p-6">
        <div className="skeleton h-5 w-56" />
        {Array.from({ length: 5 }, (_, index) => (
          <div className="space-y-2" key={index}>
            <div className="skeleton h-3 w-32" />
            <div className="skeleton h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  );
}

function formatQuota(value, storage = false) {
  const numericValue = Number(value);
  if (numericValue === -1) return "∞";
  if (!Number.isFinite(numericValue)) return "";
  if (storage && numericValue >= 1024 && numericValue % 1024 === 0) {
    return `${numericValue / 1024} GB`;
  }
  return storage ? `${numericValue} MB` : String(numericValue);
}

function parseQuotaInput(value) {
  const text = String(value).trim().toLowerCase();
  if (["∞", "infini", "illimité", "illimite", "-1"].includes(text)) return -1;
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) ? number : null;
}

function parseStorageInput(value) {
  const text = String(value).trim().toLowerCase();
  if (["∞", "infini", "illimité", "illimite", "-1"].includes(text)) return -1;
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(mb|mo|gb|go)?$/);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  const storageMo = Math.round(amount * (match[2] === "gb" || match[2] === "go" ? 1024 : 1));
  return Number.isSafeInteger(storageMo) ? storageMo : null;
}

function getPlanId(plan) {
  return String(plan?._id || plan?.id);
}

function QuotasTab({ canWrite, onToast }) {
  const plansQuery = usePlatformPlans();
  const saveMutation = useSavePlanQuotas();
  const [drafts, setDrafts] = useState({});
  const plans = plansQuery.data || [];

  function setDraft(planId, key, value) {
    setDrafts((current) => ({
      ...current,
      [planId]: { ...current[planId], [key]: value },
    }));
  }

  function getInputValue(plan, key) {
    const planId = getPlanId(plan);
    const draftValue = drafts[planId]?.[key];
    if (draftValue !== undefined) return draftValue;
    return formatQuota(plan.quotas?.[key] ?? 0, key === "stockageMo");
  }

  async function savePlanQuotas(plan) {
    const planId = getPlanId(plan);
    const values = drafts[planId] || {};
    const quotas = {};

    for (const field of quotaFields) {
      const currentValue = values[field.key];
      const parsed = field.storage
        ? parseStorageInput(
            currentValue === undefined
              ? formatQuota(plan.quotas?.[field.key] ?? 0, true)
              : currentValue,
          )
        : parseQuotaInput(
            currentValue === undefined
              ? formatQuota(plan.quotas?.[field.key] ?? 0)
              : currentValue,
          );
      if (parsed === null) {
        onToast(`Valeur invalide pour le quota « ${field.label} » du plan ${plan.nom}.`, "error");
        return;
      }
      quotas[field.key] = parsed;
    }

    const validation = planQuotasSchema.safeParse(quotas);
    if (!validation.success) {
      onToast(validation.error.issues[0]?.message || "Les quotas saisis sont invalides.", "error");
      return;
    }

    try {
      const updatedPlan = await saveMutation.mutateAsync({
        planId,
        quotas: validation.data,
      });
      setDrafts((current) => ({
        ...current,
        [planId]: {
          boutiques: formatQuota(updatedPlan.quotas?.boutiques ?? quotas.boutiques),
          produits: formatQuota(updatedPlan.quotas?.produits ?? quotas.produits),
          utilisateurs: formatQuota(updatedPlan.quotas?.utilisateurs ?? quotas.utilisateurs),
          stockageMo: formatQuota(
            updatedPlan.quotas?.stockageMo ?? quotas.stockageMo,
            true,
          ),
        },
      }));
      onToast(`Les quotas du plan ${plan.nom} ont été enregistrés.`);
    } catch (error) {
      onToast(`Enregistrement des quotas impossible : ${parseApiError(error).message}`, "error");
    }
  }

  if (plansQuery.isPending) {
    return (
      <div aria-label="Chargement des plans" className="space-y-4" role="status">
        <span className="sr-only">Chargement des plans…</span>
        {Array.from({ length: 3 }, (_, index) => (
          <div className="skeleton h-36 rounded-xl" key={index} />
        ))}
      </div>
    );
  }

  if (plansQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
        <p>Impossible de charger les plans : {parseApiError(plansQuery.error).message}</p>
        <button
          className="mt-2 inline-flex items-center gap-1 font-semibold underline underline-offset-2"
          onClick={() => plansQuery.refetch()}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          Réessayer
        </button>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-lg bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        Aucun plan tarifaire n’est disponible.
      </div>
    );
  }

  return (
    <section aria-labelledby="plan-quotas-heading" className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-900" id="plan-quotas-heading">
        Limites par plan
      </h3>
      {plans.map((plan) => {
        const planId = getPlanId(plan);
        const isSaving = saveMutation.isPending && saveMutation.variables?.planId === planId;
        return (
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5" key={planId}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-800">{plan.nom}</h4>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-500">
                {plan.publie ? "Publié" : "Non publié"}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {quotaFields.map((field) => (
                <label className="block" key={field.key}>
                  <span className="mb-1 block text-xs text-slate-500">{field.label}</span>
                  <input
                    aria-label={`${field.label} — ${plan.nom}`}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-platform-500 focus:ring-2 focus:ring-platform-100 disabled:bg-slate-100"
                    disabled={!canWrite || isSaving}
                    inputMode="text"
                    onChange={(event) => setDraft(planId, field.key, event.target.value)}
                    placeholder={field.storage ? "ex. 5 GB ou ∞" : "Nombre ou ∞"}
                    value={getInputValue(plan, field.key)}
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Utilise <span className="font-medium">∞</span> pour une limite illimitée.
                Le stockage est enregistré en Mo.
              </p>
              {canWrite && (
                <button
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-platform-600 px-3 text-xs font-semibold text-white hover:bg-platform-700 focus:outline-none focus:ring-2 focus:ring-platform-300 disabled:cursor-wait disabled:opacity-60"
                  disabled={isSaving}
                  onClick={() => savePlanQuotas(plan)}
                  type="button"
                >
                  {isSaving ? (
                    <RefreshCw aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  {isSaving ? "Enregistrement…" : "Enregistrer"}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function PlatformSettingsContent({ settings }) {
  const { user } = useAuth();
  const canWrite = user?.role === "super_admin";
  const saveSettingsMutation = useSavePlatformSettings();
  const [activeTab, setActiveTab] = useState("general");
  const [toast, setToast] = useState(null);
  const [formError, setFormError] = useState("");
  const [general, setGeneral] = useState(() => ({
    nomPlateforme: settings.general?.nomPlateforme || "",
    urlPrincipale: settings.general?.urlPrincipale || "",
    emailSupport: settings.general?.emailSupport || "",
    emailFacturation: settings.general?.emailFacturation || "",
    deviseParDefaut: settings.general?.deviseParDefaut || "",
    fuseauHoraire: settings.general?.fuseauHoraire || "",
  }));
  const [emails, setEmails] = useState(() => ({
    serveurSmtp: settings.emails?.serveurSmtp || "",
    portSmtp: String(settings.emails?.portSmtp ?? 587),
    expediteurParDefaut: settings.emails?.expediteurParDefaut || "",
    emailBienvenue: settings.emails?.emailBienvenue ?? true,
    emailRappelPaiement: settings.emails?.emailRappelPaiement ?? true,
    emailSuspension: settings.emails?.emailSuspension ?? true,
    alertesSysteme: settings.emails?.alertesSysteme ?? true,
  }));

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  async function saveSettingsSection(section) {
    setFormError("");
    const values =
      section === "general"
        ? general
        : { ...emails, portSmtp: Number(emails.portSmtp) };
    const schema =
      section === "general" ? generalSettingsSchema : emailSettingsSchema;
    const validation = schema.safeParse(values);

    if (!validation.success) {
      setFormError(
        validation.error.issues[0]?.message ||
          "Vérifie les informations saisies.",
      );
      return;
    }

    try {
      await saveSettingsMutation.mutateAsync({
        section,
        values: validation.data,
      });
      showToast(
        section === "general"
          ? "Les paramètres généraux ont été enregistrés."
          : "Les paramètres emails et notifications ont été enregistrés.",
      );
    } catch (error) {
      setFormError(parseApiError(error).message);
    }
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">
          Paramètres plateforme
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Configuration globale de la plateforme Stockline.
        </p>
      </header>

      <div
        aria-label="Sections des paramètres plateforme"
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-200/80 p-1"
        role="tablist"
      >
        {tabOptions.map(({ value, label }) => (
          <button
            aria-controls={`platform-settings-panel-${value}`}
            aria-selected={activeTab === value}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
              activeTab === value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
            }`}
            id={`platform-settings-tab-${value}`}
            key={value}
            onClick={() => {
              setActiveTab(value);
              setFormError("");
            }}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-w-xl">
        {activeTab === "general" && (
          <section
            aria-labelledby="platform-general-heading"
            className="card space-y-4 p-4 sm:p-5"
            id="platform-settings-panel-general"
            role="tabpanel"
          >
            <h3 className="text-sm font-semibold text-slate-900" id="platform-general-heading">
              Informations de la plateforme
            </h3>
            {generalFields.map((field) => (
              <label className="block" key={field.name}>
                <span className="mb-1.5 block text-sm text-slate-600">
                  {field.label}
                </span>
                <input
                  autoComplete="off"
                  className={fieldClassName}
                  disabled={!canWrite || saveSettingsMutation.isPending}
                  onChange={(event) =>
                    setGeneral((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                  type={field.type}
                  value={general[field.name]}
                />
              </label>
            ))}

            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-600">
                Devise par défaut
              </span>
              <select
                className={fieldClassName}
                disabled={!canWrite || saveSettingsMutation.isPending}
                onChange={(event) =>
                  setGeneral((current) => ({
                    ...current,
                    deviseParDefaut: event.target.value,
                  }))
                }
                value={general.deviseParDefaut}
              >
                <option disabled value="">
                  Non définie
                </option>
                {!["XAF", "XOF", "USD"].includes(general.deviseParDefaut) && (
                  <option value={general.deviseParDefaut}>
                    {general.deviseParDefaut} — devise configurée
                  </option>
                )}
                <option value="XAF">FCFA — XAF</option>
                <option value="XOF">FCFA — XOF</option>
                <option value="USD">USD — Dollar américain</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-600">
                Fuseau horaire
              </span>
              <input
                className={fieldClassName}
                disabled={!canWrite || saveSettingsMutation.isPending}
                onChange={(event) =>
                  setGeneral((current) => ({
                    ...current,
                    fuseauHoraire: event.target.value,
                  }))
                }
                value={general.fuseauHoraire}
              />
            </label>

            <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <Globe2 aria-hidden="true" className="h-4 w-4 shrink-0 text-platform-600" />
              {general.deviseParDefaut || general.fuseauHoraire
                ? `Paramètres régionaux : ${general.deviseParDefaut || "—"} · Fuseau horaire : ${general.fuseauHoraire || "—"}.`
                : "Aucun paramètre régional n’a été renvoyé par le backend."}
            </p>
          </section>
        )}

        {activeTab === "emails" && (
          <section
            aria-labelledby="platform-email-heading"
            className="card space-y-4 p-4 sm:p-5"
            id="platform-settings-panel-emails"
            role="tabpanel"
          >
            <h3 className="text-sm font-semibold text-slate-900" id="platform-email-heading">
              Configuration des emails transactionnels
            </h3>
            {emailFields.map((field) => (
              <label className="block" key={field.name}>
                <span className="mb-1.5 block text-sm text-slate-600">
                  {field.label}
                </span>
                <input
                  autoComplete="off"
                  className={fieldClassName}
                  disabled={!canWrite || saveSettingsMutation.isPending}
                  max={field.type === "number" ? 65535 : undefined}
                  min={field.type === "number" ? 1 : undefined}
                  onChange={(event) =>
                    setEmails((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                  type={field.type}
                  value={emails[field.name]}
                />
              </label>
            ))}

            <fieldset className="space-y-3 border-t border-slate-100 pt-4">
              <legend className="sr-only">Emails et notifications activés</legend>
              {emailToggles.map((toggle) => (
                <label className="flex items-start gap-2.5 text-sm text-slate-600" key={toggle.name}>
                  <input
                    checked={emails[toggle.name]}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-platform-600 focus:ring-platform-500"
                    disabled={!canWrite || saveSettingsMutation.isPending}
                    onChange={(event) =>
                      setEmails((current) => ({
                        ...current,
                        [toggle.name]: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{toggle.label}</span>
                </label>
              ))}
            </fieldset>
          </section>
        )}

        {activeTab === "quotas" && (
          <div
            aria-labelledby="platform-settings-tab-quotas"
            className="card p-4 sm:p-5"
            id="platform-settings-panel-quotas"
            role="tabpanel"
          >
            <QuotasTab canWrite={canWrite} onToast={showToast} />
          </div>
        )}

        {formError && activeTab !== "quotas" && (
          <p
            aria-live="assertive"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            role="alert"
          >
            {formError}
          </p>
        )}

        {activeTab !== "quotas" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {!canWrite && (
              <p className="text-xs text-slate-500">
                La modification est réservée au Super-Admin.
              </p>
            )}
            {canWrite && (
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-platform-600 px-4 text-sm font-semibold text-white transition hover:bg-platform-700 focus:outline-none focus:ring-2 focus:ring-platform-300 disabled:cursor-wait disabled:opacity-60"
                disabled={saveSettingsMutation.isPending}
                onClick={() => saveSettingsSection(activeTab)}
                type="button"
              >
                {saveSettingsMutation.isPending && (
                  <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
                )}
                {saveSettingsMutation.isPending
                  ? "Enregistrement…"
                  : "Sauvegarder les modifications"}
              </button>
            )}
          </div>
        )}
      </div>

      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </section>
  );
}

export default function PlatformSettingsPage() {
  const settingsQuery = usePlatformSettings();

  if (settingsQuery.isPending) return <SettingsSkeleton />;

  if (settingsQuery.isError) {
    return (
      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-semibold text-slate-900">
            Paramètres plateforme
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Configuration globale de la plateforme Stockline.
          </p>
        </header>
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>Impossible de charger les paramètres : {parseApiError(settingsQuery.error).message}</p>
            <button
              className="mt-2 inline-flex items-center gap-1 font-semibold underline underline-offset-2"
              onClick={() => settingsQuery.refetch()}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              Réessayer
            </button>
          </div>
        </div>
      </section>
    );
  }

  return <PlatformSettingsContent settings={settingsQuery.data} />;
}
