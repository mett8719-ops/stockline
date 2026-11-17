import { useEffect, useRef, useState } from "react";
import { Check, Copy, UserRoundPlus, X } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useInviteEmployee } from "../hooks.js";

const fieldClassName =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function InviteEmployeeDialog({
  roleOptions,
  onClose,
  onSaved,
}) {
  const dialogRef = useRef(null);
  const inviteMutation = useInviteEmployee();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [role, setRole] = useState(roleOptions[0]?.value || "caissier");
  const [errorMessage, setErrorMessage] = useState("");
  const [invitation, setInvitation] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");

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

    const employee = { nom: nom.trim(), email: email.trim().toLowerCase(), role };
    if (telephone.trim()) employee.telephone = telephone.trim();

    try {
      const result = await inviteMutation.mutateAsync(employee);
      setInvitation(result);
      onSaved(`Invitation envoyée à ${employee.email}.`);
    } catch (error) {
      setErrorMessage(parseApiError(error).message);
    }
  }

  async function copyTemporaryPassword() {
    try {
      await navigator.clipboard.writeText(invitation.motDePasseTemporaire);
      setCopyMessage("Mot de passe copié.");
    } catch {
      setCopyMessage("Copie indisponible : sélectionnez le mot de passe pour le copier.");
    }
  }

  return (
    <dialog
      aria-labelledby="invite-employee-title"
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-slate-950/50"
      onClick={(event) => {
        if (event.target === dialogRef.current && !inviteMutation.isPending) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!inviteMutation.isPending) onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex min-h-full items-start justify-center px-3 py-5 sm:items-center sm:px-5">
        <section className="my-auto w-full max-w-md overflow-hidden rounded-xl bg-white shadow-modal">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900" id="invite-employee-title">
              {invitation ? "Invitation envoyée" : "Inviter un employé"}
            </h2>
            <button
              aria-label="Fermer la fenêtre"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
              disabled={inviteMutation.isPending}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>

          {invitation ? (
            <div className="space-y-4 p-5">
              <div className="flex items-start gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Le compte de {invitation.employe?.nom || nom.trim()} a été créé.
                  Transmettez ce mot de passe temporaire à l’employé : il devra
                  le changer à sa première connexion.
                </p>
              </div>
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                  htmlFor="temporary-password"
                >
                  Mot de passe temporaire
                </label>
                <div className="flex gap-2">
                  <input
                    className={`${fieldClassName} font-mono`}
                    id="temporary-password"
                    readOnly
                    value={invitation.motDePasseTemporaire}
                  />
                  <button
                    aria-label="Copier le mot de passe temporaire"
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={copyTemporaryPassword}
                    type="button"
                  >
                    <Copy aria-hidden="true" className="h-4 w-4" />
                    <span className="hidden sm:inline">Copier</span>
                  </button>
                </div>
                {copyMessage && (
                  <p aria-live="polite" className="mt-2 text-xs text-slate-500">
                    {copyMessage}
                  </p>
                )}
              </div>
              <button
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
                onClick={onClose}
                type="button"
              >
                Terminé
              </button>
            </div>
          ) : (
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
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                  htmlFor="employee-name"
                >
                  Nom complet
                </label>
                <input
                  autoComplete="name"
                  className={fieldClassName}
                  id="employee-name"
                  maxLength={120}
                  onChange={(event) => setNom(event.target.value)}
                  placeholder="Prénom et nom"
                  required
                  value={nom}
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                  htmlFor="employee-email"
                >
                  Adresse e-mail
                </label>
                <input
                  autoComplete="email"
                  className={fieldClassName}
                  id="employee-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="employe@boutique.cd"
                  required
                  type="email"
                  value={email}
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                  htmlFor="employee-phone"
                >
                  Téléphone <span className="font-normal text-slate-400">(facultatif)</span>
                </label>
                <input
                  autoComplete="tel"
                  className={fieldClassName}
                  id="employee-phone"
                  onChange={(event) => setTelephone(event.target.value)}
                  placeholder="+242 06 000 00 00"
                  type="tel"
                  value={telephone}
                />
              </div>
              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-slate-700">
                  Rôle
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {roleOptions.map((option) => (
                    <button
                      aria-pressed={role === option.value}
                      className={`min-h-16 rounded-lg border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-200 ${
                        role === option.value
                          ? "border-emerald-400 bg-emerald-50 text-slate-900"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                      key={option.value}
                      onClick={() => setRole(option.value)}
                      type="button"
                    >
                      <span className="block text-sm font-medium">{option.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {option.permissions.length} accès
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                <UserRoundPlus aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Un e-mail d’invitation sera envoyé. Le mot de passe temporaire
                  sera affiché ici après la création.
                </p>
              </div>
              <footer className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
                <button
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  disabled={inviteMutation.isPending}
                  onClick={onClose}
                  type="button"
                >
                  Annuler
                </button>
                <button
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={inviteMutation.isPending || roleOptions.length === 0}
                  type="submit"
                >
                  {inviteMutation.isPending ? "Envoi en cours…" : "Envoyer l’invitation"}
                </button>
              </footer>
            </form>
          )}
        </section>
      </div>
    </dialog>
  );
}
