import api from "./api";

const GOAL_CATEGORIES = [
  "Emergency Fund", "Travel", "Education", "Home",
  "Car", "Retirement", "Business", "Other",
];

export const goalService = {
  getList: (params) => api.get("/goals", { params }),
  getOne: (id) => api.get(`/goals/${id}`),
  create: (data) => api.post("/goals", data),
  update: (id, data) => api.patch(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`),
  contribute: (id, amount) => api.post(`/goals/${id}/contribute`, { amount }),
  CATEGORIES: GOAL_CATEGORIES,
};
