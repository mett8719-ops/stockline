import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Database,
  Eye,
  Search,
  Server,
  Shield,
  ShieldAlert,
  X,
} from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { usePlatformShops } from "../../shared/hooks.js";
import { usePlatformLogs } from "../hooks.js";
import BlockIpDialog from "../components/BlockIpDialog.jsx";
import LogDetailsDialog from "../components/LogDetailsDialog.jsx";

const severityOptions = [
  { value: "", label: "Toutes les sévérités" },
  { value: "haute", label: "Haute" },
  { value: "moyenne", label: "Moyenne" },
  { value: "info", label: "Info" },
];

const severityPresentation = {
  haute: { label: "Haute", className: "bg-red-50 text-red-700" },
  moyenne: { label: "Moyenne", className: "bg-amber-50 text-amber-700" },
  info: { label: "Info", className: "bg-slate-100 text-slate-600" },
};

const shortDateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const longDateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

const eventLabels = {
  "auth.login_failed": "Tentative de connexion échouée",
  "auth.login_success": "Connexion réussie",
  "ip.blocked": "Adresse IP bloquée",
  "ip.unblocked": "Adresse IP débloquée",
  "platform_settings.updated": "Paramètres plateforme modifiés",
  "feature_flag.updated": "Feature flag modifié",
  "shop.frozen": "Boutique gelée",
  "shop.banned": "Boutique bannie",
  "shop.status_changed": "Statut de boutique modifié",
};

function getId(item) {
  return String(item?._id || item?.id || item);
}

function formatDate(value, formatter = shortDateFormat) {
  if (!value) return "Date inconnue";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : formatter.format(date);
}

