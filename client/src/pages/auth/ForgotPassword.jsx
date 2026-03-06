import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import AuthCard from "../../components/auth/AuthCard";
import { useAuth } from "../../hooks/useAuth";
import { ROUTES } from "../../constants/routes";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

const inputBase = "w-full px-4 py-3 rounded-lg text-sm outline-none transition-all font-sans text-[#111827]";
const inputStyle = (hasError) => ({
  background: "#fff",
  border: hasError ? "1.5px solid #f87171" : "1.5px solid #e5e7eb",
});
const inputFocus = (e, hasError) => !hasError && (e.target.style.borderColor = "#10b981");
const inputBlur = (e, hasError) => !hasError && (e.target.style.borderColor = "#e5e7eb");

export default function ForgotPassword() {
  const { forgotPassword, isSendingReset, forgotSuccess } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data) => forgotPassword(data);

  if (forgotSuccess) {
    return (
      <AuthCard title="Check your email" subtitle="We've sent you a password reset link.">
        <div className="text-center py-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "#d1fae5" }}
          >
            <MailCheck size={26} style={{ color: "#10b981" }} />
          </div>
          <p className="text-sm mb-6 text-[#4b5563]">
            If that email is registered, a reset link is on its way. Check your inbox and spam folder.
          </p>
          <Link to={ROUTES.LOGIN} className="text-sm font-semibold text-[#10b981] no-underline hover:text-[#059669]">
            Back to Sign In
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2 text-[#374151]">Email Address</label>
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

        <button
          type="submit"
          disabled={isSendingReset}
          className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all border-none cursor-pointer text-white bg-[#111827] disabled:bg-[#e5e7eb] disabled:text-[#6b7280] disabled:cursor-not-allowed hover:bg-[#1f2937] hover:-translate-y-px"
        >
          {isSendingReset ? (
            <><Loader2 size={16} className="animate-spin" /> Sending...</>
          ) : (
            "Send Reset Link →"
          )}
        </button>

        <p className="text-center text-sm text-[#4b5563]">
          Remember it?{" "}
          <Link to={ROUTES.LOGIN} className="text-[#10b981] font-semibold no-underline hover:text-[#059669]">
            Back to Sign In
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
