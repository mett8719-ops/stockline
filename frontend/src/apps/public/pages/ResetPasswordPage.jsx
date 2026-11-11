import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthPageLayout from "@/apps/public/components/AuthPageLayout.jsx";
import PasswordStrength from "@/apps/public/components/PasswordStrength.jsx";
import { isStrongPassword } from "@/apps/public/components/password-rules.js";
import { parseApiError } from "@/core/api/errors.js";
import apiClient from "@/core/api/client.js";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "Le lien ne contient pas de jeton. Demandez un nouveau lien de réinitialisation.",
  );
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

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
      const { data: response } = await apiClient.post(
        "/auth/reset-password",
        { token, nouveauMotDePasse: newPassword },
        { skipAuthRefresh: true },
      );
      setSuccessMessage(
        response?.data?.message ||
          "Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.",
      );
      setNewPassword("");
      setConfirmation("");
    } catch (error) {
      setErrorMessage(parseApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageLayout>
      <section aria-labelledby="reset-password-title">
        <h1
          className="text-2xl font-bold tracking-tight text-gray-900"
          id="reset-password-title"
        >
          Nouveau mot de passe
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Choisissez un nouveau mot de passe pour votre compte.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-800"
              htmlFor="reset-new-password"
            >
              Nouveau mot de passe
            </label>
            <input
              autoComplete="new-password"
              className="h-[42px] w-full rounded-[9px] border border-gray-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              id="reset-new-password"
              onChange={(event) => setNewPassword(event.target.value)}
              required
              type="password"
              value={newPassword}
            />
            <PasswordStrength password={newPassword} />
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-800"
              htmlFor="reset-confirm-password"
            >
              Confirmer le nouveau mot de passe
            </label>
            <input
              autoComplete="new-password"
              className="h-[42px] w-full rounded-[9px] border border-gray-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              id="reset-confirm-password"
              onChange={(event) => setConfirmation(event.target.value)}
              required
              type="password"
              value={confirmation}
            />
          </div>

          {successMessage && (
            <p
              className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              role="status"
            >
              {successMessage}
            </p>
          )}
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
            disabled={!token || isSubmitting || Boolean(successMessage)}
            type="submit"
          >
            {isSubmitting ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-600">
          <Link className="hover:text-brand-700" to="/login">
            ← Retour à la connexion
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-gray-400">
          <Link className="hover:text-gray-600" to="/forgot-password">
            Demander un nouveau lien
          </Link>
        </p>
      </section>
    </AuthPageLayout>
  );
}
