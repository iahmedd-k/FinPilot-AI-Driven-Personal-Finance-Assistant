const express = require("express");
const router = express.Router();
const {
  register,
  login,
  startGoogleAuth,
  googleAuthCallback,
  refreshToken,
  logout,
  getMe,
  getCurrencyOptions,
  updateCurrency,
  forgotPassword,
  resetPassword,
  // ── New handlers ──
  updateProfile,
  updatePassword,
  updateFinancialProfile,
  deleteAccount,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/auth.validator");

// ─── Public routes ─────────────────────────────────────
router.post("/register",               validate(registerSchema),       register);
router.post("/login",                  validate(loginSchema),          login);
router.get("/google",                                                  startGoogleAuth);
router.get("/google/callback",                                         googleAuthCallback);
router.post("/refresh",                                                refreshToken);
router.post("/forgot-password",        validate(forgotPasswordSchema), forgotPassword);
router.patch("/reset-password/:token", validate(resetPasswordSchema),  resetPassword);

// ─── Protected routes ──────────────────────────────────
router.post  ("/logout",             protect, logout);
router.get   ("/me",                 protect, getMe);
router.get   ("/currency-options",   protect, getCurrencyOptions);
router.put   ("/currency",           protect, updateCurrency);

// Profile page endpoints
router.put   ("/profile",            protect, updateProfile);
router.put   ("/password",           protect, updatePassword);
router.put   ("/financial-profile",  protect, updateFinancialProfile);
router.delete("/account",            protect, deleteAccount);

module.exports = router;