function formatAction(action = "") {
  return (
    eventLabels[action] ||
    action
      .split(/[._]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function getLogSummary(log) {
  const details = [];
  if (log.auteurNom) details.push(log.auteurNom);
  if (log.cible) details.push(log.cible);
  if (log.cibleId) details.push(log.cibleId);
  if (log.ip) details.push(`IP ${log.ip}`);
  return details.join(" · ");
}

function severityBadge(severity) {
  return (
    severityPresentation[severity] || {
      label: severity || "Inconnue",
      className: "bg-slate-100 text-slate-600",
    }
  );
}

function SkeletonCard({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton rounded-xl ${className}`} />;
}

function HealthCard({ label, value, detail, status, icon: Icon }) {
  const isDegraded = status && status !== "operationnel";

  return (
    <article
      className={`rounded-xl border px-3 py-3 ${
        isDegraded
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 ${
              isDegraded ? "text-amber-600" : "text-emerald-600"
            }`}
          />
          <h3 className="truncate text-sm text-slate-600">{label}</h3>
        </div>
        <span
          className={`shrink-0 text-xs font-semibold ${
            isDegraded ? "text-amber-700" : "text-emerald-700"
          }`}
        >
          {value}
        </span>
      </div>
      {detail && <p className="mt-1 pl-6 text-xs text-slate-500">{detail}</p>}
    </article>
  );
}

function LogsSkeleton() {
  return (
    <div aria-label="Chargement du journal" className="divide-y divide-slate-100" role="status">
      <span className="sr-only">Chargement du journal d’audit…</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div className="grid gap-3 px-4 py-4 md:grid-cols-[110px_minmax(0,1fr)_90px]" key={index}>
          <SkeletonCard className="h-4 w-24" />
          <SkeletonCard className="h-4 w-3/4" />
          <SkeletonCard className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

function formatAlertMessage(log) {
  const summary = getLogSummary(log);
  return [formatAction(log.action), summary].filter(Boolean).join(" — ");
}

function toApiDate(value, endOfDay = false) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

export default function PlatformLogsPage() {
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState("");
  const [actionSearch, setActionSearch] = useState("");
  const [debouncedAction, setDebouncedAction] = useState("");
  const [shopId, setShopId] = useState("");
  const [selectedShopName, setSelectedShopName] = useState("");
  const [isShopPickerOpen, setIsShopPickerOpen] = useState(false);
  const [shopSearch, setShopSearch] = useState("");
  const [debouncedShopSearch, setDebouncedShopSearch] = useState("");
  const [shopPage, setShopPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [blockIpTarget, setBlockIpTarget] = useState("");
  const [feedback, setFeedback] = useState("");

  const logsQuery = usePlatformLogs({
    page,
    limit: 10,
    severite: severity,
    action: debouncedAction,
    shopId,
    from: toApiDate(fromDate),
    to: toApiDate(toDate, true),
  });
  const shopsQuery = usePlatformShops({
    page: shopPage,
    limit: 10,
    q: debouncedShopSearch,
    enabled: isShopPickerOpen,
  });
  const logs = logsQuery.data?.logs || [];
  const alerts = logsQuery.data?.alertesSecurite24h || [];
  const blockedIps = logsQuery.data?.ipsBloquees || [];
  const health = logsQuery.data?.santeInfrastructure || {};
  const shops = shopsQuery.data?.shops || [];
  const shopPagination = shopsQuery.data?.pagination;
  const pagination = logsQuery.data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const blockedAccounts = Number(health.comptesTemporairementBloques) || 0;
  const apiStatus = health.api?.statut || "inconnu";
  const databaseStatus = health.baseDeDonnees?.statut || "inconnu";
  const firstAlertIp = alerts[0]?.ip || "";
  const firstAlertIpBlocked =
    firstAlertIp !== "" && blockedIps.includes(firstAlertIp);
  const operationalServiceCount = [
    apiStatus === "operationnel",
    databaseStatus === "operationnel",
  ].filter(Boolean).length;

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedAction(actionSearch.trim()),
      300,
    );
    return () => window.clearTimeout(timeoutId);
  }, [actionSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedShopSearch(shopSearch.trim());
      setShopPage(1);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [shopSearch]);

  function updateSeverity(value) {
    setSeverity(value);
    setPage(1);
  }

  function updateActionSearch(value) {
    setActionSearch(value);
    setPage(1);
  }

  function updateDateRange(setter, value) {
    setter(value);
    setPage(1);
  }

  function selectShop(shop) {
    if (!shop) {
      setShopId("");
      setSelectedShopName("");
    } else {
      setShopId(getId(shop));
      setSelectedShopName(shop.nom || shop.code || "Boutique");
    }
    setIsShopPickerOpen(false);
    setShopSearch("");
    setDebouncedShopSearch("");
    setShopPage(1);
    setPage(1);
  }

  const healthCards = [
    {
      label: "API principale",
      value:
        apiStatus === "operationnel"
          ? "Opérationnelle"
          : apiStatus === "degrade"
            ? "Dégradée"
            : "Inconnue",
      detail: [
        health.api?.memoireMo != null
          ? `${health.api.memoireMo} Mo mémoire`
          : "",
        health.demarreDepuis ? `Démarrée depuis ${health.demarreDepuis}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      status: apiStatus,
      icon: Server,
    },
    {
      label: "Base de données",
      value:
        databaseStatus === "operationnel"
          ? "Opérationnelle"
          : databaseStatus === "degrade"
            ? "Dégradée"
            : "Inconnue",
      detail: "État de la connexion à la base",
      status: databaseStatus,
      icon: Database,
    },
    {
      label: "Comptes bloqués",
      value: String(blockedAccounts),
      detail: "Verrouillés temporairement",
      status: blockedAccounts > 0 ? "degrade" : "operationnel",
      icon: Shield,
    },
  ];

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">
          Journaux &amp; Sécurité
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Événements système, tentatives de connexion et santé de l’infrastructure.
        </p>
      </header>

      {feedback && (
        <p
          aria-live="polite"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          {feedback}
        </p>
      )}

      {logsQuery.isPending ? (
        <div className="card grid gap-3 p-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonCard className="h-16" key={index} />
          ))}
        </div>
      ) : logsQuery.isError ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>Impossible de charger les journaux : {parseApiError(logsQuery.error).message}</p>
            <button
              className="mt-2 font-semibold underline underline-offset-2"
              onClick={() => logsQuery.refetch()}
              type="button"
            >
              Réessayer
            </button>
          </div>
        </div>
      ) : (
        <section aria-labelledby="infrastructure-health-heading" className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900" id="infrastructure-health-heading">
              Santé de l’infrastructure
            </h3>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <CircleCheck aria-hidden="true" className="h-3.5 w-3.5" />
              {operationalServiceCount}/2 services opérationnels
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {healthCards.map((card) => (
              <HealthCard {...card} key={card.label} />
            ))}
          </div>
        </section>
      )}

      {!logsQuery.isPending && !logsQuery.isError && alerts.length > 0 && (
        <section
          aria-label="Alertes de sécurité des dernières 24 heures"
          className="rounded-xl border border-red-200 bg-red-50 p-4 sm:p-5"
        >
          <div className="flex items-start gap-2 text-sm font-semibold text-red-800">
            <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            Alerte sécurité active
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium">
              {alerts.length} événement{alerts.length === 1 ? "" : "s"} · 24 h
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-red-700">
            {formatAlertMessage(alerts[0])}
            {" · "}
            {formatDate(alerts[0].createdAt, longDateFormat)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              title={
                !firstAlertIp
                  ? "Cette alerte ne fournit pas d’adresse IP."
                  : firstAlertIpBlocked
                    ? "Cette adresse IP est déjà bloquée."
                    : undefined
              }
            >
              <button
                className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-300 ${
                  !firstAlertIp || firstAlertIpBlocked
                    ? "cursor-not-allowed bg-red-600 opacity-60"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                disabled={!firstAlertIp || firstAlertIpBlocked}
                onClick={() => setBlockIpTarget(firstAlertIp)}
                type="button"
              >
                {firstAlertIpBlocked
                  ? "IP déjà bloquée"
                  : "Bloquer définitivement l’IP"}
              </button>
            </span>
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
              onClick={() => setSelectedLog(alerts[0])}
              type="button"
            >
              <Eye aria-hidden="true" className="h-3.5 w-3.5" />
              Voir le détail
            </button>
          </div>
        </section>
      )}

      {!logsQuery.isPending &&
        !logsQuery.isError &&
        alerts.length === 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CircleCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
            Aucune alerte de sécurité détectée au cours des dernières 24 heures.
          </div>
        )}

      {!logsQuery.isError && (
        <section aria-labelledby="audit-log-heading" className="card overflow-visible">
          <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 sm:px-5">
            <Shield aria-hidden="true" className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800" id="audit-log-heading">
              Journal d’audit système
            </h3>
          </header>

          <div className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="relative block">
              <span className="sr-only">Filtrer par action</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-platform-400 focus:ring-2 focus:ring-platform-100"
                maxLength={60}
                onChange={(event) => updateActionSearch(event.target.value)}
                placeholder="Rechercher une action…"
                value={actionSearch}
              />
            </label>

            <label>
              <span className="sr-only">Filtrer par sévérité</span>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-platform-400 focus:ring-2 focus:ring-platform-100"
                onChange={(event) => updateSeverity(event.target.value)}
                value={severity}
              >
                {severityOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="relative">
              <div className="flex h-10 w-full items-center gap-1 rounded-lg border border-slate-200 bg-white pr-1 text-sm text-slate-700 focus-within:border-platform-400 focus-within:ring-2 focus-within:ring-platform-100">
                <button
                  aria-expanded={isShopPickerOpen}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 text-left outline-none"
                  onClick={() => setIsShopPickerOpen((open) => !open)}
                  type="button"
                >
                  <span className="truncate">
                    {selectedShopName || "Toutes les boutiques"}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 rotate-90 text-slate-400"
                  />
                </button>
                {shopId && (
                  <button
                    aria-label="Effacer le filtre boutique"
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-platform-200"
                    onClick={() => selectShop(null)}
                    type="button"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </div>

              {isShopPickerOpen && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                  <label className="relative block">
                    <span className="sr-only">Rechercher une boutique</span>
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      autoFocus
                      className="h-9 w-full rounded-md border border-slate-200 pl-8 pr-2 text-sm outline-none focus:border-platform-400"
                      onChange={(event) => setShopSearch(event.target.value)}
                      placeholder="Nom, code ou email…"
                      value={shopSearch}
                    />
                  </label>
                  {shopsQuery.isPending ? (
                    <div className="p-3 text-center text-xs text-slate-500" role="status">
                      Chargement des boutiques…
                    </div>
                  ) : shopsQuery.isError ? (
                    <div className="p-3 text-xs text-red-700" role="alert">
                      Impossible de charger les boutiques.
                      <button
                        className="ml-1 font-semibold underline"
                        onClick={() => shopsQuery.refetch()}
                        type="button"
                      >
                        Réessayer
                      </button>
                    </div>
                  ) : shops.length === 0 ? (
                    <p className="p-3 text-xs text-slate-500">
                      Aucune boutique trouvée.
                    </p>
                  ) : (
                    <ul className="mt-1 max-h-52 divide-y divide-slate-100 overflow-y-auto">
                      {shops.map((shop) => (
                        <li key={getId(shop)}>
                          <button
                            className="w-full rounded px-2 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                            onClick={() => selectShop(shop)}
                            type="button"
                          >
                            <span className="block truncate text-sm font-medium text-slate-800">
                              {shop.nom}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {shop.code || shop.email || ""}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {shopPagination?.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-1 pt-2 text-xs text-slate-500">
                      <span>
                        Page {shopPagination.page} / {shopPagination.totalPages}
                      </span>
                      <span className="flex gap-2">
                        <button
                          className="font-medium text-platform-700 disabled:opacity-40"
                          disabled={shopPage <= 1 || shopsQuery.isFetching}
                          onClick={() => setShopPage((current) => current - 1)}
                          type="button"
                        >
                          Précédente
                        </button>
                        <button
                          className="font-medium text-platform-700 disabled:opacity-40"
                          disabled={
                            shopPage >= shopPagination.totalPages ||
                            shopsQuery.isFetching
                          }
                          onClick={() => setShopPage((current) => current + 1)}
                          type="button"
                        >
                          Suivante
                        </button>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="relative">
                <span className="sr-only">Date de début</span>
                <CalendarDays
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs text-slate-700 outline-none focus:border-platform-400"
                  max={toDate || undefined}
                  onChange={(event) => updateDateRange(setFromDate, event.target.value)}
                  type="date"
                  value={fromDate}
                />
              </label>
              <label className="relative">
                <span className="sr-only">Date de fin</span>
                <CalendarDays
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs text-slate-700 outline-none focus:border-platform-400"
                  min={fromDate || undefined}
                  onChange={(event) => updateDateRange(setToDate, event.target.value)}
                  type="date"
                  value={toDate}
                />
              </label>
            </div>
          </div>

          {logsQuery.isPending ? (
            <LogsSkeleton />
          ) : logs.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Shield aria-hidden="true" className="mx-auto h-8 w-8 text-slate-300" />
              <h4 className="mt-3 text-sm font-semibold text-slate-800">
                Aucun événement trouvé
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Modifie les filtres ou réessaie plus tard.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[110px_minmax(0,1fr)_90px] gap-3 border-b border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-400 sm:grid sm:px-5">
                <span>Horodatage</span>
                <span>Événement</span>
                <span>Sévérité</span>
              </div>
              <ol aria-label="Événements du journal d’audit" className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const badge = severityBadge(log.severite);
                  return (
                    <li
                      className="grid gap-2 px-4 py-3 sm:grid-cols-[110px_minmax(0,1fr)_90px] sm:items-center sm:gap-3 sm:px-5"
                      key={log._id || `${log.action}-${log.createdAt}`}
                    >
                      <time
                        className="font-mono text-[11px] text-slate-400"
                        dateTime={log.createdAt}
                      >
                        {formatDate(log.createdAt)}
                      </time>
                      <div className="min-w-0">
                        <p className="break-words text-sm text-slate-700">
                          {formatAction(log.action)}
                        </p>
                        {getLogSummary(log) && (
                          <p className="mt-0.5 break-words text-xs text-slate-500">
                            {getLogSummary(log)}
                          </p>
                        )}
                      </div>
                      <span className={`w-fit rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {pagination && pagination.total > 0 && (
                <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 sm:px-5">
                  <span>
                    {pagination.total} événement{pagination.total === 1 ? "" : "s"} · Page{" "}
                    {pagination.page} sur {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      aria-label="Page précédente"
                      className="rounded-md p-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={page <= 1 || logsQuery.isFetching}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      type="button"
                    >
                      <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Page suivante"
                      className="rounded-md p-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={page >= totalPages || logsQuery.isFetching}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      type="button"
                    >
                      <ChevronRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </footer>
              )}
            </>
          )}
        </section>
      )}

      {selectedLog && (
        <LogDetailsDialog log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
      {blockIpTarget && (
        <BlockIpDialog
          ip={blockIpTarget}
          onBlocked={(message) => {
            setBlockIpTarget("");
            setFeedback(message);
          }}
          onClose={() => setBlockIpTarget("")}
        />
      )}
    </section>
  );
}
