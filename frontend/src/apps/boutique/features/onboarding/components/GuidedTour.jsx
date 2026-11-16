import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, X } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useCompleteGuidedTour } from "../hooks.js";

const tourSteps = [
  {
    target: "/dashboard",
    title: "Votre tableau de bord",
    description:
      "Retrouvez ici les ventes, les indicateurs clés et les alertes de votre boutique.",
  },
  {
    target: "/products",
    title: "Gérez vos produits",
    description:
      "Consultez votre catalogue et ajoutez vos produits pour préparer vos ventes.",
  },
  {
    target: "/stock",
    title: "Suivez votre stock",
    description:
      "Surveillez les quantités disponibles et repérez rapidement les articles à réapprovisionner.",
  },
  {
    target: "/pos",
    title: "Passez en caisse",
    description:
      "L’espace caisse vous permettra d’enregistrer les ventes et les paiements.",
  },
];

export default function GuidedTour({
  visibleNavigation,
  onOpenNavigation,
  onCloseNavigation,
}) {
  const completeTour = useCompleteGuidedTour(onCloseNavigation);
  const dialogRef = useRef(null);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useMemo(
    () =>
      tourSteps.filter(({ target }) =>
        visibleNavigation.some(({ path }) => path === target),
      ),
    [visibleNavigation],
  );
  const activeStep = steps[stepIndex];
  const apiError = completeTour.isError
    ? parseApiError(completeTour.error)
    : null;

  useEffect(() => {
    onOpenNavigation();
  }, [onOpenNavigation]);

  useEffect(() => {
    const target = activeStep
      ? document.querySelector(`[data-onboarding-target="${activeStep.target}"]`)
      : null;

    if (!target) return undefined;

    const previousStyle = {
      position: target.style.position,
      zIndex: target.style.zIndex,
      boxShadow: target.style.boxShadow,
      borderRadius: target.style.borderRadius,
    };

    target.style.position = "relative";
    target.style.zIndex = "55";
    target.style.boxShadow = "0 0 0 3px #ffffff, 0 0 0 6px #2563eb";
    target.style.borderRadius = "0.75rem";
    target.scrollIntoView({ block: "nearest", behavior: "smooth" });

    return () => {
      target.style.position = previousStyle.position;
      target.style.zIndex = previousStyle.zIndex;
      target.style.boxShadow = previousStyle.boxShadow;
      target.style.borderRadius = previousStyle.borderRadius;
    };
  }, [activeStep]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  function finishTour() {
    if (completeTour.isPending) return;
    completeTour.mutate();
  }

  if (!activeStep) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-slate-950/55"
        data-testid="guided-tour-backdrop"
      />
      <section
        aria-describedby="guided-tour-description"
        aria-labelledby="guided-tour-title"
        aria-modal="true"
        className="fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:bottom-8 sm:p-6"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            finishTour();
            return;
          }

          if (event.key !== "Tab") return;
          const buttons = dialogRef.current?.querySelectorAll(
            "button:not(:disabled)",
          );
          const firstButton = buttons?.[0];
          const lastButton = buttons?.[buttons.length - 1];

          if (
            event.shiftKey &&
            (document.activeElement === firstButton ||
              document.activeElement === dialogRef.current)
          ) {
            event.preventDefault();
            lastButton?.focus();
          } else if (!event.shiftKey && document.activeElement === lastButton) {
            event.preventDefault();
            firstButton?.focus();
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              Visite guidée · {stepIndex + 1}/{steps.length}
            </p>
            <h2
              className="mt-2 text-lg font-bold text-slate-900"
              id="guided-tour-title"
            >
              {activeStep.title}
            </h2>
          </div>
          <button
            aria-label="Passer la visite guidée"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
            disabled={completeTour.isPending}
            onClick={finishTour}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <p
          className="mt-2 text-sm leading-6 text-slate-600"
          id="guided-tour-description"
        >
          {activeStep.description}
        </p>

        {apiError && (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
            role="alert"
          >
            Impossible d’enregistrer la fin de la visite : {apiError.message}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {steps.map((tourStep, index) => (
              <span
                aria-label={`Étape ${index + 1}${index === stepIndex ? ", actuelle" : ""}`}
                className={`h-1.5 rounded-full transition-all ${
                  index === stepIndex ? "w-6 bg-brand-600" : "w-1.5 bg-slate-200"
                }`}
                key={tourStep.target}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                disabled={completeTour.isPending}
                onClick={() => {
                  completeTour.reset();
                  setStepIndex((index) => index - 1);
                }}
                type="button"
              >
                <ArrowLeft aria-hidden="true" size={15} />
                Retour
              </button>
            )}
            {stepIndex < steps.length - 1 ? (
              <button
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-60"
                disabled={completeTour.isPending}
                onClick={() => {
                  completeTour.reset();
                  setStepIndex((index) => index + 1);
                }}
                type="button"
              >
                Suivant
                <ArrowRight aria-hidden="true" size={15} />
              </button>
            ) : (
              <button
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-60"
                disabled={completeTour.isPending}
                onClick={finishTour}
                type="button"
              >
                {completeTour.isPending ? (
                  <>
                    <LoaderCircle
                      aria-hidden="true"
                      className="animate-spin"
                      size={15}
                    />
                    Enregistrement…
                  </>
                ) : (
                  <>
                    Terminer
                    <ArrowRight aria-hidden="true" size={15} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
