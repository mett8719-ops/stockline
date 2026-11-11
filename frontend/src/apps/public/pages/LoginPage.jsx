import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthPageLayout from "@/apps/public/components/AuthPageLayout.jsx";
import ForcePasswordChangeModal from "@/apps/public/components/ForcePasswordChangeModal.jsx";
import { parseApiError } from "@/core/api/errors.js";
import apiClient from "@/core/api/client.js";
import { authStore } from "@/core/store/authStore.js";
import { useAuth } from "@/core/hooks/useAuth.js";

function defaultDestination(user) {
  return user?.role === "super_admin" ? "/platform/overview" : "/dashboard";
}

function safeDestination(candidate, user) {
  if (
    typeof candidate !== "string" ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    ["/login", "/forgot-password", "/reset-password"].includes(candidate)
  ) {
    return defaultDestination(user);
  }

  return candidate;
}

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState(location.state?.message || "");
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  useEffect(() => {
    if (isInitialized && isAuthenticated && !forcePasswordChange) {
      const user = authStore.getState().user;
      navigate(safeDestination(location.state?.from, user), { replace: true });
    }
  }, [forcePasswordChange, isAuthenticated, isInitialized, location.state?.from, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { data: response } = await apiClient.post(
        "/auth/login",
        { identifiant: identifier.trim(), motDePasse: password },
        { skipAuthRefresh: true },
      );
      const session = response?.data;

      if (!session?.accessToken || !session?.utilisateur) {
        throw new Error("La réponse de connexion est incomplète. Réessayez.");
      }

      if (session.utilisateur.doitChangerMotDePasse) {
        setForcePasswordChange(true);
      }

      authStore.getState().setAuth({
        accessToken: session.accessToken,
        user: session.utilisateur,
        shop: session.boutique ?? null,
      });

      if (!session.utilisateur.doitChangerMotDePasse) {
        navigate(
          safeDestination(location.state?.from, session.utilisateur),
          { replace: true },
        );
      }
    } catch (error) {
      const parsedError = parseApiError(error);

      if (error.response?.status === 401) {
        setErrorMessage("Identifiants incorrects. Vérifiez votre email ou téléphone et votre mot de passe.");
      } else if (error.response?.status === 429) {
        setErrorMessage(
          parsedError.message ||
            "Votre compte est temporairement bloqué. Réessayez dans le délai indiqué.",
        );
      } else {
        setErrorMessage(parsedError.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForcedPasswordLogout() {
    setForcePasswordChange(false);
  }

  return (
    <>
      <AuthPageLayout>
        <section aria-labelledby="login-title">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900" id="login-title">
            Connexion
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Entrez vos identifiants pour accéder à votre espace.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-800"
                htmlFor="login-identifier"
              >
                Email ou téléphone
              </label>
              <input
                autoComplete="username"
                className="h-[42px] w-full rounded-[9px] border border-gray-300 bg-transparent px-3 text-sm text-slate-900 outline-none transition placeholder:text-gray-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                id="login-identifier"
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="email@boutique.cg"
                required
                value={identifier}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label
                  className="block text-sm font-medium text-slate-800"
                  htmlFor="login-password"
                >
                  Mot de passe
                </label>
                <Link
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  to="/forgot-password"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  autoComplete="current-password"
                  className="h-[42px] w-full rounded-[9px] border border-gray-300 bg-transparent px-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  id="login-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type={isPasswordVisible ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={
                    isPasswordVisible
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-gray-400 hover:text-gray-600"
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  type="button"
                >
                  {isPasswordVisible ? (
                    <EyeOff aria-hidden="true" size={16} />
                  ) : (
                    <Eye aria-hidden="true" size={16} />
                  )}
                </button>
              </div>
            </div>

            {notice && (
              <p
                className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                role="status"
              >
                {notice}
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
              disabled={isSubmitting || !isInitialized}
              type="submit"
            >
              {isSubmitting
                ? "Connexion..."
                : isInitialized
                  ? "Se connecter"
                  : "Vérification de la session..."}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-400">
            <Link className="hover:text-gray-600" to="/">
              ← Retour à l’accueil Stockline
            </Link>
          </p>
        </section>
      </AuthPageLayout>

      {forcePasswordChange && (
        <ForcePasswordChangeModal
          onComplete={() => {
            setForcePasswordChange(false);
            setNotice(
              "Votre mot de passe a été modifié. Reconnectez-vous avec votre nouveau mot de passe.",
            );
            navigate("/login", { replace: true });
          }}
          onLogout={handleForcedPasswordLogout}
        />
      )}
    </>
  );
}
