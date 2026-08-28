/**
 * PASSERELLE FEEXPAY — Mobile Money MTN Congo.
 * Adaptee au contrat commun defini dans payment.interface.js.
 */
const axios = require("axios");
const AppError = require("../../../app-error");
const { PAYMENT_STATUS } = require("../../../constants");
const colors = require("colors");

const NOM = "FeexPay";
const OPERATEURS = ["mtn_cg"];

const BASE_URL = process.env.FEEXPAY_BASE_URL || "https://api-v2.feexpay.me";

function estConfiguree() {
  return !!(process.env.FEEXPAY_API_KEY && process.env.FEEXPAY_SHOP_ID);
}

function client() {
  const apiKey = process.env.FEEXPAY_API_KEY;
  if (!apiKey) throw AppError.internal("FEEXPAY_API_KEY non configuree");

  return axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
}

function normalizePhone(numero) {
  let n = String(numero).replace(/[\s+().-]/g, "");
  if (n.startsWith("00")) n = n.slice(2);

  if (n.length === 9 && ["06", "05", "04"].includes(n.slice(0, 2))) {
    n = `242${n}`;
  }

  if (!/^242\d{9}$/.test(n)) {
    throw AppError.badRequest(
      "Numero MTN Congo invalide (format attendu : 242 06 XXX XX XX)"
    );
  }
  return n;
}

async function requestToPay({
  phoneNumber, amount, callbackInfo, description, firstName, lastName,
}) {
  const montant = Math.round(Number(amount));

  if (!Number.isFinite(montant) || montant < 100) {
    throw AppError.badRequest("Le montant minimum accepte est de 100");
  }

  const shop = process.env.FEEXPAY_SHOP_ID;
  if (!shop) throw AppError.internal("FEEXPAY_SHOP_ID non configure");

  const payload = {
    phoneNumber: normalizePhone(phoneNumber),
    amount: montant,
    shop,
    callback_info: String(callbackInfo),
    // FeexPay refuse les caracteres speciaux dans la description
    description: (description || "Abonnement Stockline")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .slice(0, 60),
    ...(firstName ? { first_name: firstName } : {}),
    ...(lastName ? { last_name: lastName } : {}),
  };

  try {
    const { data } = await client().post(
      "/api/transactions/public/requesttopay/mtn_cg",
      payload
    );

    console.log(
      `Paiement FeexPay initie — ref ${data?.reference} — ${montant} XAF`.cyan
    );

    return {
      reference: data?.reference || data?.transaction_id || data?.id,
      status: normaliserStatut(data?.status),
      raw: data,
    };
  } catch (e) {
    const detail = e.response?.data;
    console.error(
      `Echec FeexPay [${e.response?.status}] : ${JSON.stringify(detail)}`.red
    );

    throw new AppError(
      detail?.message || "Le service de paiement mobile est momentanement indisponible",
      502, "PAYMENT_GATEWAY_ERROR"
    );
  }
}

async function getPaymentStatus(reference) {
  if (!reference) throw AppError.badRequest("Reference de transaction requise");

  try {
    const { data } = await client().get(
      `/api/transactions/public/single/status/${reference}`
    );
    return { status: normaliserStatut(data?.status), raw: data };
  } catch (e) {
    console.error(`Echec verification FeexPay ${reference} : ${e.message}`.red);
    throw new AppError(
      "Impossible de verifier le statut du paiement",
      502, "PAYMENT_GATEWAY_ERROR"
    );
  }
}

async function verifyCallback(body) {
  const reference = body?.reference || body?.transaction_id || body?.id;

  if (!reference) {
    throw AppError.badRequest("Callback invalide : reference manquante");
  }

  // Re-verification systematique : on ne croit jamais le corps de la requete
  const { status, raw } = await getPaymentStatus(reference);

  return {
    reference,
    status,
    callbackInfo: body?.callback_info || raw?.callback_info,
    montant: raw?.amount,
    raw,
  };
}

function normaliserStatut(statut) {
  const s = String(statut || "").toUpperCase();

  if (["SUCCESS", "SUCCESSFUL", "COMPLETED"].includes(s)) {
    return PAYMENT_STATUS.SUCCESS;
  }
  if (["FAILED", "CANCELLED", "REJECTED"].includes(s)) {
    return PAYMENT_STATUS.FAILED;
  }
  return PAYMENT_STATUS.PENDING;
}

module.exports = {
  NOM, OPERATEURS, estConfiguree,
  requestToPay, getPaymentStatus, verifyCallback, normalizePhone,
};
