import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Send,
  Shield,
  Ticket,
} from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useAuth } from "@/core/hooks/useAuth.js";
import TicketComposerDialog from "../components/TicketComposerDialog.jsx";
import {
  useReplyToTicket,
  useTicket,
  useTickets,
  useUpdateTicketStatus,
} from "../hooks.js";
import { ticketReplySchema } from "../schemas.js";

const statusTabs = [
  { value: "", label: "Tous" },
  { value: "ouvert", label: "Ouvert" },
  { value: "en_cours", label: "En cours" },
  { value: "resolu", label: "Résolu" },
  { value: "ferme", label: "Fermé" },
];

const statusOptions = statusTabs.filter((status) => status.value);

const statusPresentation = {
  ouvert: { label: "Ouvert", className: "bg-blue-50 text-blue-700" },
  en_cours: { label: "En cours", className: "bg-amber-50 text-amber-700" },
  resolu: { label: "Résolu", className: "bg-emerald-50 text-emerald-700" },
  ferme: { label: "Fermé", className: "bg-slate-100 text-slate-600" },
};

const priorityPresentation = {
  basse: { label: "Faible", className: "bg-slate-100 text-slate-600" },
  normale: { label: "Normale", className: "bg-blue-50 text-blue-700" },
  haute: { label: "Haute", className: "bg-orange-50 text-orange-700" },
  urgente: { label: "Urgente", className: "bg-red-50 text-red-700" },
};

const categoryLabels = {
  technique: "Technique",
  facturation: "Facturation",
  formation: "Formation",
  quota: "Quota",
  autre: "Autre",
};

const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

function getId(ticket) {
  return ticket?.id || ticket?._id;
}

function formatDate(value, formatter = dateTimeFormat) {
  if (!value) return "Date inconnue";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : formatter.format(date);
}

function StatusBadge({ status }) {
  const presentation = statusPresentation[status] || statusPresentation.ouvert;

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${presentation.className}`}>
      {presentation.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const presentation = priorityPresentation[priority] || priorityPresentation.normale;

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${presentation.className}`}>
      {presentation.label}
    </span>
  );
}

