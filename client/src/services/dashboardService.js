import api from "./api";

export const dashboardService = {
  getDashboard: () => api.get("/dashboard"),
  getSummary: () => api.get("/dashboard/summary"),
};
