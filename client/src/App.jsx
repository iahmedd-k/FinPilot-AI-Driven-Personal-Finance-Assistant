import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { ROUTES } from "./constants/routes";

// Pages
import Landing        from "./pages/Landing";
import Login          from "./pages/auth/Login";
import Register       from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword  from "./pages/auth/ResetPassword";
import Dashboard      from "./pages/Dashboard";
import Transactions   from "./pages/Transactions";
import Goals          from "./pages/Goals";
import Subscription   from "./pages/Subscription";
// import Onboarding  from "./pages/Onboarding";
import NotFound       from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          1000 * 60 * 5,   // 5 minutes
      retry:              1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public marketing */}
            <Route path={ROUTES.HOME}            element={<Landing />} />

            {/* Public auth */}
            <Route path={ROUTES.LOGIN}           element={<Login />} />
            <Route path={ROUTES.REGISTER}        element={<Register />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
            <Route path={ROUTES.RESET_PASSWORD}  element={<ResetPassword />} />

            {/* Protected app shell */}
            <Route element={<ProtectedRoute />}>
              <Route path={ROUTES.DASHBOARD}     element={<Dashboard />} />
              <Route path={ROUTES.TRANSACTIONS}  element={<Transactions />} />
              <Route path={ROUTES.GOALS}         element={<Goals />} />
              <Route path={ROUTES.SUBSCRIPTION}  element={<Subscription />} />
            </Route>

            {/* 404 */}
            <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
          </Routes>
        </BrowserRouter>

        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#fff",
              border: "1px solid #e5e7eb",
              color: "#111827",
              boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
            },
          }}
        />
      </AuthProvider>

      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}