/**
 * Controleurs du module Rapports & Tableau de bord.
 *
 * Toutes les agregations passent par tenantScope : un gerant ne voit que ses
 * propres chiffres, jamais ceux d'une autre boutique.
 *
 * Les requetes sont lancees en PARALLELE avec Promise.all : le tableau de bord
 * en demande sept, les executer en sequence multiplierait le temps de reponse
 * par sept.
 */
const asyncHandler = require("../../../../../core/async-handler");
const { success } = require("../../../../../core/response");
const { tenantScope } = require("../../../../../core/tenant-guard");

const SaleModel = require("../../sale/model/sale.model");
const ProductModel = require("../../product/model/product.model");
const CustomerModel = require("../../customer/model/customer.model");
const SupplierModel = require("../../supplier/model/supplier.model");
const stockService = require("../../stock/model/stock.service");

const arrondir = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Ramene une date au debut de sa journee (00:00:00). */
const debutDeJournee = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * GET /reports/dashboard — Tableau de bord de la boutique.
 *
 * Reproduit exactement l'ecran d'accueil : 4 cartes KPI avec evolution vs la
 * veille, courbe des 7 derniers jours, alertes de stock bas et dernieres
 * ventes du jour.
 */
const dashboard = asyncHandler(async (req, res) => {
  const aujourdhui = debutDeJournee();

  const hier = new Date(aujourdhui);
  hier.setDate(hier.getDate() - 1);

  const debutSemaine = new Date(aujourdhui);
  debutSemaine.setDate(debutSemaine.getDate() - 6);   // 7 jours avec aujourd'hui

  // Les ventes annulees ne comptent dans aucun indicateur
  const venteValide = { statut: { $ne: "annulee" } };

  const [
    ventesJour, ventesHier, valeurStock, creances, dettes,
    courbeSemaine, dernieresVentes, alertesStock,
  ] = await Promise.all([
    // ── Ventes et benefice du jour ────────────────────────────────────
    SaleModel.aggregate([
      { $match: tenantScope(req, { ...venteValide, date: { $gte: aujourdhui } }) },
      {
        $group: {
          _id: null,
          chiffreAffaires: { $sum: "$montantTotal" },
          benefice: { $sum: "$beneficeTotal" },
          nombre: { $sum: 1 },
        },
      },
    ]),

    // ── Meme chose pour hier (comparaison en pourcentage) ─────────────
    SaleModel.aggregate([
      {
        $match: tenantScope(req, {
          ...venteValide,
          date: { $gte: hier, $lt: aujourdhui },
        }),
      },
      {
        $group: {
          _id: null,
          chiffreAffaires: { $sum: "$montantTotal" },
          benefice: { $sum: "$beneficeTotal" },
        },
      },
    ]),

    // ── Valeur du stock au prix d'achat ───────────────────────────────
    ProductModel.aggregate([
      { $match: tenantScope(req, { actif: true }) },
      {
        $group: {
          _id: null,
          valeur: { $sum: { $multiply: ["$stockActuel", "$prixAchat"] } },
          references: { $sum: 1 },
        },
      },
    ]),

    // ── Creances clients ──────────────────────────────────────────────
    CustomerModel.aggregate([
      { $match: tenantScope(req, { soldeCredit: { $gt: 0 } }) },
      { $group: { _id: null, total: { $sum: "$soldeCredit" }, nombre: { $sum: 1 } } },
    ]),

    // ── Dettes fournisseurs ───────────────────────────────────────────
    SupplierModel.aggregate([
      { $match: tenantScope(req, { soldeDu: { $gt: 0 } }) },
      { $group: { _id: null, total: { $sum: "$soldeDu" }, nombre: { $sum: 1 } } },
    ]),

    // ── Courbe ventes / benefice des 7 derniers jours ─────────────────
    SaleModel.aggregate([
      { $match: tenantScope(req, { ...venteValide, date: { $gte: debutSemaine } }) },
      {
        $group: {
          // Regroupement par jour au format AAAA-MM-JJ
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          ventes: { $sum: "$montantTotal" },
          benefice: { $sum: "$beneficeTotal" },
          nombre: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // ── Dernieres ventes du jour (tableau du bas) ─────────────────────
    SaleModel.find(tenantScope(req, { date: { $gte: aujourdhui } }))
      .sort({ date: -1 })
      .limit(10)
      .select("reference date caissierNom montantTotal paiements statut")
      .lean(),

    // ── Alertes de stock bas ──────────────────────────────────────────
    stockService.produitsEnAlerte(req.user.shopId, 5),
  ]);

  const jour = ventesJour[0] || { chiffreAffaires: 0, benefice: 0, nombre: 0 };
  const veille = ventesHier[0] || { chiffreAffaires: 0, benefice: 0 };

  /**
   * Evolution en pourcentage. Cas particulier : si la veille etait a zero et
   * qu'aujourd'hui il y a du chiffre, on affiche +100 % plutot qu'une
   * division par zero.
   */
  const evolution = (actuel, precedent) =>
    precedent > 0
      ? Math.round(((actuel - precedent) / precedent) * 100)
      : actuel > 0
      ? 100
      : 0;

  return success(res, {
    kpis: {
      ventesJour: {
        valeur: jour.chiffreAffaires,
        evolution: evolution(jour.chiffreAffaires, veille.chiffreAffaires),
        nombreTransactions: jour.nombre,
      },
      beneficeJour: {
        valeur: jour.benefice,
        evolution: evolution(jour.benefice, veille.benefice),
      },
      valeurStock: {
        valeur: valeurStock[0]?.valeur || 0,
        nombreReferences: valeurStock[0]?.references || 0,
      },
      creancesClients: {
        valeur: creances[0]?.total || 0,
        nombreClients: creances[0]?.nombre || 0,
      },
      dettesFournisseurs: {
        valeur: dettes[0]?.total || 0,
        nombreFournisseurs: dettes[0]?.nombre || 0,
      },
    },
    courbeSemaine: courbeSemaine.map((j) => ({
      jour: j._id,
      ventes: j.ventes,
      benefice: j.benefice,
      nombre: j.nombre,
    })),
    alertesStock,
    dernieresVentes,
  });
});

/**
 * GET /reports/sales — Rapport de ventes sur une periode.
 *
 * Inclut le comparatif avec la periode PRECEDENTE DE MEME DUREE : comparer
 * un mois a un trimestre n'aurait aucun sens.
 */
const salesReport = asyncHandler(async (req, res) => {
  const { from, to } = req.validated.query;

  const debut =
    from || debutDeJournee(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const fin = to || new Date();

  // Periode precedente de MEME DUREE
  const duree = fin - debut;
  const debutPrecedent = new Date(debut - duree);

  const base = { statut: { $ne: "annulee" } };

  const [periode, precedente, topProduits, parCaissier, parModePaiement] =
    await Promise.all([
      SaleModel.aggregate([
        { $match: tenantScope(req, { ...base, date: { $gte: debut, $lte: fin } }) },
        {
          $group: {
            _id: null,
            chiffreAffaires: { $sum: "$montantTotal" },
            benefice: { $sum: "$beneficeTotal" },
            nombre: { $sum: 1 },
            panierMoyen: { $avg: "$montantTotal" },
          },
        },
      ]),

      SaleModel.aggregate([
        {
          $match: tenantScope(req, {
            ...base,
            date: { $gte: debutPrecedent, $lt: debut },
          }),
        },
        {
          $group: {
            _id: null,
            chiffreAffaires: { $sum: "$montantTotal" },
            benefice: { $sum: "$beneficeTotal" },
          },
        },
      ]),

      // ── Produits les plus vendus ────────────────────────────────────
      SaleModel.aggregate([
        { $match: tenantScope(req, { ...base, date: { $gte: debut, $lte: fin } }) },
        // Eclate le tableau de lignes : une entree par produit vendu
        { $unwind: "$lignes" },
        {
          $group: {
            _id: "$lignes.produitId",
            nom: { $first: "$lignes.produitNom" },
            quantiteVendue: { $sum: "$lignes.quantite" },
            chiffreAffaires: { $sum: "$lignes.totalLigne" },
            benefice: { $sum: "$lignes.beneficeLigne" },
          },
        },
        { $sort: { quantiteVendue: -1 } },
        { $limit: 15 },
      ]),

      // ── Ventes par caissier ─────────────────────────────────────────
      SaleModel.aggregate([
        { $match: tenantScope(req, { ...base, date: { $gte: debut, $lte: fin } }) },
        {
          $group: {
            _id: "$caissierId",
            nom: { $first: "$caissierNom" },
            total: { $sum: "$montantTotal" },
            nombre: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),

      // ── Ventilation par mode de paiement ────────────────────────────
      SaleModel.aggregate([
        { $match: tenantScope(req, { ...base, date: { $gte: debut, $lte: fin } }) },
        { $unwind: "$paiements" },
        {
          $group: {
            _id: "$paiements.mode",
            total: { $sum: "$paiements.montant" },
            nombre: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

  const p = periode[0] || {
    chiffreAffaires: 0, benefice: 0, nombre: 0, panierMoyen: 0,
  };
  const prec = precedente[0] || { chiffreAffaires: 0, benefice: 0 };

  return success(res, {
    periode: { debut, fin },
    totaux: {
      chiffreAffaires: arrondir(p.chiffreAffaires),
      benefice: arrondir(p.benefice),
      nombreVentes: p.nombre,
      panierMoyen: arrondir(p.panierMoyen || 0),
      margeMoyenne:
        p.chiffreAffaires > 0
          ? Math.round((p.benefice / p.chiffreAffaires) * 100)
          : 0,
    },
    comparatif: {
      chiffreAffairesPrecedent: arrondir(prec.chiffreAffaires),
      evolutionChiffreAffaires:
        prec.chiffreAffaires > 0
          ? Math.round(
              ((p.chiffreAffaires - prec.chiffreAffaires) / prec.chiffreAffaires) * 100
            )
          : 0,
      evolutionBenefice:
        prec.benefice > 0
          ? Math.round(((p.benefice - prec.benefice) / prec.benefice) * 100)
          : 0,
    },
    topProduits,
    parCaissier,
    parModePaiement,
  });
});

/**
 * GET /reports/stock — Valorisation du stock, alertes et produits dormants.
 *
 * Les "produits dormants" sont ceux qui n'ont enregistre aucune vente sur les
 * 30 derniers jours tout en ayant du stock : c'est de la tresorerie immobilisee.
 */
const stockReport = asyncHandler(async (req, res) => {
  const [valorisation, parCategorie, alertes, peremption, produitsVendus] =
    await Promise.all([
      ProductModel.aggregate([
        { $match: tenantScope(req, { actif: true }) },
        {
          $group: {
            _id: null,
            valeurAchat: { $sum: { $multiply: ["$stockActuel", "$prixAchat"] } },
            valeurVente: { $sum: { $multiply: ["$stockActuel", "$prixVente"] } },
            references: { $sum: 1 },
            unitesTotales: { $sum: "$stockActuel" },
          },
        },
      ]),

      ProductModel.aggregate([
        { $match: tenantScope(req, { actif: true }) },
        {
          $group: {
            _id: "$categorieNom",
            valeur: { $sum: { $multiply: ["$stockActuel", "$prixAchat"] } },
            references: { $sum: 1 },
          },
        },
        { $sort: { valeur: -1 } },
      ]),

      stockService.produitsEnAlerte(req.user.shopId, 100),
      stockService.produitsProchePeremption(req.user.shopId, 60),

      // Identifiants des produits vendus sur les 30 derniers jours
      SaleModel.aggregate([
        {
          $match: tenantScope(req, {
            statut: { $ne: "annulee" },
            date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          }),
        },
        { $unwind: "$lignes" },
        { $group: { _id: "$lignes.produitId" } },
      ]),
    ]);

  // Produits en stock mais jamais vendus sur la periode
  const vendus = produitsVendus.map((r) => r._id);

  const dormants = await ProductModel.find(
    tenantScope(req, {
      actif: true,
      stockActuel: { $gt: 0 },
      _id: { $nin: vendus },
    })
  )
    .select("nom stockActuel prixAchat unite")
    .limit(30)
    .lean();

  const v = valorisation[0] || {
    valeurAchat: 0, valeurVente: 0, references: 0, unitesTotales: 0,
  };

  return success(res, {
    valorisation: {
      ...v,
      // Marge que representerait la vente de tout le stock
      margePotentielle: arrondir(v.valeurVente - v.valeurAchat),
    },
    parCategorie,
    alertes: { stockBas: alertes, peremption },
    produitsDormants: dormants,
  });
});

module.exports = { dashboard, salesReport, stockReport };
