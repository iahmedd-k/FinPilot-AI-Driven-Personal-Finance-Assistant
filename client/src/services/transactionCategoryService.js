import api from "./api";

export const transactionCategoryService = {
  list: () => api.get("/transaction-categories"),
  create: (data) => api.post("/transaction-categories", data),
  update: (id, data) => api.patch(`/transaction-categories/${id}`, data),
};
