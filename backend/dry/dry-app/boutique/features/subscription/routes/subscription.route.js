/**
 * Routes de consultation et paiement de l'abonnement par la boutique.
 */
const express = require("express");
const {
  getMySubscription,
  payMySubscription,
  checkPaymentStatus,
} = require("../controllers/subscription.controllers");

const router = express.Router();

router.get("/", getMySubscription);
router.post("/pay", payMySubscription);
router.get("/payment-status/:paymentId", checkPaymentStatus);

module.exports = router;
