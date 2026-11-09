/**
 * Routeur de l'espace BOUTIQUE — agrege les 13 modules metier + abonnement.
 *
 * ══ ORDRE DES MIDDLEWARES : VOLONTAIRE ET IMPORTANT ══
 *   1. authenticate                   → verifie le jeton, charge l'utilisateur
 *   2. apiLimiter                     → plafond de requetes par utilisateur
 *   3. shopOnly                       → bloque le staff plateforme ici
 *   4. blockIfPasswordChangeRequired  → bloque tant que le mot de passe
 *                                       temporaire n'est pas change
 *
 * Le module `auth` n'est PAS ici : il est monte a part, car ses routes
 * doivent rester accessibles avant authentification (connexion) et pendant
 * le blocage du mot de passe (changement).
 */
const express = require("express");
const { authenticate } = require("../../../core/authenticate");
const { shopOnly, blockIfPasswordChangeRequired } = require("../../../core/authorize");
const { apiLimiter } = require("../../../core/rate-limit");

const { router: productRoute, categoryRouter } =
  require("../features/product/routes/product.route");
const stockRoute = require("../features/stock/routes/stock.route");
const customerRoute = require("../features/customer/routes/customer.route");
const supplierRoute = require("../features/supplier/routes/supplier.route");
const saleRoute = require("../features/sale/routes/sale.route");
const documentRoute = require("../features/document/routes/document.route");
const inventoryRoute = require("../features/inventory/routes/inventory.route");
const treasuryRoute = require("../features/treasury/routes/treasury.route");
const { router: userRoute, roleRouter } =
  require("../features/user/routes/user-shop.route");
const reportRoute = require("../features/report/routes/report.route");
const suggestionRoute = require("../features/suggestion/routes/suggestion.route");
const subscriptionRoute = require("../features/subscription/routes/subscription.route");

const router = express.Router();

// Middlewares communs a TOUTES les routes de l'espace boutique
router.use(authenticate, apiLimiter, shopOnly, blockIfPasswordChangeRequired);

// ── Catalogue et stock ────────────────────────────────────────────────
router.use("/products", productRoute);
router.use("/categories", categoryRouter);
router.use("/stock", stockRoute);
router.use("/inventories", inventoryRoute);

// ── Vente et relation client ──────────────────────────────────────────
router.use("/sales", saleRoute);
router.use("/customers", customerRoute);
router.use("/suppliers", supplierRoute);
router.use("/documents", documentRoute);

// ── Finance et pilotage ───────────────────────────────────────────────
router.use("/treasury", treasuryRoute);
router.use("/reports", reportRoute);

// ── Administration et abonnement de la boutique ───────────────────────
router.use("/users", userRoute);
router.use("/roles", roleRouter);
router.use("/suggestions", suggestionRoute);
router.use("/subscription", subscriptionRoute);

module.exports = router;
