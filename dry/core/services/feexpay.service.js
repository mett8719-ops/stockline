/**
 * ══════════════════════════════════════════════════════════════════════════
 *  INTEGRATION FEEXPAY — Mobile Money (MTN Congo)
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Sert a encaisser les ABONNEMENTS des boutiques clientes.
 *
 * ══ REGLE DE SECURITE N°1 ══
 * La cle API FeexPay ne quitte JAMAIS le serveur. Le frontend n'appelle que
 * notre propre API ; c'est ce service qui dialogue avec FeexPay. Exposer la cle
 * cote client permettrait a n'importe qui d'initier des transactions sur notre
 * compte marchand.
 *
 * ══ REGLE DE SECURITE N°2 ══
 * Le callback FeexPay est une requete PUBLIQUE et NON AUTHENTIFIEE. On ne fait
 * jamais confiance a son contenu : `verifyCallback` re-interroge l'API FeexPay
 * pour confirmer le statut reel. Sans cela, un attaquant enverrait un faux
 * callback "SUCCESS" et obtiendrait un abonnement gratuit.
 *
 * FLUX COMPLET :
 *   1. Le client saisit son numero MTN dans notre interface
 *   2. Notre backend appelle POST /requesttopay/mtn_cg (ce service)
 *   3. Le client recoit un prompt USSD et saisit son code PIN
 *   4. FeexPay notifie notre callback (ou on sonde le statut en secours)
 *   5. Statut SUCCESS → abonnement prolonge, facture marquee payee
 */
const axios = require("axios");
const AppError = require("../app-error");
const colors = require("colors");
const { PAYMENT_STATUS } = require("../constants");

const BASE_URL = process.env.FEEXPAY_BASE_URL || "https://api-v2.feexpay.me";

/** Client HTTP preconfigure. Timeout court : un paiement ne doit pas bloquer. */
function client() {
  const apiKey = process.env.FEEXPAY_API_KEY;
  if (!apiKey) throw AppError.internal("FEEXPAY_API_KEY non configuree sur le serveur");

  return axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Normalise un numero MTN Congo au format attendu par FeexPay :
 * international SANS le signe "+" — ex. 242061234567
 */
function normalizePhone(numero) {
  let n = String(numero).replace(/[\s+().-]/g, "");
  if (n.startsWith("00")) n = n.slice(2);

  // Numero local congolais (06X, 05X, 04X) → on prefixe l'indicatif 242
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

/**
 * Initie une demande de paiement (payin) MTN Congo.
 *
 * @param {object} p
 * @param {string} p.phoneNumber  - numero du payeur
 * @param {number} p.amount       - montant (minimum 100 impose par FeexPay)
 * @param {string} p.callbackInfo - NOTRE reference interne (id du paiement en base)
 * @param {string} [p.description]
 * @param {string} [p.firstName]
 * @param {string} [p.lastName]
 */
async function requestToPay({
  phoneNumber, amount, callbackInfo, description, firstName, lastName,
}) {
  const montant = Math.round(Number(amount));
  if (!Number.isFinite(montant) || montant < 100) {
    throw AppError.badRequest("Le montant minimum accepte est de 100");
  }

  const shop = process.env.FEEXPAY_SHOP_ID;
  if (!shop) throw AppError.internal("FEEXPAY_SHOP_ID non configure sur le serveur");

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

    // On ne journalise JAMAIS le numero complet du payeur (donnee personnelle)
    console.log(
      `Paiement FeexPay initie — ref ${data?.reference} — ${montant} XAF`.cyan
    );

    return {
      reference: data?.reference || data?.transaction_id || data?.id,
      status: (data?.status || PAYMENT_STATUS.PENDING).toUpperCase(),
      raw: data,
    };
  } catch (e) {
    const detail = e.response?.data;
    console.error(`Echec FeexPay [${e.response?.status}] : ${JSON.stringify(detail)}`.red);
    throw new AppError(
      detail?.message || "Le service de paiement mobile est momentanement indisponible",
      502,
      "PAYMENT_GATEWAY_ERROR"
    );
  }
}

/**
 * Verifie le statut d'une transaction.
 * Sert de sondage de secours si le callback n'arrive pas (reseau instable).
 */
async function getPaymentStatus(reference) {
  if (!reference) throw AppError.badRequest("Reference de transaction requise");

  try {
    const { data } = await client().get(
      `/api/transactions/public/single/status/${reference}`
    );
    return { status: (data?.status || PAYMENT_STATUS.PENDING).toUpperCase(), raw: data };
  } catch (e) {
    console.error(`Echec verification FeexPay ${reference} : ${e.message}`.red);
    throw new AppError(
      "Impossible de verifier le statut du paiement",
      502,
      "PAYMENT_GATEWAY_ERROR"
    );
  }
}

/**
 * Verifie l'AUTHENTICITE d'un callback FeexPay.
 *
 * Le corps de la requete n'est jamais cru sur parole : on extrait uniquement la
 * reference, puis on re-interroge FeexPay pour connaitre le vrai statut.
 */
async function verifyCallback(body) {
  const reference = body?.reference || body?.transaction_id || body?.id;
  if (!reference) throw AppError.badRequest("Callback invalide : reference manquante");

  const { status, raw } = await getPaymentStatus(reference);

  return {
    reference,
    status,
    callbackInfo: body?.callback_info || raw?.callback_info,
    montant: raw?.amount,
    raw,
  };
}

module.exports = { requestToPay, getPaymentStatus, verifyCallback, normalizePhone };
