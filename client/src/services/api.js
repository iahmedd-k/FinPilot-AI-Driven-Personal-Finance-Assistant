import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,           // Send cookies (refresh token)
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach access token ──
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// ── Response interceptor: handle 401 + token refresh ──
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // If 401 and not already retried
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const baseURL = api.defaults.baseURL || "http://localhost:5000/api";
        const { data } = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        localStorage.setItem("accessToken", data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        // Refresh failed — clear token and redirect to login
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;