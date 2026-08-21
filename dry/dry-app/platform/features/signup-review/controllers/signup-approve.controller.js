/**
 * POST /platform/signup-requests/:id/approve — Validation d'une demande.
 *
 * ══ ACTION LA PLUS CRITIQUE DU PARCOURS D'ONBOARDING ══
 * Elle enchaine CINQ creations :
 *   1. la boutique (statut actif, code T00X genere automatiquement)
 *   2. le compte administrateur avec un MOT DE PASSE TEMPORAIRE
 *   3. la premiere facture d'abonnement
 *   4. les categories de produits par defaut, selon le type de commerce
 *   5. la cloture de la demande
 *
 * Le tout dans une TRANSACTION MongoDB : si une seule etape echoue, RIEN
 * n'est cree. On ne peut jamais se retrouver avec une boutique sans
 * administrateur, ou un administrateur rattache a une boutique inexistante.
 *
 * Le mot de passe temporaire est genere ici et envoye par email. Le flag
 * `doitChangerMotDePasse` force sa modification a la premiere connexion.
 */
const mongoose = require("mongoose");
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success } = require("../../../../../core/response");
const { recordAudit } = require("../../../../../core/audit");
const { generateTemporaryPassword } = require("../../../../../core/tokens");
const { sendAccountApproved } = require("../../../../../core/services/mailer.service");
const {
  SIGNUP_STATUS, SHOP_STATUS, SHOP_ROLES, DEFAULT_ROLE_PERMISSIONS,
} = require("../../../../../core/constants");

const SignupRequestModel = require("../model/signup-request.model");
const ShopModel = require("../../shop/model/shop.model");
const PlanModel = require("../../plan-admin/model/plan.model");
const PlatformInvoiceModel = require("../../billing/model/platform-invoice.model");
const UserModel = require("../../../../boutique/features/auth/model/user.model");
const CategoryModel = require("../../../../boutique/features/category/model/category.model");

/**
 * Categories proposees par defaut selon le type de commerce.
 * Le commercant trouve ainsi un catalogue pre-structure a sa premiere
 * connexion, plutot qu'un ecran vide.
 */
const CATEGORIES_PAR_DEFAUT = {
  supermarche: [
    "Cereales", "Huiles", "Epicerie", "Produits laitiers",
    "Hygiene", "Conserves", "Boissons", "Menage",
  ],
  boutique_detail: ["Epicerie", "Boissons", "Hygiene", "Divers"],
  depot_grossiste: ["Cereales", "Huiles", "Boissons", "Conserves"],
  pharmacie: ["Medicaments", "Parapharmacie", "Hygiene", "Materiel medical"],
  quincaillerie: ["Outillage", "Plomberie", "Electricite", "Peinture", "Quincaillerie"],
  autre: ["Divers"],
};

