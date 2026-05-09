import { useQuery } from "@tanstack/react-query";
import { ROUTES } from "../../../constants/routes";
import { subscriptionService } from "../../../services/subscriptionService";
import { BG, BORDER, Card, CardHeader, GREEN, MUTED, RED, SURFACE_STRONG, TEXT, TEXT_ON_STRONG } from "../shared";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

export default function MembershipTab({ user, navigate, isMobile }) {
  const { data: billing, isLoading } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => subscriptionService.getBillingStatus(),
    staleTime: 60000,
  });

  const isPro = String(user?.subscriptionTier || "").toLowerCase() === "pro";
  const subStatus = billing?.subscription?.status || user?.subscriptionStatus || "inactive";
  const isExpired = !["active", "trialing"].includes(subStatus) && subStatus !== "inactive";
  
  const since = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";
  
  // Use currentPeriodEnd from live billing, or falling back to saved expiry date, or falling back to usage reset date for free
  const expiryRaw = billing?.subscription?.currentPeriodEnd || user?.subscriptionExpiryDate;
  const renewal = expiryRaw 
    ? new Date(expiryRaw).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) 
    : (user?.usageResetDate ? new Date(user.usageResetDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—");

  const getStatusBadge = () => {
    if (isPro) return { label: "Active", icon: CheckCircle2, color: GREEN, bg: "rgba(34, 197, 94, 0.1)" };
    if (isExpired) return { label: "Expired", icon: AlertCircle, color: RED, bg: "rgba(239, 68, 68, 0.1)" };
    return { label: "Free Plan", icon: Clock, color: MUTED, bg: "var(--surface-muted)" };
  };

  const badge = getStatusBadge();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <CardHeader
          label="Your Current Plan"
          right={
            <button type="button" onClick={() => navigate(ROUTES.SUBSCRIPTION)} style={{ padding: isMobile ? "7px 14px" : "9px 20px", borderRadius: 10, border: "none", background: SURFACE_STRONG, color: TEXT_ON_STRONG, fontSize: isMobile ? 12 : 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              Manage membership
            </button>
          }
        />
        <div style={{ padding: "18px 20px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "8px 12px", borderRadius: 10, background: badge.bg, width: "fit-content" }}>
            <badge.icon size={14} style={{ color: badge.color }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: badge.color, textTransform: "uppercase", letterSpacing: "0.02em" }}>{badge.label}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 16 : 24 }}>
            {[
              { label: "Plan Tier", value: isPro ? "FinPilot Pro" : "Standard Free" },
              { label: "Member Since", value: since },
              { label: isPro ? "Next Renewal" : "Usage Resets", value: renewal },
              { label: "Billing Method", value: isPro ? (billing?.subscription?.cancelAtPeriodEnd ? "One-time (Canceled)" : "Auto-renew") : "N/A" }
            ].map((row) => (
              <div key={row.label}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{row.label}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      {!isPro && (
        <Card>
          <CardHeader label="Monthly Usage" />
          <div style={{ padding: isMobile ? "14px 16px" : "16px 20px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
            {[{ label: "Transactions", used: user?.transactionsUsed ?? 0, limit: 10 }, { label: "AI Queries", used: user?.aiQueriesUsed ?? 0, limit: 5 }].map((stat) => {
              const pct = Math.min((stat.used / stat.limit) * 100, 100);
              const over = stat.used >= stat.limit;

              return (
                <div key={stat.label} style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${BORDER}`, background: BG }}>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>{stat.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, marginBottom: 8 }}>
                    {stat.used}
                    <span style={{ fontSize: 13, fontWeight: 400, color: MUTED }}> / {stat.limit}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 100, background: "var(--surface-muted)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 100, background: over ? RED : GREEN, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ fontSize: 11, color: over ? RED : MUTED, marginTop: 6 }}>{over ? "Limit reached" : `${stat.limit - stat.used} remaining`}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
