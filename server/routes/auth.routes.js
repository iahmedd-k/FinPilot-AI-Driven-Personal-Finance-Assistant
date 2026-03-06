const express = require("express");
const router = express.Router();
const {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/auth.validator");

// Public routes
router.post("/register",        validate(registerSchema),       register);
router.post("/login",           validate(loginSchema),          login);
router.post("/refresh",                                         refreshToken);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.patch("/reset-password/:token", validate(resetPasswordSchema), resetPassword);

// Protected routes
router.post("/logout",  protect, logout);
router.get("/me",       protect, getMe);

module.exports = router;