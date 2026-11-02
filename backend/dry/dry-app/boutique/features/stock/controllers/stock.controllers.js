/**
 * Controleurs du module Stock & Mouvements.
 *
 * Ces controleurs sont volontairement COURTS : toute la logique metier est
 * dans `stock.service.js`, ce qui garantit que la caisse, les receptions
 * fournisseur et l'inventaire appliquent exactement les memes regles.
 */
const asyncHandler = require("../../../../../core/async-handler");
const { success, paginationMeta } = require("../../../../../core/response");
const { tenantScope } = require("../../../../../core/tenant-guard");
const { recordAudit } = require("../../../../../core/audit");
const { STOCK_MOVEMENT_TYPES } = require("../../../../../core/constants");

const StockMovementModel = require("../model/stock-movement.model");
const stockService = require("../model/stock.service");

/**
 * POST /stock/movements — Enregistrement d'un mouvement manuel.
 * Correspond au bouton "Nouvelle entree / sortie" de l'ecran Stock.
 */
const createMovement = asyncHandler(async (req, res) => {
  const donnees = req.validated.body;

  const { mouvement, produit, alerteStock } =
    await stockService.enregistrerMouvement(req, donnees);

  /**
   * Un AJUSTEMENT manuel est une action sensible : contrairement a une entree
   * ou une sortie qui correspondent a un fait physique, un ajustement corrige
   * le systeme sans contrepartie. Il est donc toujours audite.
   */
  if (donnees.type === STOCK_MOVEMENT_TYPES.ADJUST) {
    recordAudit(req, "stock.adjusted", {
      severite: "moyenne",
      cible: "Product",
      cibleId: produit._id,
      avant: { stock: mouvement.stockAvant },
      apres: { stock: mouvement.stockApres, raison: donnees.raison },
    });
  }

  return success(
    res,
    {
      mouvement,
      produit: {
        id: produit._id,
        nom: produit.nom,
        stockActuel: produit.stockActuel,
      },
      // Non nul si le seuil vient d'etre franchi : le frontend affiche l'alerte
      alerteStock,
    },
    201
  );
});

/** GET /stock/movements — Journal des mouvements, filtrable. */
const listMovements = asyncHandler(async (req, res) => {
  const { page, limit, produitId, type, from, to, q } = req.validated.query;

  const criteres = {};
  if (produitId) criteres.produitId = produitId;
  if (type) criteres.type = type;

  if (from || to) {
    criteres.createdAt = {};
    if (from) criteres.createdAt.$gte = from;
    if (to) criteres.createdAt.$lte = to;
  }

  // Barre "Rechercher un produit ou une raison..."
  if (q) {
    criteres.$or = [
      { produitNom: { $regex: q, $options: "i" } },
      { raison: { $regex: q, $options: "i" } },
    ];
  }

  const filtre = tenantScope(req, criteres);

  const [mouvements, total] = await Promise.all([
    StockMovementModel.find(filtre)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    StockMovementModel.countDocuments(filtre),
  ]);

  return success(res, mouvements, 200, paginationMeta(page, limit, total));
});

/**
 * GET /stock/alerts — Produits sous le seuil et proches de la peremption.
 * Alimente le bandeau d'alerte du module Stock et la carte du tableau de bord.
 */
const alerts = asyncHandler(async (req, res) => {
  const [stockBas, peremption] = await Promise.all([
    stockService.produitsEnAlerte(req.user.shopId, 50),
    stockService.produitsProchePeremption(req.user.shopId, 30),
  ]);

  return success(res, {
    stockBas,
    peremption,
    resume: {
      nombreStockBas: stockBas.length,
      nombreRuptures: stockBas.filter((p) => p.stockActuel <= 0).length,
      nombrePeremption: peremption.length,
    },
  });
});

module.exports = { createMovement, listMovements, alerts };
