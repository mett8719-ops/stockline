import { create } from "zustand";

const initialState = {
  items: [],
  selectedPayment: "especes",
  client: "",
  paymentAmount: 0,
  lastSale: null,
};

function computeTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export const usePosCart = create((set, get) => ({
  ...initialState,
  total: 0,
  count: 0,

  setSelectedPayment: (selectedPayment) => set({ selectedPayment }),
  setClient: (client) => set({ client }),
  setPaymentAmount: (paymentAmount) =>
    set({ paymentAmount: Number.isFinite(Number(paymentAmount)) ? Number(paymentAmount) : 0 }),

  reset: () => set({ ...initialState, total: 0, count: 0 }),

  addItem: (product, quantity = 1) => {
    const nextQuantity = Number(quantity);
    const stock = Number(product?.stock ?? 0);

    if (!product || !product.id) {
      throw new Error("Produit invalide.");
    }

    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      throw new Error("La quantité doit être supérieure à zéro.");
    }

    const currentItems = get().items;
    const existingItem = currentItems.find((item) => item.id === product.id);
    const currentQuantity = existingItem?.quantity ?? 0;
    const limitedQuantity = Math.min(nextQuantity, Math.max(0, stock - currentQuantity));

    if (stock > 0 && limitedQuantity <= 0) {
      return;
    }

    set((state) => {
      const currentItems = state.items;
      const existingItem = currentItems.find((item) => item.id === product.id);
      const nextItems = existingItem
        ? currentItems.map((item) =>
            item.id === product.id
              ? { ...item, quantity: Math.min(item.quantity + limitedQuantity, stock || item.quantity + limitedQuantity) }
              : item,
          )
        : [...currentItems, { ...product, quantity: limitedQuantity }];

      const total = computeTotal(nextItems);
      const count = nextItems.reduce((sum, item) => sum + item.quantity, 0);

      return { items: nextItems, total, count };
    });
  },

  updateQuantity: (productId, quantity) => {
    const nextQuantity = Number(quantity);

    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      throw new Error("La quantité doit être supérieure à zéro.");
    }

    const item = get().items.find((entry) => entry.id === productId);
    if (!item) {
      throw new Error("Produit introuvable dans le panier.");
    }

    const stock = Number(item.stock ?? 0);
    const boundedQuantity = stock > 0 ? Math.min(nextQuantity, stock) : nextQuantity;

    set((state) => {
      const nextItems = state.items
        .map((entry) =>
          entry.id === productId ? { ...entry, quantity: boundedQuantity } : entry,
        )
        .filter((entry) => entry.quantity > 0);

      const total = computeTotal(nextItems);
      const count = nextItems.reduce((sum, entry) => sum + entry.quantity, 0);

      return { items: nextItems, total, count };
    });
  },

  removeItem: (productId) =>
    set((state) => {
      const nextItems = state.items.filter((item) => item.id !== productId);
      const total = computeTotal(nextItems);
      const count = nextItems.reduce((sum, item) => sum + item.quantity, 0);
      return { items: nextItems, total, count };
    }),

  submitSale: () => {
    const { items, client, selectedPayment, total, paymentAmount } = get();

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Le panier est vide.");
    }

    const saleTotal = Number(total || 0);
    const amountPaid = Number(paymentAmount ?? saleTotal);

    if (!Number.isFinite(amountPaid) || amountPaid < saleTotal) {
      throw new Error("Le montant encaisse doit couvrir le total de la vente.");
    }

    const sale = {
      id: crypto.randomUUID(),
      client: client?.trim() || "Client général",
      items: items.map((item) => ({ ...item })),
      total: saleTotal,
      paymentMethod: selectedPayment,
      paymentAmount: amountPaid,
      change: Math.max(0, amountPaid - saleTotal),
      createdAt: new Date().toISOString(),
    };

    set({
      items: [],
      total: 0,
      count: 0,
      client: "",
      paymentAmount: 0,
      lastSale: sale,
    });

    return sale;
  },
}));
