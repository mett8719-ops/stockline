import { PASSWORD_RULES } from "./password-rules.js";

export default function PasswordStrength({ password }) {
  const fulfilledRules = PASSWORD_RULES.filter(({ test }) => test(password)).length;

  return (
    <div className="mt-3">
      <div
        aria-label={`Complexité du mot de passe : ${fulfilledRules} critères sur ${PASSWORD_RULES.length}`}
        aria-valuemax={PASSWORD_RULES.length}
        aria-valuemin={0}
        aria-valuenow={fulfilledRules}
        className="flex gap-1"
        role="progressbar"
      >
        {PASSWORD_RULES.map(({ label }, index) => (
          <span
            aria-hidden="true"
            className={`h-1.5 flex-1 rounded-full ${
              index < fulfilledRules ? "bg-brand-600" : "bg-gray-200"
            }`}
            key={label}
          />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
        {PASSWORD_RULES.map(({ label, test }) => {
          const fulfilled = test(password);

          return (
            <li
              className={fulfilled ? "text-emerald-700" : ""}
              key={label}
            >
              <span aria-hidden="true">{fulfilled ? "✓" : "·"}</span>{" "}
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
