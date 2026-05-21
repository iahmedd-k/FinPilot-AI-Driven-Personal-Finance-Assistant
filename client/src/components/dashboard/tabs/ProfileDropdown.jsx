// ─── src/components/dashboard/tabs/ProfileDropdown.jsx ───────
import { useState, useRef, useEffect } from "react";
import {
  User, Shield, Building2, Gem, Bell,
  SlidersHorizontal, BrainCircuit, Palette,
  Headphones, FileText, ChevronRight, ChevronDown,
  Sun, Moon, LogOut, Settings, HelpCircle, Plus, Gift, BadgeDollarSign, Loader2,
  ArrowLeft
} from "lucide-react";
import { useDashboard } from "../DashboardContext";
import { authService } from "../../../services/authService";
import { getUserCurrency } from "../../../utils/currency";
import { dedupToast } from "../dashboardShared";

const TOP_CURRENCIES = [
  { code: "USD", flag: "🇺🇸", name: "US Dollar" },
  { code: "EUR", flag: "🇪🇺", name: "Euro" },
  { code: "GBP", flag: "🇬🇧", name: "British Pound" },
  { code: "JPY", flag: "🇯🇵", name: "Japanese Yen" },
  { code: "CNY", flag: "🇨🇳", name: "Chinese Yuan" },
  { code: "CAD", flag: "🇨🇦", name: "Canadian Dollar" },
  { code: "AUD", flag: "🇦🇺", name: "Australian Dollar" },
  { code: "CHF", flag: "🇨🇭", name: "Swiss Franc" },
  { code: "HKD", flag: "🇭🇰", name: "Hong Kong Dollar" },
  { code: "SGD", flag: "🇸🇬", name: "Singapore Dollar" },
];

function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem("fp_theme");
      // Default to dark if nothing stored
      const isDark = stored === "light" ? false : true;
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
      return isDark;
    }
    catch {
      document.documentElement.setAttribute("data-theme", "dark");
      return true;
    }
  });
  const toggle = () => {
    setDark(d => {
      const next = !d;
      try { localStorage.setItem("fp_theme", next ? "dark" : "light"); } catch { void 0; }
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      window.dispatchEvent(new CustomEvent("fp-theme-change", { detail: { theme: next ? "dark" : "light" } }));
      return next;
    });
  };
  return { dark, toggle };
}

function SectionLabel({ label }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: "var(--text-secondary)",
      textTransform: "uppercase", letterSpacing: "0.08em",
      padding: "16px 16px 8px",
    }}>
      {label}
    </div>
  );
}

function Row({ icon: Icon, label, onClick, right, danger = false, isLast = false }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
        background: hov ? (danger ? "rgba(239, 68, 68, 0.08)" : "var(--border-subtle)") : "transparent",
        border: "none", borderBottom: !isLast ? "1px solid var(--border-subtle)" : "none",
        cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
        width: "100%", textAlign: "left"
      }}
    >
      <Icon size={16} style={{ color: danger ? "#ef4444" : "var(--text-secondary)", strokeWidth: 2 }} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: danger ? "#ef4444" : "var(--text-primary)" }}>
        {label}
      </span>
      {right ?? <ChevronRight size={14} style={{ color: "var(--text-secondary)", opacity: 0.5 }} />}
    </button>
  );
}

