import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, Sparkles, CreditCard, Bot, Zap } from "lucide-react";
import { useAuthContext } from "../hooks/useAuthContext";
import { subscriptionService } from "../services/subscriptionService";
import { ROUTES } from "../constants/routes";
import { toast } from "sonner";

const FREE_TX_LIMIT = 10;
const FREE_AI_LIMIT = 5;

const freeFeatures = [
  "10 transactions/month",
  "5 AI queries/month",
  "Basic dashboard",
  "Goal tracking",
];

const proFeatures = [
  "Unlimited transactions",
  "Unlimited AI queries",
  "AI auto-categorization",
  "Cash flow forecasting",
  "Advanced analytics",
  "Export data anytime",
];

export default function Subscription() {
  const { user, fetchMe } = useAuthContext();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [billingError, setBillingError] = useState(null);

  const { data: billingStatus } = useQuery({
    queryKey: ["billingStatus"],
    queryFn: () => subscriptionService.getBillingStatus(),
    retry: false,
  });
  const billingHint = billingStatus?.hint || null;

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  useEffect(() => {
    if (success) {
      toast.success("Welcome to Pro! Your account is upgraded.");
      fetchMe();
    }
  }, [success, fetchMe]);

  useEffect(() => {
    if (canceled) {
      toast.info("Checkout canceled.");
    }
  }, [canceled]);

  const handleUpgrade = async () => {
    setBillingError(null);
    setLoading(true);
    try {
      const { url } = await subscriptionService.createCheckoutSession();
      if (url) window.location.href = url;
      else toast.error("Could not start checkout");
    } catch (err) {
      const msg = err.response?.data?.message || "Checkout failed";
      const status = err.response?.status;
      setBillingError(status === 503 || (status === 400 && msg?.toLowerCase().includes("stripe")) ? msg : null);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      const { url } = await subscriptionService.createPortalSession();
      if (url) window.location.href = url;
      else toast.error("Could not open billing portal");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to open portal");
    } finally {
      setLoading(false);
    }
  };

  const isPro = user?.subscriptionTier === "pro";
  const txUsed = user?.transactionsUsed ?? 0;
  const aiUsed = user?.aiQueriesUsed ?? 0;
  const txLimit = isPro ? "∞" : FREE_TX_LIMIT;
  const aiLimit = isPro ? "∞" : FREE_AI_LIMIT;

  return (
    <div className="min-h-screen bg-[#f7f6f2] font-sans text-[#111827]">
      <header className="border-b border-[#e6e3dc] bg-white px-4 py-3 flex items-center gap-3">
        <Link to={ROUTES.DASHBOARD} className="p-2 rounded-lg text-[#6b7280] hover:bg-[#f3f4f6]">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Plan & Billing
        </h1>
      </header>

      <main className="max-w-[1000px] mx-auto px-4 py-8 space-y-8">
        {success && (
          <div className="p-4 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] text-sm font-medium">
            You’re now on Pro. Limits have been lifted.
          </div>
        )}

        {(billingError || (billingHint && !billingStatus?.billingConfigured)) && (
          <div className="p-4 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-sm">
            <p className="font-semibold mb-1">Billing not configured</p>
            <p className="text-[#991b1b]">{billingError || billingHint}</p>
            <p className="mt-2 text-xs">Use <strong>server</strong> folder’s <code className="bg-white/80 px-1 rounded">.env</code> (not client). Add <code className="bg-white/80 px-1 rounded">STRIPE_SECRET_KEY</code> and <code className="bg-white/80 px-1 rounded">STRIPE_PRICE_ID_PRO</code>, then <strong>restart the server</strong>.</p>
          </div>
        )}

        {/* Current usage */}
        <section className="bg-white rounded-2xl border border-[#e6e3dc] p-6 shadow-sm">
          <h2 className="text-sm font-bold text-[#6b7280] uppercase tracking-wider mb-4">Your usage</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f9fafb]">
              <CreditCard size={20} className="text-[#0d9488]" />
              <div>
                <p className="text-xs text-[#6b7280]">Transactions this month</p>
                <p className="text-lg font-bold text-[#111827]">
                  {isPro ? `${txUsed} (unlimited)` : `${txUsed} / ${txLimit}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f9fafb]">
              <Bot size={20} className="text-[#6366f1]" />
              <div>
                <p className="text-xs text-[#6b7280]">AI queries this month</p>
                <p className="text-lg font-bold text-[#111827]">
                  {isPro ? `${aiUsed} (unlimited)` : `${aiUsed} / ${aiLimit}`}
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-[#9ca3af] mt-3">
            Limits reset on the 1st of each month. Upgrade to Pro for unlimited usage.
          </p>
        </section>

        {/* Pricing cards */}
        <section>
          <h2 className="text-sm font-bold text-[#6b7280] uppercase tracking-wider mb-4">Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="bg-white rounded-2xl border-2 border-[#e5e7eb] p-6">
              <h3 className="text-xl font-bold text-[#111827] mb-2">Free</h3>
              <p className="text-3xl font-extrabold text-[#111827] mb-1">
                $0 <span className="text-base font-medium text-[#6b7280]">/month</span>
              </p>
              <p className="text-sm text-[#6b7280] mb-6">Perfect for trying FinPilot</p>
              <ul className="list-none mb-6 space-y-2">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[#374151]">
                    <Check size={18} className="text-[#10b981] shrink-0" strokeWidth={3} />
                    {f}
                  </li>
                ))}
              </ul>
              {isPro ? null : (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 rounded-xl bg-[#e5e7eb] text-[#6b7280] font-semibold cursor-not-allowed"
                >
                  Current plan
                </button>
              )}
            </div>

            {/* Pro */}
            <div className="bg-white rounded-2xl border-2 border-[#10b981] p-6 relative shadow-lg" style={{ boxShadow: "0 20px 60px rgba(16,185,129,0.12)" }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#10b981] to-[#6366f1]">
                {isPro ? "Current plan" : "Recommended"}
              </div>
              <h3 className="text-xl font-bold text-[#111827] mb-2 flex items-center gap-2">
                <Sparkles size={20} className="text-[#10b981]" /> Pro
              </h3>
              <p className="text-3xl font-extrabold text-[#111827] mb-1">
                $12 <span className="text-base font-medium text-[#6b7280]">/month</span>
              </p>
              <p className="text-sm text-[#6b7280] mb-6">Unlimited transactions & AI</p>
              <ul className="list-none mb-6 space-y-2">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[#374151]">
                    <Check size={18} className="text-[#10b981] shrink-0" strokeWidth={3} />
                    {f}
                  </li>
                ))}
              </ul>
              {isPro ? (
                <button
                  type="button"
                  onClick={handleManage}
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-[#111827] bg-[#f3f4f6] border border-[#e5e7eb] hover:bg-[#e5e7eb] transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                  Manage subscription
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#10b981] to-[#6366f1] hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  Upgrade to Pro
                </button>
              )}
            </div>
          </div>
        </section>

        <p className="text-center text-sm text-[#6b7280]">
          Secure payment via Stripe. Cancel anytime from the billing portal.
        </p>
      </main>
    </div>
  );
}
