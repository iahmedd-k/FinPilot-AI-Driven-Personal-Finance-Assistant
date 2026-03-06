import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, DollarSign, Target, PiggyBank, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import Logo from "../components/common/Logo";
import { useAuthContext } from "../context/AuthContext";
import api from "../services/api";
import { ROUTES } from "../constants/routes";

// ── Step schemas ──
const step1Schema = z.object({
  monthlyIncome: z.coerce.number().positive("Income must be greater than 0"),
});
const step2Schema = z.object({
  savingsGoalPercent: z.coerce.number().min(1).max(100, "Must be between 1–100"),
});
const step3Schema = z.object({
  firstTransaction: z.object({
    amount:   z.coerce.number().positive("Amount must be greater than 0"),
    type:     z.enum(["income", "expense"]),
    merchant: z.string().min(1, "Merchant is required"),
  }),
});

const steps = [
  { id: 1, label: "Income",      icon: DollarSign },
  { id: 2, label: "Savings Goal", icon: Target },
  { id: 3, label: "First Entry",  icon: PiggyBank },
];

export default function Onboarding() {
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const { updateUser } = useAuthContext();
  const navigate = useNavigate();

  const currentSchema = step === 1 ? step1Schema : step === 2 ? step2Schema : step3Schema;
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(currentSchema),
  });

  const onNext = async (data) => {
    const merged = { ...formData, ...data };
    setFormData(merged);

    if (step < 3) {
      setStep(s => s + 1);
      reset();
      return;
    }

    // Step 3 — submit everything
    setLoading(true);
    try {
      // Update user profile
      await api.patch("/auth/onboarding", {
        monthlyIncome:      merged.monthlyIncome,
        savingsGoalPercent: merged.savingsGoalPercent,
      });

      // Add first transaction
      await api.post("/transactions", {
        amount:   merged.firstTransaction.amount,
        type:     merged.firstTransaction.type,
        merchant: merged.firstTransaction.merchant,
      });

      updateUser({ isOnboarded: true, monthlyIncome: merged.monthlyIncome });
      toast.success("All set! Welcome to FinPilot 🎉");
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError) => ({
    width: "100%",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "0.9rem",
    outline: "none",
    background: "#1c2030",
    border: hasError ? "1.5px solid #f87171" : "1.5px solid rgba(255,255,255,0.08)",
    color: "#f5f0e8",
    fontFamily: "Inter, sans-serif",
    transition: "border .2s",
  });

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#0c0f18",
        backgroundImage: "radial-gradient(ellipse at 20% 20%, rgba(45,212,191,0.1) 0%, transparent 55%)",
      }}
    >
      <div className="mb-8"><Logo size="lg" /></div>

      {/* Progress steps */}
      <div className="flex items-center gap-3 mb-10">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const done    = step > s.id;
          const current = step === s.id;
          return (
            <div key={s.id} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: done ? "#2dd4bf" : current ? "rgba(45,212,191,0.15)" : "rgba(255,255,255,0.05)",
                    border: current ? "1.5px solid #2dd4bf" : done ? "none" : "1.5px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {done
                    ? <Check size={16} color="#0c0f18" strokeWidth={3} />
                    : <Icon size={16} color={current ? "#2dd4bf" : "#6b7080"} />
                  }
                </div>
                <span className="text-xs font-medium" style={{ color: current ? "#2dd4bf" : done ? "#8b90a0" : "#4b5060" }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="w-16 h-px mb-5" style={{ background: step > s.id ? "#2dd4bf" : "rgba(255,255,255,0.07)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{ background: "#141720", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <form onSubmit={handleSubmit(onNext)} className="space-y-5">

          {/* ── STEP 1: Monthly Income ── */}
          {step === 1 && (
            <>
              <div className="mb-2">
                <h2 className="text-2xl font-bold mb-2" style={{ color: "#f5f0e8", fontFamily: "Playfair Display, serif" }}>
                  What's your monthly income?
                </h2>
                <p className="text-sm" style={{ color: "#8b90a0" }}>
                  This helps FinPilot calculate your savings rate and give accurate advice.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#c0c4d0" }}>
                  Monthly Income (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: "#2dd4bf" }}>$</span>
                  <input
                    {...register("monthlyIncome")}
                    type="number"
                    placeholder="5000"
                    className="pl-8"
                    style={inputStyle(errors.monthlyIncome)}
                    onFocus={e => { if (!errors.monthlyIncome) e.target.style.border = "1.5px solid rgba(45,212,191,0.5)" }}
                    onBlur={e  => { if (!errors.monthlyIncome) e.target.style.border = "1.5px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                {errors.monthlyIncome && <p className="mt-1.5 text-xs" style={{ color: "#f87171" }}>{errors.monthlyIncome.message}</p>}
              </div>
            </>
          )}

          {/* ── STEP 2: Savings Goal ── */}
          {step === 2 && (
            <>
              <div className="mb-2">
                <h2 className="text-2xl font-bold mb-2" style={{ color: "#f5f0e8", fontFamily: "Playfair Display, serif" }}>
                  Set your savings goal
                </h2>
                <p className="text-sm" style={{ color: "#8b90a0" }}>
                  What % of your income do you want to save each month? (20% is recommended)
                </p>
              </div>
              {/* Quick picks */}
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30, 50].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => reset({ savingsGoalPercent: v })}
                    className="py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: "rgba(45,212,191,0.07)",
                      border: "1px solid rgba(45,212,191,0.15)",
                      color: "#2dd4bf",
                      cursor: "pointer",
                    }}
                  >
                    {v}%
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#c0c4d0" }}>
                  Custom %
                </label>
                <div className="relative">
                  <input
                    {...register("savingsGoalPercent")}
                    type="number"
                    placeholder="20"
                    style={{ ...inputStyle(errors.savingsGoalPercent), paddingRight: "36px" }}
                    onFocus={e => { if (!errors.savingsGoalPercent) e.target.style.border = "1.5px solid rgba(45,212,191,0.5)" }}
                    onBlur={e  => { if (!errors.savingsGoalPercent) e.target.style.border = "1.5px solid rgba(255,255,255,0.08)" }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: "#2dd4bf" }}>%</span>
                </div>
                {errors.savingsGoalPercent && <p className="mt-1.5 text-xs" style={{ color: "#f87171" }}>{errors.savingsGoalPercent.message}</p>}
              </div>
            </>
          )}

          {/* ── STEP 3: First Transaction ── */}
          {step === 3 && (
            <>
              <div className="mb-2">
                <h2 className="text-2xl font-bold mb-2" style={{ color: "#f5f0e8", fontFamily: "Playfair Display, serif" }}>
                  Add your first transaction
                </h2>
                <p className="text-sm" style={{ color: "#8b90a0" }}>
                  Let's add one transaction so FinPilot can start working for you.
                </p>
              </div>
              {/* Type toggle */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#c0c4d0" }}>Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {["income","expense"].map(t => (
                    <label
                      key={t}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all"
                      style={{ border: "1.5px solid rgba(255,255,255,0.08)", background: "#1c2030" }}
                    >
                      <input {...register("firstTransaction.type")} type="radio" value={t} className="hidden" />
                      <span style={{ color: t === "income" ? "#2dd4bf" : "#f87171" }}>
                        {t === "income" ? "↑ Income" : "↓ Expense"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Merchant */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#c0c4d0" }}>Merchant / Description</label>
                <input
                  {...register("firstTransaction.merchant")}
                  placeholder="e.g. Salary, Starbucks, Netflix"
                  style={inputStyle(errors.firstTransaction?.merchant)}
                  onFocus={e => { if (!errors.firstTransaction?.merchant) e.target.style.border = "1.5px solid rgba(45,212,191,0.5)" }}
                  onBlur={e  => { if (!errors.firstTransaction?.merchant) e.target.style.border = "1.5px solid rgba(255,255,255,0.08)" }}
                />
                {errors.firstTransaction?.merchant && <p className="mt-1.5 text-xs" style={{ color: "#f87171" }}>{errors.firstTransaction.merchant.message}</p>}
              </div>
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#c0c4d0" }}>Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: "#2dd4bf" }}>$</span>
                  <input
                    {...register("firstTransaction.amount")}
                    type="number"
                    placeholder="0.00"
                    className="pl-8"
                    style={inputStyle(errors.firstTransaction?.amount)}
                    onFocus={e => { if (!errors.firstTransaction?.amount) e.target.style.border = "1.5px solid rgba(45,212,191,0.5)" }}
                    onBlur={e  => { if (!errors.firstTransaction?.amount) e.target.style.border = "1.5px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                {errors.firstTransaction?.amount && <p className="mt-1.5 text-xs" style={{ color: "#f87171" }}>{errors.firstTransaction.amount.message}</p>}
              </div>
            </>
          )}

          {/* CTA Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all mt-2"
            style={{
              background: loading ? "#1c2030" : "#2dd4bf",
              color: loading ? "#6b7080" : "#0c0f18",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              border: "none",
            }}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Setting up...</>
            ) : step < 3 ? (
              <>Continue <ArrowRight size={16} /></>
            ) : (
              <>Go to Dashboard <ArrowRight size={16} /></>
            )}
          </button>

          {/* Skip onboarding */}
          {step === 3 && (
            <button
              type="button"
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="w-full text-center text-sm transition-colors"
              style={{ color: "#4b5060", background: "none", border: "none", cursor: "pointer" }}
            >
              Skip for now
            </button>
          )}
        </form>
      </div>

      {/* Step counter */}
      <p className="mt-5 text-xs" style={{ color: "#4b5060" }}>
        Step {step} of {steps.length}
      </p>
    </div>
  );
}