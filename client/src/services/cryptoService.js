import api from "./api";

export const cryptoService = {
  add: (data) => api.post("/crypto", data),
  list: () => api.get("/crypto"),
  delete: (id) => api.delete(`/crypto/${id}`),
  update: (id, data) => api.patch(`/crypto/${id}`, data),
};