module.exports = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { planId: planForce } = req.validated.body || {};

  const demande = await SignupRequestModel.findById(id)
    .select("+proprietaire.passwordHash");

  if (!demande) throw AppError.notFound("Demande introuvable");

  if (["approved", "rejected"].includes(demande.statut)) {
    throw AppError.conflict(
      `Cette demande a deja ete traitee (statut : ${demande.statut})`
    );
  }

  const plan = await PlanModel.findById(
    planForce || demande.abonnement.planId
  ).lean();

  if (!plan) throw AppError.badRequest("Plan tarifaire introuvable");

  // Ultime verification : le compte n'a pas ete cree entre-temps
  const dejaExistant = await UserModel.findOne({
    email: demande.proprietaire.email,
  }).lean();

  if (dejaExistant) {
    throw AppError.conflict("Un compte existe deja avec cette adresse email");
  }

  const motDePasseTemporaire = generateTemporaryPassword();
  const session = await mongoose.startSession();

  let boutiqueCreee = null;
  let adminCree = null;

  try {
    await session.withTransaction(async () => {
      // ══ 1. BOUTIQUE ═══════════════════════════════════════════════
      const maintenant = new Date();
      const prochainRenouvellement = new Date(maintenant);

      if (demande.abonnement.cycle === "yearly") {
        prochainRenouvellement.setFullYear(prochainRenouvellement.getFullYear() + 1);
      } else {
        prochainRenouvellement.setMonth(prochainRenouvellement.getMonth() + 1);
      }

      const [boutique] = await ShopModel.create(
        [{
          nom: demande.boutique.nom,
          typeActivite: demande.boutique.typeActivite,
          adresse: demande.boutique.adresse,
          ville: demande.boutique.ville,
          telephone: demande.proprietaire.telephone,
          email: demande.proprietaire.email,
          statut: SHOP_STATUS.ACTIVE,
          planId: plan._id,
          cycleFacturation: demande.abonnement.cycle,
          jourPrelevement: demande.abonnement.jourPrelevement,
          dateDebutAbonnement: maintenant,
          dateProchainRenouvellement: prochainRenouvellement,
          compteurs: { utilisateurs: 1, produits: 0, stockageMo: 0 },
        }],
        { session }
      );
      boutiqueCreee = boutique;

      // ══ 2. COMPTE ADMINISTRATEUR ══════════════════════════════════
      const [admin] = await UserModel.create(
        [{
          nom: demande.proprietaire.nomComplet,
          email: demande.proprietaire.email,
          telephone: demande.proprietaire.telephone,
          /**
           * On impose le mot de passe TEMPORAIRE (et non celui choisi par le
           * demandeur) : l'email d'activation reste ainsi exploitable meme si
           * le proprietaire a oublie ce qu'il avait saisi des semaines plus tot.
           * Le hook pre-save du modele le hache automatiquement.
           */
          passwordHash: motDePasseTemporaire,
          role: SHOP_ROLES.ADMIN,
          shopId: boutique._id,
          permissions: DEFAULT_ROLE_PERMISSIONS[SHOP_ROLES.ADMIN],
          doitChangerMotDePasse: true,   // force l'ecran de premiere connexion
          actif: true,
        }],
        { session }
      );
      adminCree = admin;

      await ShopModel.updateOne(
        { _id: boutique._id },
        { proprietaireId: admin._id },
        { session }
      );

      // ══ 3. PREMIERE FACTURE D'ABONNEMENT ══════════════════════════
      const montant =
        demande.abonnement.cycle === "yearly"
          ? Math.round(plan.prix * 12 * (1 - (plan.remiseAnnuellePourcent || 0) / 100))
          : plan.prix;

      const echeance = new Date(maintenant);
      echeance.setDate(demande.abonnement.jourPrelevement);
      // Si le jour choisi est deja passe ce mois-ci, on vise le mois suivant
      if (echeance < maintenant) echeance.setMonth(echeance.getMonth() + 1);

      await PlatformInvoiceModel.create(
        [{
          numero: await PlatformInvoiceModel.genererNumero(),
          shopId: boutique._id,
          shopNom: boutique.nom,
          planId: plan._id,
          planNom: plan.nom,
          periodeLibelle: maintenant.toLocaleDateString("fr-FR", {
            month: "short",
            year: "numeric",
          }),
          periodeDebut: maintenant,
          periodeFin: prochainRenouvellement,
          montant,
          devise: plan.devise,
          statut: "en_attente",
          dateEcheance: echeance,
        }],
        { session }
      );

      // ══ 4. CATEGORIES PAR DEFAUT ══════════════════════════════════
      const categories =
        CATEGORIES_PAR_DEFAUT[demande.boutique.typeActivite] ||
        CATEGORIES_PAR_DEFAUT.autre;

      await CategoryModel.create(
        categories.map((nom, index) => ({
          shopId: boutique._id,
          nom,
          ordre: index,
        })),
        { session }
      );

      // ══ 5. CLOTURE DE LA DEMANDE ══════════════════════════════════
      await SignupRequestModel.updateOne(
        { _id: demande._id },
        {
          statut: SIGNUP_STATUS.APPROVED,
          traiteePar: req.user.id,
          traiteeLe: new Date(),
          shopIdCree: boutique._id,
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  /**
   * Email d'activation envoye HORS TRANSACTION : un echec d'envoi ne doit pas
   * annuler la creation du compte, qui est deja valide en base.
   */
  const urlConnexion = `${(process.env.CORS_ORIGIN || "").split(",")[0]}/login`;

  await sendAccountApproved({
    to: demande.proprietaire.email,
    ownerName: demande.proprietaire.nomComplet,
    shopName: boutiqueCreee.nom,
    tempPassword: motDePasseTemporaire,
    loginUrl: urlConnexion,
  });

  recordAudit(req, "signup.approved", {
    severite: "haute",
    cible: "Shop",
    cibleId: boutiqueCreee._id,
    apres: {
      boutique: boutiqueCreee.nom,
      code: boutiqueCreee.code,
      plan: plan.nom,
    },
  });

  return success(
    res,
    {
      message: "Compte cree. L'email d'activation a ete envoye au proprietaire.",
      boutique: {
        id: boutiqueCreee._id,
        code: boutiqueCreee.code,
        nom: boutiqueCreee.nom,
        statut: boutiqueCreee.statut,
      },
      administrateur: {
        id: adminCree._id,
        email: adminCree.email,
      },
      /**
       * Affiche UNE SEULE FOIS dans l'interface Super-Admin : permet de
       * transmettre les acces par telephone si le proprietaire ne recoit pas
       * l'email (boite pleine, adresse mal saisie, spam).
       */
      motDePasseTemporaire,
    },
    201
  );
});
