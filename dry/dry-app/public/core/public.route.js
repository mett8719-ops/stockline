/**
 * Routeur de l'espace PUBLIC — aucune authentification.
 *
 * Trois familles de routes :
 *   - inscription et plans tarifaires (landing page)
 *   - callback de la passerelle de paiement
 *
 * Le callback est ici parce qu'il est appele par un service externe qui ne
 * peut pas s'authentifier. Sa securite repose sur la re-verification
 * systematique du statut aupres de la passerelle.
 */
const express = require("express");
const signupRoute = require("../features/signup/routes/signup.route");
const billing = require("../../platform/features/billing/controllers/billing.controllers");
const { registerRoute, registerSchema } = require("../../../core/openapi");
const { z } = require("zod");

const router = express.Router();

// Inscription et plans publies
router.use("/", signupRoute);

// ══ CALLBACK DE LA PASSERELLE DE PAIEMENT ═════════════════════════════
router.post("/payments/callback", billing.paymentCallback);

registerRoute({
  method: "post",
  path: "/public/payments/callback",
  tags: ["Inscription"],
  security: false,
  summary: "Notification de la passerelle de paiement (usage interne)",
  description:
    "Appele par la passerelle Mobile Money, jamais par un navigateur.\n\n" +
    "Le corps de la requete n'est jamais cru sur parole : le statut reel est " +
    "systematiquement re-verifie aupres de la passerelle avant de marquer une " +
    "facture comme payee.\n\n" +
    "Repond toujours 200, meme sur transaction inconnue, pour eviter les " +
    "relances en boucle.",
  responses: {
    200: registerSchema("PaymentCallbackAck", z.object({ recu: z.boolean() })),
  },
});

module.exports = router;
