import { useState } from "react";
import {
  Boxes,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/core/hooks/useAuth.js";
import NotificationBell from "@/apps/shared/features/notifications/NotificationBell.jsx";
import SyncBadge from "@/core/offline/SyncBadge.jsx";

const navigation = [
  { label: "Tableau de bord", path: "/dashboard", permission: "dashboard", icon: LayoutDashboard },
  { label: "Caisse", path: "/pos", permission: "pos", icon: ShoppingCart },
  { label: "Produits", path: "/products", permission: "products", icon: Package },
  { label: "Stock", path: "/stock", permission: "stock", icon: Boxes },
  { label: "Clients", path: "/customers", permission: "customers", icon: Users },
  { label: "Fournisseurs", path: "/suppliers", permission: "suppliers", icon: Truck },
  { label: "Documents", path: "/documents", permission: "documents", icon: FileText },
  { label: "Inventaires", path: "/inventories", permission: "inventory", icon: ClipboardList },
  { label: "Trésorerie", path: "/treasury", permission: "treasury", icon: Wallet },
  { label: "Utilisateurs", path: "/users", permission: "users", icon: Users },
  { label: "Messagerie", path: "/messaging", permission: "messaging", icon: MessageSquare },
  { label: "Tickets support", path: "/tickets", permission: "tickets", icon: MessageSquare },
  { label: "Suggestions", path: "/suggestions", permission: "suggestions", icon: Lightbulb },
  { label: "Paramètres", path: "/settings", permission: "settings", icon: Settings },
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

function BoutiqueSidebar({ shop, user, visibleNavigation, onNavigate }) {
  return (
    <>
      <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
          S
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Stockline</p>
          <p className="truncate text-xs text-slate-400">Espace boutique</p>
        </div>
      </div>

      <label className="px-3 pt-5">
        <span className="sr-only">Boutique active</span>
        <span className="flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-200">
          <Store aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
          <select
            aria-label="Boutique active"
            className="min-w-0 flex-1 appearance-none truncate bg-transparent text-sm outline-none"
            disabled
            value={shop?.id || ""}
          >
            <option className="text-slate-900" value={shop?.id || ""}>
              {shop?.nom || "Ma boutique"}
            </option>
          </select>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
        </span>
      </label>

      <nav aria-label="Navigation boutique" className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-1">
          {visibleNavigation.map(({ label, path, icon: Icon }) => (
            <li key={path}>
              <NavLink
                end={path === "/dashboard"}
                onClick={onNavigate}
                to={path}
                className={({ isActive }) =>
                  `flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-brand-600 font-medium text-white"
                      : "text-slate-300 hover:bg-sidebar-hover hover:text-white"
                  }`
                }
              >
                <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white"
          >
            {getInitials(user?.nom)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user?.nom || "Utilisateur"}
            </p>
            <p className="truncate text-xs capitalize text-slate-400">
              {user?.roleLibelle || user?.role || "Équipe"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function BoutiqueLayout({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { permissions, user, shop, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dateLabel] = useState(() => {
    const formattedDate = frenchDate.format(new Date());
    return formattedDate[0].toUpperCase() + formattedDate.slice(1);
  });
  const visibleNavigation = navigation.filter(
    (item) => user?.role === "admin" || permissions.includes(item.permission),
  );
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
        aria-label="Espace boutique"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
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
        <BoutiqueSidebar
          onNavigate={() => setIsMenuOpen(false)}
          shop={shop}
          user={user}
          visibleNavigation={visibleNavigation}
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
                {activePage?.label || "Espace boutique"}
              </h1>
              <p className="truncate text-xs text-slate-500 sm:text-sm">
                {shop?.nom || "Stockline"} · {dateLabel}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <SyncBadge />
            <NotificationBell />
            <div
              aria-label={`Connecté en tant que ${user?.nom || "utilisateur"}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 sm:h-9 sm:w-9"
              title={user?.nom || "Utilisateur"}
            >
              {getInitials(user?.nom)}
            </div>
            <button
              aria-label="Se déconnecter"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              onClick={handleLogout}
              type="button"
            >
              <LogOut aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
