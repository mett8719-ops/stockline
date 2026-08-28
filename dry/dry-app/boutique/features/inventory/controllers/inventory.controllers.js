/**
 * Controleurs du module Inventaire physique.
 *
 * CYCLE : demarrage (fige le stock theorique) → saisie des quantites comptees
 * → cloture IRREVERSIBLE qui aligne le stock systeme sur le comptage reel.
 */
const mongoose = require("mongoose");
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success, paginationMeta } = require("../../../../../core/response");
const { tenantScope, tenantPayload } = require("../../../../../core/tenant-guard");
const { recordAudit } = require("../../../../../core/audit");

const InventoryModel = require("../model/inventory.model");
const ProductModel = require("../../product/model/product.model");
const stockService = require("../../stock/model/stock.service");

const arrondir = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** GET /inventories — Historique et indicateurs. */
const list = asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const filtre = tenantScope(req, {});

  const [inventaires, total, enCours, valeurStock] = await Promise.all([
    InventoryModel.find(filtre)
      .sort({ demarreLe: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      // Les lignes sont volumineuses : exclues de la liste
      .select("-lignes")
      .lean(),

    InventoryModel.countDocuments(filtre),

    InventoryModel.findOne(tenantScope(req, { statut: "en_cours" }))
      .select("-lignes")
      .lean(),

    // Valeur totale du stock au prix d'achat
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
  ]);

  const dernier = inventaires.find((i) => i.statut === "cloture");

  return success(
    res,
    {
      inventaires,
      inventaireEnCours: enCours,
      // Les 3 cartes en haut de l'ecran Inventaire
      indicateurs: {
        dernierInventaire: dernier?.clotureLe || null,
        ecartsDetectes: dernier?.nombreEcarts || 0,
        deficitTotal: dernier?.deficitTotal || 0,
        valeurInventoriee: valeurStock[0]?.valeur || 0,
        nombreReferences: valeurStock[0]?.references || 0,
      },
    },
    200,
    paginationMeta(page, limit, total)
  );
});

/**
 * POST /inventories — Demarrage d'une session.
 *
 * Fige le stock theorique de TOUS les produits actifs a l'instant T. C'est ce
 * qui permet de comparer, plus tard, le comptage physique a ce que le systeme
 * pensait avoir — meme si des ventes ont lieu pendant le comptage.
 */
const start = asyncHandler(async (req, res) => {
  const dejaEnCours = await InventoryModel.findOne(
    tenantScope(req, { statut: "en_cours" })
  ).lean();

  if (dejaEnCours) {
    throw AppError.conflict(
      `Un inventaire est deja en cours (${dejaEnCours.reference}). Cloturez-le d'abord.`
    );
  }

  const produits = await ProductModel.find(tenantScope(req, { actif: true }))
    .select("nom categorieNom unite stockActuel prixAchat")
    .lean();

  if (!produits.length) {
    throw AppError.badRequest("Aucun produit actif a inventorier");
  }

  const inventaire = await InventoryModel.create(
    tenantPayload(req, {
      reference: await InventoryModel.genererReference(req.user.shopId),
      lignes: produits.map((p) => ({
        produitId: p._id,
        produitNom: p.nom,
        categorieNom: p.categorieNom,
        unite: p.unite,
        stockTheorique: p.stockActuel,   // fige
        quantiteComptee: null,
        ecart: 0,
        statut: "en_attente",
      })),
      nombreArticles: produits.length,
      valeurTotale: arrondir(
        produits.reduce((s, p) => s + p.stockActuel * p.prixAchat, 0)
      ),
      realiseParId: req.user.id,
      realiseParNom: req.user.nom,
    })
  );

  recordAudit(req, "inventory.started", {
    cible: "Inventory",
    cibleId: inventaire._id,
  });

  return success(res, inventaire, 201);
});

/** GET /inventories/:id — Session complete avec ses lignes. */
const getOne = asyncHandler(async (req, res) => {
  const inventaire = await InventoryModel.findOne(
    tenantScope(req, { _id: req.validated.params.id })
  ).lean();

  if (!inventaire) throw AppError.notFound("Inventaire introuvable");
  return success(res, inventaire);
});

/**
 * PATCH /inventories/:id/count — Saisie de la quantite comptee.
 *
 * L'ecart est recalcule a chaque saisie, ainsi que la progression globale
 * affichee dans la barre en haut de l'ecran.
 */
