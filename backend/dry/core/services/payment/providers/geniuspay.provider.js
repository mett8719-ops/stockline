/**
 * ══════════════════════════════════════════════════════════════════════════
 *  PASSERELLE GENIUS PAY — Mobile Money
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠ POINTS A AJUSTER A LA RECEPTION DE LA DOCUMENTATION OFFICIELLE :
 *   - les chemins d'URL exacts (marques // AJUSTER)
 *   - les noms de champs de la requete et de la reponse
 *   - le mecanisme de signature des callbacks, s'il existe
 *
 * Tant que ces points ne sont pas confirmes, garder PAYMENT_PROVIDER=feexpay
 * en production.
 *
 * ══ DEUX REGLES DE SECURITE, IDENTIQUES POUR TOUTE PASSERELLE ══
 *   1. Les identifiants marchand ne quittent JAMAIS le serveur.
 *   2. Toute notification entrante est re-verifiee aupres de l'API avant
 *      d'etre prise en compte.
 */
const axios = require("axios");
const crypto = require("crypto");
const AppError = require("../../../app-error");
const { PAYMENT_STATUS } = require("../../../constants");
const colors = require("colors");

const NOM = "Genius Pay";
const OPERATEURS = ["mtn_cg", "airtel_cg"];

const BASE_URL = process.env.GENIUSPAY_BASE_URL || "https://api.geniuspay.cg";

/** La passerelle est-elle configuree ? (affiche dans la supervision) */
function estConfiguree() {
  return !!(process.env.GENIUSPAY_API_KEY && process.env.GENIUSPAY_MERCHANT_ID);
}

/** Client HTTP preconfigure. */
function client() {
  const apiKey = process.env.GENIUSPAY_API_KEY;

  if (!apiKey) {
    throw AppError.internal("GENIUSPAY_API_KEY non configuree sur le serveur");
  }

  return axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
    headers: {
      // AJUSTER : certaines passerelles utilisent "X-API-Key" plutot que Bearer
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Normalise un numero congolais au format international sans le "+".
 * Ex. "06 123 45 67" → "242061234567"
 */
function normalizePhone(numero) {
  let n = String(numero).replace(/[\s+().-]/g, "");
  if (n.startsWith("00")) n = n.slice(2);

  // Numero local (06X, 05X, 04X) → prefixe de l'indicatif Congo
  if (n.length === 9 && ["06", "05", "04"].includes(n.slice(0, 2))) {
    n = `242${n}`;
  }

  if (!/^242\d{9}$/.test(n)) {
    throw AppError.badRequest(
      "Numero Congo invalide (format attendu : 242 06 XXX XX XX)"
    );
  }

  return n;
}

/** Initie une demande de paiement. */
async function requestToPay({
  phoneNumber, amount, callbackInfo, description, firstName, lastName, operateur,
}) {
  const montant = Math.round(Number(amount));

  if (!Number.isFinite(montant) || montant < 100) {
    throw AppError.badRequest("Le montant minimum accepte est de 100");
  }

  const merchantId = process.env.GENIUSPAY_MERCHANT_ID;
  if (!merchantId) {
    throw AppError.internal("GENIUSPAY_MERCHANT_ID non configure");
  }

  // AJUSTER : noms de champs exacts selon la documentation Genius Pay
  const payload = {
    merchant_id: merchantId,
    phone: normalizePhone(phoneNumber),
    amount: montant,
    currency: process.env.DEFAULT_CURRENCY || "XAF",
    operator: operateur || "mtn_cg",
    // Notre reference interne, renvoyee telle quelle dans le callback
    external_reference: String(callbackInfo),
    description: (description || "Abonnement Stockline")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .slice(0, 60),
    callback_url: process.env.GENIUSPAY_CALLBACK_URL,
    ...(firstName ? { first_name: firstName } : {}),
    ...(lastName ? { last_name: lastName } : {}),
  };

  try {
    // AJUSTER : chemin exact de l'endpoint
    const { data } = await client().post("/v1/payments/collect", payload);

    // On ne journalise jamais le numero complet du payeur
    console.log(
      `Paiement Genius Pay initie — ref ${data?.reference || data?.id} — ${montant} XAF`.cyan
    );

    return {
      reference: data?.reference || data?.transaction_id || data?.id,
      status: normaliserStatut(data?.status),
      raw: data,
    };
  } catch (e) {
    const detail = e.response?.data;
    console.error(
      `Echec Genius Pay [${e.response?.status}] : ${JSON.stringify(detail)}`.red
    );

    throw new AppError(
      detail?.message || "Le service de paiement mobile est momentanement indisponible",
      502, "PAYMENT_GATEWAY_ERROR"
    );
  }
}

/** Verifie le statut d'une transaction (sondage de secours). */
async function getPaymentStatus(reference) {
  if (!reference) throw AppError.badRequest("Reference de transaction requise");

  try {
    // AJUSTER : chemin exact
    const { data } = await client().get(`/v1/payments/${reference}`);
    return { status: normaliserStatut(data?.status), raw: data };
  } catch (e) {
    console.error(
      `Echec verification Genius Pay ${reference} : ${e.message}`.red
    );
    throw new AppError(
      "Impossible de verifier le statut du paiement",
      502, "PAYMENT_GATEWAY_ERROR"
    );
  }
}

/**
 * Valide une notification entrante.
 *
 * DEUX NIVEAUX DE VERIFICATION :
 *   1. si une signature HMAC est fournie, on la controle
 *   2. dans TOUS les cas, on re-interroge l'API pour confirmer le statut reel
 *
 * Le niveau 2 est le plus important : meme sans signature, un faux callback
 * ne peut pas faire croire a un paiement reussi.
 */
async function verifyCallback(body, headers = {}) {
  const reference =
    body?.reference || body?.transaction_id || body?.id;

  if (!reference) {
    throw AppError.badRequest("Callback invalide : reference manquante");
  }

  // ── Niveau 1 : verification de signature, si configuree ─────────────
  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET;
  const signatureRecue = headers["x-geniuspay-signature"] || headers["x-signature"];

  if (secret && signatureRecue) {
    const signatureAttendue = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(body))
      .digest("hex");

    // Comparaison a temps constant : evite les attaques par mesure de temps
    const valide =
      signatureRecue.length === signatureAttendue.length &&
      crypto.timingSafeEqual(
        Buffer.from(signatureRecue),
        Buffer.from(signatureAttendue)
      );

    if (!valide) {
      console.warn(`Signature de callback Genius Pay invalide (${reference})`.red);
      throw AppError.unauthorized("Signature de callback invalide");
    }
  }

  // ── Niveau 2 : re-verification aupres de l'API (TOUJOURS) ───────────
  const { status, raw } = await getPaymentStatus(reference);

  return {
    reference,
    status,
    callbackInfo: body?.external_reference || raw?.external_reference,
    montant: raw?.amount,
    raw,
  };
}

/** Traduit le statut de la passerelle vers notre vocabulaire interne. */
function normaliserStatut(statut) {
  const s = String(statut || "").toUpperCase();

  if (["SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID"].includes(s)) {
    return PAYMENT_STATUS.SUCCESS;
  }
  if (["FAILED", "CANCELLED", "REJECTED", "EXPIRED"].includes(s)) {
    return PAYMENT_STATUS.FAILED;
  }
  return PAYMENT_STATUS.PENDING;
}

module.exports = {
  NOM, OPERATEURS, estConfiguree,
  requestToPay, getPaymentStatus, verifyCallback, normalizePhone,
};
