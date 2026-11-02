/**
 * Creation et diffusion des notifications.
 *
 * Chaque notification est a la fois :
 *   - PERSISTEE en base (centre de notifications, historique consultable)
 *   - POUSSEE en temps reel via Socket.IO (badge qui s'incremente aussitot)
 *
 * Les erreurs sont capturees : une notification qui echoue ne doit jamais
 * annuler l'action metier qui l'a declenchee (une vente, un paiement...).
 */
const { emitToUser, emitToShop, emitToPlatform } = require("./realtime.service");
const { NOTIFICATION_CATEGORIES, PLATFORM_ROLE_LIST } = require("../constants");
const colors = require("colors");

/**
 * Notifie un utilisateur precis.
 * @param {string} p.userId
 * @param {string} [p.shopId]
 * @param {string} p.titre
 * @param {string} p.message
 * @param {string} [p.categorie] - voir NOTIFICATION_CATEGORIES
 * @param {string} [p.lien]      - route frontend ouverte au clic
 */
async function notifyUser({
  userId, shopId = null, titre, message,
  categorie = NOTIFICATION_CATEGORIES.SYSTEM, lien, meta,
}) {
  const NotificationModel = require("../../dry-app/shared/features/notification/model/notification.model");
  try {
    const notif = await NotificationModel.create({
      destinataireId: userId, shopId, titre, message, categorie, lien, meta,
    });
    emitToUser(userId, "notification:new", notif.toJSON());
    return notif;
  } catch (e) {
    console.error(`Echec de notification utilisateur : ${e.message}`.red);
    return null;
  }
}

/**
 * Notifie tous les membres d'une boutique, eventuellement filtres par role.
 * Ex. alerte de stock bas → uniquement l'admin et le magasinier.
 */
async function notifyShop({
  shopId, roles = null, titre, message,
  categorie = NOTIFICATION_CATEGORIES.BUSINESS, lien,
}) {
  const UserModel = require("../../dry-app/boutique/features/auth/model/user.model");
  const NotificationModel = require("../../dry-app/shared/features/notification/model/notification.model");

  try {
    const filtre = { shopId, actif: true };
    if (roles?.length) filtre.role = { $in: roles };

    const destinataires = await UserModel.find(filtre).select("_id").lean();
    if (!destinataires.length) return [];

    const notifs = await NotificationModel.insertMany(
      destinataires.map((u) => ({
        destinataireId: u._id, shopId, titre, message, categorie, lien,
      }))
    );

    emitToShop(shopId, "notification:new", { titre, message, categorie, lien });
    return notifs;
  } catch (e) {
    console.error(`Echec de notification boutique : ${e.message}`.red);
    return [];
  }
}

/**
 * Notifie le staff de la plateforme.
 * Ex. nouvelle demande d'inscription, paiement en retard, tentative de
 * connexion suspecte.
 */
async function notifyPlatform({
  titre, message, categorie = NOTIFICATION_CATEGORIES.SYSTEM, lien, meta,
}) {
  const UserModel = require("../../dry-app/boutique/features/auth/model/user.model");
  const NotificationModel = require("../../dry-app/shared/features/notification/model/notification.model");

  try {
    const staff = await UserModel.find({
      role: { $in: PLATFORM_ROLE_LIST }, actif: true,
    }).select("_id").lean();

    const notifs = await NotificationModel.insertMany(
      staff.map((u) => ({
        destinataireId: u._id, shopId: null, titre, message, categorie, lien, meta,
      }))
    );

    emitToPlatform("notification:new", { titre, message, categorie, lien, meta });
    return notifs;
  } catch (e) {
    console.error(`Echec de notification plateforme : ${e.message}`.red);
    return [];
  }
}

module.exports = { notifyUser, notifyShop, notifyPlatform };
