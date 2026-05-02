const jwt = require("jsonwebtoken");

const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });
};

const setRefreshTokenCookie = (res, refreshToken) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,         // 7 days
  });
};

const buildAuthUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  preferredCurrency: user.preferredCurrency,
  subscriptionTier: user.subscriptionTier,
  monthlyIncome: user.monthlyIncome,
  isOnboarded: user.isOnboarded,
  transactionsUsed: user.transactionsUsed,
  aiQueriesUsed: user.aiQueriesUsed,
  usageResetDate: user.usageResetDate,
});

const buildAuthPayload = (user) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  return {
    success: true,
    accessToken,
    refreshToken,
    user: buildAuthUser(user),
  };
};

const sendTokens = (res, user, statusCode) => {
  const payload = buildAuthPayload(user);
  setRefreshTokenCookie(res, payload.refreshToken);

  res.status(statusCode).json({
    success: payload.success,
    accessToken: payload.accessToken,
    user: payload.user,
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  buildAuthUser,
  buildAuthPayload,
  sendTokens,
};
