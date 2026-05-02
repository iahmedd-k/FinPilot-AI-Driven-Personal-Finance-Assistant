const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { aiChat, getQuickPrompts } = require("../controllers/ai.controller");

// AI specific rate limiter — stricter than global
const rateLimit = require("express-rate-limit");
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,             // 1 minute
  max: 10,                         // max 10 AI requests per minute
  message: { success: false, message: "Too many AI requests. Slow down." },
});

router.use(protect);

router.post("/chat",          aiLimiter, aiChat);
router.get("/quick-prompts",            getQuickPrompts);

module.exports = router;