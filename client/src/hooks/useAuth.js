import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthContext } from "./useAuthContext";
import { authService } from "../services/authService";
import { ROUTES } from "../constants/routes";

export function useAuth() {
  const { user, loading, login: setAuthSession, logout, updateUser, fetchMe } = useAuthContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Register ──
  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: ({ data }) => {
      setAuthSession(data.accessToken, data.user);
      toast.success("Account created! Let's set up your profile.", {
        id: "auth-success",
        duration: 1500,
      });
      navigate(ROUTES.DASHBOARD);
    },
  });

  // ── Login ──
  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: ({ data }) => {
      queryClient.clear(); // wipe any previous user's cached data before setting new user
      setAuthSession(data.accessToken, data.user);
      toast.success(`Welcome back, ${data.user.name}!`, {
        id: "auth-success",
        duration: 1500,
      });
      navigate(ROUTES.DASHBOARD);
    },
  });

  // ── Logout ──
  const handleLogout = async () => {
    queryClient.clear(); // wipe all cached data on logout — prevents next user seeing stale data
    await logout();
    toast.dismiss();
    navigate(ROUTES.HOME);
    toast.success("Logged out successfully", {
      id: "auth-success",
      duration: 1500,
    });
  };

  // ── Forgot Password ──
  const forgotMutation = useMutation({
    mutationFn: authService.forgotPassword,
    onSuccess: () => {
      toast.success("Reset link sent! Check your email.", {
        id: "auth-success",
        duration: 1500,
      });
    },
  });

  // ── Reset Password ──
  const resetMutation = useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: ({ data }) => {
      queryClient.clear(); // fresh session after password reset
      setAuthSession(data.accessToken, data.user);
      toast.success("Password reset! Welcome back.", {
        id: "auth-success",
        duration: 1500,
      });
      navigate(ROUTES.DASHBOARD);
    },
  });

  const completeExternalLogin = async (accessToken) => {
    localStorage.setItem("accessToken", accessToken);
    queryClient.clear();
    const { data } = await authService.getMe();
    setAuthSession(accessToken, data.user);
    toast.success(`Welcome${data.user?.name ? `, ${data.user.name}` : ""}!`, {
      id: "auth-success",
      duration: 1500,
    });
    navigate(ROUTES.DASHBOARD, { replace: true });
    return data.user;
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    updateUser,
    fetchMe,                                    // exposed so Dashboard can call refreshUser
    register:      registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    login:         loginMutation.mutateAsync,   // mutateAsync so Login page can await + catch
    isLoggingIn:   loginMutation.isPending,
    logout:        handleLogout,
    forgotPassword:      forgotMutation.mutateAsync,
    isSendingReset:      forgotMutation.isPending,
    forgotSuccess:       forgotMutation.isSuccess,
    resetPassword:       resetMutation.mutateAsync,
    isResettingPassword: resetMutation.isPending,
    completeExternalLogin,
  };
}
