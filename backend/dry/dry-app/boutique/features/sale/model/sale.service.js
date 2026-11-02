/**
 * Service de calcul d'une vente.
 *
 * ══ REGLE DE SECURITE FONDAMENTALE ══
 * TOUS les montants sont recalcules COTE SERVEUR a partir du catalogue. Le
 * frontend envoie les quantites et les modes de paiement ; il n'impose JAMAIS
 * un total.
 *
 * Sans cette regle, un client malveillant pourrait forger une requete
 * "montantTotal: 0" et vider le stock gratuitement.
 */
const AppError = require("../../../../../core/app-error");
const ProductModel = require("../../product/model/product.model");

/**
 * Arrondi monetaire a 2 decimales.
 * `Number.EPSILON` corrige les erreurs de virgule flottante : sans lui,
 * Math.round(1.005 * 100) / 100 donne 1 au lieu de 1.01.
 */
const arrondir = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Construit les lignes de vente valorisees a partir du panier envoye.
 * @returns {Promise<{lignes, sousTotal, montantTva, beneficeTotal}>}
 */
async function calculerLignes(req, lignesPanier, session) {
  const shopId = req.user.shopId;

  // Un seul appel base pour tous les produits du panier
  const produits = await ProductModel.find({
    _id: { $in: lignesPanier.map((l) => l.produitId) },
    shopId,
  })
    .session(session || null)
    .lean();

  const parId = new Map(produits.map((p) => [p._id.toString(), p]));

  let sousTotal = 0;
  let montantTva = 0;
  let beneficeTotal = 0;

  const lignes = lignesPanier.map((ligne) => {
    const produit = parId.get(String(ligne.produitId));

    if (!produit) {
      throw AppError.badRequest(
        `Produit ${ligne.produitId} introuvable dans le catalogue`
      );
    }
    if (!produit.actif) {
      throw AppError.badRequest(
        `Le produit ${produit.nom} n'est plus disponible a la vente`
      );
    }

    /**
     * Le prix par defaut est celui du CATALOGUE. Un prix personnalise est
     * accepte (negociation avec un revendeur) mais jamais en dessous du prix
     * d'achat : cela signalerait une erreur de saisie ou une fraude.
     */
    const prixUnitaire = ligne.prixUnitaire ?? produit.prixVente;

    if (prixUnitaire < produit.prixAchat) {
      throw AppError.badRequest(
        `Le prix applique a ${produit.nom} est inferieur a son prix d'achat`
      );
    }

    const remise = ligne.remise || 0;
    const totalLigne = arrondir(prixUnitaire * ligne.quantite - remise);

    if (totalLigne < 0) {
      throw AppError.badRequest(
        `Remise superieure au montant de la ligne ${produit.nom}`
      );
    }

    // Benefice FIGE au moment de la vente
    const beneficeLigne = arrondir(
      (prixUnitaire - produit.prixAchat) * ligne.quantite - remise
    );

    /**
     * TVA calculee en "dedans" : le prix affiche est TTC, on extrait la part
     * de taxe. C'est l'usage courant dans le commerce de detail.
     */
    const tvaLigne = produit.tauxTva
      ? arrondir(totalLigne * (produit.tauxTva / (100 + produit.tauxTva)))
      : 0;

    sousTotal = arrondir(sousTotal + totalLigne);
    montantTva = arrondir(montantTva + tvaLigne);
    beneficeTotal = arrondir(beneficeTotal + beneficeLigne);

    return {
      produitId: produit._id,
      produitNom: produit.nom,        // fige
      unite: produit.unite,
      quantite: ligne.quantite,
      prixUnitaire,
      prixAchatUnitaire: produit.prixAchat,   // fige — essentiel pour les rapports
      remise,
      totalLigne,
      beneficeLigne,
    };
  });

  return { lignes, sousTotal, montantTva, beneficeTotal };
}

/**
 * Verifie la coherence des paiements et calcule la monnaie a rendre.
 * @returns {{montantPaye, montantCredit, monnaieRendue, statut}}
 */
function calculerPaiements({ paiements, montantTotal, montantRemis, clientId }) {
  const total = arrondir(montantTotal);

  // Part laissee a credit (le client paiera plus tard)
  const montantCredit = arrondir(
    paiements.filter((p) => p.mode === "credit").reduce((s, p) => s + p.montant, 0)
  );

  // Part reglee immediatement, tous modes confondus
  const montantPaye = arrondir(
    paiements.filter((p) => p.mode !== "credit").reduce((s, p) => s + p.montant, 0)
  );

  const totalAnnonce = arrondir(montantPaye + montantCredit);

  /**
   * Tolerance d'un centime : absorbe les arrondis d'affichage cote frontend
   * sans laisser passer un ecart reel.
   */
  if (Math.abs(totalAnnonce - total) > 0.01) {
    throw AppError.badRequest(
      `La somme des paiements (${totalAnnonce}) ne correspond pas au total ` +
      `de la vente (${total})`
    );
  }

  // Une creance doit etre rattachee a quelqu'un
  if (montantCredit > 0 && !clientId) {
    throw AppError.badRequest(
      "Une vente a credit doit etre rattachee a un client identifie"
    );
  }

  /**
   * La monnaie ne se rend que sur la part en ESPECES. Si le client paie
   * 10 000 en mobile money, il n'y a pas de monnaie a rendre meme s'il a
   * "remis" plus que le total.
   */
  const especes = arrondir(
    paiements.filter((p) => p.mode === "especes").reduce((s, p) => s + p.montant, 0)
  );
  const remis = arrondir(montantRemis || 0);
  const monnaieRendue = remis > especes ? arrondir(remis - especes) : 0;

  let statut = "payee";
  if (montantCredit > 0) statut = montantPaye > 0 ? "partielle" : "credit";

  return { montantPaye, montantCredit, monnaieRendue, statut };
}

module.exports = { calculerLignes, calculerPaiements, arrondir };
