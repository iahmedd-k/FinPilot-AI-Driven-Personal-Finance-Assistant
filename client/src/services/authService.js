import api from "./api";

export const authService = {
  register: (data) =>
    api.post("/auth/register", data),

  login: (data) =>
    api.post("/auth/login", data),

  getGoogleAuthUrl: () =>
    `${api.defaults.baseURL || "http://localhost:5000/api"}/auth/google`,

  logout: () =>
    api.post("/auth/logout"),

  forgotPassword: (data) =>
    api.post("/auth/forgot-password", data),

  resetPassword: ({ token, password }) =>
    api.patch(`/auth/reset-password/${token}`, { password }),

  getMe: () =>
    api.get("/auth/me"),

  getCurrencyOptions: () =>
    api.get("/auth/currency-options"),

  updateCurrency: (currency) =>
    api.put("/auth/currency", { currency }),

  updateProfile: (data) =>
    api.put("/auth/profile", data),
};
