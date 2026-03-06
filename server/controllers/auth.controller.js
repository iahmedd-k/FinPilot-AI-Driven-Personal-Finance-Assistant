

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendTokens, generateAccessToken } = require("../utils/generateToken");

// ─── @POST /api/auth/register ──────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // Create user (password hashed via pre-save hook)
    const user = await User.create({ name, email, passwordHash: password });

    sendTokens(res, user, 201);
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/auth/login ─────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Get user with password
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Reset monthly usage if needed
    if (new Date() >= user.usageResetDate) {
      await user.resetMonthlyUsage();
    }

    sendTokens(res, user, 200);
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/auth/refresh ───────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: "No refresh token" });
    }

    // Verify refresh token
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const accessToken = generateAccessToken(user._id);
    res.status(200).json({ success: true, accessToken });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/auth/logout ────────────────────────────
const logout = async (req, res, next) => {
  try {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/auth/me ─────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/auth/forgot-password ──────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({ success: true, message: "If that email exists, a reset link was sent" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    // TODO: send email with resetToken
    // await sendResetEmail(user.email, resetToken);

    res.status(200).json({ success: true, message: "If that email exists, a reset link was sent" });
  } catch (err) {
    next(err);
  }
};

// ─── @PATCH /api/auth/reset-password/:token ───────────
const resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Token is invalid or expired" });
    }

    user.passwordHash = req.body.password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    sendTokens(res, user, 200);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refreshToken, logout, getMe, forgotPassword, resetPassword };