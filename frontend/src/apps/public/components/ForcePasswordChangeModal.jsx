import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import apiClient from "@/core/api/client.js";
import { authStore } from "@/core/store/authStore.js";
import PasswordStrength from "./PasswordStrength.jsx";
import { isStrongPassword } from "./password-rules.js";

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  required = false,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-800" htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <div className="relative">
        <input
          autoComplete={autoComplete}
          className="h-[42px] w-full rounded-[9px] border border-gray-300 bg-white px-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          id={id}
          onChange={onChange}
          required={required}
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-gray-400 hover:text-gray-600"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function ForcePasswordChangeModal({ onComplete, onLogout }) {
  const dialogRef = useRef(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return undefined;

    dialog.showModal();
    dialog.querySelector("input")?.focus();

    return () => dialog.close();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (!isStrongPassword(newPassword)) {
      setErrorMessage("Le nouveau mot de passe ne respecte pas encore tous les critères.");
      return;
    }

    if (newPassword !== confirmation) {
      setErrorMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post("/auth/change-password", {
        ...(currentPassword ? { motDePasseActuel: currentPassword } : {}),
        nouveauMotDePasse: newPassword,
        confirmation,
      });

      await authStore.getState().logout({ notifyServer: false });
      onComplete();
    } catch (error) {
      setErrorMessage(parseApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await authStore.getState().logout();
      onLogout();
    } catch (error) {
      setErrorMessage(parseApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      aria-labelledby="force-password-title"
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-slate-950/60"
      onCancel={(event) => event.preventDefault()}
      ref={dialogRef}
    >
      <div className="flex min-h-full items-center justify-center px-4 py-8">
        <section className="my-auto w-full max-w-md rounded-xl bg-white p-6 shadow-modal sm:p-8">
          <h2
            className="text-xl font-bold text-slate-900"
            id="force-password-title"
          >
            Sécurisez votre compte
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Pour continuer, choisissez un nouveau mot de passe. Le mot de passe
            temporaire utilisé pour vous connecter n’a pas besoin d’être saisi à
            nouveau.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <PasswordField
              autoComplete="current-password"
              id="current-password"
              label="Ancien mot de passe (facultatif)"
              onChange={(event) => setCurrentPassword(event.target.value)}
              value={currentPassword}
            />
            <div>
              <PasswordField
                autoComplete="new-password"
                id="new-password"
                label="Nouveau mot de passe"
                onChange={(event) => setNewPassword(event.target.value)}
                required
                value={newPassword}
              />
              <PasswordStrength password={newPassword} />
            </div>
            <PasswordField
              autoComplete="new-password"
              id="confirm-password"
              label="Confirmer le nouveau mot de passe"
              onChange={(event) => setConfirmation(event.target.value)}
              required
              value={confirmation}
            />

            {errorMessage && (
              <p
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                {errorMessage}
              </p>
            )}

            <button
              className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Enregistrement..." : "Enregistrer le nouveau mot de passe"}
            </button>
            <button
              className="w-full py-1 text-sm font-medium text-gray-500 hover:text-gray-700"
              disabled={isSubmitting}
              onClick={handleLogout}
              type="button"
            >
              Se déconnecter
            </button>
          </form>
        </section>
      </div>
    </dialog>
  );
}
