import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "../../hooks/useAuthContext";
import { ROUTES } from "../../constants/routes";
import LoadingSpinner from "../common/LoadingSpinner";

export default function ProtectedRoute() {
  const { user, loading } = useAuthContext();

  // Still checking auth state — show spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <LoadingSpinner />
      </div>
    );
  }

  // Not logged in — redirect to login
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Logged in — render the protected page
  return <Outlet />;
}