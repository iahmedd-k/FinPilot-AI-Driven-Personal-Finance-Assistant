import axios from "axios";

const rawApiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
const normalizedApiBase = String(rawApiBase).replace(/\/+$/, "");
const resolvedApiBase = /\/api$/i.test(normalizedApiBase)
  ? normalizedApiBase
  : `${normalizedApiBase}/api`;

const api = axios.create({
  baseURL: resolvedApiBase,
  withCredentials: true,           // Send cookies (refresh token)
  headers: { "Content-Type": "application/json" },
});

// ── Auth routes — never redirect on 401 here ──────────
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];
const isAuthPage = () => AUTH_ROUTES.some((r) => window.location.pathname.startsWith(r));

// ── Request interceptor: attach access token ──────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// ── Track in-flight refresh to avoid parallel refresh calls ──
let isRefreshing = false;
let refreshQueue = []; // callbacks waiting for the new token

const processQueue = (error, token = null) => {
  refreshQueue.forEach((cb) => (error ? cb.reject(error) : cb.resolve(token)));
  refreshQueue = [];
};

// ── Response interceptor: handle 401 + token refresh ──
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Don't attempt refresh if there's no token or no response status
    if (!localStorage.getItem("accessToken") || !err.response) {
      return Promise.reject(err);
    }

    // If 401 and not already retried
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;

      // If a refresh is already in flight, queue this request
      // instead of firing a second /auth/refresh call
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (original.headers) {
              typeof original.headers.set === 'function' 
                ? original.headers.set('Authorization', `Bearer ${token}`) 
                : (original.headers.Authorization = `Bearer ${token}`);
            }
            return api(original);
          })
          .catch((e) => Promise.reject(e));
      }

      isRefreshing = true;
      try {
        const baseURL = api.defaults.baseURL || "http://localhost:5000/api";
        const { data } = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.accessToken;
        localStorage.setItem("accessToken", newToken);
        if (api.defaults.headers.common) {
          api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        }
        if (original.headers) {
          typeof original.headers.set === 'function'
            ? original.headers.set('Authorization', `Bearer ${newToken}`)
            : (original.headers.Authorization = `Bearer ${newToken}`);
        }
        processQueue(null, newToken);
        return api(original);
      } catch (refreshErr) {
        // Refresh failed — clear queue, wipe token, redirect if not on auth page
        processQueue(refreshErr, null);
        localStorage.removeItem("accessToken");
        if (!isAuthPage()) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;