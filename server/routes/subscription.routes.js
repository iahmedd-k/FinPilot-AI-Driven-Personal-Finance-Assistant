const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getBillingStatus, createCheckoutSession, createPortalSession } = require("../controllers/subscription.controller");

router.get("/status", getBillingStatus);
router.post("/create-checkout-session", protect, createCheckoutSession);
router.post("/create-portal-session", protect, createPortalSession);
// Webhook is registered in app.js with raw body (no protect, no JSON)

module.exports = router;
