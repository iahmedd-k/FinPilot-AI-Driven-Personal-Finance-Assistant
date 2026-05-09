// ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "../../hooks/useAuthContext";
import { ROUTES } from "../../constants/routes";
import LoadingSpinner from "../common/LoadingSpinner";

export default function ProtectedRoute() {
  const { user, loading } = useAuthContext();

  // While still initializing auth state, show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <LoadingSpinner />
      </div>
    );
  }

  // If no user after loading is done, redirect to login
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // User is authenticated and loading is done
  return <Outlet />;
}