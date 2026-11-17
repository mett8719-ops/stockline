import { useEffect, useRef, useState } from "react";
import { Shield, Snowflake, X } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useUpdateEmployee } from "../hooks.js";

const fieldClassName =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function EmployeeActionDialog({
  mode,
  employee,
  roleOptions,
  onClose,
  onSaved,
}) {
  const dialogRef = useRef(null);
  const updateMutation = useUpdateEmployee();
  const initialRole = roleOptions.some((role) => role.value === employee.role)
    ? employee.role
    : roleOptions[0]?.value || "";
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [name, setName] = useState(employee.nom || "");
  const [telephone, setTelephone] = useState(employee.telephone || "");
  const [errorMessage, setErrorMessage] = useState("");
  const isRoleMode = mode === "role";
  const isEditMode = mode === "edit";
  const willFreeze = !employee.gele;
  const title = isRoleMode
    ? "Modifier le rôle"
    : isEditMode
      ? "Modifier l’employé"
      : willFreeze
      ? "Geler l’accès"
      : "Réactiver l’accès";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    dialog.showModal();
    dialog.querySelector("button")?.focus();
    return () => dialog.close();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    const changes = isRoleMode
      ? { role: selectedRole, customRoleId: null }
      : isEditMode
        ? { nom: name.trim() }
        : { gele: willFreeze };
    if (isEditMode && telephone.trim()) changes.telephone = telephone.trim();

    try {
      await updateMutation.mutateAsync({
        employeeId: employee.id || employee._id,
        changes,
      });
      onSaved(
        isRoleMode
          ? `Le rôle de ${employee.nom} a été modifié.`
          : isEditMode
            ? `Les informations de ${employee.nom} ont été modifiées.`
            : willFreeze
              ? `L’accès de ${employee.nom} a été gelé.`
              : `L’accès de ${employee.nom} a été réactivé.`,
      );
      onClose();
    } catch (error) {
      setErrorMessage(parseApiError(error).message);
    }
  }

  return (
    <dialog
      aria-labelledby="employee-action-title"
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-slate-950/50"
      onClick={(event) => {
        if (event.target === dialogRef.current && !updateMutation.isPending) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!updateMutation.isPending) onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex min-h-full items-center justify-center px-3 py-5 sm:px-5">
        <section className="my-auto w-full max-w-md overflow-hidden rounded-xl bg-white shadow-modal">
          <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900" id="employee-action-title">
                {title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{employee.nom}</p>
            </div>
            <button
              aria-label="Fermer la fenêtre"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              disabled={updateMutation.isPending}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>

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
            {isEditMode ? (
              <>
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                    htmlFor="edit-employee-name"
                  >
                    Nom complet
                  </label>
                  <input
                    autoComplete="name"
                    className={fieldClassName}
                    id="edit-employee-name"
                    maxLength={120}
                    onChange={(event) => setName(event.target.value)}
                    required
                    value={name}
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                    htmlFor="edit-employee-phone"
                  >
                    Téléphone
                  </label>
                  <input
                    autoComplete="tel"
                    className={fieldClassName}
                    id="edit-employee-phone"
                    onChange={(event) => setTelephone(event.target.value)}
                    placeholder="Facultatif"
                    type="tel"
                    value={telephone}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Laissez vide pour conserver le numéro actuel.
                  </p>
                </div>
              </>
            ) : isRoleMode ? (
              <>
                <fieldset>
                  <legend className="mb-2 text-sm text-slate-600">
                    Sélectionner un rôle
                  </legend>
                  <div className="space-y-2">
                    {roleOptions.map((option) => (
                      <button
                        aria-pressed={selectedRole === option.value}
                        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-200 ${
                          selectedRole === option.value
                            ? "border-emerald-400 bg-emerald-50 text-slate-900"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                        key={option.value}
                        onClick={() => setSelectedRole(option.value)}
                        type="button"
                      >
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-emerald-700">
                          {option.permissions.length} accès
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                {employee.role === "custom" && (
                  <p className="text-xs text-slate-500">
                    Appliquer un rôle prédéfini remplacera son rôle personnalisé.
                  </p>
                )}
              </>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  {willFreeze ? (
                    <Snowflake aria-hidden="true" className="h-5 w-5" />
                  ) : (
                    <Shield aria-hidden="true" className="h-5 w-5" />
                  )}
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {willFreeze
                    ? "Cet employé ne pourra plus se connecter tant que son accès est gelé. Vous pourrez le réactiver à tout moment."
                    : "Cet employé pourra de nouveau se connecter à son compte."}
                </p>
              </div>
            )}
            <footer className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                disabled={updateMutation.isPending}
                onClick={onClose}
                type="button"
              >
                Annuler
              </button>
              <button
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={updateMutation.isPending || (isRoleMode && !selectedRole)}
                type="submit"
              >
                {updateMutation.isPending
                  ? "Enregistrement…"
                  : isEditMode
                    ? "Enregistrer"
                    : isRoleMode
                    ? "Appliquer"
                    : willFreeze
                      ? "Geler l’accès"
                      : "Réactiver l’accès"}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </dialog>
  );
}
