/**
 * Journal d'audit des actions sensibles.
 *
 * On journalise systematiquement : modification de prix, annulation de vente,
 * ajustement de stock, creation/suppression de compte, changement de plan,
 * gel/bannissement d'une boutique, et tout acces du Super-Admin a un tenant.
 *
 * L'ecriture est volontairement "fire and forget" (sans await) : un echec de
 * journalisation ne doit JAMAIS faire echouer l'action metier de l'utilisateur.
 */
const colors = require("colors");

/**
 * @param {object} req    - requete Express (auteur, IP, shopId)
 * @param {string} action - verbe metier, ex. "sale.cancel", "shop.ban"
 * @param {object} options
 * @param {string} [options.cible]    - type de ressource ("Product", "Sale"...)
 * @param {string} [options.cibleId]
 * @param {object} [options.avant]    - etat avant modification
 * @param {object} [options.apres]    - etat apres modification
 * @param {string} [options.severite] - "info" | "moyenne" | "haute"
 */
function recordAudit(req, action, options = {}) {
  const AuditLogModel = require("../dry-app/platform/features/audit-log/model/audit-log.model");

  const entree = {
    action,
    shopId: req?.user?.shopId || options.shopId || null,
    auteurId: req?.user?.id || null,
    auteurNom: req?.user?.nom || "systeme",
    auteurRole: req?.user?.role || "systeme",
    cible: options.cible,
    cibleId: options.cibleId ? String(options.cibleId) : undefined,
    avant: options.avant,
    apres: options.apres,
    severite: options.severite || "info",
    ip: req?.ip,
    userAgent: req?.headers?.["user-agent"],
  };

  AuditLogModel.create(entree).catch((e) =>
    console.error(`Echec d'ecriture du journal d'audit (${action}) : ${e.message}`.red)
  );
}

module.exports = { recordAudit };
