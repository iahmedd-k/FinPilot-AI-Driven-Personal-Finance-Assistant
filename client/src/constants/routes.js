export const ROUTES = {
  // Public
  HOME:           "/",
  LOGIN:          "/login",
  REGISTER:       "/register",
  FORGOT_PASSWORD:"/forgot-password",
  RESET_PASSWORD: "/reset-password/:token",
  DOCS:           "/docs/:slug",

  // Protected
  ONBOARDING:     "/onboarding",
  DASHBOARD:      "/dashboard",
  PROFILEPAGE:    "/profile",
  TRANSACTIONS:   "/transactions",
  GOALS:          "/goals",
  AI_ASSISTANT:   "/ai",
  SUBSCRIPTION:   "/subscription",

  // Misc
  NOT_FOUND:      "*",
};
