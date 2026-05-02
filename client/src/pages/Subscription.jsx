import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, CheckCircle2, Crown, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "../hooks/useAuthContext";
import { subscriptionService } from "../services/subscriptionService";
import { ROUTES } from "../constants/routes";

const C = {
  successText: "#1A8B5C",
  successBg: "rgba(26,139,92,0.10)",
  infoText: "#0D7377",
  infoBg: "rgba(13,115,119,0.10)",
  warningBg: "rgba(212,168,83,0.10)",
  warningBorder: "#D4A853",
  warningText: "#D4A853",
};

const O = {
  bg: "var(--bg-primary)",
  cardBg: "var(--bg-card)",
  cardShadow: "var(--shadow-card)",
  cardRadius: 16,
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textMuted: "var(--text-muted)",
  border: "var(--border-default)",
  borderLight: "var(--border-subtle)",
  green: "#1A8B5C",
  teal: "#0D7377",
  navy: "#0A0A1A",
  pillBg: "var(--bg-secondary)",
};

function BrandLockup() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0A0A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #fff", position: "relative" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />
        </div>
      </div>
      <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", fontFamily: "Inter, sans-serif" }}>FinPilot</span>
    </div>
  );
}

function ActionButton({ children, primary = false, disabled = false, icon = null, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      {...props}
      style={{
        width: "100%",
        minHeight: 50,
        borderRadius: 999,
        border: primary ? `1px solid ${O.navy}` : `1px solid ${O.border}`,
        background: primary ? O.navy : O.pillBg,
        color: primary ? "#FFFFFF" : O.textPrimary,
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: "Inter, sans-serif",
        padding: "0 16px",
        boxShadow: primary ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, fetchMe } = useAuthContext();
  const [loadingAction, setLoadingAction] = useState("");

  const isPro = String(user?.subscriptionTier || "").toLowerCase() === "pro";
  const canceled = searchParams.get("canceled") === "true";

  const { data: billingStatus } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => subscriptionService.getBillingStatus(),
    enabled: !!user,
    retry: false,
  });

  const billingConfigured = !!billingStatus?.billingConfigured;
  const hasBillingAccount = !!user?.stripeCustomerId || !!user?.stripeSubscriptionId || isPro;
  const liveSubscription = billingStatus?.subscription || null;
  const livePrice = billingStatus?.proPrice || null;
  const liveInterval = liveSubscription?.interval || livePrice?.interval || "month";
  const billingCycleLabel = liveInterval === "year" ? "yearly" : "monthly";
  const statusLabel = liveSubscription?.status ? liveSubscription.status.replace(/_/g, " ") : (isPro ? "active" : "free");
  const statusDateLabel = liveSubscription?.currentPeriodEnd
    ? new Date(liveSubscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const displayAmount = livePrice?.unitAmount != null
    ? new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(livePrice.currency || "usd").toUpperCase(),
    }).format(livePrice.unitAmount / 100)
    : "$99.00";
  const displayInterval = livePrice?.intervalCount && livePrice.intervalCount > 1
    ? `${livePrice.intervalCount} ${liveInterval}s`
    : liveInterval;

  useEffect(() => {
    fetchMe?.();
  }, [fetchMe]);

  useEffect(() => {
    if (canceled) {
      toast.info("Checkout canceled.");
    }
  }, [canceled]);

  const runBillingAction = async (kind) => {
    setLoadingAction(kind);
    try {
      if (kind === "upgrade") {
        const { url } = await subscriptionService.createCheckoutSession();
        if (url) {
          window.location.href = url;
          return;
        }
      }

      if (kind === "manage") {
        const { url } = await subscriptionService.createPortalSession();
        if (url) {
          window.location.href = url;
          return;
        }
      }

      toast.error("Billing action failed.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Billing action failed.");
    } finally {
      setLoadingAction("");
    }
  };

  const featureList = useMemo(
    () => [
      "Unlimited transactions and imports",
      "AI advisor and advanced forecasting",
      "Full dashboard insights and Pro tools",
      "Stripe-hosted secure billing",
    ],
    []
  );
  const membershipTone = isPro
    ? { color: C.successText, background: C.successBg }
    : { color: C.infoText, background: C.infoBg };

  return (
    <div style={{ minHeight: "100vh", background: O.bg, color: O.textPrimary, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @media (max-width: 1024px) {
          .subscription-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="subscription-layout" style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)", minHeight: "100vh" }}>
        <section style={{ background: O.navy, color: "#FFFFFF", padding: "40px 32px", display: "flex", flexDirection: "column", gap: 28 }}>
          <BrandLockup />

          <div style={{ marginTop: 12, display: "grid", gap: 16 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, width: "fit-content", padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 12.5, fontWeight: 700 }}>
              <Crown size={14} />
              {isPro ? "Pro Active" : "Free Plan"}
            </div>

            <div style={{ fontSize: 34, lineHeight: 1.1, letterSpacing: "-0.04em", fontWeight: 800 }}>
              {isPro ? "Your Pro access is active." : "Upgrade to Pro with Stripe Checkout."}
            </div>

            <div style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,0.7)", maxWidth: 360 }}>
              {isPro
                ? "Your account already has Pro access. Billing is managed in Stripe, and your dashboard tools stay unlocked."
                : "Free users can upgrade straight to Pro. Stripe handles payment details securely, so this page only shows plan details and the upgrade action."}
            </div>
          </div>

          <div style={{ marginTop: 8, display: "grid", gap: 12 }}>
            {featureList.map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.9)", fontSize: 14.5 }}>
                <CheckCircle2 size={16} style={{ color: "#4ade80", flexShrink: 0 }} />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate(ROUTES.DASHBOARD)}
            style={{ marginTop: "auto", width: "fit-content", border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", gap: 10, color: "#FFFFFF", fontSize: 15, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
          >
            <ArrowLeft size={17} />
            Return to dashboard
          </button>
        </section>

        <section style={{ padding: "40px 32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 760, background: O.cardBg, border: `1px solid ${O.border}`, borderRadius: 24, boxShadow: O.cardShadow, padding: "32px 28px" }}>
            {!billingConfigured ? (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", border: `1px solid ${C.warningBorder}`, background: C.warningBg, borderRadius: 14, padding: "13px 14px", marginBottom: 20 }}>
                <AlertCircle size={16} color={C.warningText} style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 13.5, lineHeight: 1.55, color: C.warningText }}>
                  {billingStatus?.hint || "Stripe billing is not configured on the server."}
                </div>
              </div>
            ) : null}

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: membershipTone.background, color: membershipTone.color, fontSize: 12.5, fontWeight: 700, border: `1px solid ${O.border}` }}>
                  {isPro ? <ShieldCheck size={14} /> : <Sparkles size={14} />}
                  {isPro ? "Pro membership" : "Free membership"}
                </div>

                <div style={{ marginTop: 18, fontSize: 30, lineHeight: 1.1, letterSpacing: "-0.04em", fontWeight: 800, color: O.textPrimary }}>
                  {isPro ? "FinPilot Pro" : "Upgrade to FinPilot Pro"}
                </div>

                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700, color: O.textPrimary }}>
                  {displayAmount} per {displayInterval}
                </div>

                <div style={{ marginTop: 14, maxWidth: 560, fontSize: 15, lineHeight: 1.65, color: O.textSecondary }}>
                  {isPro
                    ? `Your ${billingCycleLabel} Pro subscription is ${statusLabel}.${statusDateLabel ? ` Current access runs through ${statusDateLabel}.` : ""} If you need billing changes, invoices, or cancellation, manage everything inside Stripe.`
                    : liveSubscription?.status
                      ? `Your last ${billingCycleLabel} Stripe subscription is ${statusLabel}.${statusDateLabel ? ` It ended or updates on ${statusDateLabel}.` : ""}`
                      : "You are currently on the free tier. Continue to Stripe Checkout to upgrade your account to Pro."}
                </div>
              </div>

              <div style={{ width: "100%", maxWidth: 280, display: "grid", gap: 12 }}>
                {!isPro ? (
                  <ActionButton
                    primary
                    disabled={!billingConfigured || !!loadingAction}
                    onClick={() => runBillingAction("upgrade")}
                    icon={loadingAction === "upgrade" ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Crown size={16} />}
                  >
                    Continue to Stripe Checkout
                  </ActionButton>
                ) : (
                  <ActionButton
                    primary
                    disabled={!billingConfigured || !!loadingAction || !hasBillingAccount}
                    onClick={() => runBillingAction("manage")}
                    icon={loadingAction === "manage" ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <ShieldCheck size={16} />}
                  >
                    Manage in Stripe
                  </ActionButton>
                )}

                <ActionButton onClick={() => navigate(ROUTES.DASHBOARD)}>
                  Back to dashboard
                </ActionButton>
              </div>
            </div>

                <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <div style={{ border: `1px solid ${O.border}`, borderRadius: 16, padding: "16px 18px", background: O.bg }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: O.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em" }}>Plan</div>
                <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700, color: O.textPrimary }}>{isPro ? "Pro" : "Free"}</div>
                <div style={{ marginTop: 6, fontSize: 13.5, color: O.textSecondary }}>
                  {isPro ? "All Pro features are enabled on this account." : "Upgrade to unlock all Pro features."}
                </div>
              </div>

              <div style={{ border: `1px solid ${O.border}`, borderRadius: 16, padding: "16px 18px", background: O.bg }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: O.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em" }}>Billing</div>
                <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700, color: O.textPrimary }}>
                  {billingConfigured ? "Stripe Checkout" : "Not configured"}
                </div>
                <div style={{ marginTop: 6, fontSize: 13.5, color: O.textSecondary }}>
                  {isPro ? "Stripe is used for managing your active subscription." : "Payment details are collected securely in Stripe during checkout."}
                </div>
              </div>

              <div style={{ border: `1px solid ${O.border}`, borderRadius: 16, padding: "16px 18px", background: O.bg }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: O.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em" }}>Status</div>
                <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700, color: O.textPrimary, textTransform: "capitalize" }}>{statusLabel}</div>
                <div style={{ marginTop: 6, fontSize: 13.5, color: O.textSecondary }}>
                  {liveSubscription?.cancelAtPeriodEnd
                    ? `Cancellation is scheduled. Access remains until ${statusDateLabel || "the end of the billing period"}.`
                    : liveSubscription?.status === "canceled" || liveSubscription?.status === "unpaid" || liveSubscription?.status === "past_due"
                      ? `This subscription is no longer active${statusDateLabel ? ` as of ${statusDateLabel}` : ""}.`
                      : statusDateLabel
                        ? `Current billing period ends on ${statusDateLabel}.`
                        : "No active Stripe subscription found for this account."}
                </div>
              </div>

              <div style={{ border: `1px solid ${O.border}`, borderRadius: 16, padding: "16px 18px", background: O.bg }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: O.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em" }}>Account</div>
                <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700, color: O.textPrimary }}>{user?.email || "Signed in user"}</div>
                <div style={{ marginTop: 6, fontSize: 13.5, color: O.textSecondary }}>
                  {hasBillingAccount ? "Billing account found for this user." : "A Stripe billing account will be created when checkout completes."}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
