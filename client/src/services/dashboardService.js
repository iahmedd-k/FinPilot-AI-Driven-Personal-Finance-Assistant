import api from "./api";

export const dashboardService = {
  getDashboard: () => api.get("/dashboard"),
  getSummary: () => api.get("/dashboard/summary"),
  getForecast: (params = {}) => api.get("/dashboard/forecast", { params }),
  getSpendingSettings: () => api.get("/dashboard/spending-settings"),
  saveSpendingSettings: (payload) => api.post("/dashboard/spending-settings", payload),
  getForecastCustomizations: () => api.get("/dashboard/forecast/customizations"),
  saveForecastCustomizations: (payload) => api.post("/dashboard/forecast/customizations", payload),
  resetForecastCustomizations: () => api.post("/dashboard/forecast/customizations/reset"),
  exportData: () => api.post("/dashboard/export"),
};
