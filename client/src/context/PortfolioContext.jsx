import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { cryptoService } from "../services/cryptoService";
import { useAuthContext } from "../hooks/useAuthContext";

const PortfolioContext = createContext();

export function PortfolioProvider({ children }) {
  const { user } = useAuthContext();
  const [assets, setAssets]   = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshAssets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await cryptoService.list();
      setAssets(data.assets || []);
    } catch (err) {
      console.error("Failed to load portfolio", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?._id) {
      refreshAssets();      // fetch this user's portfolio
    } else {
      setAssets([]);        // logged out → clear immediately
      setLoading(false);
    }
  }, [user?._id]);          // re-runs whenever user changes (login / logout / switch)

  return (
    <PortfolioContext.Provider value={{ assets, loading, refreshAssets }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  return useContext(PortfolioContext);
}