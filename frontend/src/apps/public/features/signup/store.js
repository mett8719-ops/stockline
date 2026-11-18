import { create } from "zustand";

const initialShop = {
  nom: "",
  typeActivite: "",
  autreActivite: "", // description libre quand typeActivite === "autre"
  pays: "CG",        // code pays ISO 3166-1 alpha-2, défaut Congo Brazzaville
  ville: "",
};

const initialOwner = {
  nomComplet: "",
  email: "",
  telephone: "",
  // ⚠️  motDePasse intentionnellement EXCLU du store (jamais en mémoire persistante)
};

const initialSubscription = {
  planId: "",
  cycle: "monthly",
  jourPrelevement: 1,
};

export const useSignupStore = create((set) => ({
  step: 1,
  boutique: initialShop,
  proprietaire: initialOwner,
  abonnement: initialSubscription,

  setBoutique: (boutique) =>
    set((state) => ({ boutique: { ...state.boutique, ...boutique } })),

  /** Le mot de passe est volontairement omis de la déstructuration. */
  setProprietaire: ({ nomComplet, email, telephone }) =>
    set((state) => ({
      proprietaire: {
        ...state.proprietaire,
        nomComplet,
        email,
        telephone,
      },
    })),

  setAbonnement: (abonnement) =>
    set((state) => ({
      abonnement: { ...state.abonnement, ...abonnement },
    })),

  setStep: (step) => set({ step }),
  resetSignup: () =>
    set({
      step: 1,
      boutique: initialShop,
      proprietaire: initialOwner,
      abonnement: initialSubscription,
    }),
}));
