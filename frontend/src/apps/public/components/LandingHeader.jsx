import { useState } from "react";
import { ArrowUpRight, Menu, TrendingUp, X } from "lucide-react";
import { Link } from "react-router-dom";

const navigation = [
  { label: "Fonctionnalités", href: "/#fonctionnalités" },
  { label: "Tarifs", href: "/#tarifs" },
  { label: "Témoignages", href: "/#apropos" },
  { label: "Support", href: "/#support" },
];

export default function LandingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          to="/"
          aria-label="Stockline, accueil"
          className="inline-flex items-center gap-2.5 rounded-lg text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
          onClick={closeMenu}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <TrendingUp aria-hidden="true" size={19} strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight">Stockline</span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-8 md:flex">
          {navigation.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-slate-600 transition hover:text-brand-600"
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Se connecter
          </Link>
          <Link
            to="/inscription"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            Créer mon compte
            <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </nav>

        <button
          type="button"
          aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isMenuOpen}
          aria-controls="landing-mobile-menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 md:hidden"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? (
            <X aria-hidden="true" size={21} />
          ) : (
            <Menu aria-hidden="true" size={21} />
          )}
        </button>
      </div>

      {isMenuOpen && (
        <nav
          id="landing-mobile-menu"
          aria-label="Navigation mobile"
          className="border-t border-slate-100 bg-white px-5 py-3 shadow-lg md:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={closeMenu}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <Link
                to="/login"
                className="flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700"
                onClick={closeMenu}
              >
                Se connecter
              </Link>
              <Link
                to="/inscription"
                className="flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white"
                onClick={closeMenu}
              >
                Créer mon compte
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
