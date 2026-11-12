import { useState } from "react";
import {
  BarChart3,
  Bell,
  CreditCard,
  FileText,
  Flag,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  Store,
  Ticket,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/hooks/useAuth.js";

const navigation = [
  { label: "Vue d'ensemble", path: "/platform/overview", icon: LayoutDashboard, end: true },
  { label: "Demandes en attente", path: "/platform/signup-requests", icon: Users },
  { label: "Boutiques", path: "/platform/shops", icon: Store },
  { label: "Abonnements & Facturation", path: "/platform/billing", icon: CreditCard },
  { label: "Factures boutiques", path: "/platform/invoices", icon: FileText },
  { label: "Plans tarifaires", path: "/platform/plans", icon: Layers },
  { label: "Analytique d'usage", path: "/platform/analytics", icon: BarChart3 },
  { label: "Messagerie / Support", path: "/platform/messaging", icon: MessageSquare },
  { label: "Tickets support", path: "/platform/tickets", icon: Ticket },
  { label: "Notifications", path: "/platform/notifications", icon: Bell },
  { label: "Journaux & Sécurité", path: "/platform/logs", icon: Shield },
  { label: "Feature Flags", path: "/platform/feature-flags", icon: Flag },
  { label: "Paramètres plateforme", path: "/platform/settings", icon: Settings },
];

const frenchDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function getInitials(name) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U"
  );
}

function PlatformSidebar({ user, onNavigate, onLogout }) {
  return (
    <>
      <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-platform-600 text-white">
          <TrendingUp aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Stockline</p>
          <p className="truncate text-xs text-platform-400">Console Admin</p>
        </div>
      </div>

      <nav aria-label="Navigation plateforme" className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-1">
          {navigation.map(({ label, path, icon: Icon, end }) => (
            <li key={path}>
              <NavLink
                end={end}
                onClick={onNavigate}
                to={path}
                className={({ isActive }) =>
                  `flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-platform-600 font-medium text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                <span className="min-w-0">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-platform-600/20 px-3 py-2 text-xs text-platform-400">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
          <span>Plateforme opérationnelle</span>
        </div>
        <div className="flex items-center gap-3 px-1 py-1">
          <div
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-platform-600 text-xs font-semibold text-white"
          >
            {getInitials(user?.nom)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">
              {user?.nom || "Administrateur"}
            </p>
            <p className="truncate text-xs text-platform-400">
              {user?.roleLibelle || "Super Administrateur"}
            </p>
          </div>
          <button
            aria-label="Se déconnecter"
            className="rounded-md p-2 text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-400"
            onClick={onLogout}
            type="button"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function PlatformLayout({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dateLabel] = useState(() => {
    const formattedDate = frenchDate.format(new Date());
    return formattedDate[0].toUpperCase() + formattedDate.slice(1);
  });
  const activePage = navigation.find(
    ({ path }) =>
      location.pathname === path || location.pathname.startsWith(`${path}/`),
  );
  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error("Échec de la fermeture de session côté serveur.", error);
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {isMenuOpen && (
        <button
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
          onClick={() => setIsMenuOpen(false)}
          type="button"
        />
      )}

      <aside
        aria-label="Console d'administration"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-platform-950 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute right-3 top-5 md:hidden">
          <button
            aria-label="Fermer le menu"
            className="rounded-md p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => setIsMenuOpen(false)}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <PlatformSidebar
          onLogout={handleLogout}
          onNavigate={() => setIsMenuOpen(false)}
          user={user}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-expanded={isMenuOpen}
              aria-label="Ouvrir le menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setIsMenuOpen(true)}
              type="button"
            >
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                {activePage?.label || "Console Admin"}
              </h1>
              <p className="truncate text-xs text-slate-500 sm:text-sm">
                Plateforme Stockline Africa · {dateLabel}
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 sm:flex">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
            Tous les systèmes opérationnels
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
