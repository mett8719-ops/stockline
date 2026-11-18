import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useSaveCustomRole } from "../hooks.js";

const fieldClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const permissionLabels = {
  dashboard: "Tableau de bord",
  pos: "Vente / Caisse",
  products: "Produits",
  stock: "Stock",
  customers: "Clients",
  suppliers: "Fournisseurs",
  documents: "Devis & Factures",
  inventory: "Inventaire",
  treasury: "Trésorerie",
  users: "Utilisateurs",
  messaging: "Messagerie",
  tickets: "Tickets",
  suggestions: "Suggestions",
  settings: "Paramètres",
};

export default function CustomRoleDialog({
  role,
  permissions,
  onClose,
  onSaved,
}) {
  const dialogRef = useRef(null);
  const saveMutation = useSaveCustomRole();
  const [name, setName] = useState(role?.nom || "");
  const [selectedPermissions, setSelectedPermissions] = useState(
    () => role?.permissions || [],
  );
  const [errorMessage, setErrorMessage] = useState("");
  const isEditing = Boolean(role);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    dialog.showModal();
    dialog.querySelector("input")?.focus();
    return () => dialog.close();
  }, []);

  function togglePermission(permission) {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((value) => value !== permission)
        : [...current, permission],
    );
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    if (selectedPermissions.length === 0) {
      setErrorMessage("Sélectionnez au moins une permission pour ce rôle.");
      return;
    }

    const payload = {
      nom: name.trim(),
      permissions: selectedPermissions,
    };

    try {
      await saveMutation.mutateAsync({
        roleId: role?._id || role?.id,
        role: payload,
      });
      onSaved(
        isEditing
          ? `Le rôle « ${payload.nom} » a été modifié.`
          : `Le rôle « ${payload.nom} » a été créé.`,
      );
      onClose();
    } catch (error) {
      setErrorMessage(parseApiError(error).message);
    }
  }

  return (
    <dialog
      aria-labelledby="custom-role-title"
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-slate-950/50"
      onClick={(event) => {
        if (event.target === dialogRef.current && !saveMutation.isPending) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!saveMutation.isPending) onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex min-h-full items-start justify-center px-3 py-5 sm:items-center sm:px-5">
        <section className="my-auto w-full max-w-md overflow-hidden rounded-xl bg-white shadow-modal">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900" id="custom-role-title">
              {isEditing ? "Modifier le rôle personnalisé" : "Créer un rôle personnalisé"}
            </h2>
            <button
              aria-label="Fermer la fenêtre"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              disabled={saveMutation.isPending}
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
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-700"
                htmlFor="custom-role-name"
              >
                Nom du rôle
              </label>
              <input
                className={fieldClassName}
                id="custom-role-name"
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex. : Superviseur, Livreur…"
                required
                value={name}
              />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">
                Fonctionnalités accessibles
                <span className="ml-1 font-normal text-slate-400">
                  ({selectedPermissions.length} sélectionnée{selectedPermissions.length === 1 ? "" : "s"})
                </span>
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {permissions.map((permission) => {
                  const isSelected = selectedPermissions.includes(permission);
                  return (
                    <label
                      className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition focus-within:ring-2 focus-within:ring-brand-200 ${
                        isSelected
                          ? "border-brand-300 bg-brand-50 text-slate-800"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                      }`}
                      key={permission}
                    >
                      <input
                        checked={isSelected}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        onChange={() => togglePermission(permission)}
                        type="checkbox"
                        value={permission}
                      />
                      <span className="flex-1">
                        {permissionLabels[permission] || permission}
                      </span>
                      {isSelected && (
                        <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <p className="rounded-lg bg-violet-50 px-3 py-2.5 text-xs text-violet-700">
              Ce rôle sera disponible lors de l’invitation ou de la modification
              d’un employé.
            </p>
            <footer className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                disabled={saveMutation.isPending}
                onClick={onClose}
                type="button"
              >
                Annuler
              </button>
              <button
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saveMutation.isPending || !name.trim()}
                type="submit"
              >
                {saveMutation.isPending
                  ? "Enregistrement…"
                  : isEditing
                    ? "Enregistrer"
                    : "Créer le rôle"}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </dialog>
  );
}