const recordCount = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { produitId, quantiteComptee, commentaire } = req.validated.body;

  const inventaire = await InventoryModel.findOne(
    tenantScope(req, { _id: id, statut: "en_cours" })
  );

  if (!inventaire) {
    throw AppError.notFound("Aucun inventaire en cours avec cet identifiant");
  }

  const ligne = inventaire.lignes.find(
    (l) => String(l.produitId) === String(produitId)
  );

  if (!ligne) {
    throw AppError.badRequest("Ce produit ne fait pas partie de cet inventaire");
  }

  const produit = await ProductModel.findOne(
    tenantScope(req, { _id: produitId })
  )
    .select("prixAchat")
    .lean();

  // Premiere saisie pour cet article ? (pour incrementer la progression)
  const nouvelleLigne = ligne.quantiteComptee === null;

  ligne.quantiteComptee = quantiteComptee;
  ligne.ecart = quantiteComptee - ligne.stockTheorique;
  ligne.valeurEcart = arrondir(ligne.ecart * (produit?.prixAchat || 0));
  ligne.commentaire = commentaire;
  ligne.statut =
    ligne.ecart === 0 ? "conforme" : ligne.ecart < 0 ? "deficit" : "excedent";

  if (nouvelleLigne) inventaire.articlesComptes += 1;

  inventaire.nombreEcarts = inventaire.lignes.filter(
    (l) => l.quantiteComptee !== null && l.ecart !== 0
  ).length;

  // Deficit = somme des ecarts NEGATIFS uniquement
  inventaire.deficitTotal = arrondir(
    inventaire.lignes.reduce(
      (s, l) => s + (l.valeurEcart < 0 ? l.valeurEcart : 0),
      0
    )
  );

  await inventaire.save();

  return success(res, {
    ligne,
    progression: {
      comptes: inventaire.articlesComptes,
      total: inventaire.nombreArticles,
      pourcentage: Math.round(
        (inventaire.articlesComptes / inventaire.nombreArticles) * 100
      ),
      ecarts: inventaire.nombreEcarts,
    },
  });
});

/**
 * POST /inventories/:id/close — Cloture IRREVERSIBLE.
 *
 * Pour chaque article compte presentant un ecart, un mouvement d'AJUSTEMENT
 * est enregistre et le stock systeme est aligne sur le comptage physique.
 *
 * Les articles NON COMPTES sont laisses inchanges : on ne suppose pas qu'un
 * article non compte a un stock nul.
 */
const close = asyncHandler(async (req, res) => {
  const inventaire = await InventoryModel.findOne(
    tenantScope(req, { _id: req.validated.params.id, statut: "en_cours" })
  );

  if (!inventaire) {
    throw AppError.notFound("Aucun inventaire en cours avec cet identifiant");
  }

  if (inventaire.articlesComptes === 0) {
    throw AppError.badRequest(
      "Aucun article n'a ete compte : la cloture est impossible"
    );
  }

  const session = await mongoose.startSession();
  let ajustements = 0;

  try {
    await session.withTransaction(async () => {
      for (const ligne of inventaire.lignes) {
        // On ignore les articles non comptes et ceux sans ecart
        if (ligne.quantiteComptee === null || ligne.ecart === 0) continue;

        await stockService.enregistrerMouvement(req, {
          produitId: ligne.produitId,
          type: "ajustement",
          quantite: Math.abs(ligne.ecart),
          quantiteCible: ligne.quantiteComptee,   // stock FINAL vise
          raison:
            `Ajustement inventaire ${inventaire.reference}` +
            (ligne.commentaire ? ` — ${ligne.commentaire}` : ""),
          referenceType: "inventaire",
          referenceId: inventaire._id,
          referenceLibelle: inventaire.reference,
          // Un comptage peut legitimement donner zero
          autoriserNegatif: true,
          session,
        });

        ajustements += 1;
      }

      inventaire.statut = "cloture";
      inventaire.clotureLe = new Date();
      inventaire.valideParId = req.user.id;
      await inventaire.save({ session });
    });
  } finally {
    await session.endSession();
  }

  recordAudit(req, "inventory.closed", {
    severite: "haute",
    cible: "Inventory",
    cibleId: inventaire._id,
    apres: {
      reference: inventaire.reference,
      articlesComptes: inventaire.articlesComptes,
      ecarts: inventaire.nombreEcarts,
      deficitTotal: inventaire.deficitTotal,
      ajustements,
    },
  });

  return success(res, {
    message: `Inventaire ${inventaire.reference} cloture. ${ajustements} ajustement(s) applique(s).`,
    inventaire: { ...inventaire.toObject(), lignes: undefined },
    rapport: {
      articlesComptes: inventaire.articlesComptes,
      nombreEcarts: inventaire.nombreEcarts,
      deficitTotal: inventaire.deficitTotal,
      ajustementsAppliques: ajustements,
    },
  });
});

module.exports = { list, start, getOne, recordCount, close };
