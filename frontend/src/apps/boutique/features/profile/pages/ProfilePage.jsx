import { useState } from "react";
import { KeyRound, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { parseApiError } from "@/core/api/errors.js";
import { authStore } from "@/core/store/authStore.js";
import { useAuth } from "@/core/hooks/useAuth.js";
import PasswordStrength from "@/apps/public/components/PasswordStrength.jsx";
import { isStrongPassword } from "@/apps/public/components/password-rules.js";
import { changeOwnPassword } from "../api.js";

const roleLabels = {
  admin: "Administrateur",
  caissier: "Caissier(ère)",
  magasinier: "Magasinier",
  comptable: "Comptable",
  custom: "Rôle personnalisé",
};

const fieldClassName =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function ProfileInfo({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">
        {value || "—"}
      </dd>
    </div>
  );
}

export default function ProfilePage() {
  const { user, shop } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!isStrongPassword(newPassword)) {
      setErrorMessage(
        "Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.",
      );
      return;
    }

    if (newPassword !== confirmation) {
      setErrorMessage("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await changeOwnPassword({
        motDePasseActuel: currentPassword,
        nouveauMotDePasse: newPassword,
        confirmation,
      });
      navigate("/login", {
        replace: true,
        state: {
          message:
            result?.message ||
            "Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe.",
        },
      });
      await authStore.getState().logout({ notifyServer: false });
    } catch (error) {
      setErrorMessage(parseApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Mon profil</h2>
        <p className="mt-1 text-sm text-slate-500">
          Consultez vos informations et sécurisez votre compte.
        </p>
      </header>

      <section
        aria-labelledby="profile-info-title"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <UserRound aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900" id="profile-info-title">
              Informations personnelles
            </h3>
            <p className="text-xs text-slate-500">
              Informations associées à votre compte.
            </p>
          </div>
        </header>
        <dl className="grid gap-5 p-5 sm:grid-cols-2">
          <ProfileInfo label="Nom complet" value={user?.nom} />
          <ProfileInfo label="Adresse e-mail" value={user?.email} />
          <ProfileInfo label="Téléphone" value={user?.telephone} />
          <ProfileInfo
            label="Rôle"
            value={user?.roleLibelle || roleLabels[user?.role] || user?.role}
          />
          <ProfileInfo label="Boutique" value={shop?.nom} />
        </dl>
      </section>

      <section
        aria-labelledby="change-password-title"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <KeyRound aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900" id="change-password-title">
              Changer mon mot de passe
            </h3>
            <p className="text-xs text-slate-500">
              Vous devrez vous reconnecter après le changement.
            </p>
          </div>
        </header>
        <form className="max-w-xl space-y-4 p-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-700"
              htmlFor="profile-current-password"
            >
              Mot de passe actuel
            </label>
            <input
              autoComplete="current-password"
              className={fieldClassName}
              id="profile-current-password"
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              type="password"
              value={currentPassword}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-700"
              htmlFor="profile-new-password"
            >
              Nouveau mot de passe
            </label>
            <input
              autoComplete="new-password"
              className={fieldClassName}
              id="profile-new-password"
              maxLength={128}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              type="password"
              value={newPassword}
            />
            <PasswordStrength password={newPassword} />
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-700"
              htmlFor="profile-password-confirmation"
            >
              Confirmer le nouveau mot de passe
            </label>
            <input
              autoComplete="new-password"
              className={fieldClassName}
              id="profile-password-confirmation"
              maxLength={128}
              onChange={(event) => setConfirmation(event.target.value)}
              required
              type="password"
              value={confirmation}
            />
          </div>
          {errorMessage && (
            <p
              aria-live="assertive"
              className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Enregistrement…" : "Changer le mot de passe"}
          </button>
        </form>
      </section>
    </section>
  );
}
