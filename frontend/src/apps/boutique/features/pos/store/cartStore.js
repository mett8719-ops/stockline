import { create } from "zustand";

const initialPaymentBreakdown = {
  especes: 0,
  mobile_money: 0,
  carte: 0,
  credit: 0,
};

const initialState = {
  items: [],
  selectedPayment: "especes",
  client: "",
  paymentAmount: 0,
  paymentBreakdown: { ...initialPaymentBreakdown },
  lastSale: null,
};

function computeTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function toMoney(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

const cartStore = create((set, get) => ({
  ...initialState,
  total: 0,
  count: 0,

  setSelectedPayment: (selectedPayment) =>
    set((state) => {
      const fallbackValue = state.total || 0;
      const nextBreakdown = { ...state.paymentBreakdown };

      if (selectedPayment === "especes") {
        nextBreakdown.especes = nextBreakdown.especes || fallbackValue;
      }
      if (selectedPayment === "mobile_money") {
        nextBreakdown.mobile_money = nextBreakdown.mobile_money || fallbackValue;
      }
      if (selectedPayment === "credit") {
        nextBreakdown.credit = nextBreakdown.credit || fallbackValue;
      }

      return {
        selectedPayment,
        paymentBreakdown: nextBreakdown,
        paymentAmount: Object.values(nextBreakdown).reduce((sum, value) => sum + toMoney(value), 0),
      };
    }),

  setClient: (client) => set({ client }),

  setPaymentBreakdown: (paymentBreakdown) =>
    set((state) => {
      const nextBreakdown = {
        ...initialPaymentBreakdown,
        ...state.paymentBreakdown,
        ...paymentBreakdown,
      };

      return {
        paymentBreakdown: nextBreakdown,
        paymentAmount: Object.values(nextBreakdown).reduce((sum, value) => sum + toMoney(value), 0),
      };
    }),

  setPaymentAmount: (paymentAmount) =>
    set((state) => {
      const numericValue = toMoney(paymentAmount);
      const nextBreakdown = {
        ...state.paymentBreakdown,
        [state.selectedPayment === "mobile_money" ? "mobile_money" : "especes"]: numericValue,
      };

      return {
        paymentAmount: numericValue,
        paymentBreakdown: nextBreakdown,
      };
    }),

  getPaymentTotal: () => {
    const { paymentBreakdown } = get();
    return Object.values(paymentBreakdown).reduce((sum, value) => sum + toMoney(value), 0);
  },

  getChange: () => {
    const { total } = get();
    const paid = get().getPaymentTotal();
    return Math.max(0, paid - Number(total || 0));
  },

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
    const { items, client, selectedPayment, total, paymentBreakdown } = get();

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Le panier est vide.");
    }

    const saleTotal = Number(total || 0);
    const trimmedClient = (client || "").trim();
    const normalizedBreakdown = {
      ...initialPaymentBreakdown,
      ...paymentBreakdown,
    };

    if (selectedPayment === "credit" && !trimmedClient) {
      throw new Error("Le client est obligatoire pour une vente à crédit.");
    }

    if (selectedPayment === "credit") {
      normalizedBreakdown.credit = saleTotal;
    }

    const amountPaid = Object.values(normalizedBreakdown).reduce((sum, value) => sum + toMoney(value), 0);

    if (!Number.isFinite(amountPaid) || amountPaid < saleTotal) {
      throw new Error("Le montant encaisse doit couvrir le total de la vente.");
    }

    const sale = {
      id: crypto.randomUUID(),
      client: trimmedClient || "Client général",
      items: items.map((item) => ({ ...item })),
      total: saleTotal,
      paymentMethod: selectedPayment,
      paymentAmount: amountPaid,
      amounts: { ...normalizedBreakdown },
      change: Math.max(0, amountPaid - saleTotal),
      createdAt: new Date().toISOString(),
    };

    set({
      items: [],
      total: 0,
      count: 0,
      client: "",
      paymentAmount: 0,
      paymentBreakdown: { ...initialPaymentBreakdown },
      lastSale: sale,
    });

    return sale;
  },
}));

const originalGetState = cartStore.getState.bind(cartStore);

cartStore.getState = () =>
  new Proxy(originalGetState(), {
    get(target, property, receiver) {
      const current = originalGetState();

      if (Reflect.has(current, property)) {
        const value = current[property];
        return typeof value === "function" ? value.bind(current) : value;
      }

      return Reflect.get(target, property, receiver);
    },
  });

export const usePosCart = cartStore;
