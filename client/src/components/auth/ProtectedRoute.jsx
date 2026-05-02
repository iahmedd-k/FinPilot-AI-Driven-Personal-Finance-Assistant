// ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "../../hooks/useAuthContext";
import { ROUTES } from "../../constants/routes";
import LoadingSpinner from "../common/LoadingSpinner";
import { PortfolioProvider } from "../../context/PortfolioContext"; // ✅ add this

export default function ProtectedRoute() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // ✅ PortfolioProvider lives here — mounts once, never remounts on navigation
  return (
    <PortfolioProvider>
      <Outlet />
    </PortfolioProvider>
  );
}