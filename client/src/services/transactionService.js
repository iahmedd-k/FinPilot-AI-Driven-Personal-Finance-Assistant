import api from "./api";

const TRANSACTION_CATEGORIES = [
  "Salary", "Freelance", "Investment", "Other Income",
  "Dining", "Groceries", "Transport", "Subscriptions",
  "Shopping", "Health", "Education", "Utilities",
  "Rent", "Entertainment", "Travel", "Other Expense",
];

export const transactionService = {
  getList: (params) => api.get("/transactions", { params }),
  getOne: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post("/transactions", data),
  update: (id, data) => api.patch(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  /** Upload CSV file. Backend: field "file", max 2MB, columns: amount, type, merchant, date, notes */
  importCSV: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/transactions/csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  CATEGORIES: TRANSACTION_CATEGORIES,
};
