import { ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const footerGroups = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", href: "/#fonctionnalités" },
      { label: "Tarifs", href: "/#tarifs" },
      { label: "À propos", href: "/#apropos" },
    ],
  },
  {
    title: "Compte",
    links: [{ label: "Se connecter", href: "/login" }],
  },
  {
    title: "Légal",
    links: [
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "Confidentialité", href: "/confidentialite" },
      { label: "CGU", href: "/cgu" },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer id="support" className="bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,1fr)] lg:gap-10">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
                <TrendingUp aria-hidden="true" size={19} strokeWidth={2.5} />
              </span>
              <span className="text-lg font-bold tracking-tight">Stockline</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
              La gestion commerciale pour les boutiques d’Afrique centrale.
              Stock, ventes et trésorerie dans un seul outil.
            </p>
            <Link
              to="/inscription"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
            >
              Créer mon compte
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>

          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-sm font-semibold text-white">{group.title}</h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("/") && !link.href.startsWith("/#") ? (
                      <Link
                        to={link.href}
                        className="text-sm text-slate-400 transition hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-slate-400 transition hover:text-white"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="text-sm font-semibold text-white">Contact</h2>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
              Les coordonnées officielles de Stockline seront ajoutées après
              validation par l’équipe.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-slate-800 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Stockline. Tous droits réservés.</p>
          <p>Les informations légales doivent être validées avant publication.</p>
        </div>
      </div>
    </footer>
  );
}