export default function ProfileDropdown() {
  const { profileOpen, setProfileOpen, profileRef, navigate, logout, queryClient, ROUTES, refreshUser, user, notifications, setMobileOpen } = useDashboard();
  const { dark, toggle: toggleTheme } = useTheme();
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const [showCurrencyOptions, setShowCurrencyOptions] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [currencyLoading, setCurrencyLoading] = useState(false);
  const [currencySaving, setCurrencySaving] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const timeAgo = (date) => {
    if (!date) return "";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `about ${Math.floor(interval)} years ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `about ${Math.floor(interval)} months ago`;
    interval = seconds / 86400;
    if (interval > 1) return `about ${Math.floor(interval)} days ago`;
    interval = seconds / 3600;
    if (interval > 1) return `about ${Math.floor(interval)} hours ago`;
    interval = seconds / 60;
    if (interval > 1) return `about ${Math.floor(interval)} minutes ago`;
    return "just now";
  };

  useEffect(() => {
    setSelectedCurrency(getUserCurrency(user));
  }, [user?.preferredCurrency]);

  useEffect(() => {
    if (!profileOpen) {
      setShowThemeOptions(false);
      setShowCurrencyOptions(false);
      setShowNotifications(false);
      return;
    }

    let mounted = true;
    const loadCurrencies = async () => {
      setCurrencyLoading(true);
      try {
        const { data } = await authService.getCurrencyOptions();
        if (!mounted) return;
        setSelectedCurrency(getUserCurrency({ preferredCurrency: data?.selectedCurrency || user?.preferredCurrency || "USD" }));
      } catch {
        if (!mounted) return;
      } finally {
        if (mounted) setCurrencyLoading(false);
      }
    };

    loadCurrencies();
    return () => {
      mounted = false;
    };
  }, [profileOpen, user?.preferredCurrency]);

  const handleCurrencyChange = async (currencyCode) => {
    const nextCurrency = getUserCurrency({ preferredCurrency: currencyCode });
    if (!nextCurrency || nextCurrency === selectedCurrency || currencySaving) return;

    setCurrencySaving(true);
    try {
      const { data } = await authService.updateCurrency(nextCurrency);
      setSelectedCurrency(nextCurrency);
      await refreshUser?.();
      queryClient.invalidateQueries();
      dedupToast.success(data?.message || "Currency updated.");
      setShowCurrencyOptions(false);
      setProfileOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 250);
    } catch (err) {
      dedupToast.error(err?.response?.data?.message || "Failed to update currency.");
    } finally {
      setCurrencySaving(false);
    }
  };

  return (
    <div ref={profileRef} style={{ position: "relative" }}>
      {/* Trigger — The Gear icon circle */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setProfileOpen(v => !v); }}
        aria-label="Open profile menu"
        style={{
          position: "relative",
          zIndex: 30,
          width: 34, height: 34, borderRadius: "50%",
          background: profileOpen ? "var(--accent-transparent)" : "var(--bg-secondary)",
          border: profileOpen ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: profileOpen ? "var(--accent)" : "var(--text-secondary)",
          transition: "all 0.2s"
        }}
      >
        <Settings size={18} strokeWidth={profileOpen ? 2.5 : 2} />
      </button>

      {profileOpen && (
        <div style={{
          position: "absolute", top: 45, right: 0, width: 280,
          background: "var(--bg-primary)", border: "1px solid var(--border-subtle)",
          borderRadius: 16, boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          zIndex: 1000, overflow: "hidden", animation: "fadeUp 0.15s ease-out"
        }}>
          <div style={{ maxHeight: "85vh", overflowY: "auto", position: "relative" }}>
            {showNotifications ? (
              <div style={{ animation: "fadeUp 0.15s ease-out" }}>
                {/* Notification Header */}
                <div style={{ display: "flex", alignItems: "center", padding: "18px 16px 14px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-primary)", position: "sticky", top: 0, zIndex: 10 }}>
                  <button onClick={() => setShowNotifications(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", display: "flex", alignItems: "center", padding: 0, marginRight: 16 }}>
                    <ArrowLeft size={18} />
                  </button>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.15em" }}>NOTIFICATIONS</span>
                </div>

                {/* Notifications List */}
                <div style={{ padding: "8px 0" }} className="custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                      <Bell size={24} style={{ opacity: 0.3, marginBottom: 12 }} />
                      <div>No notifications yet</div>
                    </div>
                  ) : (
                    notifications.map((n, i) => {
                      // Try to split message if it has a bold-like structure (e.g. "Title: Body")
                      const parts = n.message.split(" · ");
                      const title = parts[0];
                      const desc = parts.slice(1).join(" · ");
                      return (
                        <div key={n.id} style={{ padding: "18px 20px", borderBottom: i === notifications.length - 1 ? "none" : "1px solid var(--border-subtle)" }}>
                          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-primary)", marginBottom: desc ? 6 : 8, lineHeight: 1.4 }}>{title}</div>
                          {desc && <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 10 }}>{desc}</div>}
                          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>{timeAgo(n.time)}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <>

            {/* ACCOUNT */}
            <SectionLabel label="Account" />
            <div style={{ background: "var(--bg-secondary)", margin: "0 12px", borderRadius: 12, border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
              <Row icon={User} label="Profile" onClick={() => { navigate("/profile"); setProfileOpen(false); }} />
              <Row icon={Bell} label="Notifications" onClick={() => setShowNotifications(true)} />
              <Row icon={Gem} label="Membership" onClick={() => { navigate("/profile?tab=membership"); setProfileOpen(false); }} />
              <Row icon={Shield} label="Security" onClick={() => { navigate("/profile?tab=security"); setProfileOpen(false); }} />
              <Row icon={Building2} label="Linked Accounts" isLast onClick={() => { navigate("/profile?tab=accounts"); setProfileOpen(false); }} />
            </div>

            {/* PREFERENCES */}
            <SectionLabel label="Preferences" />
            <div style={{ background: "var(--bg-secondary)", margin: "0 12px", borderRadius: 12, border: "1px solid var(--border-subtle)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <Row icon={SlidersHorizontal} label="Spending Settings" onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("spend", "settings");
                if (window.location.pathname === ROUTES.DASHBOARD) {
                  navigate(`${ROUTES.DASHBOARD}?${params.toString()}`);
                } else {
                  navigate(`${ROUTES.DASHBOARD}?spend=settings`);
                }
                setMobileOpen?.(false);
                setProfileOpen(false);
              }} />
              <Row icon={BrainCircuit} label="AI Financial Profile" onClick={() => { navigate("/profile?tab=aiprofile"); setProfileOpen(false); }} />
              <div style={{ position: "relative" }}>
                <Row
                  icon={Palette} label="Appearance"
                  onClick={() => setShowThemeOptions(!showThemeOptions)}
                  right={<ChevronDown size={14} style={{ color: "var(--text-secondary)", transform: showThemeOptions ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />}
                  isLast={false}
                />
                {showThemeOptions && (
                  <div style={{ background: "var(--bg-primary)", padding: "4px 8px 8px", display: "flex", flexDirection: "column", gap: 4, animation: "fadeUp 0.1s ease-out" }}>
                    {[
                      { id: "light", label: "Light Mode", icon: Sun, active: !dark },
                      { id: "dark", label: "Dark Mode", icon: Moon, active: dark },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          if ((opt.id === "dark" && !dark) || (opt.id === "light" && dark)) toggleTheme();
                          setShowThemeOptions(false);
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                          borderRadius: 8, background: opt.active ? "var(--accent-transparent)" : "transparent",
                          border: "none", cursor: "pointer", width: "100%", transition: "all 0.1s"
                        }}
                      >
                        <opt.icon size={14} style={{ color: opt.active ? "var(--accent)" : "var(--text-secondary)" }} />
                        <span style={{ fontSize: 12, fontWeight: opt.active ? 600 : 500, color: opt.active ? "var(--text-primary)" : "var(--text-secondary)" }}>
                          {opt.label}
                        </span>
                        {opt.active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ position: "relative" }}>
                <Row
                  icon={BadgeDollarSign}
                  label={`Currency (${selectedCurrency})`}
                  onClick={() => setShowCurrencyOptions(!showCurrencyOptions)}
                  right={currencySaving
                    ? <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent)" }} />
                    : <ChevronDown size={14} style={{ color: "var(--text-secondary)", transform: showCurrencyOptions ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                  }
                  isLast
                />
                {showCurrencyOptions && (
                  <div style={{ background: "var(--bg-primary)", padding: "6px 8px 10px", display: "flex", flexDirection: "column", gap: 4, animation: "fadeUp 0.1s ease-out", maxHeight: 220, overflowY: "auto" }}>
                    {currencySaving && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", padding: "8px 10px" }}>
                        <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent)" }} />
                        Updating currency...
                      </div>
                    )}
                    {currencyLoading ? (
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: "8px 10px" }}>Loading currencies...</div>
                    ) : (
                      TOP_CURRENCIES.map((currency) => {
                        const { code, flag, name } = currency;
                        const active = code === selectedCurrency;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => handleCurrencyChange(code)}
                            disabled={currencySaving}
                            style={{
                              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                              borderRadius: 8, background: active ? "var(--accent-transparent)" : "transparent",
                              border: "none", cursor: currencySaving ? "not-allowed" : "pointer", width: "100%", transition: "all 0.1s",
                              opacity: currencySaving ? 0.7 : 1,
                            }}
                          >
                            <span style={{ fontSize: 16 }}>{flag}</span>
                            <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>
                              {code} - {name}
                            </span>
                            {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RESOURCES */}
            <SectionLabel label="Resources" />
            <div style={{ background: "var(--bg-secondary)", margin: "0 12px", borderRadius: 12, border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
         <Row icon={FileText} label="Documents" onClick={() =>  { navigate("/profile?tab=documents"); setProfileOpen(false)}} />
            </div>

            {/* Sign out */}
            <div style={{ padding: "12px 12px 16px" }}>
              <button
                onClick={async () => { setProfileOpen(false); queryClient.clear(); await logout(); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  borderRadius: 10, background: "rgba(239, 68, 68, 0.08)", border: "none",
                  color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"}
              >
                <LogOut size={16} /> Log out
              </button>
            </div>

              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