function TicketListSkeleton() {
  return (
    <div aria-label="Chargement des tickets" className="divide-y divide-slate-100" role="status">
      <span className="sr-only">Chargement des tickets…</span>
      {Array.from({ length: 5 }, (_, index) => (
        <div className="space-y-2 px-4 py-4" key={index}>
          <div className="flex gap-2">
            <div className="skeleton h-4 w-14" />
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-4 w-16" />
          </div>
          <div className="skeleton h-4 w-4/5" />
          <div className="skeleton h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function TicketListItem({ isPlatform, isSelected, onSelect, ticket }) {
  return (
    <button
      aria-pressed={isSelected}
      className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-300 ${
        isSelected ? "bg-slate-50" : "bg-white"
      }`}
      onClick={onSelect}
      type="button"
    >
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[11px] text-slate-400">
          {ticket.reference || "—"}
        </span>
        <StatusBadge status={ticket.statut} />
        <PriorityBadge priority={ticket.priorite} />
      </span>
      <span className="mt-1 block truncate text-sm font-medium text-slate-900">
        {ticket.sujet}
      </span>
      <span className="mt-0.5 block truncate text-xs text-slate-500">
        {isPlatform ? ticket.shopNom || "Boutique" : ticket.auteurNom || "Équipe"}
        {" · "}
        {formatDate(ticket.createdAt)}
      </span>
    </button>
  );
}

function TicketDetail({
  canChangeStatus,
  isPlatform,
  onBack,
  selectedTicket,
  statusError,
  statusPending,
  statusSelectValue,
  onStatusSelect,
  onSubmitReply,
  replyDraft,
  replyError,
  replyPending,
  setReplyDraft,
}) {
  if (!selectedTicket) {
    return (
      <div className="hidden min-w-0 flex-1 items-center justify-center p-8 text-center md:flex">
        <div className="max-w-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Ticket aria-hidden="true" className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-sm font-semibold text-slate-800">
            Sélectionnez un ticket
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choisissez une demande dans la liste pour consulter son fil de discussion.
          </p>
        </div>
      </div>
    );
  }

  const responses = selectedTicket.reponses || [];

  return (
    <section aria-label={`Détail du ticket ${selectedTicket.reference}`} className="flex min-w-0 flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex items-start gap-2">
          <button
            aria-label="Retour à la liste des tickets"
            className="mt-0.5 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-slate-400">
                {selectedTicket.reference}
              </span>
              {canChangeStatus ? (
                <label className="sr-only" htmlFor="ticket-status">
                  Statut du ticket
                </label>
              ) : null}
              {canChangeStatus ? (
                <select
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
                  disabled={statusPending}
                  id="ticket-status"
                  onChange={onStatusSelect}
                  value={statusSelectValue || selectedTicket.statut}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <StatusBadge status={selectedTicket.statut} />
              )}
              <PriorityBadge priority={selectedTicket.priorite} />
            </div>
            <h2 className="mt-1 truncate text-sm font-semibold text-slate-900 sm:text-base">
              {selectedTicket.sujet}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {selectedTicket.auteurNom || "Équipe"}
              {isPlatform && selectedTicket.shopNom ? ` · ${selectedTicket.shopNom}` : ""}
              {" · "}
              {formatDate(selectedTicket.createdAt)}
            </p>
            {selectedTicket.categorie && (
              <p className="mt-1 text-xs text-slate-500">
                Catégorie : {categoryLabels[selectedTicket.categorie] || selectedTicket.categorie}
              </p>
            )}
          </div>
        </div>
        {statusError && (
          <p aria-live="assertive" className="mt-2 text-xs text-red-700" role="alert">
            {statusError}
          </p>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
        <div className="border-b border-slate-100 bg-white px-4 py-4 sm:px-5">
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {selectedTicket.description}
          </p>
        </div>
        <ol aria-label="Fil de discussion" className="space-y-5 px-4 py-5 sm:px-5">
          {responses.map((reply, index) => {
            const isSupport = Boolean(reply.estSupport);
            return (
              <li
                className={`flex items-end gap-2 ${isSupport ? "justify-end" : "justify-start"}`}
                key={reply._id || reply.id || `${reply.date}-${index}`}
              >
                {isPlatform && !isSupport && (
                  <span
                    aria-hidden="true"
                    className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-500 text-[10px] font-semibold text-white"
                  >
                    {(reply.auteurNom || "U").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className={`max-w-[85%] sm:max-w-[75%] ${isSupport ? "text-right" : "text-left"}`}>
                  <p className="mb-1 px-1 text-[11px] text-slate-500">
                    {isSupport ? "Support Stockline" : reply.auteurNom || "Auteur"}
                    {" · "}
                    {formatDate(reply.date, timeFormat)}
                  </p>
                  <p
                    className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${
                      isSupport
                        ? "rounded-br-md bg-violet-600 text-white"
                          : "rounded-bl-md bg-slate-200 text-slate-700"
                    }`}
                  >
                    {reply.texte}
                  </p>
                </div>
                {isPlatform && isSupport && (
                  <span
                    aria-hidden="true"
                    className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-semibold text-white"
                  >
                    SS
                  </span>
                )}
              </li>
            );
          })}
          {responses.length === 0 && (
            <li className="py-5 text-center text-sm text-slate-500">
              Aucune réponse pour le moment.
            </li>
          )}
        </ol>
      </div>

      <form className="border-t border-slate-200 bg-white p-3 sm:px-4 sm:py-3" onSubmit={onSubmitReply}>
        {replyError && (
          <p aria-live="assertive" className="mb-2 text-xs text-red-700" role="alert">
            {replyError}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor="ticket-reply">
            Écrire une réponse
          </label>
          <textarea
            className="min-h-12 max-h-32 flex-1 resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
            disabled={replyPending}
            id="ticket-reply"
            maxLength={4000}
            onChange={(event) => setReplyDraft(event.target.value)}
            placeholder={isPlatform ? "Répondre en tant que Support Stockline…" : "Écrire une réponse…"}
            value={replyDraft}
          />
          <button
            aria-label="Envoyer la réponse"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            disabled={replyPending || !replyDraft.trim()}
            type="submit"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}

export default function TicketsPage({ platform = false }) {
  const { user } = useAuth();
  const isPlatform = platform;
  const canCreateTicket = !isPlatform;
  const canContactPlatform = !isPlatform && user?.role === "admin";
  const canChangeStatus = isPlatform || user?.role === "admin";
  const scopeKey = `${isPlatform ? "platform" : "shop"}:${user?.id || user?._id || "current"}`;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyError, setReplyError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusSelectValue, setStatusSelectValue] = useState("");
  const [feedback, setFeedback] = useState("");

  const ticketsQuery = useTickets(scopeKey, {
    page,
    q: debouncedSearch,
    statut: statusFilter,
  });
  const ticketQuery = useTicket(scopeKey, selectedId);
  const replyMutation = useReplyToTicket();
  const statusMutation = useUpdateTicketStatus();
  const tickets = ticketsQuery.data?.tickets || [];
  const pagination = ticketsQuery.data?.pagination;
  const selectedTicket = ticketQuery.data;

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  function selectTicket(ticketId) {
    setSelectedId(ticketId);
    setReplyDraft("");
    setReplyError("");
    setStatusError("");
    setStatusSelectValue("");
  }

  function changeSearch(value) {
    setSearch(value);
    setPage(1);
    selectTicket("");
  }

  function changeStatusFilter(value) {
    setStatusFilter(value);
    setPage(1);
    selectTicket("");
  }

  async function handleSubmitReply(event) {
    event.preventDefault();
    setReplyError("");
    const validation = ticketReplySchema.safeParse({ texte: replyDraft });

    if (!validation.success) {
      setReplyError(validation.error.issues[0]?.message || "La réponse est invalide.");
      return;
    }

    try {
      await replyMutation.mutateAsync({
        ticketId: selectedId,
        texte: validation.data.texte,
        scopeKey,
      });
      setReplyDraft("");
    } catch (error) {
      setReplyError(parseApiError(error).message);
    }
  }

  async function handleStatusChange(event) {
    const statut = event.target.value;
    if (!selectedId || !canChangeStatus) return;

    setStatusError("");
    setStatusSelectValue(statut);

    try {
      await statusMutation.mutateAsync({ ticketId: selectedId, statut, scopeKey });
      setStatusSelectValue("");
    } catch (error) {
      setStatusSelectValue("");
      setStatusError(parseApiError(error).message);
    }
  }

  function handleTicketCreated(ticket) {
    setIsComposerOpen(false);
    setFeedback(`Le ticket ${ticket.reference || ""} a été ouvert.`);
    selectTicket(getId(ticket) || "");
    setStatusFilter("");
    setPage(1);
  }

  const totalPages = pagination?.totalPages || 1;
  const ticketsLoading = ticketsQuery.isPending;
  const listError = ticketsQuery.isError;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {isPlatform ? "Tickets Support" : "Tickets & Support"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isPlatform
              ? "Demandes de support des boutiques."
              : "Suivi de vos incidents et demandes."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPlatform && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700">
              <Shield aria-hidden="true" className="h-3.5 w-3.5" />
              Données protégées / Accès isolé
            </div>
          )}
          {canCreateTicket && (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
              onClick={() => setIsComposerOpen(true)}
              type="button"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Nouveau ticket
            </button>
          )}
        </div>
      </header>

      {feedback && (
        <p
          aria-live="polite"
          className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          role="status"
        >
          {feedback}
        </p>
      )}

      <div className="card flex min-h-[65vh] overflow-hidden lg:h-[calc(100vh-13rem)] lg:min-h-[560px]">
        <aside
          aria-label="Liste des tickets"
          className={`flex w-full min-w-0 flex-col md:w-[320px] md:shrink-0 md:border-r md:border-slate-200 ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="space-y-3 border-b border-slate-200 p-3">
            <label className="relative block">
              <span className="sr-only">Rechercher un ticket</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                onChange={(event) => changeSearch(event.target.value)}
                placeholder={isPlatform ? "Rechercher un ticket…" : "Rechercher par sujet ou référence…"}
                value={search}
              />
            </label>
            <div aria-label="Filtrer les tickets par statut" className="flex gap-1 overflow-x-auto pb-0.5" role="group">
              {statusTabs.map((tab) => (
                <button
                  aria-pressed={statusFilter === tab.value}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-200 ${
                    statusFilter === tab.value
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  key={tab.value || "all"}
                  onClick={() => changeStatusFilter(tab.value)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {ticketsLoading ? (
              <TicketListSkeleton />
            ) : listError ? (
              <div className="p-4">
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                  <p className="flex items-start gap-2">
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Impossible de charger les tickets : {parseApiError(ticketsQuery.error).message}</span>
                  </p>
                  <button
                    className="mt-2 ml-6 font-semibold underline underline-offset-2"
                    onClick={() => ticketsQuery.refetch()}
                    type="button"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Ticket aria-hidden="true" className="mx-auto h-8 w-8 text-slate-300" />
                <h3 className="mt-3 text-sm font-semibold text-slate-800">
                  Aucun ticket
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {search || statusFilter
                    ? "Aucun ticket ne correspond à ces filtres."
                    : "Les demandes de support apparaîtront ici."}
                </p>
              </div>
            ) : (
              tickets.map((ticket) => {
                const ticketId = getId(ticket);
                return (
                  <TicketListItem
                    isPlatform={isPlatform}
                    isSelected={ticketId === selectedId}
                    key={ticketId}
                    onSelect={() => selectTicket(ticketId)}
                    ticket={ticket}
                  />
                );
              })
            )}
          </div>

          {!ticketsLoading && !listError && pagination && pagination.total > 0 && (
            <footer className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
              <span>
                Page {pagination.page} sur {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  aria-label="Page précédente"
                  className="rounded-md p-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={page <= 1 || ticketsQuery.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                </button>
                <button
                  aria-label="Page suivante"
                  className="rounded-md p-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={page >= totalPages || ticketsQuery.isFetching}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </footer>
          )}
        </aside>

        <div className={`min-w-0 flex-1 ${selectedId ? "flex" : "hidden md:flex"}`}>
          {selectedId && ticketQuery.isPending ? (
            <div aria-label="Chargement du ticket" className="flex flex-1 flex-col p-5" role="status">
              <span className="sr-only">Chargement du ticket…</span>
              <div className="skeleton h-5 w-32" />
              <div className="skeleton mt-4 h-6 w-3/4" />
              <div className="skeleton mt-3 h-16 w-full" />
              <div className="skeleton mt-6 h-12 w-2/3 self-end" />
            </div>
          ) : selectedId && ticketQuery.isError ? (
            <div className="m-auto max-w-sm p-5 text-center">
              <p className="text-sm text-red-700" role="alert">
                Impossible de charger ce ticket : {parseApiError(ticketQuery.error).message}
              </p>
              <button
                className="mt-3 text-sm font-semibold text-brand-700 underline underline-offset-2"
                onClick={() => ticketQuery.refetch()}
                type="button"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <TicketDetail
              canChangeStatus={canChangeStatus}
              isPlatform={isPlatform}
              onBack={() => selectTicket("")}
              onStatusSelect={handleStatusChange}
              onSubmitReply={handleSubmitReply}
              replyDraft={replyDraft}
              replyError={replyError}
              replyPending={replyMutation.isPending}
              selectedTicket={selectedTicket}
              setReplyDraft={setReplyDraft}
              statusError={statusError}
              statusPending={statusMutation.isPending}
              statusSelectValue={statusSelectValue}
            />
          )}
        </div>
      </div>

      {isComposerOpen && (
        <TicketComposerDialog
          canContactPlatform={canContactPlatform}
          onClose={() => setIsComposerOpen(false)}
          onSaved={handleTicketCreated}
          scopeKey={scopeKey}
        />
      )}
    </section>
  );
}
