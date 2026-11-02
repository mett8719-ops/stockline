/**
 * ══════════════════════════════════════════════════════════════════════════
 *  SERVICE STOCK — POINT DE PASSAGE UNIQUE DE TOUTE VARIATION DE STOCK
 * ══════════════════════════════════════════════════════════════════════════
 *
 * REGLE ABSOLUE : aucun controleur ne modifie jamais `produit.stockActuel`
 * directement. Toute variation passe par ce service, qui garantit dans une
 * seule operation :
 *   1. la mise a jour du compteur sur le produit,
 *   2. l'ecriture du mouvement dans le journal,
 *   3. le declenchement de l'alerte si le seuil est franchi.
 *
 * Sans cette discipline, le stock affiche en caisse et l'historique des
 * mouvements divergeraient — et l'inventaire deviendrait ininterpretable.
 */
const AppError = require("../../../../../core/app-error");
const { STOCK_MOVEMENT_TYPES, NOTIFICATION_CATEGORIES } = require("../../../../../core/constants");
const { notifyShop } = require("../../../../../core/services/notification.service");
const ProductModel = require("../../product/model/product.model");
const StockMovementModel = require("./stock-movement.model");
const colors = require("colors");

/**
 * Enregistre un mouvement de stock et met a jour le produit.
 *
 * @param {object} req  - requete Express (fournit shopId et auteur)
 * @param {object} p
 * @param {string} p.produitId
 * @param {'entree'|'sortie'|'ajustement'} p.type
 * @param {number} p.quantite            - toujours positive
 * @param {string} p.raison
 * @param {string} [p.referenceType]
 * @param {string} [p.referenceId]
 * @param {string} [p.referenceLibelle]
 * @param {number} [p.quantiteCible]     - ajustement : stock final voulu
 * @param {boolean} [p.autoriserNegatif] - rare (cloture d'inventaire)
 * @param {object} [p.session]           - session MongoDB si transaction en cours
 * @returns {Promise<{mouvement, produit, alerteStock}>}
 */
async function enregistrerMouvement(req, {
  produitId, type, quantite, raison,
  referenceType = "manuel", referenceId, referenceLibelle,
  quantiteCible, autoriserNegatif = false, session, clientOperationId,
}) {
  const shopId = req.user.shopId;

  const produit = await ProductModel
    .findOne({ _id: produitId, shopId })
    .session(session || null);

  if (!produit) throw AppError.notFound("Produit introuvable");

  const stockAvant = produit.stockActuel || 0;
  let variation;

  switch (type) {
    case STOCK_MOVEMENT_TYPES.IN:
      if (quantite <= 0) throw AppError.badRequest("La quantite d'entree doit etre positive");
      variation = quantite;
      break;

    case STOCK_MOVEMENT_TYPES.OUT:
      if (quantite <= 0) throw AppError.badRequest("La quantite de sortie doit etre positive");
      // Protection metier : on refuse de vendre un stock qu'on n'a pas
      if (!autoriserNegatif && quantite > stockAvant) {
        throw new AppError(
          `Stock insuffisant pour ${produit.nom} : ${stockAvant} ${produit.unite} ` +
          `disponible(s), ${quantite} demande(s).`,
          400, "INSUFFICIENT_STOCK"
        );
      }
      variation = -quantite;
      break;

    case STOCK_MOVEMENT_TYPES.ADJUST:
      // Ajustement d'inventaire : on vise un stock FINAL, pas une variation
      if (quantiteCible === undefined) {
        throw AppError.badRequest("Un ajustement necessite la quantite cible");
      }
      variation = quantiteCible - stockAvant;
      break;

    default:
      throw AppError.badRequest(`Type de mouvement inconnu : ${type}`);
  }

  const stockApres = stockAvant + variation;

  // Mise a jour du compteur materialise
  produit.stockActuel = stockApres;
  await produit.save({ session });

  const [mouvement] = await StockMovementModel.create(
    [{
      shopId,
      produitId: produit._id,
      produitNom: produit.nom,
      type,
      quantite: Math.abs(variation),
      stockAvant,
      stockApres,
      raison,
      referenceType, referenceId, referenceLibelle,
      auteurId: req.user.id,
      auteurNom: req.user.nom || "Systeme",
      clientOperationId,
    }],
    { session }
  );

  /**
   * ALERTE DE SEUIL — uniquement au FRANCHISSEMENT.
   * On ne renotifie pas a chaque vente d'un produit deja sous le seuil :
   * sinon un produit en rupture genererait une notification par vente et
   * noierait le centre de notifications du gerant.
   */
  let alerteStock = null;
  const seuil = produit.seuilAlerte || 0;

  if (seuil > 0 && stockApres <= seuil && stockAvant > seuil) {
    alerteStock = {
      produit: produit.nom,
      stockActuel: stockApres,
      seuil,
      unite: produit.unite,
    };

    notifyShop({
      shopId,
      roles: ["admin", "magasinier"],
      titre: stockApres <= 0 ? "Rupture de stock" : "Stock bas",
      message: `${produit.nom} : ${stockApres} ${produit.unite} restant(s) (seuil : ${seuil}).`,
      categorie: NOTIFICATION_CATEGORIES.BUSINESS,
      lien: "/stock",
    }).catch((e) => console.error(`Echec notification stock bas : ${e.message}`.red));
  }

  return { mouvement, produit, alerteStock };
}

