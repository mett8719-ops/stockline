import apiClient from "@/core/api/client.js";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertAmount(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`La réponse de trésorerie contient un montant invalide (${name}).`);
  }
}

function validateOverview(overview) {
  if (!isRecord(overview)) {
    throw new TypeError("La réponse de trésorerie est invalide.");
  }

  assertAmount(overview.soldeCaisse, "soldeCaisse");

  if (!isRecord(overview.periode)) {
    throw new TypeError("La réponse de trésorerie ne contient pas de période valide.");
  }

  assertAmount(overview.periode.totalRecettes, "totalRecettes");
  assertAmount(overview.periode.totalDepenses, "totalDepenses");

  if (!Array.isArray(overview.journal)) {
    throw new TypeError("Le journal de trésorerie est invalide.");
  }

  for (const day of overview.journal) {
    if (
      !isRecord(day) ||
      typeof day.jour !== "string" ||
      !Array.isArray(day.operations)
    ) {
      throw new TypeError("Une journée du journal de trésorerie est invalide.");
    }

    assertAmount(day.recettes, "recettes du jour");
    assertAmount(day.depenses, "dépenses du jour");

    for (const operation of day.operations) {
      if (
        !isRecord(operation) ||
        !["recette", "depense"].includes(operation.type) ||
        typeof operation.libelle !== "string" ||
        typeof operation.date !== "string" ||
        !Number.isFinite(Date.parse(operation.date))
      ) {
        throw new TypeError("Une opération du journal de trésorerie est invalide.");
      }

      assertAmount(operation.montant, "montant de l’opération");
    }
  }

  return overview;
}

export async function getTreasuryOverview(days = 3) {
  const now = new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const response = await apiClient.get("/treasury", {
    params: {
      from: from.toISOString(),
      to: now.toISOString(),
      page: 1,
      limit: 100,
    },
  });
  const overview = response.data?.data;

  return validateOverview(overview);
}

export async function createTreasuryTransaction(transaction) {
  const response = await apiClient.post("/treasury/transactions", transaction);
  const createdTransaction = response.data?.data;

  if (
    !isRecord(createdTransaction) ||
    !["recette", "depense"].includes(createdTransaction.type) ||
    typeof createdTransaction.libelle !== "string" ||
    typeof createdTransaction.date !== "string" ||
    !Number.isFinite(Date.parse(createdTransaction.date))
  ) {
    throw new TypeError("La réponse de création de l’opération est invalide.");
  }

  assertAmount(createdTransaction.montant, "montant créé");
  return createdTransaction;
}
