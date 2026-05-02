import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthCard from "../../components/auth/AuthCard";
import AlertBanner from "../../components/ui/AlertBanner";
import { useAuth } from "../../hooks/useAuth";
import { ROUTES } from "../../constants/routes";

const schema = z.object({
  name:     z.string().min(2, "Name must be at least 2 characters"),
  email:    z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[0-9]/, "Include at least one number"),
});

/* ── Password strength meter ── */
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: "6+ chars",  ok: password.length >= 6 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Number",    ok: /[0-9]/.test(password) },
    { label: "Symbol",    ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const barColor = score <= 1 ? "#f87171" : score === 2 ? "#fbbf24" : score === 3 ? "#60a5fa" : "#34d399";
  const label    = score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2.5"
    >
      {/* Bars */}
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: n <= score ? barColor : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>
      {/* Labels row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map(({ label, ok }) => (
            <span key={label} className="flex items-center gap-1 text-[10px]"
              style={{ color: ok ? "#6ee7b7" : "#52525b" }}>
              {ok ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
              {label}
            </span>
          ))}
        </div>
        <span className="text-[10px] font-semibold" style={{ color: barColor }}>{label}</span>
      </div>
    </motion.div>
  );
}

/* ── Field wrapper ── */
function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-zinc-300">{label}</label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-1.5 flex items-center gap-1.5 text-[0.75rem] text-red-400"
          >
            <AlertCircle size={12} /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const baseInput = {
  background: "rgba(255,255,255,0.05)",
  color: "#f4f4f5",
};

export default function Register() {
  const [showPass, setShowPass]   = useState(false);
  const [password, setPassword]   = useState("");
  const [serverErr, setServerErr] = useState(null);
  const { register: registerUser, isRegistering } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data) => {
    setServerErr(null);
    try {
      registerUser(data);
    } catch (err) {
      const msg = err?.response?.data?.message || "Registration failed";
      const friendlyMap = {
        "already exists":      "An account with this email already exists. Try logging in instead.",
        "email taken":         "This email is already taken. Try a different one.",
        "invalid email":       "That email address doesn't look valid.",
        "password too short":  "Password needs to be at least 6 characters.",
      };
      const friendly = Object.keys(friendlyMap).find((k) =>
        msg.toLowerCase().includes(k.toLowerCase())
      );
      setServerErr(friendlyMap[friendly] || msg);
    }
  };

  const inputBorder = (hasErr) =>
    hasErr ? "1.5px solid rgba(239,68,68,0.6)" : "1.5px solid rgba(255,255,255,0.1)";
  const onFocus = (e, hasErr) => { if (!hasErr) e.target.style.borderColor = "rgba(99,102,241,0.6)"; };
  const onBlur  = (e, hasErr) => { if (!hasErr) e.target.style.borderColor = "rgba(255,255,255,0.1)"; };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start managing your finances with AI in under 3 minutes."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Server error banner */}
        <AnimatePresence>
          {serverErr && (
            <AlertBanner
              variant="error"
              title="Registration failed"
              message={serverErr}
              onClose={() => setServerErr(null)}
            />
          )}
        </AnimatePresence>

        {/* Full Name */}
        <Field label="Full Name" error={errors.name?.message}>
          <input
            {...register("name")}
            placeholder="John Doe"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all text-zinc-100 placeholder:text-zinc-600"
            style={{ ...baseInput, border: inputBorder(!!errors.name) }}
            onFocus={(e) => onFocus(e, !!errors.name)}
            onBlur={(e)  => onBlur(e, !!errors.name)}
          />
        </Field>

        {/* Email */}
        <Field label="Email Address" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all text-zinc-100 placeholder:text-zinc-600"
            style={{ ...baseInput, border: inputBorder(!!errors.email) }}
            onFocus={(e) => onFocus(e, !!errors.email)}
            onBlur={(e)  => onBlur(e, !!errors.email)}
          />
        </Field>

        {/* Password */}
        <Field label="Password" error={errors.password?.message}>
          <div className="relative">
            <input
              {...register("password")}
              type={showPass ? "text" : "password"}
              placeholder="Min. 6 characters"
              className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all text-zinc-100 placeholder:text-zinc-600"
              style={{ ...baseInput, border: inputBorder(!!errors.password) }}
              onFocus={(e) => onFocus(e, !!errors.password)}
              onBlur={(e)  => onBlur(e, !!errors.password)}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {/* Strength meter only when typing */}
          <AnimatePresence>{password && <PasswordStrength password={password} />}</AnimatePresence>
        </Field>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={isRegistering}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all mt-1 border-none cursor-pointer text-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
            boxShadow: "0 0 24px rgba(99,102,241,0.35)",
          }}
        >
          {isRegistering ? (
            <><Loader2 size={16} className="animate-spin" /> Creating account…</>
          ) : (
            "Create Account →"
          )}
        </motion.button>

        <div className="flex items-center gap-3 my-0">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          <span className="text-xs text-zinc-600">or</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
        </div>

        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link to={ROUTES.LOGIN} className="text-indigo-400 font-semibold no-underline hover:text-indigo-300 transition-colors">
            Sign in
          </Link>
        </p>
      </form>

      <p className="mt-6 text-xs text-center text-zinc-700">
        By creating an account you agree to our Terms of Service and Privacy Policy.
      </p>
    </AuthCard>
  );
}
