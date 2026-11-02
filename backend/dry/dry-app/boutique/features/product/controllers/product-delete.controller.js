/**
 * DELETE /products/:id — Desactivation d'un produit (SUPPRESSION LOGIQUE).
 *
 * On ne supprime JAMAIS physiquement un produit deja vendu : cela casserait
 * l'historique des ventes et fausserait tous les rapports passes. Le produit
 * est simplement retire du catalogue actif.
 *
 * Le message renvoye precise si le produit apparait dans des ventes, pour que
 * le gerant comprenne pourquoi il reste visible dans l'historique.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { tenantScope } = require("../../../../../core/tenant-guard");
const { recordAudit } = require("../../../../../core/audit");

const ProductModel = require("../model/product.model");
const SaleModel = require("../../sale/model/sale.model");
const ShopModel = require("../../../../platform/features/shop/model/shop.model");

module.exports = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const produit = await ProductModel.findOne(tenantScope(req, { _id: id }));
  if (!produit) throw AppError.notFound("Produit introuvable");

  // Le produit apparait-il dans au moins une vente ?
  const dejaVendu = await SaleModel.exists(
    tenantScope(req, { "lignes.produitId": id })
  );

  produit.actif = false;
  await produit.save();

  await ShopModel.updateOne(
    { _id: req.user.shopId },
    { $inc: { "compteurs.produits": -1 } }
  );

  recordAudit(req, "product.deactivated", {
    severite: "moyenne",
    cible: "Product",
    cibleId: produit._id,
    avant: { nom: produit.nom, stockActuel: produit.stockActuel },
  });

  return success(res, {
    message: dejaVendu
      ? "Produit desactive. Il reste visible dans l'historique des ventes."
      : "Produit desactive.",
  });
});
