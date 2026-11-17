function toMoney(value) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function sortPaymentModes(paymentBreakdown = {}) {
  return Object.entries({
    especes: toMoney(paymentBreakdown.especes),
    mobile_money: toMoney(paymentBreakdown.mobile_money),
    carte: toMoney(paymentBreakdown.carte),
    credit: toMoney(paymentBreakdown.credit),
  }).filter(([, amount]) => amount > 0);
}

export function getPaymentEntries({ selectedPayment, paymentBreakdown = {}, total = 0, paymentAmount = 0 }) {
  const saleTotal = toMoney(total);

  if (selectedPayment === "mixed") {
    return sortPaymentModes(paymentBreakdown).map(([mode, amount]) => ({
      mode,
      montant: amount,
    }));
  }

  const normalizedMode =
    selectedPayment === "mobile_money"
      ? "mobile_money"
      : selectedPayment === "credit"
        ? "credit"
        : "especes";

  const amount =
    selectedPayment === "credit"
      ? saleTotal
      : toMoney(paymentAmount || paymentBreakdown[normalizedMode] || saleTotal);

  return [{ mode: normalizedMode, montant: amount }];
}

export function buildSalePayload(cartState = {}) {
  const items = Array.isArray(cartState.items) ? cartState.items : [];
  const total = toMoney(cartState.total);
  const customerName = (cartState.client ?? "").trim();
  const selectedPayment = cartState.selectedPayment ?? "especes";
  const paymentBreakdown = cartState.paymentBreakdown ?? {};
  const paymentAmount = toMoney(cartState.paymentAmount ?? 0);

  const paiements = getPaymentEntries({
    selectedPayment,
    paymentBreakdown,
    total,
    paymentAmount,
  });

  const montantPaye = paiements.reduce((sum, line) => sum + toMoney(line.montant), 0);
  const montantRemis = Math.max(0, montantPaye - total);

  return {
    lignes: items.map((item) => ({
      produitId: item?.id ?? item?._id,
      quantite: Number(item?.quantity ?? 0),
      prixUnitaire: toMoney(item?.price ?? 0),
      remise: 0,
    })),
    clientId: null,
    paiements,
    remiseGlobale: 0,
    montantRemis,
    notes: customerName ? `Client: ${customerName}` : undefined,
    clientOperationId: crypto.randomUUID(),
    dateVente: new Date().toISOString(),
  };
}

export function buildThermalReceipt(receipt = {}) {
  const lines = Array.isArray(receipt.lignes) ? receipt.lignes : [];
  const total = toMoney(receipt.montantTotal ?? 0);
  const monnaie = toMoney(receipt.monnaieRendue ?? 0);
  const paymentMode = receipt.modePaiement ?? "";
  const reference = receipt.reference ?? "VTE";
  const date = receipt.date ? new Date(receipt.date) : new Date();

  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);

  const ticket = [
    "STOCKLINE",
    "Ticket de caisse",
    `Ref: ${reference}`,
    `Date: ${formattedDate}`,
    "--------------------------------",
    ...lines.map((line) => `${line.designation ?? "Produit"} x${line.quantite ?? 0} ${Number(line.total ?? 0).toLocaleString("fr-FR")} CDF`),
    "--------------------------------",
    `Total: ${total.toLocaleString("fr-FR")} CDF`,
    `Monnaie: ${monnaie.toLocaleString("fr-FR")} CDF`,
    `Paiement: ${paymentMode || "Caisse"}`,
    "",
    "Merci pour votre achat !",
  ];

  return ticket.join("\n");
}

export function getStockIssueNames(error) {
  const details = error?.response?.data?.error?.details ?? error?.details ?? [];

  if (!Array.isArray(details)) {
    return [];
  }

  const names = details
    .map((item) => item?.produit ?? item?.name ?? item?.nom)
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());

  return [...new Set(names)];
}

export async function submitSaleToApi(cartState = {}) {
  const { default: apiClient } = await import("../../../../../core/api/client.js");
  const payload = buildSalePayload(cartState);
  const response = await apiClient.post("/sales", payload);
  const sale = response.data?.data?.vente ?? response.data?.vente ?? {};
  const receipt = response.data?.data?.recu ?? response.data?.recu ?? buildThermalReceipt(sale);

  return {
    sale,
    receipt,
    payload,
    raw: response.data,
  };
}
