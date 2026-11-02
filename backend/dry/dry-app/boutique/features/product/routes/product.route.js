/**
 * Routes du module Produits & Catalogue.
 *
 * ══ ATTENTION A L'ORDRE DES ROUTES ══
 * `/export` et `/barcode/:code` sont declarees AVANT `/:id`. Sinon Express
 * interpreterait "export" comme un identifiant de produit et la route ne
 * fonctionnerait jamais.
 */
const express = require("express");
const validate = require("../../../../../core/validate");
const { registerRoute } = require("../../../../../core/openapi");
const { requirePermission } = require("../../../../../core/authorize");
const { trackUsage } = require("../../../../../core/usage-tracker");
const { idParam } = require("../../../../../core/common-schemas");
const { PERMISSIONS } = require("../../../../../core/constants");
const S = require("../model/product.schema");

const create = require("../controllers/product-create.controller");
const list = require("../controllers/product-list.controller");
const update = require("../controllers/product-update.controller");
const remove = require("../controllers/product-delete.controller");
const misc = require("../controllers/product-misc.controller");

const router = express.Router();

/**
 * Permission et compteur d'usage appliques a TOUTES les routes du module.
 * `trackUsage` alimente l'ecran "Analytique d'usage" du Super-Admin.
 */
router.use(requirePermission(PERMISSIONS.PRODUCTS), trackUsage("products"));

// ══ GET /products ═════════════════════════════════════════════════════
router.get("/", validate({ query: S.listProductsQuerySchema }), list);
registerRoute({
  method: "get", path: "/products", tags: ["Produits"], permissions: ["products"],
  summary: "Lister le catalogue",
  description:
    "Recherche instantanee (`q`) sur le nom, la reference et le code-barres.\n\n" +
    "Filtre `statutStock` : `en_stock`, `stock_bas` ou `rupture`.\n\n" +
    "Les champs calcules `marge`, `margePourcent` et `statutStock` sont inclus.",
  request: { query: S.listProductsQuerySchema },
  responses: { 200: S.productResponse },
});

// ══ GET /products/export (AVANT /:id) ═════════════════════════════════
router.get("/export", misc.exportAll);
registerRoute({
  method: "get", path: "/products/export", tags: ["Produits"], permissions: ["products"],
  summary: "Exporter le catalogue complet",
  responses: { 200: S.productResponse },
});

// ══ GET /products/barcode/:code (AVANT /:id) ══════════════════════════
router.get("/barcode/:code", misc.findByBarcode);
registerRoute({
  method: "get", path: "/products/barcode/{code}", tags: ["Produits"], permissions: ["products"],
  summary: "Rechercher un produit par code-barres",
  description: "Utilise par le scan en caisse. Reponse en quelques millisecondes.",
  responses: { 200: S.productResponse },
});

// ══ GET /products/:id ═════════════════════════════════════════════════
router.get("/:id", validate({ params: idParam }), misc.getOne);
registerRoute({
  method: "get", path: "/products/{id}", tags: ["Produits"], permissions: ["products"],
  summary: "Fiche produit avec ses 20 derniers mouvements de stock",
  request: { params: idParam },
  responses: { 200: S.productResponse },
});

// ══ POST /products ════════════════════════════════════════════════════
router.post("/", validate({ body: S.createProductSchema }), create);
registerRoute({
  method: "post", path: "/products", tags: ["Produits"], permissions: ["products"],
  summary: "Creer un produit",
  description:
    "Verifie le quota du plan avant creation. Un `stockInitial` non nul genere " +
    "automatiquement un mouvement d'entree trace.\n\n" +
    "La categorie peut etre fournie par `categorieId` ou par `categorieNom` " +
    "(creee automatiquement si absente).",
  request: { body: S.createProductSchema },
  responses: { 201: S.productResponse },
});

// ══ POST /products/import ═════════════════════════════════════════════
router.post("/import", validate({ body: S.importProductsSchema }), misc.importBulk);
registerRoute({
  method: "post", path: "/products/import", tags: ["Produits"], permissions: ["products"],
  summary: "Importer un catalogue en masse",
  description:
    "Le fichier Excel/CSV est parse cote client, puis envoye ici. Maximum " +
    "1000 lignes par import.\n\n" +
    "Chaque ligne est traitee independamment : une ligne fautive n'annule pas " +
    "les autres. Le rapport detaille les creations, les doublons ignores et " +
    "les erreurs.",
  request: { body: S.importProductsSchema },
  responses: { 201: S.productResponse },
});

// ══ PATCH /products/:id ═══════════════════════════════════════════════
router.patch("/:id", validate({ params: idParam, body: S.updateProductSchema }), update);
registerRoute({
  method: "patch", path: "/products/{id}", tags: ["Produits"], permissions: ["products"],
  summary: "Modifier un produit",
  description:
    "Le stock ne peut PAS etre modifie ici : utiliser `POST /stock/movements`.\n\n" +
    "Tout changement de prix est archive dans l'historique du produit et " +
    "journalise dans le journal d'audit.",
  request: { params: idParam, body: S.updateProductSchema },
  responses: { 200: S.productResponse },
});

// ══ DELETE /products/:id ══════════════════════════════════════════════
router.delete("/:id", validate({ params: idParam }), remove);
registerRoute({
  method: "delete", path: "/products/{id}", tags: ["Produits"], permissions: ["products"],
  summary: "Desactiver un produit (suppression logique)",
  description:
    "Le produit n'est jamais supprime physiquement : cela casserait " +
    "l'historique des ventes. Il est retire du catalogue actif.",
  request: { params: idParam },
  responses: { 200: S.productResponse },
});

// ══ ROUTEUR CATEGORIES (memes permissions) ════════════════════════════
const categoryRouter = express.Router();
categoryRouter.use(requirePermission(PERMISSIONS.PRODUCTS));

categoryRouter.get("/", misc.listCategories);
registerRoute({
  method: "get", path: "/categories", tags: ["Produits"], permissions: ["products"],
  summary: "Lister les categories avec le nombre de produits",
  responses: { 200: S.productResponse },
});

categoryRouter.post("/", validate({ body: S.createCategorySchema }), misc.createCategory);
registerRoute({
  method: "post", path: "/categories", tags: ["Produits"], permissions: ["products"],
  summary: "Creer une categorie",
  request: { body: S.createCategorySchema },
  responses: { 201: S.productResponse },
});

module.exports = { router, categoryRouter };
