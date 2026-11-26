import { z } from "zod";

export const businessTypeLabels = {
  boutique_detail: "Boutique de détail",
  depot_grossiste: "Dépôt / Grossiste",
  supermarche: "Supermarché",
  pharmacie: "Pharmacie",
  quincaillerie: "Quincaillerie",
  autre: "Autre",
};

export const cycleLabels = {
  monthly: "Mensuel",
  yearly: "Annuel",
  annual: "Annuel",
};

export const signupStatusMeta = {
  pending: {
    label: "En attente",
    badgeClass: "bg-amber-50 text-amber-700 border border-amber-200/70",
  },
  in_review: {
    label: "En cours de vérification",
    badgeClass: "bg-blue-50 text-blue-700 border border-blue-200/70",
  },
  info_requested: {
    label: "Infos demandées",
    badgeClass: "bg-platform-50 text-platform-700 border border-platform-200/70",
  },
  approved: {
    label: "Approuvée",
    badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
  },
  rejected: {
    label: "Rejetée",
    badgeClass: "bg-rose-50 text-rose-700 border border-rose-200/70",
  },
};

export function getPlanBadgeClass(planNom = "") {
  const normalized = planNom.trim().toLowerCase();
  if (normalized.includes("enterprise") || normalized.includes("entreprise")) {
    return "bg-platform-100 text-platform-700";
  }
  if (normalized.includes("pro")) {
    return "bg-blue-50 text-blue-700";
  }
  return "bg-slate-100 text-slate-600";
}

export const requestInfoSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, "Précisez les informations attendues (au moins 10 caractères).")
    .max(1000, "Le message ne peut pas dépasser 1000 caractères."),
});

export const rejectSignupSchema = z.object({
  motif: z
    .string()
    .trim()
    .min(5, "Le motif de rejet doit comporter au moins 5 caractères.")
    .max(500, "Le motif ne peut pas dépasser 500 caractères."),
});

export function formatSignupDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
