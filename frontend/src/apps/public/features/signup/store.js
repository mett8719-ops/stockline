import { create } from "zustand";

const initialShop = {
  nom: "",
  typeActivite: "",
  ville: "",
};

const initialOwner = {
  nomComplet: "",
  email: "",
  telephone: "",
};

export const useSignupStore = create((set) => ({
  step: 1,
  boutique: initialShop,
  proprietaire: initialOwner,
  setBoutique: (boutique) =>
    set((state) => ({ boutique: { ...state.boutique, ...boutique } })),
  setProprietaire: ({ nomComplet, email, telephone }) =>
    set((state) => ({
      proprietaire: {
        ...state.proprietaire,
        nomComplet,
        email,
        telephone,
      },
    })),
  setStep: (step) => set({ step }),
}));
