/**
 * PATCH /products/:id — Modification d'un produit.
 *
 * ══ ACTION SENSIBLE : LE CHANGEMENT DE PRIX ══
 * Toute modification de prix est archivee dans `historiquePrix` ET journalisee
 * avec une severite `moyenne`. C'est une action qui impacte directement le
 * calcul des marges : on doit pouvoir expliquer, trois mois plus tard, qui a
 * change quoi et quand.
 *
 * Le STOCK ne peut PAS etre modifie ici — il passe obligatoirement par un
 * mouvement, sans quoi l'historique deviendrait incoherent.
 */
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { tenantScope } = require("../../../../../core/tenant-guard");
const { recordAudit } = require("../../../../../core/audit");

const ProductModel = require("../model/product.model");
const CategoryModel = require("../../category/model/category.model");

module.exports = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const donnees = req.validated.body;

  const produit = await ProductModel.findOne(tenantScope(req, { _id: id }));
  if (!produit) throw AppError.notFound("Produit introuvable");

  // ── Unicite du SKU si celui-ci change ───────────────────────────────
  if (donnees.sku && donnees.sku !== produit.sku) {
    const existe = await ProductModel.findOne(
      tenantScope(req, { sku: donnees.sku, _id: { $ne: id } })
    ).lean();

    if (existe) {
      throw AppError.conflict(`La reference ${donnees.sku} est deja utilisee`);
    }
  }

  // ── Categorie : verifier l'appartenance a la boutique ───────────────
  if (donnees.categorieId) {
    const categorie = await CategoryModel.findOne(
      tenantScope(req, { _id: donnees.categorieId })
    ).lean();

    if (!categorie) throw AppError.badRequest("Categorie introuvable");
    donnees.categorieNom = categorie.nom;
  }

  /**
   * Coherence des prix meme en modification PARTIELLE.
   * Si seul le prix d'achat est envoye, il faut le comparer au prix de vente
   * ACTUEL — pas seulement aux champs presents dans la requete.
   */
  const nouveauPrixAchat = donnees.prixAchat ?? produit.prixAchat;
  const nouveauPrixVente = donnees.prixVente ?? produit.prixVente;

  if (nouveauPrixVente < nouveauPrixAchat) {
    throw AppError.badRequest(
      "Le prix de vente ne peut pas etre inferieur au prix d'achat"
    );
  }

  const prixModifies =
    (donnees.prixAchat !== undefined && donnees.prixAchat !== produit.prixAchat) ||
    (donnees.prixVente !== undefined && donnees.prixVente !== produit.prixVente);

  // Capture de l'etat avant modification, pour le journal d'audit
  const etatAvant = {
    nom: produit.nom,
    prixAchat: produit.prixAchat,
    prixVente: produit.prixVente,
  };

  Object.assign(produit, donnees);

  if (prixModifies) {
    produit.historiquePrix.push({
      prixAchat: nouveauPrixAchat,
      prixVente: nouveauPrixVente,
      modifieLe: new Date(),
      modifiePar: req.user.id,
    });
  }

  await produit.save();

  recordAudit(req, prixModifies ? "product.price_changed" : "product.updated", {
    severite: prixModifies ? "moyenne" : "info",
    cible: "Product",
    cibleId: produit._id,
    avant: etatAvant,
    apres: {
      nom: produit.nom,
      prixAchat: produit.prixAchat,
      prixVente: produit.prixVente,
    },
  });

  return success(res, produit);
});
