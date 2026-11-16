/**
 * GET /products — Catalogue pagine.
 *
 * Ce controleur alimente DEUX ecrans : la liste "Produits & Catalogue" et la
 * grille de la caisse (avec ses filtres par categorie).
 *
 * ══ SUBTILITE DU FILTRE statutStock ══
 * Comparer `stockActuel` a `seuilAlerte` demande une expression `$expr` : ce
 * sont DEUX CHAMPS DU MEME DOCUMENT, et un filtre classique ne sait comparer
 * qu'un champ a une valeur fixe.
 */
const asyncHandler = require("../../../../../core/async-handler");
const { success, paginationMeta } = require("../../../../../core/response");
const { tenantScope } = require("../../../../../core/tenant-guard");
const ProductModel = require("../model/product.model");
const mongoose = require("mongoose");

module.exports = asyncHandler(async (req, res) => {
  const { page, limit, q, categorieId, statutStock, actif, sort } =
    req.validated.query;

  const criteres = {};

  if (categorieId) criteres.categorieId = categorieId;

  // Par defaut, on masque les produits desactives
  if (actif !== undefined) criteres.actif = actif === "true";
  else criteres.actif = true;

  // ── Recherche instantanee : nom, reference ou code-barres ───────────
  if (q) {
    const escaped = q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    criteres.$or = [
      { nom: regex },
      { sku: regex },
      { codeBarre: q },   // egalite stricte : un code-barres est exact
    ];
  }

  // ── Filtre par statut de stock ──────────────────────────────────────
  if (statutStock === "rupture") {
    criteres.stockActuel = { $lte: 0 };
  } else if (statutStock === "stock_bas") {
    // $expr avec refs de champs : on utilise aggregate() pour eviter le
    // CastError Mongoose qui essaie de caster "$seuilAlerte" en Number.
    // On stocke l'info dans criteres pour basculer vers aggregate() ci-dessous.
    criteres._useAggregateStockBas = true;
  } else if (statutStock === "en_stock") {
    criteres._useAggregateEnStock = true;
  }

  // Extraire les flags d'aggregation avant de construire le filtre Mongoose
  const useAggregateStockBas = criteres._useAggregateStockBas;
  const useAggregateEnStock = criteres._useAggregateEnStock;
  delete criteres._useAggregateStockBas;
  delete criteres._useAggregateEnStock;

  const filtreBase = tenantScope(req, criteres);

  let produits, total;

  if (useAggregateStockBas || useAggregateEnStock) {
    // $expr avec refs de deux champs du meme document : aggregation obligatoire
    // pour eviter le CastError Mongoose (impossible de caster "$seuilAlerte" en Number).
    const exprCond = useAggregateStockBas
      ? { $and: [{ $gt: ["$stockActuel", 0] }, { $lte: ["$stockActuel", "$seuilAlerte"] }, { $gt: ["$seuilAlerte", 0] }] }
      : { $gt: ["$stockActuel", "$seuilAlerte"] };

    const sortField = sort ? sort.startsWith("-") ? sort.slice(1) : sort : "nom";
    const sortDir = sort && sort.startsWith("-") ? -1 : 1;

    const pipeline = [
      { $match: { ...filtreBase, $expr: exprCond } },
      { $sort: { [sortField]: sortDir } },
    ];

    const [resultat, countResultat] = await Promise.all([
      ProductModel.aggregate([
        ...pipeline,
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]),
      ProductModel.aggregate([...pipeline, { $count: "total" }]),
    ]);

    produits = resultat;
    total = countResultat[0]?.total || 0;
  } else {
    [produits, total] = await Promise.all([
      ProductModel.find(filtreBase)
        .sort(sort || "nom")
        .skip((page - 1) * limit)
        .limit(limit)
        .lean({ virtuals: true }),
      ProductModel.countDocuments(filtreBase),
    ]);
  }

  return success(res, produits, 200, paginationMeta(page, limit, total));
});
