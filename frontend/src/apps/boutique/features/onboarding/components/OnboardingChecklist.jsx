import { Check, Circle, Package, Settings2, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

const checklistItems = [
  {
    key: "logoAjoute",
    title: "Ajouter le logo de la boutique",
    description: "Personnalisez l’espace de votre boutique.",
    icon: Settings2,
  },
  {
    key: "premierProduit",
    title: "Ajouter votre premier produit",
    description: "Votre catalogue est prêt pour les ventes.",
    icon: Package,
    to: "/products",
    action: "Voir les produits",
  },
  {
    key: "employeInvite",
    title: "Inviter un employé",
    description: "Préparez l’accès de votre équipe.",
    icon: UserPlus,
  },
];

export default function OnboardingChecklist({ shop, canManageProducts }) {
  const steps = shop?.etapesOnboarding ?? {};
  const completed = checklistItems.filter(
    ({ key }) => key === "logoAjoute"
      ? Boolean(steps[key] || shop?.logoUrl)
      : Boolean(steps[key]),
  ).length;

  return (
    <section
      aria-labelledby="onboarding-checklist-title"
      className="card overflow-hidden"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Bien démarrer
          </p>
          <h3
            className="mt-1 text-base font-semibold text-slate-900"
            id="onboarding-checklist-title"
          >
            Complétez la configuration de votre boutique
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Quelques étapes pour préparer votre espace de travail.
          </p>
        </div>
        <span
          aria-label={`${completed} tâche${completed === 1 ? "" : "s"} sur 3 terminée${completed === 1 ? "" : "s"}`}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
            completed === checklistItems.length
              ? "bg-emerald-50 text-emerald-700"
              : "bg-blue-50 text-brand-700"
          }`}
        >
          {completed}/{checklistItems.length}
        </span>
      </div>

      <div className="px-5 py-4 sm:px-6">
        <div
          aria-hidden="true"
          className="h-2 overflow-hidden rounded-full bg-slate-100"
        >
          <span
            className="block h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${(completed / checklistItems.length) * 100}%` }}
          />
        </div>

        <ul className="mt-3 divide-y divide-slate-100">
          {checklistItems.map(({ key, title, description, icon: Icon, to, action }) => {
            const isComplete =
              key === "logoAjoute"
                ? Boolean(steps[key] || shop?.logoUrl)
                : Boolean(steps[key]);
            const canNavigate = to && canManageProducts && !isComplete;
            const content = (
              <>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isComplete
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isComplete ? (
                    <Check aria-hidden="true" size={17} />
                  ) : (
                    <Icon aria-hidden="true" size={17} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-medium ${
                      isComplete ? "text-slate-500 line-through" : "text-slate-800"
                    }`}
                  >
                    {title}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {description}
                  </span>
                </span>
                {action && canNavigate && (
                  <span className="shrink-0 text-xs font-semibold text-brand-700">
                    {action}
                  </span>
                )}
                {!isComplete && !action && (
                  <Circle
                    aria-hidden="true"
                    className="shrink-0 text-slate-300"
                    size={17}
                  />
                )}
              </>
            );

            return (
              <li key={key}>
                {canNavigate ? (
                  <Link
                    className="flex min-h-[68px] items-center gap-3 py-3 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    to={to}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex min-h-[68px] items-center gap-3 py-3">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
