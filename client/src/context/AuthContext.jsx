/* eslint-disable no-empty */
import { createContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

// eslint-disable-next-line react-refresh/eslint-disable no-empty-export-components
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializationAttempt, setInitializationAttempt] = useState(0);

  // useCallback so fetchMe is a stable reference — safe to call from Dashboard
  const fetchMe = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        // No token available — just mark as not loading
        setLoading(false);
        return;
      }
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      setLoading(false);
    } catch (err) {
      // Only clear token if it's a 401 (unauthorized)
      // Other errors (network, server errors) shouldn't clear the token
      if (err.response?.status === 401) {
        localStorage.removeItem("accessToken");
        setUser(null);
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (accessToken, userData) => {
    localStorage.setItem("accessToken", accessToken);
    setUser(userData);
    setLoading(false);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    localStorage.removeItem("accessToken");
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}