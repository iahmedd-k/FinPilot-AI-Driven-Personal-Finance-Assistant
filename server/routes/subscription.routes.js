const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getBillingStatus, createCheckoutSession, createPortalSession, syncCheckoutSession } = require("../controllers/subscription.controller");

router.get("/status", protect, getBillingStatus);
router.post("/create-checkout-session", protect, createCheckoutSession);
router.post("/create-portal-session", protect, createPortalSession);
router.post("/sync-checkout-session", protect, syncCheckoutSession);
// Webhook is registered in app.js with raw body (no protect, no JSON)

module.exports = router;
