import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import AuthCard from "../../components/auth/AuthCard";
import { useAuth } from "../../hooks/useAuth";

const schema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirm:  z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

const inputBase = "w-full px-4 py-3 rounded-lg text-sm outline-none transition-all font-sans text-[#111827]";
const inputStyle = (hasError) => ({
  background: "#fff",
  border: hasError ? "1.5px solid #f87171" : "1.5px solid #e5e7eb",
});
const inputFocus = (e, hasError) => !hasError && (e.target.style.borderColor = "#10b981");
const inputBlur = (e, hasError) => !hasError && (e.target.style.borderColor = "#e5e7eb");

export default function ResetPassword() {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { token } = useParams();
  const { resetPassword, isResettingPassword } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = ({ password }) => resetPassword({ token, password });

  return (
    <AuthCard
      title="Set new password"
      subtitle="Choose a strong password for your account."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        <div>
          <label className="block text-sm font-medium mb-2 text-[#374151]">New Password</label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPass ? "text" : "password"}
              placeholder="Min. 6 characters"
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

        <div>
          <label className="block text-sm font-medium mb-2 text-[#374151]">Confirm Password</label>
          <div className="relative">
            <input
              {...register("confirm")}
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat your password"
              className={`${inputBase} pr-11`}
              style={inputStyle(!!errors.confirm)}
              onFocus={(e) => inputFocus(e, !!errors.confirm)}
              onBlur={(e) => inputBlur(e, !!errors.confirm)}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] bg-transparent border-none cursor-pointer"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirm && <p className="mt-1.5 text-xs text-[#f87171]">{errors.confirm.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isResettingPassword}
          className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all border-none cursor-pointer text-white bg-[#111827] disabled:bg-[#e5e7eb] disabled:text-[#6b7280] disabled:cursor-not-allowed hover:bg-[#1f2937] hover:-translate-y-px"
        >
          {isResettingPassword ? (
            <><Loader2 size={16} className="animate-spin" /> Resetting...</>
          ) : (
            "Reset Password →"
          )}
        </button>
      </form>
    </AuthCard>
  );
}
