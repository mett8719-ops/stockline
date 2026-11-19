import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { usePlatformShops, usePlatformPlans } from "../../shared/hooks.js";
import { useUpsertFeatureFlag } from "../hooks.js";

const fieldClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-platform-500 focus:ring-2 focus:ring-platform-100";

const strategyOptions = [
  { value: "global", label: "Global", description: "Cibler toutes les boutiques." },
  { value: "plan", label: "Par plan", description: "Limiter à certains plans." },
  { value: "beta", label: "Bêta", description: "Choisir des boutiques précises." },
  {
    value: "pourcentage",
    label: "Pourcentage",
    description: "Déployer progressivement.",
  },
];

function getId(item) {
  return String(item?._id || item?.id || item);
}

export default function FlagTargetingDialog({ flag, onClose, onSaved }) {
  const dialogRef = useRef(null);
  const upsertMutation = useUpsertFeatureFlag();
  const [strategie, setStrategie] = useState(flag.strategie || "global");
  const [plansCibles, setPlansCibles] = useState(
    (flag.plansCibles || []).map(getId),
  );
  const [boutiquesCibles, setBoutiquesCibles] = useState(
    (flag.boutiquesCibles || []).map(getId),
  );
  const [pourcentage, setPourcentage] = useState(
    String(flag.pourcentageDeploiement ?? 0),
  );
  const [shopSearch, setShopSearch] = useState("");
  const [debouncedShopSearch, setDebouncedShopSearch] = useState("");
  const [shopPage, setShopPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");
  const plansQuery = usePlatformPlans();
  const shopsQuery = usePlatformShops({
    page: shopPage,
    limit: 10,
    q: debouncedShopSearch,
    enabled: strategie === "beta",
  });
  const plans = plansQuery.data || [];
  const shops = shopsQuery.data?.shops || [];
  const shopPagination = shopsQuery.data?.pagination;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => {
        setDebouncedShopSearch(shopSearch.trim());
        setShopPage(1);
      },
      300,
    );
    return () => window.clearTimeout(timeoutId);
  }, [shopSearch]);

  function toggleSelection(selected, setSelected, value) {
    setSelected(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (strategie === "plan" && plansCibles.length === 0) {
      setErrorMessage("Sélectionne au moins un plan pour ce ciblage.");
      return;
    }

    if (strategie === "beta" && boutiquesCibles.length === 0) {
      setErrorMessage("Sélectionne au moins une boutique pour la bêta.");
      return;
    }

    const numericPercentage = Number(pourcentage);
    if (
      strategie === "pourcentage" &&
      (!Number.isFinite(numericPercentage) ||
        numericPercentage < 0 ||
        numericPercentage > 100)
    ) {
      setErrorMessage("Le pourcentage doit être compris entre 0 et 100.");
      return;
    }

    try {
      const savedFlag = await upsertMutation.mutateAsync({
        cle: flag.cle,
        nom: flag.nom,
        description: flag.description || "",
        environnement: flag.environnement,
        actif: Boolean(flag.actif),
        strategie,
        plansCibles: strategie === "plan" ? plansCibles : [],
        boutiquesCibles: strategie === "beta" ? boutiquesCibles : [],
        pourcentageDeploiement:
          strategie === "pourcentage" ? numericPercentage : 0,
      });
      onSaved(`Ciblage de « ${flag.nom} » enregistré.`, savedFlag);
    } catch (error) {
      setErrorMessage(parseApiError(error).message);
    }
  }

  const isPending = upsertMutation.isPending;

  return (
    <dialog
      aria-labelledby="flag-targeting-title"
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-slate-950/50"
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !isPending) onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex min-h-full items-start justify-center px-3 py-5 sm:items-center sm:px-5">
        <section className="my-auto w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-modal">
          <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900" id="flag-targeting-title">
                Ciblage du flag
              </h2>
              <p className="mt-1 truncate text-sm text-slate-600">{flag.nom}</p>
              <p className="mt-0.5 font-mono text-xs text-slate-400">{flag.cle}</p>
            </div>
            <button
              aria-label="Fermer la fenêtre"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-platform-300"
              disabled={isPending}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>

          <form className="space-y-4 p-5" onSubmit={handleSubmit}>
            {errorMessage && (
              <p
                aria-live="assertive"
                className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
                role="alert"
              >
                {errorMessage}
              </p>
            )}

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">
                Stratégie de ciblage
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {strategyOptions.map((option) => (
                  <label
                    className={`cursor-pointer rounded-lg border p-3 transition ${
                      strategie === option.value
                        ? "border-platform-500 bg-platform-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    key={option.value}
                  >
                    <input
                      checked={strategie === option.value}
                      className="sr-only"
                      name="flag-strategy"
                      onChange={() => setStrategie(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span className="block text-sm font-medium text-slate-800">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {option.description}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {strategie === "plan" && (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700">
                  Plans concernés
                </legend>
                {plansQuery.isPending ? (
                  <div
                    aria-label="Chargement des plans"
                    className="skeleton h-20 rounded-lg"
                    role="status"
                  />
                ) : plansQuery.isError ? (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                    Impossible de charger les plans : {parseApiError(plansQuery.error).message}
                    <button
                      className="ml-2 font-semibold underline"
                      onClick={() => plansQuery.refetch()}
                      type="button"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : plans.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                    Aucun plan n’est disponible.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                    {plans.map((plan) => {
                      const planId = getId(plan);
                      return (
                        <label className="flex items-center gap-2 text-sm text-slate-700" key={planId}>
                          <input
                            checked={plansCibles.includes(planId)}
                            className="h-4 w-4 rounded border-slate-300 accent-platform-600 focus:ring-platform-500"
                            onChange={() =>
                              toggleSelection(plansCibles, setPlansCibles, planId)
                            }
                            type="checkbox"
                          />
                          {plan.nom}
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>
            )}

            {strategie === "beta" && (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700">
                  Boutiques en bêta
                  {boutiquesCibles.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {boutiquesCibles.length} sélectionnée(s)
                    </span>
                  )}
                </legend>
                <input
                  className={fieldClassName}
                  onChange={(event) => setShopSearch(event.target.value)}
                  placeholder="Rechercher une boutique…"
                  value={shopSearch}
                />
                {shopsQuery.isPending ? (
                  <div
                    aria-label="Chargement des boutiques"
                    className="skeleton mt-2 h-24 rounded-lg"
                    role="status"
                  />
                ) : shopsQuery.isError ? (
                  <div className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                    Impossible de charger les boutiques : {parseApiError(shopsQuery.error).message}
                    <button
                      className="ml-2 font-semibold underline"
                      onClick={() => shopsQuery.refetch()}
                      type="button"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : shops.length === 0 ? (
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                    Aucune boutique ne correspond à la recherche.
                  </p>
                ) : (
                  <div className="mt-2 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                    {shops.map((shop) => {
                      const shopId = getId(shop);
                      return (
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50" key={shopId}>
                          <input
                            checked={boutiquesCibles.includes(shopId)}
                            className="h-4 w-4 rounded border-slate-300 accent-platform-600 focus:ring-platform-500"
                            onChange={() =>
                              toggleSelection(
                                boutiquesCibles,
                                setBoutiquesCibles,
                                shopId,
                              )
                            }
                            type="checkbox"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-800">
                              {shop.nom}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {shop.code || "Boutique"}
                              {shop.planId?.nom ? ` · ${shop.planId.nom}` : ""}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {shopPagination?.totalPages > 1 && (
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Page {shopPagination.page} sur {shopPagination.totalPages}
                    </span>
                    <span className="flex gap-2">
                      <button
                        className="font-medium text-platform-700 disabled:opacity-40"
                        disabled={shopPage <= 1 || shopsQuery.isFetching}
                        onClick={() => setShopPage((page) => page - 1)}
                        type="button"
                      >
                        Précédente
                      </button>
                      <button
                        className="font-medium text-platform-700 disabled:opacity-40"
                        disabled={
                          shopPage >= shopPagination.totalPages ||
                          shopsQuery.isFetching
                        }
                        onClick={() => setShopPage((page) => page + 1)}
                        type="button"
                      >
                        Suivante
                      </button>
                    </span>
                  </div>
                )}
              </fieldset>
            )}

            {strategie === "pourcentage" && (
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                  htmlFor="flag-percentage"
                >
                  Pourcentage de déploiement
                </label>
                <div className="relative">
                  <input
                    className={`${fieldClassName} pr-9`}
                    id="flag-percentage"
                    max="100"
                    min="0"
                    onChange={(event) => setPourcentage(event.target.value)}
                    required
                    type="number"
                    value={pourcentage}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    %
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                disabled={isPending}
                onClick={onClose}
                type="button"
              >
                Annuler
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg bg-platform-600 px-4 text-sm font-semibold text-white hover:bg-platform-700 focus:outline-none focus:ring-2 focus:ring-platform-300 disabled:cursor-wait disabled:opacity-60"
                disabled={isPending || (strategie === "plan" && plansQuery.isPending) || (strategie === "beta" && shopsQuery.isPending)}
                type="submit"
              >
                {isPending ? "Enregistrement…" : "Enregistrer le ciblage"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </dialog>
  );
}
