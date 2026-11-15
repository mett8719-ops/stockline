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

  if (overview.sessionCaisse != null) {
    const session = overview.sessionCaisse;
    if (
      !isRecord(session) ||
      typeof session._id !== "string" ||
      session.statut !== "ouverte" ||
      typeof session.ouverteLe !== "string" ||
      !Number.isFinite(Date.parse(session.ouverteLe))
    ) {
      throw new TypeError("La session de caisse ouverte est invalide.");
    }

    assertAmount(session.fondsOuverture, "fonds d’ouverture");
  }

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

export async function openTreasurySession(session) {
  const response = await apiClient.post("/treasury/sessions/open", session);
  const openedSession = response.data?.data;

  if (
    !isRecord(openedSession) ||
    typeof openedSession._id !== "string" ||
    openedSession.statut !== "ouverte" ||
    !Number.isFinite(Date.parse(openedSession.ouverteLe))
  ) {
    throw new TypeError("La réponse d’ouverture de caisse est invalide.");
  }

  assertAmount(openedSession.fondsOuverture, "fonds d’ouverture");
  return openedSession;
}

export async function closeTreasurySession(session) {
  const response = await apiClient.post("/treasury/sessions/close", session);
  const result = response.data?.data;
  const report = result?.rapport;

  if (
    !isRecord(result) ||
    !isRecord(result.session) ||
    result.session.statut !== "fermee" ||
    !isRecord(report) ||
    typeof report.interpretation !== "string"
  ) {
    throw new TypeError("La réponse de clôture et son rapport Z sont invalides.");
  }

  for (const field of [
    "fondsOuverture",
    "totalVentes",
    "nombreVentes",
    "totalDepenses",
    "fondsTheorique",
    "fondsComptes",
    "ecart",
  ]) {
    if (!Number.isFinite(report[field])) {
      throw new TypeError(`Le rapport Z contient une valeur invalide (${field}).`);
    }
  }

  if (!isRecord(report.ventilationParMode)) {
    throw new TypeError("La ventilation par mode du rapport Z est invalide.");
  }

  return result;
}

export async function getTreasuryExport({ from, to } = {}) {
  const response = await apiClient.get("/treasury/export", {
    params: { from, to },
  });
  const result = response.data?.data;

  if (
    !isRecord(result) ||
    !Array.isArray(result.lignes) ||
    !isRecord(result.totaux)
  ) {
    throw new TypeError("La réponse d’export comptable est invalide.");
  }

  for (const row of result.lignes) {
    if (
      !isRecord(row) ||
      typeof row.date !== "string" ||
      typeof row.libelle !== "string" ||
      typeof row.categorie !== "string" ||
      typeof row.modePaiement !== "string" ||
      typeof row.auteur !== "string" ||
      !Number.isFinite(row.debit) ||
      !Number.isFinite(row.credit)
    ) {
      throw new TypeError("Une ligne de l’export comptable est invalide.");
    }
  }

  assertAmount(result.totaux.debit, "total débit");
  assertAmount(result.totaux.credit, "total crédit");
  return result;
}
