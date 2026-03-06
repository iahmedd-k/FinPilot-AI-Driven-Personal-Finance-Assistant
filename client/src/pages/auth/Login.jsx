import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import AuthCard from "../../components/auth/AuthCard";
import { useAuth } from "../../hooks/useAuth";
import { ROUTES } from "../../constants/routes";

const schema = z.object({
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const inputBase = "w-full px-4 py-3 rounded-lg text-sm outline-none transition-all font-sans text-[#111827]";
const inputStyle = (hasError) => ({
  background: "#fff",
  border: hasError ? "1.5px solid #f87171" : "1.5px solid #e5e7eb",
});
const inputFocus = (e, hasError) => !hasError && (e.target.style.borderColor = "#10b981");
const inputBlur = (e, hasError) => !hasError && (e.target.style.borderColor = "#e5e7eb");

export default function Login() {
  const [showPass, setShowPass] = useState(false);
  const { login, isLoggingIn } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data) => login(data);

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your FinPilot account to continue."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        <div>
          <label className="block text-sm font-medium mb-2 text-[#374151]">
            Email Address
          </label>
          <input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            className={inputBase}
            style={inputStyle(!!errors.email)}
            onFocus={(e) => inputFocus(e, !!errors.email)}
            onBlur={(e) => inputBlur(e, !!errors.email)}
          />
          {errors.email && <p className="mt-1.5 text-xs text-[#f87171]">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[#374151]">Password</label>
            <Link to={ROUTES.FORGOT_PASSWORD} className="text-xs text-[#10b981] font-medium no-underline hover:text-[#059669]">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              {...register("password")}
              type={showPass ? "text" : "password"}
              placeholder="Your password"
              className={`${inputBase} pr-11`}
              style={inputStyle(!!errors.password)}
              onFocus={(e) => inputFocus(e, !!errors.password)}
              onBlur={(e) => inputBlur(e, !!errors.password)}
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] bg-transparent border-none cursor-pointer"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-xs text-[#f87171]">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoggingIn}
          className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all mt-2 border-none cursor-pointer text-white bg-[#111827] disabled:bg-[#e5e7eb] disabled:text-[#6b7280] disabled:cursor-not-allowed hover:bg-[#1f2937] hover:-translate-y-px"
        >
          {isLoggingIn ? (
            <><Loader2 size={16} className="animate-spin" /> Signing in...</>
          ) : (
            "Sign In →"
          )}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#e5e7eb]" />
          <span className="text-xs text-[#6b7280]">or</span>
          <div className="flex-1 h-px bg-[#e5e7eb]" />
        </div>

        <p className="text-center text-sm text-[#4b5563]">
          Don't have an account?{" "}
          <Link to={ROUTES.REGISTER} className="text-[#10b981] font-semibold no-underline hover:text-[#059669]">
            Create one free
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
