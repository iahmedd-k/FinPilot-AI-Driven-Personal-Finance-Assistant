import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BrainCircuit, Building2, ChevronDown, ChevronRight, FileText, Gem, LogOut, Menu, Moon, Palette, Pencil, Plus, Settings, Shield, SlidersHorizontal, Sun, User, Wand2 } from "lucide-react";
import { useAuthContext } from "../hooks/useAuthContext";
import { ROUTES } from "../constants/routes";
import ProfileTab from "../components/profile/tabs/ProfileTab";
import AccountsTab from "../components/profile/tabs/AccountsTab";
import SecurityTab from "../components/profile/tabs/SecurityTab";
import DocumentsTab from "../components/profile/tabs/DocumentsTab";
import MembershipTab from "../components/profile/tabs/MembershipTab";
import AIProfileTab from "../components/profile/tabs/AIProfileTab";
import { C, navSections } from "../components/dashboard/dashboardShared.jsx";
import Logo from "../components/common/Logo";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "accounts", label: "Accounts" },
  { id: "security", label: "Security" },
  { id: "documents", label: "Documents" },
  { id: "membership", label: "Membership" },
  { id: "aiprofile", label: "AI Financial Profile" },
];

function useTheme() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("fp_theme") === "dark"; }
    catch { return false; }
  });

  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      try { localStorage.setItem("fp_theme", next ? "dark" : "light"); } catch { void 0; }
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      window.dispatchEvent(new CustomEvent("fp-theme-change", { detail: { theme: next ? "dark" : "light" } }));
      return next;
    });
  };

  return { dark, toggle };
}

