import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useCreateTicket } from "../hooks.js";
import { ticketSchema } from "../schemas.js";

const fieldClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const priorities = [
  { value: "basse", label: "Faible" },
  { value: "normale", label: "Normale" },
  { value: "haute", label: "Haute" },
  { value: "urgente", label: "Urgente" },
];

export default function TicketComposerDialog({
  canContactPlatform,
  onClose,
  onSaved,
  scopeKey,
}) {
  const dialogRef = useRef(null);
  const createMutation = useCreateTicket();
  const [sujet, setSujet] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState("autre");
  const [priorite, setPriorite] = useState("normale");
  const [niveau, setNiveau] = useState("interne");
  const [errorMessage, setErrorMessage] = useState("");

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

    const ticket = {
      sujet,
      description,
      categorie,
      priorite,
      ...(canContactPlatform ? { niveau } : {}),
    };
    const validation = ticketSchema.safeParse(ticket);

    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message || "Vérifie les champs du formulaire.");
      return;
    }

    try {
      const createdTicket = await createMutation.mutateAsync({
        ticket: validation.data,
        scopeKey,
      });
      onSaved(createdTicket);
    } catch (error) {
      setErrorMessage(parseApiError(error).message);
    }
  }

  return (
    <dialog
      aria-labelledby="create-ticket-title"
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-transparent p-0 backdrop:bg-slate-950/50"
      onCancel={(event) => {
        event.preventDefault();
        if (!createMutation.isPending) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !createMutation.isPending) {
          onClose();
        }
      }}
      ref={dialogRef}
    >
      <div className="flex min-h-full items-start justify-center px-3 py-5 sm:items-center sm:px-5">
        <section className="my-auto w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-modal">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900" id="create-ticket-title">
                Nouveau ticket
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Décris le problème pour que l’équipe puisse t’aider.
              </p>
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

          <form className="space-y-4 p-5" onSubmit={handleSubmit}>
            {errorMessage && (
              <p aria-live="assertive" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
                {errorMessage}
              </p>
            )}

            {canContactPlatform && (
              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-slate-700">
                  Destinataire
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      value: "interne",
                      label: "Interne (équipe)",
                      description: "Signaler un problème à l’équipe",
                    },
                    {
                      value: "plateforme",
                      label: "Support Stockline",
                      description: "Contacter l’équipe Stockline",
                    },
                  ].map((option) => (
                    <label
                      className={`cursor-pointer rounded-lg border p-3 transition ${
                        niveau === option.value
                          ? "border-brand-500 bg-brand-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      key={option.value}
                    >
                      <input
                        checked={niveau === option.value}
                        className="sr-only"
                        name="ticket-level"
                        onChange={() => setNiveau(option.value)}
                        type="radio"
                        value={option.value}
                      />
                      <span className="block text-sm font-medium text-slate-800">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {option.description}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="ticket-subject">
                Sujet
              </label>
              <input
                autoComplete="off"
                className={`${fieldClassName} h-11`}
                id="ticket-subject"
                maxLength={200}
                onChange={(event) => setSujet(event.target.value)}
                placeholder="Décris brièvement le problème"
                required
                value={sujet}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="ticket-description">
                Description détaillée
              </label>
              <textarea
                className={`${fieldClassName} min-h-28 resize-y py-3`}
                id="ticket-description"
                maxLength={4000}
                minLength={10}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Explique ce qui s’est passé et dans quelles circonstances…"
                required
                value={description}
              />
              <p className="mt-1 text-xs text-slate-500">10 caractères minimum.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="ticket-category">
                  Catégorie
                </label>
                <select
                  className={`${fieldClassName} h-11`}
                  id="ticket-category"
                  onChange={(event) => setCategorie(event.target.value)}
                  value={categorie}
                >
                  <option value="technique">Technique</option>
                  <option value="facturation">Facturation</option>
                  <option value="formation">Formation</option>
                  <option value="quota">Quota</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <fieldset>
                <legend className="mb-1.5 block text-sm font-medium text-slate-700">
                  Priorité
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {priorities.map((option) => (
                    <label
                      className={`flex h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-sm transition ${
                        priorite === option.value
                          ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      key={option.value}
                    >
                      <input
                        checked={priorite === option.value}
                        className="sr-only"
                        name="ticket-priority"
                        onChange={() => setPriorite(option.value)}
                        type="radio"
                        value={option.value}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row">
              <button
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-60"
                disabled={createMutation.isPending}
                onClick={onClose}
                type="button"
              >
                Annuler
              </button>
              <button
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-wait disabled:opacity-60"
                disabled={createMutation.isPending}
                type="submit"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                {createMutation.isPending ? "Ouverture…" : "Ouvrir le ticket"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </dialog>
  );
}
