import { useEffect, useRef, useState } from "react";
import { UserRoundPlus, X } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useCreateCustomer } from "../hooks.js";
import {
  createCustomerSchema,
  customerCategoryLabels,
  getCustomerFieldErrors,
} from "../schemas.js";

const fieldClassName =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const initialForm = {
  nom: "",
  telephone: "",
  email: "",
  adresse: "",
  categorie: "particulier",
  plafondCredit: "0",
  notes: "",
};

function FieldError({ children, id }) {
  if (!children) return null;
  return (
    <p className="mt-1 text-xs text-red-600" id={id}>
      {children}
    </p>
  );
}

export default function CreateCustomerDialog({ onClose, onCreated }) {
  const dialogRef = useRef(null);
  const createMutation = useCreateCustomer();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    dialog.showModal();
    dialog.querySelector("input")?.focus();
    return () => dialog.close();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setErrorMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    const result = createCustomerSchema.safeParse({
      ...form,
      plafondCredit: form.plafondCredit.trim()
        ? Number(form.plafondCredit)
        : undefined,
    });

    if (!result.success) {
      const errors = getCustomerFieldErrors(result.error);
      setFieldErrors(errors);
      const firstInvalidField = Object.keys(errors)[0];
      if (firstInvalidField) {
        dialogRef.current?.querySelector(`[name="${firstInvalidField}"]`)?.focus();
      }
      return;
    }

    setFieldErrors({});

    try {
      const customer = await createMutation.mutateAsync(result.data);
      onCreated(customer);
    } catch (error) {
      const apiError = parseApiError(error);
      if (error?.response?.status === 409) {
        const duplicateName = apiError.message.split(":").slice(1).join(":").trim();
        setErrorMessage(
          duplicateName
            ? `Ce numéro est déjà associé à ${duplicateName}. Consultez sa fiche avant de créer un doublon.`
            : apiError.message,
        );
        return;
      }
      setErrorMessage(apiError.message);
    }
  }

  function fieldProps(name) {
    const errorId = `${name}-error`;
    return {
      "aria-describedby": fieldErrors[name] ? errorId : undefined,
      "aria-invalid": Boolean(fieldErrors[name]),
      className: fieldClassName,
      name,
      onChange: updateField,
      value: form[name],
    };
  }

  return (
    <dialog
      aria-labelledby="create-customer-title"
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-slate-950/50"
      onClick={(event) => {
        if (event.target === dialogRef.current && !createMutation.isPending) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!createMutation.isPending) onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex min-h-full items-start justify-center px-3 py-5 sm:items-center sm:px-5">
        <section className="my-auto w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-modal">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <UserRoundPlus aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900" id="create-customer-title">
                  Nouveau client
                </h2>
                <p className="text-sm text-slate-500">Ajoutez ses coordonnées et ses préférences.</p>
              </div>
            </div>
            <button
              aria-label="Fermer la fenêtre"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
              disabled={createMutation.isPending}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </header>

          <form className="space-y-5 p-5" noValidate onSubmit={handleSubmit}>
            {errorMessage && (
              <p
                aria-live="assertive"
                className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700"
                role="alert"
              >
                {errorMessage}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="customer-nom">
                  Nom complet <span className="text-red-600">*</span>
                </label>
                <input
                  autoComplete="name"
                  {...fieldProps("nom")}
                  id="customer-nom"
                  maxLength={150}
                  placeholder="Prénom et nom"
                  required
                />
                <FieldError id="nom-error">{fieldErrors.nom}</FieldError>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="customer-telephone">
                  Téléphone <span className="font-normal text-slate-400">(facultatif)</span>
                </label>
                <input
                  autoComplete="tel"
                  {...fieldProps("telephone")}
                  id="customer-telephone"
                  maxLength={20}
                  placeholder="+242 06 123 45 67"
                  type="tel"
                />
                <FieldError id="telephone-error">{fieldErrors.telephone}</FieldError>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="customer-email">
                  Adresse e-mail <span className="font-normal text-slate-400">(facultatif)</span>
                </label>
                <input
                  autoComplete="email"
                  {...fieldProps("email")}
                  id="customer-email"
                  placeholder="client@exemple.cd"
                  type="email"
                />
                <FieldError id="email-error">{fieldErrors.email}</FieldError>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="customer-categorie">
                  Catégorie
                </label>
                <select {...fieldProps("categorie")} id="customer-categorie">
                  {Object.entries(customerCategoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <FieldError id="categorie-error">{fieldErrors.categorie}</FieldError>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="customer-adresse">
                  Adresse <span className="font-normal text-slate-400">(facultatif)</span>
                </label>
                <input
                  autoComplete="street-address"
                  {...fieldProps("adresse")}
                  id="customer-adresse"
                  maxLength={250}
                  placeholder="Adresse du client"
                />
                <FieldError id="adresse-error">{fieldErrors.adresse}</FieldError>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="customer-plafond">
                  Plafond de crédit (FCFA)
                </label>
                <input
                  {...fieldProps("plafondCredit")}
                  id="customer-plafond"
                  min="0"
                  required
                  step="0.01"
                  type="number"
                />
                <FieldError id="plafondCredit-error">{fieldErrors.plafondCredit}</FieldError>
                <p className="mt-1 text-xs text-slate-500">0 signifie qu’aucune limite n’est définie.</p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="customer-notes">
                Notes <span className="font-normal text-slate-400">(facultatif)</span>
              </label>
              <textarea
                {...fieldProps("notes")}
                className={`${fieldClassName} h-auto min-h-20 py-2.5`}
                id="customer-notes"
                maxLength={500}
                rows={3}
              />
              <FieldError id="notes-error">{fieldErrors.notes}</FieldError>
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-300"
                disabled={createMutation.isPending}
                onClick={onClose}
                type="button"
              >
                Annuler
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={createMutation.isPending}
                type="submit"
              >
                {createMutation.isPending ? "Enregistrement…" : "Créer le client"}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </dialog>
  );
}