function ProfileMenuDropdown({ navigate, logout, queryClient, closeNotifications }) {
  const [open, setOpen] = useState(false);
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const menuRef = useRef(null);
  const { dark, toggle } = useTheme();

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setShowThemeOptions(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const rowBase = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    textAlign: "left",
    padding: "10px 14px",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid var(--border-subtle)",
    cursor: "pointer",
    fontFamily: "inherit",
  };

  const go = (path) => {
    closeNotifications?.();
    setOpen(false);
    setShowThemeOptions(false);
    navigate(path);
  };

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => {
          closeNotifications?.();
          setOpen((prev) => !prev);
        }}
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: open ? "var(--accent-transparent)" : "var(--bg-secondary)",
          border: open ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: open ? "var(--accent)" : "var(--text-secondary)",
        }}
      >
        <Settings size={18} strokeWidth={open ? 2.5 : 2} />
      </button>

      {open && (
        <div style={{ position: "absolute", top: 45, right: 0, width: 280, background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: 16, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", zIndex: 1000, overflow: "hidden" }}>
          <div style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "16px 16px 8px" }}>Account</div>
            <div style={{ background: "var(--bg-secondary)", margin: "0 12px", borderRadius: 12, border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
              <button type="button" onClick={() => go("/profile")} style={rowBase}><User size={16} style={{ color: "var(--text-secondary)" }} /><span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Profile</span><ChevronRight size={14} style={{ color: "var(--text-secondary)", opacity: 0.5 }} /></button>
              <button type="button" onClick={() => go(ROUTES.SUBSCRIPTION)} style={rowBase}><Gem size={16} style={{ color: "var(--text-secondary)" }} /><span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Membership</span><ChevronRight size={14} style={{ color: "var(--text-secondary)", opacity: 0.5 }} /></button>
              <button type="button" onClick={() => go("/profile?tab=security")} style={rowBase}><Shield size={16} style={{ color: "var(--text-secondary)" }} /><span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Security</span><ChevronRight size={14} style={{ color: "var(--text-secondary)", opacity: 0.5 }} /></button>
              <button type="button" onClick={() => go("/profile?tab=accounts")} style={{ ...rowBase, borderBottom: "none" }}><Building2 size={16} style={{ color: "var(--text-secondary)" }} /><span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Linked Accounts</span><ChevronRight size={14} style={{ color: "var(--text-secondary)", opacity: 0.5 }} /></button>
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "16px 16px 8px" }}>Preferences</div>
            <div style={{ background: "var(--bg-secondary)", margin: "0 12px", borderRadius: 12, border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
              <button type="button" onClick={() => go(`${ROUTES.DASHBOARD}?nav=spending&spend=settings`)} style={rowBase}><SlidersHorizontal size={16} style={{ color: "var(--text-secondary)" }} /><span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Spending Settings</span><ChevronRight size={14} style={{ color: "var(--text-secondary)", opacity: 0.5 }} /></button>
              <button type="button" onClick={() => go("/profile?tab=aiprofile")} style={rowBase}><BrainCircuit size={16} style={{ color: "var(--text-secondary)" }} /><span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>AI Financial Profile</span><ChevronRight size={14} style={{ color: "var(--text-secondary)", opacity: 0.5 }} /></button>
              <button type="button" onClick={() => setShowThemeOptions((prev) => !prev)} style={{ ...rowBase, borderBottom: showThemeOptions ? "none" : "1px solid var(--border-subtle)" }}>
                <Palette size={16} style={{ color: "var(--text-secondary)" }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Appearance</span>
                <ChevronDown size={14} style={{ color: "var(--text-secondary)", transform: showThemeOptions ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
              </button>
              {showThemeOptions && (
                <div style={{ background: "var(--bg-primary)", padding: "4px 8px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {[{ id: "light", label: "Light Mode", icon: Sun, active: !dark }, { id: "dark", label: "Dark Mode", icon: Moon, active: dark }].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if ((opt.id === "dark" && !dark) || (opt.id === "light" && dark)) toggle();
                        setShowThemeOptions(false);
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: opt.active ? "var(--accent-transparent)" : "transparent", border: "none", cursor: "pointer", width: "100%" }}
                    >
                      <opt.icon size={14} style={{ color: opt.active ? "var(--accent)" : "var(--text-secondary)" }} />
                      <span style={{ fontSize: 12, fontWeight: opt.active ? 600 : 500, color: opt.active ? "var(--text-primary)" : "var(--text-secondary)" }}>{opt.label}</span>
                      {opt.active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "16px 16px 8px" }}>Resources</div>
            <div style={{ background: "var(--bg-secondary)", margin: "0 12px", borderRadius: 12, border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
              <button type="button" onClick={() => go("/profile?tab=documents")} style={{ ...rowBase, borderBottom: "none" }}><FileText size={16} style={{ color: "var(--text-secondary)" }} /><span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Documents</span><ChevronRight size={14} style={{ color: "var(--text-secondary)", opacity: 0.5 }} /></button>
            </div>

            <div style={{ padding: "12px 12px 16px" }}>
              <button
                type="button"
                onClick={async () => {
                  setOpen(false);
                  queryClient.clear();
                  await logout();
                }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(239, 68, 68, 0.08)", border: "none", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                <LogOut size={16} /> Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardLikeSidebar({ mobileOpen, setMobileOpen, sideCollapsed, setSideCollapsed }) {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const isPro = String(user?.subscriptionTier || "").toLowerCase() === "pro";
  const sideW = sideCollapsed ? 60 : 200;

  return (
    <>
      <style>{`
        @media (max-width: 920px) {
          .profile-side-shell {
            transform: translateX(${mobileOpen ? "0" : "-100%"});
          }
        }
      `}</style>
      <aside
        className="profile-side-shell"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: sideW,
          background: C.sidebar,
          borderRight: `1px solid ${C.sidebarB}`,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.18s ease, transform 0.2s ease",
          zIndex: 40,
          overflowY: "auto",
        }}
      >
        <div style={{ height: 58, display: "flex", alignItems: "center", padding: sideCollapsed ? "0 12px" : "0 16px", borderBottom: `1px solid ${C.sidebarB}` }}>
          {sideCollapsed ? (
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0A0A1A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #fff", position: "relative" }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />
              </div>
            </div>
          ) : (
            <Logo size="sm" className="pointer-events-none" />
          )}
        </div>

        <div style={{ padding: "10px 8px 14px" }}>
          {navSections.map((section) => (
            <div key={section.label} style={{ marginBottom: 12 }}>
              {!sideCollapsed && (
                <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em", padding: "8px 10px 6px" }}>
                  {section.label}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isProfileShortcut = item.id === "ai_advisor";
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      if (isProfileShortcut) {
                        navigate(`${ROUTES.DASHBOARD}?nav=dashboard&advisor=1`);
                        return;
                      }
                      navigate(`${ROUTES.DASHBOARD}?nav=${item.id}`);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: sideCollapsed ? "10px 0" : "10px 12px",
                      justifyContent: sideCollapsed ? "center" : "flex-start",
                      background: "transparent",
                      border: "none",
                      borderRadius: 12,
                      color: C.sub,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                      textAlign: "left",
                    }}
                  >
                    <Icon size={17} style={{ flexShrink: 0 }} />
                    {!sideCollapsed && <span>{item.label}</span>}
                    {!sideCollapsed && item.id === "forecast" && !isPro && <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.6 }}>Pro</span>}
                  </button>
                );
              })}
            </div>
          ))}

          <div style={{ marginTop: 8, paddingTop: 10, borderTop: `1px solid ${C.sidebarB}` }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: sideCollapsed ? "10px 0" : "10px 12px",
                justifyContent: sideCollapsed ? "center" : "flex-start",
                background: "var(--border-subtle)",
                borderRadius: 12,
                color: C.text,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Pencil size={17} />
              {!sideCollapsed && <span>Profile</span>}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "auto", padding: 10 }}>
          <button
            type="button"
            onClick={() => setSideCollapsed((prev) => !prev)}
            style={{ width: "100%", border: `1px solid ${C.border}`, background: C.white, color: C.sub, borderRadius: 12, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}
          >
            {sideCollapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </aside>
    </>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, fetchMe, logout } = useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  const pushNotif = (type, text) => { void type; void text; };
  const queryTab = new URLSearchParams(location.search).get("tab");
  const tab = TABS.some((t) => t.id === queryTab) ? queryTab : "profile";
  const goToTab = (next) => navigate(`${ROUTES.PROFILEPAGE}?tab=${next}`, { replace: true });
  const closeNotifications = () => setNotifOpen(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const close = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--font-sans)" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        .profile-mobile-backdrop { display: none; }
        @media (max-width: 920px) {
          .profile-mobile-backdrop { display: block; }
          .profile-main-shell { margin-left: 0 !important; }
          .profile-tabs-shell { top: 58px !important; }
          .profile-content-shell { padding: 18px 12px 90px !important; }
          .profile-side-shell { width: min(280px, 82vw) !important; }
          .profile-header-shell { padding: 10px 12px !important; gap: 8px !important; }
          .profile-title { font-size: 18px !important; }
          .profile-header-actions { gap: 8px !important; }
          .profile-tabs-shell { padding: 8px 12px 0 !important; }
        }
        @media (max-width: 640px) {
          .profile-advisor-label { display: none; }
          .profile-advisor-btn { padding: 7px 10px !important; }
          .profile-title { font-size: 17px !important; }
          .profile-tabs-button { padding: 8px 12px !important; font-size: 13px !important; }
          .profile-notif-popover { right: -40px !important; width: min(300px, calc(100vw - 24px)) !important; }
        }
      `}</style>

      {mobileOpen && (
        <div
          className="profile-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.3)", zIndex: 35 }}
        />
      )}

      <DashboardLikeSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} sideCollapsed={sideCollapsed} setSideCollapsed={setSideCollapsed} />

      <div className="profile-main-shell" style={{ marginLeft: sideCollapsed ? 60 : 200, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <header className="profile-header-shell" style={{ minHeight: 58, background: C.bg, display: "flex", alignItems: "center", padding: "0 20px", gap: 12, position: "sticky", top: 0, zIndex: 20 }}>
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth <= 920) setMobileOpen((prev) => !prev);
              else setSideCollapsed((prev) => !prev);
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.sub, display: "flex", alignItems: "center", padding: 4, borderRadius: 8 }}
          >
            <Menu size={19} />
          </button>

          <div className="profile-title" style={{ flex: 1, minWidth: 0, fontSize: 22, fontWeight: 500, color: C.text, fontFamily: "var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.2px" }}>
            Profile
          </div>

          <div className="profile-header-actions" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <button
              type="button"
              className="profile-advisor-btn"
              onClick={() => navigate(`${ROUTES.DASHBOARD}?nav=dashboard&advisor=1`)}
              style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", transition: "all 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", flexShrink: 0 }}
            >
              <Wand2 size={13} style={{ color: "var(--text-primary)", strokeWidth: 1.75, flexShrink: 0 }} />
              <span className="profile-advisor-label" style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", letterSpacing: "-0.1px" }}>AI Advisor</span>
            </button>

            <button type="button" onClick={() => goToTab("accounts")} style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}>
              <Plus size={18} />
            </button>

            <div ref={notifRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => { setNotifOpen((v) => !v); setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))); }}
                style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)", position: "relative" }}
              >
                <Bell size={17} />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <div style={{ position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, background: C.red, borderRadius: 99, border: `2px solid var(--bg-primary)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff", padding: "0 3px" }}>
                    {notifications.filter((n) => !n.read).length > 9 ? "9+" : notifications.filter((n) => !n.read).length}
                  </div>
                )}
              </button>

              {notifOpen && (
                <div className="profile-notif-popover" style={{ position: "absolute", top: 42, right: 0, width: 300, background: "var(--bg-primary)", border: `1px solid var(--border-subtle)`, borderRadius: 14, boxShadow: "0 18px 40px rgba(0,0,0,0.15)", zIndex: 100, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid var(--border-subtle)` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Notifications</div>
                  </div>
                  <div style={{ padding: "32px 16px", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Bell size={20} style={{ color: "var(--text-secondary)", opacity: 0.5 }} /></div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>No notifications yet</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bg-secondary)", border: "1px solid var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>
              {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "FP"}
            </div>

            <ProfileMenuDropdown navigate={navigate} logout={logout} queryClient={queryClient} closeNotifications={closeNotifications} />
          </div>
        </header>

        <div className="profile-tabs-shell" style={{ background: C.bg, padding: "10px 20px 0", position: "sticky", top: 58, zIndex: 18 }}>
          <div style={{ display: "flex", gap: 2, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToTab(item.id)}
                  className="profile-tabs-button"
                  style={{
                    padding: "8px 14px",
                    border: "none",
                    background: active ? "var(--bg-secondary)" : "transparent",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--text-primary)" : "var(--text-secondary)",
                    borderRadius: 8,
                    whiteSpace: "nowrap",
                    fontFamily: "inherit",
                    transition: "background 0.15s, color 0.15s",
                    lineHeight: 1.4,
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="profile-content-shell" style={{ width: "100%", padding: "24px 28px 80px", animation: "fadeUp 0.25s ease" }} key={tab}>
          {tab === "profile" && <ProfileTab user={user} refreshUser={fetchMe} pushNotif={pushNotif} />}
          {tab === "accounts" && <AccountsTab pushNotif={pushNotif} />}
          {tab === "security" && <SecurityTab pushNotif={pushNotif} />}
          {tab === "documents" && <DocumentsTab />}
          {tab === "membership" && <MembershipTab user={user} navigate={navigate} />}
          {tab === "aiprofile" && <AIProfileTab />}
        </div>
      </div>
    </div>
  );
}
