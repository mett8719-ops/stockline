import { Check } from "lucide-react";

const steps = [
  { number: 1, label: "Votre boutique" },
  { number: 2, label: "Le propriétaire" },
  { number: 3, label: "Votre forfait" },
  { number: 4, label: "Confirmation" },
];

export default function SignupStepper({ currentStep }) {
  return (
    <ol
      aria-label="Étapes de création du compte"
      className="grid grid-cols-4 gap-1 sm:flex sm:flex-col sm:gap-0"
    >
      {steps.map(({ number, label }, index) => {
        const isComplete = number < currentStep;
        const isCurrent = number === currentStep;

        return (
          <li
            aria-current={isCurrent ? "step" : undefined}
            className="relative min-w-0 sm:flex sm:min-h-[76px] sm:gap-4"
            key={number}
          >
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute left-4 top-8 hidden h-[44px] w-px sm:block ${
                  isComplete ? "bg-blue-300" : "bg-slate-200"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                isComplete
                  ? "bg-brand-600 text-white"
                  : isCurrent
                    ? "bg-brand-600 text-white ring-4 ring-blue-100"
                    : "border border-slate-300 bg-white text-slate-500"
              }`}
            >
              {isComplete ? <Check aria-hidden="true" size={16} /> : number}
            </span>
            <span
              className={`mt-2 block truncate text-[11px] leading-4 sm:mt-1 sm:text-sm ${
                isCurrent
                  ? "font-semibold text-slate-900"
                  : isComplete
                    ? "font-medium text-slate-700"
                    : "text-slate-500"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
