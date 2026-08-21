/**
 * Controleurs complementaires du module Produits.
 *
 * Regroupes ici car ce sont des actions courtes et connexes. Les actions
 * principales (create, list, update, delete) restent dans leurs propres
 * fichiers, conformement au patron du projet.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { tenantScope, tenantPayload } = require("../../../../../core/tenant-guard");

const ProductModel = require("../model/product.model");
const CategoryModel = require("../../category/model/category.model");
const StockMovementModel = require("../../stock/model/stock-movement.model");
const ShopModel = require("../../../../platform/features/shop/model/shop.model");
const stockService = require("../../stock/model/stock.service");

/** GET /products/:id — Fiche produit avec ses 20 derniers mouvements. */
const getOne = asyncHandler(async (req, res) => {
  const produit = await ProductModel.findOne(
    tenantScope(req, { _id: req.validated.params.id })
  ).lean({ virtuals: true });

  if (!produit) throw AppError.notFound("Produit introuvable");

  const mouvements = await StockMovementModel.find(
    tenantScope(req, { produitId: produit._id })
  )
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return success(res, { ...produit, derniersMouvements: mouvements });
});

/**
 * GET /products/barcode/:code — Recherche par code-barres (scan en caisse).
 *
 * Doit repondre en quelques millisecondes : le caissier scanne, le produit
 * doit apparaitre dans le panier immediatement. L'index composite
 * { shopId, codeBarre } est indispensable ici.
 */
const findByBarcode = asyncHandler(async (req, res) => {
  const produit = await ProductModel.findOne(
    tenantScope(req, { codeBarre: req.params.code, actif: true })
  ).lean({ virtuals: true });

  if (!produit) {
    throw AppError.notFound("Aucun produit ne correspond a ce code-barres");
  }

  return success(res, produit);
});

/**
 * POST /products/import — Import en masse depuis Excel/CSV.
 *
 * Le frontend envoie le tableau deja parse. Chaque ligne est traitee
 * INDEPENDAMMENT : une ligne fautive n'annule pas les autres. Le rapport
 * detaille precisement ce qui a ete cree, ignore ou rejete.
 */
const importBulk = asyncHandler(async (req, res) => {
  const { produits } = req.validated.body;

  // ── Verification du quota AVANT de commencer ────────────────────────
  const boutique = await ShopModel.findById(req.user.shopId)
    .populate("planId", "nom quotas")
    .lean();

  const quota = boutique?.planId?.quotas?.produits;
  const nombreActuel = await ProductModel.countDocuments(
    tenantScope(req, { actif: true })
  );

  if (quota && quota !== -1 && nombreActuel + produits.length > quota) {
    throw new AppError(
      `Import impossible : votre plan est limite a ${quota} produits ` +
      `(${nombreActuel} deja enregistres, ${produits.length} a importer).`,
      403, "QUOTA_EXCEEDED"
    );
  }

  const rapport = { crees: 0, ignores: [], erreurs: [] };

  for (const [index, ligne] of produits.entries()) {
    try {
      // Doublon de reference : on ignore sans faire echouer l'import
      if (ligne.sku) {
        const existe = await ProductModel.findOne(
          tenantScope(req, { sku: ligne.sku })
        ).lean();

        if (existe) {
          rapport.ignores.push({
            ligne: index + 1,
            nom: ligne.nom,
            raison: "Reference deja existante",
          });
          continue;
        }
      }

      // Categorie creee a la volee si elle n'existe pas
      let categorieId;
      if (ligne.categorieNom) {
        const categorie = await CategoryModel.findOneAndUpdate(
          tenantScope(req, { nom: ligne.categorieNom }),
          { $setOnInsert: tenantPayload(req, { nom: ligne.categorieNom }) },
          { upsert: true, new: true }
        );
        categorieId = categorie._id;
      }

      const produit = await ProductModel.create(
        tenantPayload(req, {
          nom: ligne.nom,
          sku: ligne.sku,
          categorieId,
          categorieNom: ligne.categorieNom,
          unite: ligne.unite || "piece",
          prixAchat: ligne.prixAchat,
          prixVente: ligne.prixVente,
          seuilAlerte: ligne.seuilAlerte || 0,
          stockActuel: 0,
        })
      );

      if (ligne.stockInitial > 0) {
        await stockService.enregistrerMouvement(req, {
          produitId: produit._id,
          type: "entree",
          quantite: ligne.stockInitial,
          raison: "Import initial du catalogue",
          referenceType: "manuel",
        });
      }

      rapport.crees += 1;
    } catch (e) {
      rapport.erreurs.push({
        ligne: index + 1,
        nom: ligne.nom,
        raison: e.message,
      });
    }
  }

  await ShopModel.updateOne(
    { _id: req.user.shopId },
    {
      $inc: { "compteurs.produits": rapport.crees },
      $set: { "etapesOnboarding.premierProduit": rapport.crees > 0 },
    }
  );

  return success(res, rapport, 201);
});

/** GET /products/export — Export complet (le CSV est genere cote client). */
const exportAll = asyncHandler(async (req, res) => {
  const produits = await ProductModel.find(tenantScope(req, { actif: true }))
    .sort("nom")
    .select(
      "nom sku codeBarre categorieNom unite prixAchat prixVente stockActuel seuilAlerte"
    )
    .lean({ virtuals: true });

  return success(res, produits);
});

/** GET /categories — Categories avec le nombre de produits de chacune. */
const listCategories = asyncHandler(async (req, res) => {
  const categories = await CategoryModel.find(tenantScope(req, { actif: true }))
    .sort({ ordre: 1, nom: 1 })
    .lean();

  /**
   * Comptage groupe en UNE seule requete d'agregation, plutot qu'un
   * countDocuments par categorie. Avec 20 categories, on economise
   * 19 aller-retours vers la base.
   */
  const comptages = await ProductModel.aggregate([
    { $match: tenantScope(req, { actif: true }) },
    { $group: { _id: "$categorieId", total: { $sum: 1 } } },
  ]);

  const parId = new Map(comptages.map((c) => [String(c._id), c.total]));

  return success(
    res,
    categories.map((c) => ({
      ...c,
      nombreProduits: parId.get(String(c._id)) || 0,
    }))
  );
});

/** POST /categories — Creation d'une categorie. */
const createCategory = asyncHandler(async (req, res) => {
  const existe = await CategoryModel.findOne(
    tenantScope(req, { nom: req.validated.body.nom })
  ).lean();

  if (existe) throw AppError.conflict("Cette categorie existe deja");

  const categorie = await CategoryModel.create(
    tenantPayload(req, req.validated.body)
  );

  return success(res, categorie, 201);
});

module.exports = {
  getOne, findByBarcode, importBulk, exportAll, listCategories, createCategory,
};
