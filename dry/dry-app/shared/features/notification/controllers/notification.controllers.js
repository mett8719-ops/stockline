/**
 * Controleurs du centre de notifications (boutique ET plateforme).
 *
 * ══ ISOLATION PARTICULIERE ══
 * Une notification appartient a son DESTINATAIRE, pas a une boutique. Le
 * filtre porte donc sur `destinataireId` et non sur `shopId` — c'est le seul
 * module ou l'on n'utilise pas `tenantScope`.
 *
 * Cela permet au staff plateforme (qui n'a pas de shopId) de recevoir des
 * notifications par le meme mecanisme.
 */
const mongoose = require("mongoose");
const asyncHandler = require("../../../../../core/async-handler");
const AppError = require("../../../../../core/app-error");
const { success, paginationMeta } = require("../../../../../core/response");
const NotificationModel = require("../model/notification.model");

/** GET /notifications — Liste paginee avec compteurs par categorie. */
const list = asyncHandler(async (req, res) => {
  const { page, limit, categorie, lu } = req.validated.query;

  // Isolation par destinataire
  const filtre = { destinataireId: req.user.id };
  if (categorie) filtre.categorie = categorie;
  if (lu !== undefined) filtre.lu = lu === "true";

  const [notifications, total, nonLues, parCategorie] = await Promise.all([
    NotificationModel.find(filtre)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    NotificationModel.countDocuments(filtre),

    // Badge global affiche dans la barre superieure
    NotificationModel.countDocuments({
      destinataireId: req.user.id,
      lu: false,
    }),

    /**
     * Compteurs par categorie pour les onglets de filtre.
     * `createFromHexString` : dans une agregation, l'identifiant doit etre un
     * ObjectId, pas une chaine — contrairement a `find` qui convertit tout seul.
     */
    NotificationModel.aggregate([
      {
        $match: {
          destinataireId: mongoose.Types.ObjectId.createFromHexString(req.user.id),
        },
      },
      {
        $group: {
          _id: "$categorie",
          total: { $sum: 1 },
          nonLues: { $sum: { $cond: ["$lu", 0, 1] } },
        },
      },
    ]),
  ]);

  return success(
    res,
    {
      notifications,
      nonLues,
      compteurs: parCategorie.reduce((acc, c) => ({ ...acc, [c._id]: c }), {}),
    },
    200,
    paginationMeta(page, limit, total)
  );
});

/** PATCH /notifications/:id/read — Marquer une notification comme lue. */
const markRead = asyncHandler(async (req, res) => {
  // Le filtre inclut le destinataire : on ne peut pas marquer celle d'un autre
  const notification = await NotificationModel.findOneAndUpdate(
    { _id: req.validated.params.id, destinataireId: req.user.id },
    { lu: true, luLe: new Date() },
    { new: true }
  );

  if (!notification) throw AppError.notFound("Notification introuvable");
  return success(res, notification);
});

/** PATCH /notifications/read-all — Tout marquer comme lu. */
const markAllRead = asyncHandler(async (req, res) => {
  const resultat = await NotificationModel.updateMany(
    { destinataireId: req.user.id, lu: false },
    { lu: true, luLe: new Date() }
  );

  return success(res, { marquees: resultat.modifiedCount });
});

module.exports = { list, markRead, markAllRead };
