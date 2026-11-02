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
    criteres.$or = [
      { nom: { $regex: q, $options: "i" } },
      { sku: { $regex: q, $options: "i" } },
      { codeBarre: q },   // egalite stricte : un code-barres est exact
    ];
  }

  // ── Filtre par statut de stock ──────────────────────────────────────
  if (statutStock === "rupture") {
    criteres.stockActuel = { $lte: 0 };
  } else if (statutStock === "stock_bas") {
    criteres.$expr = {
      $and: [
        { $gt: ["$stockActuel", 0] },              // pas en rupture
        { $lte: ["$stockActuel", "$seuilAlerte"] }, // sous le seuil
        { $gt: ["$seuilAlerte", 0] },              // seuil defini
      ],
    };
  } else if (statutStock === "en_stock") {
    criteres.$expr = { $gt: ["$stockActuel", "$seuilAlerte"] };
  }

  const filtre = tenantScope(req, criteres);

  const [produits, total] = await Promise.all([
    ProductModel.find(filtre)
      .sort(sort || "nom")
      .skip((page - 1) * limit)
      .limit(limit)
      // `virtuals: true` : inclut marge, margePourcent et statutStock
      .lean({ virtuals: true }),
    ProductModel.countDocuments(filtre),
  ]);

  return success(res, produits, 200, paginationMeta(page, limit, total));
});
