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

const sendTokens = (res, user, statusCode) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Refresh token in HTTP-only cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,         // 7 days
  });

  res.status(statusCode).json({
    success: true,
    accessToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      monthlyIncome: user.monthlyIncome,
      isOnboarded: user.isOnboarded,
      transactionsUsed: user.transactionsUsed,
      aiQueriesUsed: user.aiQueriesUsed,
      usageResetDate: user.usageResetDate,
    },
  });
};

module.exports = { generateAccessToken, generateRefreshToken, sendTokens };