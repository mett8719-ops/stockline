import { useState } from "react";
import {
  Check,
  ChevronRight,
  Copy,
  Inbox,
  Search,
} from "lucide-react";
import { useAuth } from "@/core/hooks/useAuth.js";
import { useDebounce } from "@/core/hooks/useDebounce.js";
import { parseApiError } from "@/core/api/errors.js";
import ApproveSignupModal from "../components/ApproveSignupModal.jsx";
import SignupActionModal from "../components/SignupActionModal.jsx";
import SignupDetailPanel from "../components/SignupDetailPanel.jsx";
import {
  useApproveSignupRequest,
  useRejectSignupRequest,
  useRequestSignupInfo,
  useSignupRequest,
  useSignupRequests,
} from "../hooks.js";
import {
  formatSignupDate,
  getPlanBadgeClass,
  signupStatusMeta,
} from "../schemas.js";

export default function SignupRequestsPage() {
  const { user } = useAuth();
  const canApproveOrReject = user?.role === "super_admin";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [actionModalMode, setActionModalMode] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const debouncedSearch = useDebounce(search.trim(), 300);

  const listQuery = useSignupRequests({
    page,
    limit: 20,
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
  });
  const detailQuery = useSignupRequest(selectedId);

  const approveMutation = useApproveSignupRequest();
  const requestInfoMutation = useRequestSignupInfo();
  const rejectMutation = useRejectSignupRequest();

  const items = listQuery.data?.items ?? [];
  const meta = listQuery.data?.meta ?? { page: 1, totalPages: 1, total: 0 };
  const totalCount = meta.total ?? items.length;

  const selectedSummary = items.find((item) => item._id === selectedId || item.id === selectedId);
  const activeSignup = detailQuery.data ?? selectedSummary ?? null;

  async function handleApproveConfirm() {
    if (!selectedId) return;
    const result = await approveMutation.mutateAsync({ id: selectedId });
    setSelectedId(null);
    setCopiedPassword(false);
    setFeedback({
      type: "success",
      message: result?.message || "Compte créé et email d'activation envoyé.",
      tempPassword: result?.motDePasseTemporaire || null,
      shopName: result?.boutique?.nom || activeSignup?.boutique?.nom,
    });
  }

  async function handleActionSubmit(payload) {
    if (!selectedId) return;
    if (actionModalMode === "reject") {
      await rejectMutation.mutateAsync({ id: selectedId, motif: payload.motif });
      setSelectedId(null);
      setFeedback({
        type: "info",
        message: "La demande a été rejetée et le demandeur a été notifié par email.",
      });
      return;
    }

    await requestInfoMutation.mutateAsync({
      id: selectedId,
      message: payload.message,
    });
    setFeedback({
      type: "info",
      message: "La demande d'informations complémentaires a été envoyée.",
    });
  }

  async function handleCopyPassword(password) {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
    } catch {
      setCopiedPassword(false);
    }
  }

  return (
    <div className="-m-4 flex min-h-[calc(100vh-72px)] flex-col bg-white sm:-m-6 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-slate-200 px-6 py-5">
          <h1 className="text-2xl font-bold text-slate-900">
            Demandes en attente
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {totalCount} demande{totalCount > 1 ? "s" : ""} à traiter
          </p>

          <div className="relative mt-4">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              aria-label="Rechercher une boutique ou un propriétaire"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-platform-500 focus:bg-white focus:ring-2 focus:ring-platform-100"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Rechercher une boutique ou un propriétaire..."
              type="search"
              value={search}
            />
          </div>

          {feedback && (
            <div
              className={`mt-4 flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-platform-200 bg-platform-50 text-platform-900"
              }`}
              role="status"
            >
              <div>
                <p className="font-medium">{feedback.message}</p>
                {feedback.tempPassword && (
                  <p className="mt-1 text-xs">
                    Mot de passe temporaire ({feedback.shopName}) :{" "}
                    <code className="rounded bg-white px-2 py-0.5 font-mono font-semibold text-slate-900">
                      {feedback.tempPassword}
                    </code>
                  </p>
                )}
              </div>
              {feedback.tempPassword && (
                <button
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-lg border border-emerald-300 bg-white px-3 text-xs font-medium text-emerald-800 hover:bg-emerald-100 sm:self-center"
                  onClick={() => handleCopyPassword(feedback.tempPassword)}
                  type="button"
                >
                  {copiedPassword ? (
                    <>
                      <Check aria-hidden="true" className="h-3.5 w-3.5" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                      Copier le mot de passe
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {listQuery.isPending ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div className="animate-pulse px-6 py-4" key={idx}>
                <div className="h-4 w-48 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-36 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-28 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : listQuery.isError ? (
          <div className="p-6">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {parseApiError(listQuery.error).message}
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox aria-hidden="true" className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              Aucune demande en attente
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Toutes les demandes correspondant à votre recherche ont été traitées.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200/80">
            {items.map((item) => {
              const id = item._id || item.id;
              const isSelected = id === selectedId;
              const planName = item.abonnement?.planNom || "Starter";
              const status = signupStatusMeta[item.statut] || signupStatusMeta.pending;

              return (
                <li key={id}>
                  <button
                    className={`flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition ${
                      isSelected
                        ? "bg-platform-50/70"
                        : "hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      setFeedback(null);
                      setSelectedId(id);
                    }}
                    type="button"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">
                          {item.boutique?.nom || "Boutique sans nom"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getPlanBadgeClass(
                            planName,
                          )}`}
                        >
                          {planName}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-slate-600">
                        {item.proprietaire?.nomComplet || "—"} ·{" "}
                        {item.boutique?.ville || "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatSignupDate(item.createdAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.badgeClass}`}
                      >
                        {status.label}
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className="h-4 w-4 text-slate-400"
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {meta.totalPages > 1 && (
          <div className="mt-auto flex items-center justify-between border-t border-slate-200 px-6 py-3 text-sm text-slate-600">
            <span>
              Page {meta.page} sur {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                type="button"
              >
                Précédent
              </button>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                type="button"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId && (
        <SignupDetailPanel
          canApproveOrReject={canApproveOrReject}
          isLoading={detailQuery.isPending && !selectedSummary}
          onApprove={() => setIsApproveModalOpen(true)}
          onClose={() => setSelectedId(null)}
          onReject={() => setActionModalMode("reject")}
          onRequestInfo={() => setActionModalMode("request-info")}
          signup={activeSignup}
        />
      )}

      {isApproveModalOpen && activeSignup && (
        <ApproveSignupModal
          isPending={approveMutation.isPending}
          onClose={() => setIsApproveModalOpen(false)}
          onConfirm={handleApproveConfirm}
          signup={activeSignup}
        />
      )}

      {actionModalMode && activeSignup && (
        <SignupActionModal
          isPending={
            requestInfoMutation.isPending || rejectMutation.isPending
          }
          mode={actionModalMode}
          onClose={() => setActionModalMode(null)}
          onSubmit={handleActionSubmit}
          signup={activeSignup}
        />
      )}
    </div>
  );
}
