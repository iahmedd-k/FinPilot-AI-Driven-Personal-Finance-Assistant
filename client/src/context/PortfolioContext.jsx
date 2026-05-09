import { createContext, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { cryptoService } from "../services/cryptoService";
import { useAuthContext } from "../hooks/useAuthContext";

const PortfolioContext = createContext();

export function PortfolioProvider({ children }) {
  const { user } = useAuthContext();

  const {
    data: assets = [],
    isLoading: loading,
    refetch: refreshAssets,
  } = useQuery({
    queryKey: ["profile-assets", user?._id],
    queryFn: () => cryptoService.list().then((r) => r.data?.assets || []),
    enabled: !!user?._id,
    staleTime: 0,
    refetchOnMount: true,
  });

  const netWorthAssets = useMemo(
    () => assets.filter((asset) => asset?.includeInNetWorth !== false),
    [assets]
  );

  return (
    <PortfolioContext.Provider value={{ assets, netWorthAssets, loading, refreshAssets }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  return useContext(PortfolioContext);
}
