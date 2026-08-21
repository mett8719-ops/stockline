/**
 * POST /products — Creation d'un produit.
 *
 * ══ PREMIER CONTROLEUR METIER : OBSERVE LE PATRON ══
 * Aucune requete n'appelle Model.find({...}) directement. Tout passe par
 * tenantScope(req, {...}) pour la lecture et tenantPayload(req, {...}) pour
 * la creation. C'est la regle absolue du projet.
 *
 * Trois etapes :
 *   1. verification du quota du plan (limite "500 produits" du Starter)
 *   2. resolution de la categorie (par id, ou par nom avec creation)
 *   3. creation du produit, puis mouvement d'entree si stock initial fourni
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { tenantScope, tenantPayload } = require("../../../../../core/tenant-guard");
const { recordAudit } = require("../../../../../core/audit");

const ProductModel = require("../model/product.model");
const CategoryModel = require("../../category/model/category.model");
const ShopModel = require("../../../../platform/features/shop/model/shop.model");
const stockService = require("../../stock/model/stock.service");

module.exports = asyncHandler(async (req, res) => {
  const donnees = req.validated.body;

  // ══ 1. CONTROLE DU QUOTA DU PLAN ══════════════════════════════════
  const boutique = await ShopModel.findById(req.user.shopId)
    .populate("planId", "nom quotas")
    .lean();

  const quotaProduits = boutique?.planId?.quotas?.produits;

  // -1 signifie illimite
  if (quotaProduits && quotaProduits !== -1) {
    const nombreActuel = await ProductModel.countDocuments(
      tenantScope(req, { actif: true })
    );

    if (nombreActuel >= quotaProduits) {
      throw new AppError(
        `Votre plan ${boutique.planId.nom} est limite a ${quotaProduits} produits. ` +
        "Passez a un plan superieur pour en ajouter davantage.",
        403, "QUOTA_EXCEEDED"
      );
    }
  }

  // ══ 2. UNICITE DU SKU DANS LA BOUTIQUE ════════════════════════════
  if (donnees.sku) {
    const existe = await ProductModel.findOne(
      tenantScope(req, { sku: donnees.sku })
    ).lean();

    if (existe) {
      throw AppError.conflict(`La reference ${donnees.sku} est deja utilisee`);
    }
  }

  // ══ 3. RESOLUTION DE LA CATEGORIE ═════════════════════════════════
  let categorieId = donnees.categorieId;
  let categorieNom = donnees.categorieNom;

  if (!categorieId && categorieNom) {
    /**
     * Categorie fournie par son NOM : on la cree si elle n'existe pas.
     * `upsert` evite une condition de course si deux produits de la meme
     * nouvelle categorie sont crees simultanement.
     */
    const categorie = await CategoryModel.findOneAndUpdate(
      tenantScope(req, { nom: categorieNom }),
      { $setOnInsert: tenantPayload(req, { nom: categorieNom }) },
      { upsert: true, new: true }
    );
    categorieId = categorie._id;
  } else if (categorieId) {
    // Categorie fournie par son id : verifier qu'elle appartient a la boutique
    const categorie = await CategoryModel.findOne(
      tenantScope(req, { _id: categorieId })
    ).lean();

    if (!categorie) throw AppError.badRequest("Categorie introuvable");
    categorieNom = categorie.nom;
  }

  // ══ 4. CREATION DU PRODUIT ════════════════════════════════════════
  const { stockInitial = 0, ...reste } = donnees;

  const produit = await ProductModel.create(
    tenantPayload(req, {
      ...reste,
      categorieId,
      categorieNom,
      // Le stock est TOUJOURS pose par un mouvement, jamais directement
      stockActuel: 0,
      historiquePrix: [
        {
          prixAchat: donnees.prixAchat,
          prixVente: donnees.prixVente,
          modifiePar: req.user.id,
        },
      ],
    })
  );

  // ══ 5. MOUVEMENT D'ENTREE INITIAL ═════════════════════════════════
  if (stockInitial > 0) {
    await stockService.enregistrerMouvement(req, {
      produitId: produit._id,
      type: "entree",
      quantite: stockInitial,
      raison: "Stock initial a la creation du produit",
      referenceType: "manuel",
    });
    produit.stockActuel = stockInitial;
  }

  // ══ 6. COMPTEURS ET ONBOARDING ════════════════════════════════════
  await ShopModel.updateOne(
    { _id: req.user.shopId },
    {
      $inc: { "compteurs.produits": 1 },
      // Coche l'etape "Ajouter votre premier produit" de la checklist
      $set: { "etapesOnboarding.premierProduit": true },
    }
  );

  recordAudit(req, "product.created", {
    cible: "Product",
    cibleId: produit._id,
    apres: { nom: produit.nom, prixVente: produit.prixVente },
  });

  return success(res, produit, 201);
});
