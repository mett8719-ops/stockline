/**
 * Plugin Mongoose d'isolation multi-tenant — DEUXIEME BARRIERE DE SECURITE.
 *
 * Applique a tout modele metier de boutique, il :
 *   1. ajoute le champ `shopId` obligatoire, indexe et IMMUABLE ;
 *   2. refuse l'enregistrement d'un document sans shopId ;
 *   3. bloque, EN DEVELOPPEMENT, toute requete lancee sans filtre shopId
 *      → l'oubli apparait immediatement au dev, au lieu de devenir une fuite
 *        silencieuse en production.
 *
 * Usage dans un modele :
 *   const tenantPlugin = require("../../../../core/tenant.plugin");
 *   productSchema.plugin(tenantPlugin);
 */
const mongoose = require("mongoose");

module.exports = function tenantPlugin(schema, options = {}) {
  schema.add({
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "platform-shop",
      required: [true, "shopId est obligatoire (isolation multi-tenant)"],
      index: true,
      immutable: true, // une donnee ne change JAMAIS de boutique
    },
  });

  // Garde-fou actif uniquement hors production
  if (process.env.NODE_ENV !== "production" && !options.allowGlobalQueries) {
    const hooks = [
      "find", "findOne", "findOneAndUpdate",
      "updateMany", "deleteMany", "countDocuments",
    ];

    schema.pre(hooks, function guardTenantFilter() {
      const filtre = this.getFilter() || {};
      const aShopId =
        "shopId" in filtre ||
        (filtre.$and || []).some((c) => "shopId" in c) ||
        (Array.isArray(filtre.$or) && filtre.$or.length > 0 &&
          filtre.$or.every((c) => "shopId" in c));

      if (!aShopId && !this.getOptions()?.bypassTenantGuard) {
        throw new Error(
          `[ISOLATION] Requete sur ${this.model.modelName} sans filtre shopId. ` +
          "Utilisez tenantScope(req, {...}). Si la requete est volontairement " +
          "globale (tache planifiee, console plateforme), passez explicitement " +
          "l'option { bypassTenantGuard: true }."
        );
      }
    });
  }
};
