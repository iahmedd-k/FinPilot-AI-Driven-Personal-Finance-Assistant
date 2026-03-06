import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthContext } from "./useAuthContext";
import { authService } from "../services/authService";
import { ROUTES } from "../constants/routes";

export function useAuth() {
  const { user, loading, login, logout, updateUser } = useAuthContext();
  const navigate = useNavigate();

  // ── Register ──
  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: ({ data }) => {
      login(data.accessToken, data.user);
      toast.success("Account created! Let's set up your profile.");
      navigate(ROUTES.DASHBOARD);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Registration failed");
    },
  });

  // ── Login ──
  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: ({ data }) => {
      login(data.accessToken, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(ROUTES.DASHBOARD);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Invalid email or password");
    },
  });

  // ── Logout ──
  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.HOME);
    toast.success("Logged out successfully");
  };

  // ── Forgot Password ──
  const forgotMutation = useMutation({
    mutationFn: authService.forgotPassword,
    onSuccess: () => {
      toast.success("Reset link sent! Check your email.");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Something went wrong");
    },
  });

  // ── Reset Password ──
  const resetMutation = useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: ({ data }) => {
      login(data.accessToken, data.user);
      toast.success("Password reset! Welcome back.");
      navigate(ROUTES.DASHBOARD);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Reset link is invalid or expired");
    },
  });

  return {
    user,
    loading,
    isAuthenticated: !!user,
    updateUser,
    register:      registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    login:         loginMutation.mutate,
    isLoggingIn:   loginMutation.isPending,
    logout:        handleLogout,
    forgotPassword:      forgotMutation.mutate,
    isSendingReset:      forgotMutation.isPending,
    forgotSuccess:       forgotMutation.isSuccess,
    resetPassword:       resetMutation.mutate,
    isResettingPassword: resetMutation.isPending,
  };
}