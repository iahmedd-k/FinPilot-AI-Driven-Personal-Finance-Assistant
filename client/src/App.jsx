import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";

import { AuthProvider }      from "./context/AuthContext";
import { PortfolioProvider } from "./context/PortfolioContext";
import ProtectedRoute        from "./components/auth/ProtectedRoute";
import { ROUTES }            from "./constants/routes";

import Landing        from "./pages/Landing";
import Login          from "./pages/auth/Login";
import ResetPassword  from "./pages/auth/ResetPassword";
import Dashboard      from "./pages/Dashboard";
import Transactions   from "./pages/Transactions";
import Goals          from "./pages/Goals";
import Subscription   from "./pages/Subscription";
import NotFound       from "./pages/NotFound";
import ProfilePage    from "./pages/ProfilePage";
import DocsPage       from "./pages/DocsPage";

// QueryClient must be outside App() — instantiating inside would reset cache on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,              // always re-fetch on mount — individual queries override this
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>                  {/* BrowserRouter first — AuthProvider uses useNavigate */}
        <AuthProvider>
          <PortfolioProvider>         {/* PortfolioProvider inside AuthProvider — needs user context */}
            <Routes>
              <Route path={ROUTES.HOME}            element={<Landing />} />
              <Route path={ROUTES.LOGIN}           element={<Login />} />
              <Route path={ROUTES.REGISTER}        element={<Login />} />
              <Route path={ROUTES.FORGOT_PASSWORD} element={<Login />} />
              <Route path={ROUTES.RESET_PASSWORD}  element={<ResetPassword />} />
              <Route path={ROUTES.DOCS}            element={<DocsPage />} />

              <Route element={<ProtectedRoute />}>
                <Route path={ROUTES.DASHBOARD}    element={<Dashboard />} />
                <Route path={ROUTES.TRANSACTIONS} element={<Transactions />} />
                <Route path ={ROUTES.PROFILEPAGE} element={<ProfilePage />}/>
                <Route path={ROUTES.GOALS}        element={<Goals />} />
                <Route path={ROUTES.SUBSCRIPTION} element={<Subscription />} />
              </Route>

              <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
                },
              }}
            />
          </PortfolioProvider>
        </AuthProvider>
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
