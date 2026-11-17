import { useState } from "react";
import {
  CircleHelp,
  Pencil,
  RefreshCw,
  Shield,
  Snowflake,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { parseApiError } from "@/core/api/errors.js";
import { useAuth } from "@/core/hooks/useAuth.js";
import EmployeeActionDialog from "../components/EmployeeActionDialog.jsx";
import InviteEmployeeDialog from "../components/InviteEmployeeDialog.jsx";
import { useEmployeeRoles, useEmployees } from "../hooks.js";

const roleLabels = {
  admin: "Administrateur",
  caissier: "Caissier(ère)",
  magasinier: "Magasinier",
  comptable: "Comptable",
  custom: "Rôle personnalisé",
};

const permissionLabels = {
  dashboard: "Tableau de bord",
  pos: "Caisse",
  products: "Produits",
  stock: "Stock",
  customers: "Clients",
  suppliers: "Fournisseurs",
  documents: "Documents",
  inventory: "Inventaires",
  treasury: "Trésorerie",
  users: "Utilisateurs",
  messaging: "Messagerie",
  tickets: "Tickets support",
  suggestions: "Suggestions",
  settings: "Paramètres",
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function getInitials(name) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function formatLastConnection(value) {
  if (!value) return "Jamais connecté";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Dernière connexion inconnue";
  return `Dernière connexion : ${dateFormat.format(date)}`;
}

function EmployeeRow({ employee, isCurrentUser, roleOptions, onAction }) {
  const roleLabel =
    employee.roleLibelle ||
    roleLabels[employee.role] ||
    employee.role ||
    "Équipe";
  const isFrozen = Boolean(employee.gele);
  const isInactive = !employee.actif;

  return (
    <article className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          isInactive || isFrozen
            ? "bg-slate-100 text-slate-400"
            : "bg-brand-50 text-brand-700"
        }`}
      >
        {getInitials(employee.nom)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-medium text-slate-900">
            {employee.nom}
          </h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {roleLabel}
          </span>
          {(isInactive || isFrozen) && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {isInactive ? "Inactif" : "Gelé"}
            </span>
          )}
        </div>
        <p className="mt-1 break-all text-xs text-slate-500">
          {employee.email}
          {employee.telephone ? ` · ${employee.telephone}` : ""}
          {" · "}
          {formatLastConnection(employee.derniereConnexion)}
        </p>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          aria-label={`Modifier les informations de ${employee.nom}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-200"
          onClick={() => onAction("edit", employee)}
          title="Modifier le nom ou le téléphone"
          type="button"
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
          <span className="sm:hidden">Modifier</span>
        </button>
        <button
          aria-label={`Modifier le rôle de ${employee.nom}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isCurrentUser || roleOptions.length === 0}
          onClick={() => onAction("role", employee)}
          title={isCurrentUser ? "Vous ne pouvez pas modifier votre propre rôle" : "Modifier le rôle et les accès"}
          type="button"
        >
          <Shield aria-hidden="true" className="h-4 w-4" />
          <span className="sm:hidden">Rôle</span>
        </button>
        <button
          aria-checked={isFrozen}
          aria-label={isFrozen ? `Réactiver ${employee.nom}` : `Geler ${employee.nom}`}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
            isFrozen || isInactive ? "bg-slate-300" : "bg-emerald-600"
          }`}
          disabled={isCurrentUser || isInactive}
          onClick={() => onAction("freeze", employee)}
          role="switch"
          title={
            isCurrentUser
              ? "Vous ne pouvez pas geler votre propre compte"
              : isInactive
                ? "Compte désactivé"
                : isFrozen
                  ? "Réactiver l’accès"
                  : "Geler l’accès"
          }
          type="button"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              isFrozen || isInactive ? "translate-x-1" : "translate-x-6"
            }`}
          />
        </button>
      </div>
    </article>
  );
}

function LoadingEmployees() {
  return (
    <div aria-label="Chargement des employés" className="divide-y divide-slate-100" role="status">
      <span className="sr-only">Chargement des employés…</span>
      {Array.from({ length: 4 }, (_, index) => (
        <div className="flex items-center gap-4 px-5 py-5" key={index}>
          <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-3 w-64 max-w-full" />
          </div>
          <div className="skeleton h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("members");
  const [dialog, setDialog] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const employeesQuery = useEmployees();
  const rolesQuery = useEmployeeRoles();
  const employees = employeesQuery.data || [];
  const roleOptions = (rolesQuery.data?.rolesPredefinis || [])
    .filter((role) => role.nom !== "admin")
    .map((role) => ({
      value: role.nom,
      label: roleLabels[role.nom] || role.nom,
      permissions: role.permissions || [],
    }));

  function showFeedback(message, type = "success") {
    setFeedback({ message, type });
  }

  function openDialog(mode, employee = null) {
    setFeedback(null);
    setDialog({ mode, employee });
  }

  const currentUserId = user?.id || user?._id;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Utilisateurs &amp; Droits
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Gérez les accès de votre équipe.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={rolesQuery.isPending || roleOptions.length === 0}
          onClick={() => openDialog("invite")}
          type="button"
        >
          <UserRoundPlus aria-hidden="true" className="h-4 w-4" />
          Inviter un employé
        </button>
      </header>

      <div className="flex w-fit max-w-full rounded-lg bg-slate-200 p-1" role="tablist" aria-label="Utilisateurs et rôles">
        <button
          aria-selected={tab === "members"}
          className={`min-h-9 rounded-md px-3 text-sm transition ${
            tab === "members"
              ? "bg-white font-medium text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
          id="employees-tab"
          onClick={() => setTab("members")}
          role="tab"
          type="button"
        >
          Membres de l’équipe
        </button>
        <button
          aria-selected={tab === "roles"}
          className={`min-h-9 rounded-md px-3 text-sm transition ${
            tab === "roles"
              ? "bg-white font-medium text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
          id="roles-tab"
          onClick={() => setTab("roles")}
          role="tab"
          type="button"
        >
          Rôles &amp; permissions
        </button>
      </div>

      {feedback && (
        <p
          aria-live="polite"
          className={`rounded-lg px-4 py-3 text-sm ${
            feedback.type === "error"
              ? "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}

      {tab === "members" ? (
        <section
          aria-labelledby="employees-tab"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          role="tabpanel"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
            <p className="text-sm text-slate-500">
              {employees.length} membre{employees.length === 1 ? "" : "s"} dans l’équipe
            </p>
            <button
              aria-label="Actualiser la liste"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              disabled={employeesQuery.isFetching}
              onClick={() => employeesQuery.refetch()}
              type="button"
            >
              <RefreshCw
                aria-hidden="true"
                className={`h-4 w-4 ${employeesQuery.isFetching ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          {employeesQuery.isPending ? (
            <LoadingEmployees />
          ) : employeesQuery.isError ? (
            <div className="p-6 text-center">
              <p className="text-sm text-red-700" role="alert">
                Impossible de charger les employés : {parseApiError(employeesQuery.error).message}
              </p>
              <button
                className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => employeesQuery.refetch()}
                type="button"
              >
                Réessayer
              </button>
            </div>
          ) : employees.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <UsersRound aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                Aucun employé pour le moment
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Invitez un membre pour lui donner accès à votre boutique.
              </p>
            </div>
          ) : (
            employees.map((employee) => (
              <EmployeeRow
                employee={employee}
                isCurrentUser={String(employee.id || employee._id) === String(currentUserId)}
                key={employee.id || employee._id}
                onAction={openDialog}
                roleOptions={roleOptions}
              />
            ))
          )}
        </section>
      ) : (
        <section aria-labelledby="roles-tab" className="space-y-4" role="tabpanel">
          <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            <CircleHelp aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Les permissions sont attribuées automatiquement selon le rôle.
              Vous pourrez créer des rôles personnalisés dans les paramètres.
            </p>
          </div>
          {rolesQuery.isPending ? (
            <div aria-label="Chargement des rôles" className="grid gap-4 md:grid-cols-3" role="status">
              {Array.from({ length: 3 }, (_, index) => (
                <div className="card h-40 p-5" key={index}>
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton mt-4 h-3 w-48" />
                  <div className="skeleton mt-2 h-3 w-36" />
                </div>
              ))}
            </div>
          ) : rolesQuery.isError ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              Impossible de charger les rôles : {parseApiError(rolesQuery.error).message}
            </p>
          ) : roleOptions.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              Aucun rôle prédéfini disponible.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {roleOptions.map((role) => (
                <article className="rounded-xl border border-slate-200 bg-white p-5" key={role.value}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">{role.label}</h3>
                    <span className="text-xs font-medium text-emerald-700">
                      {role.permissions.length} accès
                    </span>
                  </div>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {role.permissions.map((permission) => (
                      <li
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                        key={permission}
                      >
                        {permissionLabels[permission] || permission}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
              <article className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-slate-500 md:col-span-2 xl:col-span-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Snowflake aria-hidden="true" className="h-4 w-4" />
                  Administrateur
                </div>
                <p className="mt-2 text-sm">
                  Accès complet à la boutique. Ce rôle est réservé à l’administration.
                </p>
              </article>
            </div>
          )}
        </section>
      )}

      {dialog?.mode === "invite" && (
        <InviteEmployeeDialog
          onClose={() => setDialog(null)}
          onSaved={(message) => showFeedback(message)}
          roleOptions={roleOptions}
        />
      )}
      {dialog?.employee && (
        <EmployeeActionDialog
          employee={dialog.employee}
          mode={dialog.mode}
          onClose={() => setDialog(null)}
          onSaved={(message) => showFeedback(message)}
          roleOptions={roleOptions}
        />
      )}
    </section>
  );
}