/**
 * Applique plusieurs sorties de stock en une fois (validation d'une vente).
 *
 * DEUX PHASES : on verifie D'ABORD la disponibilite de toutes les lignes,
 * puis on applique. On evite ainsi une vente partiellement decrementee si la
 * derniere ligne echoue.
 */
async function appliquerSortiesVente(req, lignes, { referenceId, referenceLibelle, session }) {
  const shopId = req.user.shopId;

  // ── Phase 1 : verification globale ────────────────────────────────
  const produits = await ProductModel
    .find({ _id: { $in: lignes.map((l) => l.produitId) }, shopId })
    .session(session || null);

  const parId = new Map(produits.map((p) => [p._id.toString(), p]));
  const insuffisants = [];

  for (const ligne of lignes) {
    const produit = parId.get(String(ligne.produitId));
    if (!produit) throw AppError.badRequest(`Produit ${ligne.produitId} introuvable`);
    if (!produit.actif) throw AppError.badRequest(`Le produit ${produit.nom} n'est plus actif`);

    if (produit.stockActuel < ligne.quantite) {
      insuffisants.push({
        produit: produit.nom,
        disponible: produit.stockActuel,
        demande: ligne.quantite,
        unite: produit.unite,
      });
    }
  }

  if (insuffisants.length) {
    // Le detail permet au frontend de surligner les lignes fautives du panier
    throw new AppError(
      `Stock insuffisant pour ${insuffisants.length} produit(s)`,
      400, "INSUFFICIENT_STOCK", insuffisants
    );
  }

  // ── Phase 2 : application ─────────────────────────────────────────
  const alertes = [];
  for (const ligne of lignes) {
    const { alerteStock } = await enregistrerMouvement(req, {
      produitId: ligne.produitId,
      type: STOCK_MOVEMENT_TYPES.OUT,
      quantite: ligne.quantite,
      raison: referenceLibelle || "Vente en caisse",
      referenceType: "vente",
      referenceId,
      referenceLibelle,
      session,
    });
    if (alerteStock) alertes.push(alerteStock);
  }

  return alertes;
}

/** Rend le stock a la suite d'une annulation de vente. */
async function annulerSortiesVente(req, lignes, { referenceId, referenceLibelle, session }) {
  for (const ligne of lignes) {
    await enregistrerMouvement(req, {
      produitId: ligne.produitId,
      type: STOCK_MOVEMENT_TYPES.IN,
      quantite: ligne.quantite,
      raison: `Annulation ${referenceLibelle}`,
      referenceType: "vente",
      referenceId,
      referenceLibelle,
      session,
    });
  }
}

/** Produits sous leur seuil d'alerte (bandeau du module Stock). */
async function produitsEnAlerte(shopId, limite = 20) {
  return ProductModel.find({
    shopId,
    actif: true,
    seuilAlerte: { $gt: 0 },
    $expr: { $lte: ["$stockActuel", "$seuilAlerte"] },
  })
    .sort({ stockActuel: 1 })
    .limit(limite)
    .select("nom stockActuel seuilAlerte unite categorieNom")
    .lean();
}

/** Produits proches de la peremption (alimentaire, pharmacie). */
async function produitsProchePeremption(shopId, joursAvant = 30) {
  const limite = new Date();
  limite.setDate(limite.getDate() + joursAvant);

  return ProductModel.find({
    shopId,
    actif: true,
    datePeremption: { $ne: null, $lte: limite },
    stockActuel: { $gt: 0 },
  })
    .sort({ datePeremption: 1 })
    .select("nom datePeremption stockActuel unite")
    .lean();
}

module.exports = {
  enregistrerMouvement,
  appliquerSortiesVente,
  annulerSortiesVente,
  produitsEnAlerte,
  produitsProchePeremption,
};
