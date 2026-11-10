import { useState } from "react";
import { Link } from "react-router-dom";
import AuthPageLayout from "@/apps/public/components/AuthPageLayout.jsx";
import { parseApiError } from "@/core/api/errors.js";
import apiClient from "@/core/api/client.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const { data: response } = await apiClient.post(
        "/auth/forgot-password",
        { email: email.trim() },
        { skipAuthRefresh: true },
      );
      setSuccessMessage(
        response?.data?.message ||
          "Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.",
      );
    } catch (error) {
      setErrorMessage(parseApiError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageLayout>
      <section aria-labelledby="forgot-password-title">
        <h1
          className="text-2xl font-bold tracking-tight text-gray-900"
          id="forgot-password-title"
        >
          Mot de passe oublié
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Entrez votre email pour recevoir un lien de réinitialisation.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-800"
              htmlFor="recovery-email"
            >
              Adresse email
            </label>
            <input
              autoComplete="email"
              className="h-[42px] w-full rounded-[9px] border border-gray-300 bg-transparent px-3 text-sm text-slate-900 outline-none transition placeholder:text-gray-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              id="recovery-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@exemple.com"
              required
              type="email"
              value={email}
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
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Envoi..." : "Envoyer le lien"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-600">
          <Link className="hover:text-brand-700" to="/login">
            ← Retour à la connexion
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-gray-400">
          <Link className="hover:text-gray-600" to="/">
            ← Retour à l’accueil Stockline
          </Link>
        </p>
      </section>
    </AuthPageLayout>
  );
}
