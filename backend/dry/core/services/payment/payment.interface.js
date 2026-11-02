/**
 * ══════════════════════════════════════════════════════════════════════════
 *  ABSTRACTION DE LA PASSERELLE DE PAIEMENT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * POURQUOI CETTE COUCHE :
 * Le code metier (facturation, abonnements) ne doit JAMAIS dependre d'un
 * agregateur precis. Changer de prestataire — ou en utiliser plusieurs selon
 * l'operateur — doit se limiter a une variable d'environnement.
 *
 * CONTRAT que toute passerelle doit respecter :
 *   requestToPay(params)      → initie un encaissement
 *   getPaymentStatus(ref)     → verifie le statut d'une transaction
 *   verifyCallback(body)      → valide une notification entrante
 *   normalizePhone(numero)    → met le numero au format attendu
 *
 * Ajouter une passerelle = creer un fichier dans providers/ qui exporte ces
 * quatre fonctions, puis l'enregistrer dans `PASSERELLES` ci-dessous.
 */
const AppError = require("../../app-error");
const colors = require("colors");

/** Registre des passerelles disponibles. */
const PASSERELLES = {
  feexpay: () => require("./providers/feexpay.provider"),
  geniuspay: () => require("./providers/geniuspay.provider"),
};

/**
 * Renvoie la passerelle active, definie par PAYMENT_PROVIDER.
 * Par defaut : geniuspay.
 */
function getProvider(nom = null) {
  const cle = (nom || process.env.PAYMENT_PROVIDER || "geniuspay").toLowerCase();
  const charger = PASSERELLES[cle];

  if (!charger) {
    throw AppError.internal(
      `Passerelle de paiement inconnue : "${cle}". ` +
      `Valeurs acceptees : ${Object.keys(PASSERELLES).join(", ")}`
    );
  }

  return charger();
}

/**
 * Initie une demande de paiement.
 *
 * @param {object} p
 * @param {string} p.phoneNumber   - numero du payeur
 * @param {number} p.amount        - montant
 * @param {string} p.callbackInfo  - NOTRE reference interne (id du paiement)
 * @param {string} [p.description]
 * @param {string} [p.firstName]
 * @param {string} [p.lastName]
 * @param {string} [p.provider]    - force une passerelle precise
 * @returns {Promise<{reference, status, provider, raw}>}
 */
async function requestToPay(p) {
  const passerelle = getProvider(p.provider);
  const resultat = await passerelle.requestToPay(p);

  return { ...resultat, provider: passerelle.NOM };
}

/** Verifie le statut d'une transaction. */
async function getPaymentStatus(reference, provider = null) {
  const passerelle = getProvider(provider);
  return passerelle.getPaymentStatus(reference);
}

/**
 * Valide une notification entrante.
 *
 * REGLE COMMUNE A TOUTES LES PASSERELLES : on ne fait jamais confiance au
 * corps de la requete. Chaque implementation doit re-interroger son API pour
 * confirmer le statut reel avant de renvoyer un resultat.
 */
async function verifyCallback(body, provider = null) {
  const passerelle = getProvider(provider);
  return passerelle.verifyCallback(body);
}

/** Normalise un numero au format attendu par la passerelle. */
function normalizePhone(numero, provider = null) {
  return getProvider(provider).normalizePhone(numero);
}

/** Liste des passerelles configurees, pour l'ecran de supervision. */
function listerPasserelles() {
  return Object.keys(PASSERELLES).map((cle) => {
    const p = PASSERELLES[cle]();
    return {
      cle,
      nom: p.NOM,
      operateurs: p.OPERATEURS,
      configuree: p.estConfiguree(),
      active: cle === (process.env.PAYMENT_PROVIDER || "geniuspay").toLowerCase(),
    };
  });
}

module.exports = {
  requestToPay, getPaymentStatus, verifyCallback,
  normalizePhone, listerPasserelles, getProvider,
};
