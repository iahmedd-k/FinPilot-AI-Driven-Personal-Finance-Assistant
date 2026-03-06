import api from "./api";

export const authService = {
  register: (data) =>
    api.post("/auth/register", data),

  login: (data) =>
    api.post("/auth/login", data),

  logout: () =>
    api.post("/auth/logout"),

  forgotPassword: (data) =>
    api.post("/auth/forgot-password", data),

  resetPassword: ({ token, password }) =>
    api.patch(`/auth/reset-password/${token}`, { password }),

  getMe: () =>
    api.get("/auth/me"),
};