const crypto = require("crypto");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ChatSession = require("../models/ChatSession");
const { sendTokens, generateAccessToken, buildAuthPayload, setRefreshTokenCookie } = require("../utils/generateToken");
const {
  getSupportedCurrencies,
  isSupportedCurrency,
  convertUserFinancialData,
} = require("../services/currencyConversionService");

const getClientUrl = () => process.env.CLIENT_URL || "http://localhost:5173";

const getGoogleRedirectUri = (req) =>
  process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/auth/google/callback`;

const buildGoogleErrorRedirect = (req, message) => {
  const params = new URLSearchParams({
    provider: "google",
    error: message || "Google sign-in failed.",
  });

  return `${getClientUrl()}/login?${params.toString()}`;
};

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

const deriveGoogleName = ({ name, given_name, email }) =>
  String(name || given_name || email?.split("@")[0] || "Google User").trim();

const ensureMonthlyUsageFresh = async (user) => {
  if (user?.usageResetDate && new Date() >= user.usageResetDate) {
    await user.resetMonthlyUsage();
    return User.findById(user._id);
  }
  return user;
};

const verifyGoogleIdToken = async (idToken, expectedAudience) => {
  const { data } = await axios.get("https://oauth2.googleapis.com/tokeninfo", {
    params: { id_token: idToken },
    timeout: 10000,
  });

  if (!data?.sub || !data?.email) {
    throw new Error("Google account details were incomplete.");
  }

  if (expectedAudience && data.aud !== expectedAudience) {
    throw new Error("Google token audience mismatch.");
  }

  if (String(data.email_verified) !== "true") {
    throw new Error("Google email is not verified.");
  }

  return data;
};

const findOrCreateGoogleUser = async (googleProfile) => {
  const email = normalizeEmail(googleProfile.email);
  const googleId = String(googleProfile.sub);
  const fallbackPassword = crypto.randomBytes(32).toString("hex");

  let user = await User.findOne({
    $or: [{ googleId }, { email }],
  });

  if (!user) {
    user = await User.create({
      name: deriveGoogleName(googleProfile),
      email,
      googleId,
      passwordHash: fallbackPassword,
    });
    return user;
  }

  let shouldSave = false;
  if (!user.googleId) {
    user.googleId = googleId;
    shouldSave = true;
  }
  if (!user.name || user.name.trim().length < 2) {
    user.name = deriveGoogleName(googleProfile);
    shouldSave = true;
  }
  if (user.email !== email) {
    user.email = email;
    shouldSave = true;
  }

  if (shouldSave) {
    await user.save();
  }

  return user;
};

// ─── @POST /api/auth/register ──────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

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

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      return res.status(401).json({ success: false, message: "No account found with this email." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    if (new Date() >= user.usageResetDate) {
      await user.resetMonthlyUsage();
    }

    sendTokens(res, user, 200);
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/auth/google ─────────────────────────────
const startGoogleAuth = async (req, res, next) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(buildGoogleErrorRedirect(req, "Google sign-in is not configured yet."));
    }

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: getGoogleRedirectUri(req),
      response_type: "code",
      scope: "openid email profile",
      access_type: "online",
      prompt: "select_account",
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/auth/google/callback ────────────────────
const googleAuthCallback = async (req, res, next) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.redirect(buildGoogleErrorRedirect(req, "Google sign-in was cancelled."));
    }

    if (!code) {
      return res.redirect(buildGoogleErrorRedirect(req, "Missing Google authorization code."));
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(buildGoogleErrorRedirect(req, "Google sign-in is not configured yet."));
    }

    const redirectUri = getGoogleRedirectUri(req);
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000,
      }
    );

    const idToken = tokenResponse?.data?.id_token;
    if (!idToken) {
      return res.redirect(buildGoogleErrorRedirect(req, "Google did not return an identity token."));
    }

    const googleProfile = await verifyGoogleIdToken(idToken, process.env.GOOGLE_CLIENT_ID);
    let user = await findOrCreateGoogleUser(googleProfile);
    user = await ensureMonthlyUsageFresh(user);

    const payload = buildAuthPayload(user);
    setRefreshTokenCookie(res, payload.refreshToken);

    const params = new URLSearchParams({
      provider: "google",
      accessToken: payload.accessToken,
    });

    res.redirect(`${getClientUrl()}/login?${params.toString()}`);
  } catch (err) {
    console.error("Google auth callback failed:", err?.response?.data || err.message);
    res.redirect(buildGoogleErrorRedirect(req, "Google sign-in failed. Please try again."));
  }
};

// ─── @POST /api/auth/refresh ───────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: "No refresh token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id).lean();
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
    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/auth/me ─────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, user: req.user });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/auth/currency-options ───────────────────
const getCurrencyOptions = async (req, res, next) => {
  try {
    const currencies = await getSupportedCurrencies();
    res.status(200).json({
      success: true,
      currencies,
      selectedCurrency: req.user?.preferredCurrency || "USD",
    });
  } catch (err) {
    next(err);
  }
};

// ─── @PUT /api/auth/currency ───────────────────────────
const updateCurrency = async (req, res, next) => {
  try {
    const currency = String(req.body?.currency || "").trim().toUpperCase();
    const isSupported = await isSupportedCurrency(currency);
    if (!isSupported) {
      const currencies = await getSupportedCurrencies();
      return res.status(400).json({
        success: false,
        message: `Unsupported currency. Supported values: ${currencies.join(", ")}`,
      });
    }

    const currentUser = await User.findById(req.user._id).select("preferredCurrency");
    if (!currentUser) return res.status(404).json({ success: false, message: "User not found." });

    const currentCurrency = String(currentUser.preferredCurrency || "USD").toUpperCase();

    if (currentCurrency !== currency) {
      try {
        await convertUserFinancialData({
          userId: req.user._id,
          fromCurrency: currentCurrency,
          toCurrency: currency,
        });
      } catch (conversionError) {
        return res.status(502).json({
          success: false,
          message: conversionError?.message || "Currency conversion failed. Please try again.",
        });
      }
    }

    const user = await User.findById(req.user._id)
      .select("-passwordHash -refreshToken -passwordResetToken -passwordResetExpires");

    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    res.status(200).json({ success: true, message: "Currency updated successfully.", user });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/auth/forgot-password ──────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({ success: true, message: "If that email exists, a reset link was sent" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const { sendResetEmail } = require("../services/emailService");

    try {
      await sendResetEmail(user.email, resetToken);
      console.log("✅ Email sent to:", user.email);
    } catch (emailErr) {
      console.error("❌ Email send failed:", emailErr.message);
      return res.status(500).json({ success: false, message: emailErr.message });
    }

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

// ─── @PUT /api/auth/profile ────────────────────────────
// Updates personal info + taxes/income fields from the Profile tab.
// All fields are optional — only included fields are updated.
const updateProfile = async (req, res, next) => {
  try {
    const {
      name, email,
      dob, country, phone, address,
      employment, annualIncome, taxStatus, preferredCurrency,
    } = req.body;

    const currentUser = await User.findById(req.user._id).select("email preferredCurrency");
    if (!currentUser) return res.status(404).json({ success: false, message: "User not found." });

    const update = {};
    let currencyChange = null;

    // Core identity
    if (name  !== undefined) update.name  = name.trim();
    if (email !== undefined) {
      const normalised = email.trim().toLowerCase();
      // Block if another account already uses this email
      if (normalised !== currentUser.email) {
        const exists = await User.findOne({ email: normalised, _id: { $ne: req.user._id } }).lean();
        if (exists) {
          return res.status(400).json({ success: false, message: "Email already in use." });
        }
      }
      update.email = normalised;
    }

    // Personal information
    if (dob     !== undefined) update.dob     = dob     || null;
    if (country !== undefined) update.country = country || null;
    if (phone   !== undefined) update.phone   = phone   || null;
    if (address !== undefined) update.address = address || null;

    // Taxes & income
    if (employment   !== undefined) update.employment   = employment   || null;
    if (annualIncome !== undefined) update.annualIncome = annualIncome != null ? Number(annualIncome) : null;
    if (taxStatus    !== undefined) update.taxStatus    = taxStatus    || null;
    if (preferredCurrency !== undefined) {
      const normalizedCurrency = String(preferredCurrency || "").trim().toUpperCase();
      const isSupported = await isSupportedCurrency(normalizedCurrency);
      if (!isSupported) {
        const currencies = await getSupportedCurrencies();
        return res.status(400).json({
          success: false,
          message: `Unsupported currency. Supported values: ${currencies.join(", ")}`,
        });
      }

      const currentCurrency = String(currentUser.preferredCurrency || "USD").toUpperCase();
      if (normalizedCurrency !== currentCurrency) {
        currencyChange = {
          fromCurrency: currentCurrency,
          toCurrency: normalizedCurrency,
        };
      }
    }

    await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (currencyChange) {
      try {
        await convertUserFinancialData({
          userId: req.user._id,
          fromCurrency: currencyChange.fromCurrency,
          toCurrency: currencyChange.toCurrency,
        });
      } catch (conversionError) {
        return res.status(502).json({
          success: false,
          message: conversionError?.message || "Currency conversion failed. Please try again.",
        });
      }
    }

    const user = await User.findById(req.user._id)
      .select("-passwordHash -refreshToken -passwordResetToken -passwordResetExpires");

    if (update.memoryAssistEnabled === false) {
      await ChatSession.deleteMany({ userId: req.user._id });
    }

    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    res.status(200).json({ success: true, message: "Profile updated successfully.", user });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors).map(e => e.message).join(", "),
      });
    }
    next(err);
  }
};

// ─── @PUT /api/auth/password ───────────────────────────
// Verifies current password then saves a new hashed one.
// The pre-save hook on the User model handles the bcrypt hashing.
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ success: false, message: "Current password is required." });
    }
    if (!newPassword) {
      return res.status(400).json({ success: false, message: "New password is required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    }

    // passwordHash is select:false — must explicitly select it
    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }

    // Assign plain text — the pre("save") hook will bcrypt it automatically
    user.passwordHash = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: "Password changed successfully." });
  } catch (err) {
    next(err);
  }
};

// ─── @PUT /api/auth/financial-profile ─────────────────
// Saves the AI Financial Profile tab fields.
const updateFinancialProfile = async (req, res, next) => {
  try {
    const { age, location, employment, annualIncome, riskProfile, dependents, memoryAssistEnabled } = req.body;

    const update = {};
    if (age          !== undefined) update.age          = age != null ? Number(age) : null;
    if (location     !== undefined) update.location     = location     || null;
    if (employment   !== undefined) update.employment   = employment   || null;
    if (annualIncome !== undefined) update.annualIncome = annualIncome != null ? Number(annualIncome) : null;
    if (riskProfile  !== undefined) update.riskProfile  = riskProfile  || null;
    if (dependents   !== undefined) update.dependents   = Number(dependents) || 0;
    if (memoryAssistEnabled !== undefined) update.memoryAssistEnabled = !!memoryAssistEnabled;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true, runValidators: true }
    ).select("-passwordHash -refreshToken -passwordResetToken -passwordResetExpires");

    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    res.status(200).json({ success: true, message: "Financial profile updated.", user });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors).map(e => e.message).join(", "),
      });
    }
    next(err);
  }
};

// ─── @DELETE /api/auth/account ─────────────────────────
// Permanently deletes the user + all their data.
// Adjust the model names to match your actual models.
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Delete all related collections in parallel
    // .catch(() => {}) so a missing model doesn't crash the whole handler
    const mongoose = require("mongoose");

    await Promise.all([
      mongoose.model("Transaction").deleteMany({ user: userId }).catch(() => {}),
      mongoose.model("Goal").deleteMany({ user: userId }).catch(() => {}),
      mongoose.model("Asset").deleteMany({ user: userId }).catch(() => {}),
      mongoose.model("AISession").deleteMany({ user: userId }).catch(() => {}),
    ]);

    await User.findByIdAndDelete(userId);

    // Clear the refresh token cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });

    res.status(200).json({ success: true, message: "Account deleted successfully." });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
  updateProfile,
  updatePassword,
  updateFinancialProfile,
  deleteAccount,
};
