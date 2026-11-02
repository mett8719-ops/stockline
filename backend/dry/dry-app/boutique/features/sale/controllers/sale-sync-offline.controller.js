/**
 * POST /sales/sync — Synchronisation des ventes conclues hors ligne.
 *
 * Le poste de caisse envoie un lot de ventes accumulees pendant la coupure
 * reseau.
 *
 * ══ PRINCIPE CLE : TRAITEMENT INDEPENDANT ══
 * Chaque vente est traitee separement. Si l'une echoue — parce qu'un autre
 * poste a vendu le meme produit entre-temps et que le stock est devenu
 * insuffisant — les autres sont TOUT DE MEME enregistrees.
 *
 * Le rapport renvoye liste precisement les succes, les doublons ignores et
 * les echecs, afin que le caissier sache exactement quoi corriger.
 */
const asyncHandler = require("../../../../../core/async-handler");
const { success } = require("../../../../../core/response");
const { tenantScope } = require("../../../../../core/tenant-guard");
const SaleModel = require("../model/sale.model");
const creerVente = require("./sale-create.controller");
const colors = require("colors");

module.exports = asyncHandler(async (req, res) => {
  const { ventes } = req.validated.body;

  const resultats = { synchronisees: [], doublons: [], echecs: [] };

  for (const donneesVente of ventes) {
    try {
      // ── Doublon deja synchronise lors d'une tentative precedente ────
      if (donneesVente.clientOperationId) {
        const existante = await SaleModel.findOne(
          tenantScope(req, { clientOperationId: donneesVente.clientOperationId })
        )
          .select("reference date")
          .lean();

        if (existante) {
          resultats.doublons.push({
            clientOperationId: donneesVente.clientOperationId,
            reference: existante.reference,
          });
          continue;
        }
      }

      /**
       * On REUTILISE le controleur de creation, avec une fausse reponse
       * Express. Cela garantit que les regles metier sont STRICTEMENT
       * IDENTIQUES en ligne et hors ligne — pas de duplication de logique,
       * donc pas de divergence possible.
       */
      const fausseReponse = {
        statusCode: null,
        payload: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.payload = body; return this; },
      };

      await creerVente(
        {
          ...req,
          validated: { body: { ...donneesVente, creeeHorsLigne: true } },
        },
        fausseReponse,
        (err) => { throw err; }   // propage l'erreur au catch ci-dessous
      );

      resultats.synchronisees.push({
        clientOperationId: donneesVente.clientOperationId,
        reference: fausseReponse.payload?.data?.vente?.reference,
      });
    } catch (e) {
      console.warn(
        `Echec de synchronisation (${donneesVente.clientOperationId}) : ${e.message}`.yellow
      );

      resultats.echecs.push({
        clientOperationId: donneesVente.clientOperationId,
        raison: e.message,
        code: e.code || "SYNC_ERROR",
        // Detail des produits en rupture, le cas echeant
        details: e.details,
      });
    }
  }

  return success(res, {
    resume: {
      total: ventes.length,
      synchronisees: resultats.synchronisees.length,
      doublons: resultats.doublons.length,
      echecs: resultats.echecs.length,
    },
    ...resultats,
  });
});
