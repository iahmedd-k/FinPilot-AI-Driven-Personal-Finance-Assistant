/**
 * Middleware to restrict routes to Pro subscribers only.
 * Usage: router.get("/pro-feature", protect, requirePro, handler);
 */
const requirePro = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  if (user.subscriptionTier !== "pro") {
    return res.status(403).json({
      success: false,
      message: "This feature requires a Pro subscription.",
      currentTier: user.subscriptionTier,
      upgradeUrl: "/subscription",
    });
  }

  next();
};

module.exports = { requirePro };
