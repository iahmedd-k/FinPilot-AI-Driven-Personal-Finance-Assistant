// ─── src/pages/Dashboard.jsx ─────────────────────────────────
//
// FILE LOCATION: src/pages/Dashboard.jsx
//
// Path map (relative to THIS file — src/pages/):
//   components/dashboard  →  ../components/dashboard/...
//   services              →  ../services/...
//   context               →  ../context/...
//   constants             →  ../constants/routes
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, LineChart, Line, ReferenceDot,
} from "recharts";
import {
  House, ReceiptText, ChartPie, SlidersHorizontal, Gift,
  Wand2, Plus, ChevronRight, Bell,
  ArrowUpRight, ArrowDownRight, ShoppingCart, Utensils, Bus,
  Building2, Bolt, BadgeDollarSign, HeartPulse,
  TrendingUp, Wallet, Menu, X, Search,
  GraduationCap, Gem, Upload, Download, Lock,
  Trash2, Pencil, Check, Filter, SortAsc, SortDesc,
  XCircle, AlertTriangle, Car, Target, PiggyBank, Star,
  RefreshCw, ChevronDown, Flame,
} from "lucide-react";

// ── Dashboard components (../components/dashboard/) ──────────
import { DashboardProvider, useDashboard } from "../components/dashboard/DashboardContext";
import {
  C, dedupToast, ProGate, Card, ChartTip,
  CAT_COLORS, catToIcon, getSpendingCategoryMeta, goalIcons,
  navSections, navItems, timeTabs,
} from "../components/dashboard/dashboardShared.jsx";
import { SpendingPage, CalendarPicker, formatDateInputValue } from "../components/dashboard/tabs/SpendingTab";
import { ForecastPage } from "../components/dashboard/tabs/ForecastTab";
import ProfileDropdown from "../components/dashboard/tabs/ProfileDropdown";
import Logo from "../components/common/Logo";
import TransactionDetailSidebar from "../components/dashboard/TransactionDetailSidebar";
import SpendingSettingsSidebar from "../pages/Spendingsettingssidebar.jsx";
import { transactionCategoryService } from "../services/transactionCategoryService";

// ── Other page components ────────────────────────────────────
import Portfolio from "./Portfolio";
import Equity from "./Equity";

// ── Services (../services/) ──────────────────────────────────
import { transactionService } from "../services/transactionService";
import { aiService } from "../services/aiService";
import { subscriptionService } from "../services/subscriptionService";
import api from "../services/api";

// ── Constants (../constants/routes) ─────────────────────────
import { ROUTES } from "../constants/routes";
import { formatCurrencyAmount, getCurrencySymbol, getUserCurrency } from "../utils/currency";

// ── Context (../context/) ────────────────────────────────────
import { PortfolioProvider, usePortfolio } from "../context/PortfolioContext";

// Reusable breakdown bars moved out of render to avoid recreating component each render
function BreakdownBars({ groups, total, colors, title, titleTotal, C, fmtNW }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{title}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtNW(titleTotal)}</span>
      </div>
      {groups.length === 0
        ? <div style={{ fontSize: 11, color: C.muted }}>No data yet</div>
        : groups.map((g, i) => (
          <div key={g.label} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 4 }}>
              {g.label} ({total > 0 ? Math.round(((g.total / total) * 100)) : 0}%)
            </div>
            <div style={{ height: 6, borderRadius: 100, background: C.border2, overflow: "hidden" }}>
              <div style={{ width: `${total > 0 ? ((g.total / total) * 100) : 0}%`, height: "100%", borderRadius: 100, background: colors[i % colors.length], transition: "width 0.6s ease" }} />
            </div>
          </div>
        ))
      }
    </div>
  );
}
import { useAuthContext } from "../hooks/useAuthContext";

// ─────────────────────────────────────────────────────────────
// Sub-components that stay in this file (unchanged from original):
//   AddTransactionModal, GoalsPage, AICopilotContent,
//   SpendingContent, AIAdvisorCard, SpendingCalendar,
//   HealthScoreWidget, SavingsGoalsWidget, MonthlyBudgetWidget,
//   CryptoHoldingsWidget, InvestmentsChartCard, NetWorthView,
//   MiniSparkline, PortfolioGlanceCard
// ─────────────────────────────────────────────────────────────

/**
 * Safely renders AI/bot text with **bold** markdown support.
 * Avoids dangerouslySetInnerHTML — React escapes all text nodes automatically.
 */
function renderMd(text, boldColor) {
  return (text || "").split("\n").flatMap((line, li) => {
    const parts = line.split(/\*\*(.*?)\*\*/g).map((part, i) =>
      i % 2 === 0
        ? part
        : <strong key={`b${li}-${i}`} style={{ color: boldColor }}>{part}</strong>
    );
    return li === 0 ? parts : [<br key={`br${li}`} />, ...parts];
  });
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const clampPercent = (value, { min = 0, max = 100 } = {}) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return clamp(numeric, min, max);
};
const getMerchantMonogram = (merchant, category) => {
  const source = String(merchant || category || "TX").trim();
  if (!source) return "TX";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
};
const getAssetCostBasis = (asset) => {
  if (!asset) return 0;
  // For crypto, always calculate from buyPrice * quantity for accuracy
  if (asset.assetType === "crypto") {
    const cost = (Number(asset.buyPrice) || 0) * (Number(asset.quantity) || 0);
    // Only use totalCost if crypto cost is 0 and totalCost is explicitly set
    if (cost > 0) return cost;
    if (Number(asset.totalCost) > 0) return Number(asset.totalCost);
    return cost; // Return 0 if no cost data
  }
  if (Number(asset.totalCost) > 0) return Number(asset.totalCost);
  const unitCost = Number(asset.buyingPrice) || Number(asset.purchasePrice) || 0;
  const quantity = Number(asset.quantity);
  return unitCost * (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
};






/* ─── Main Export ────────────────────────────────────────── */
export default function Dashboard() {
  return (
    <DashboardProvider>
      <DashboardShell />
    </DashboardProvider>
  );
}

/* ─── Shell ─────────────────────────────────────────────── */
function DashboardShell() {
  const location = useLocation();
  const allowedDashboardNavs = useMemo(
    () => new Set(["dashboard", "spending", "portfolio", "equity", "planning", "forecast", "benefits"]),
    []
  );
  const [themeDark, setThemeDark] = useState(() => {
    try {
      const stored = localStorage.getItem("fp_theme");
      if (stored === "dark") return true;
      if (stored === "light") return false;
      return document.documentElement.getAttribute("data-theme") === "dark";
    } catch {
      return document.documentElement.getAttribute("data-theme") === "dark";
    }
  });
  const {
    user, isPro, refreshUser, updateUser,
    txLimitReached, aiLimitReached, txRemaining, aiRemaining, resetLabel,
    navigate,
    activeNav, setActiveNav,
    activeTab, setActiveTab,
    dashSubTab, setDashSubTab,
    showAdvisor, setShowAdvisor,
    isMobile, isTablet,
    mobileOpen, setMobileOpen,
    sideCollapsed, setSideCollapsed,
    addModalOpen, setAddModalOpen,
    csvFile, setCsvFile,
    fileInputRef, isExporting,
    profileOpen, setProfileOpen, profileRef,
    notifOpen, setNotifOpen, notifRef,
    notifications, setNotifications, pushNotif,
    queryClient, dashboardRes, csvImportMutation,
    dashboard, summary, categoryBreakdown, monthlyChart,
    apiGoals, apiBudget, apiTransactions,
    statCards, dashCalc, effectiveForecast,
    netWorthData, cashFlowData, categoryData,
    goals, transactions, spendMerchants,
    handleExportData,
    messages, setMessages,
    chatInput, setChatInput,
    isTyping, setIsTyping,
    copilotSessionRef, msgsEndRef,
    advisorMessages, setAdvisorMessages,
    advisorSessions, setAdvisorSessions,
    advisorActiveSession, setAdvisorActiveSession,
    advisorSidebarOpen, setAdvisorSidebarOpen,
    advisorSessionsLoading,
    setGlobalSelectedTxId,
  } = useDashboard();
  const isCompactAdvisor = isMobile || isTablet;

  const goToNav = useCallback((nextNav, { replace = true } = {}) => {
    if (!allowedDashboardNavs.has(nextNav)) return;

    const params = new URLSearchParams(location.search);
    const currentNav = params.get("nav") || "dashboard";
    if (currentNav !== nextNav) {
      params.set("nav", nextNav);
      const nextSearch = params.toString();
      navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`, { replace });
    }

    if (activeNav !== nextNav) {
      setActiveNav(nextNav);
    }
  }, [activeNav, allowedDashboardNavs, location.pathname, location.search, navigate, setActiveNav]);

  const goToSpending = () => {
    const params = new URLSearchParams(location.search);
    if (params.get("spend") === "settings") {
      params.delete("spend");
    }

    const currentNav = params.get("nav") || "dashboard";
    if (currentNav !== "spending") {
      params.set("nav", "spending");
      const nextSearch = params.toString();
      navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
    }

    if (activeNav !== "spending") {
      setActiveNav("spending");
    }

    if (isMobile) setMobileOpen(false);
  };

  const spendingSettingsOpen = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("spend") === "settings";
  }, [location.search]);

  useEffect(() => {
    if (spendingSettingsOpen) {
      setMobileOpen(false);
    }
  }, [spendingSettingsOpen, setMobileOpen]);

  const closeSpendingSettings = useCallback(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("spend") !== "settings") return;

    params.delete("spend");
    const nextSearch = params.toString();
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const nav = new URLSearchParams(location.search).get("nav");
    if (nav && allowedDashboardNavs.has(nav) && nav !== activeNav) {
      setActiveNav(nav);
    }
  }, [location.search, setActiveNav, activeNav, allowedDashboardNavs]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const advisor = params.get("advisor");
    const nav = params.get("nav");
    if (advisor === "1" && nav === "dashboard") {
      setShowAdvisor(true);
      params.delete("advisor");
      const nextSearch = params.toString();
      navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate, setShowAdvisor]);



  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const billing = params.get("billing");
    const sessionId = params.get("session_id");
    if (!billing) return;

    let cleanupTimer;
    const finish = async () => {
      if (billing === "success") {
        try {
          let syncedUser = null;
          if (sessionId) {
            const syncResult = await subscriptionService.syncCheckoutSession(sessionId);
            syncedUser = syncResult?.user || null;
            if (syncedUser) updateUser?.(syncedUser);
          }
          await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          await queryClient.invalidateQueries({ queryKey: ["transactions"] });
          await queryClient.invalidateQueries({ queryKey: ["transactions-page"] });
          await queryClient.invalidateQueries({ queryKey: ["billing-status"] });
          await refreshUser?.();
          cleanupTimer = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["transactions-page"] });
            queryClient.invalidateQueries({ queryKey: ["billing-status"] });
            refreshUser?.();
          }, 1200);
        } catch {
          void 0;
        }
        dedupToast.success("Pro subscription updated successfully.");
      } else if (billing === "portal") {
        try {
          await subscriptionService.getBillingStatus();
          await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          await queryClient.invalidateQueries({ queryKey: ["transactions"] });
          await queryClient.invalidateQueries({ queryKey: ["transactions-page"] });
          await queryClient.invalidateQueries({ queryKey: ["billing-status"] });
          await refreshUser?.();
        } catch {
          void 0;
        }
        dedupToast.success("Returned from Stripe billing.");
      }

      params.delete("billing");
      params.delete("session_id");
      const nextSearch = params.toString();
      navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
    };

    finish();
    return () => {
      clearTimeout(cleanupTimer);
    };
  }, [location.pathname, location.search, navigate, queryClient, refreshUser, updateUser]);

  useEffect(() => {
    const onThemeEvent = (e) => {
      const next = e?.detail?.theme === "dark";
      setThemeDark(next);
    };
    const onStorage = (e) => {
      if (e.key !== "fp_theme") return;
      setThemeDark(e.newValue === "dark");
    };

    window.addEventListener("fp-theme-change", onThemeEvent);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("fp-theme-change", onThemeEvent);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeDark ? "dark" : "light");
    try {
      localStorage.setItem("fp_theme", themeDark ? "dark" : "light");
    } catch {
      void 0;
    }
  }, [themeDark]);

  const sideW = isMobile
    ? 0
    : spendingSettingsOpen
      ? (isTablet ? 0 : 60)
      : (sideCollapsed ? 60 : 240);

  // ── AI Copilot send handler ─────────────────────────────
  const handleSend = async (txt) => {
    const msg = (txt || chatInput).trim();
    if (!msg) return;
    const currentHistory = messages
      .filter((m, i) => !(i === 0 && m.role === "bot"))
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
    setMessages((p) => [...p, { role: "user", text: msg }]);
    setChatInput("");
    setIsTyping(true);
    try {
      if (!copilotSessionRef.current) {
        try {
          const sessionRes = await aiService.createSession("copilot", msg);
          copilotSessionRef.current = sessionRes.data.session._id;
        } catch (e) { console.error("Failed to create copilot session", e); }
      }
      const { data } = await aiService.chat(msg, currentHistory, copilotSessionRef.current);
      setMessages((p) => [...p, { role: "bot", text: data.reply || "I couldn't generate a response." }]);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Something went wrong. Please try again.";
      setMessages((p) => [...p, { role: "bot", text: `${errorMsg}` }]);
      if (err.response?.status === 403) {
        dedupToast.error(errorMsg, { action: { label: "Upgrade to Pro", onClick: () => navigate(ROUTES.SUBSCRIPTION) } });
        pushNotif("error", errorMsg);
      } else {
        dedupToast.error(errorMsg);
        pushNotif("error", errorMsg);
      }
    } finally { setIsTyping(false); }
  };

  return (
    <>
      {/* ── Global styles ── */}
      <style>{`
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
html,body { height:100%; background:${C.bg}; }

::-webkit-scrollbar { width:4px; height:4px; }
::-webkit-scrollbar-thumb { background:#d1cdc5; border-radius:4px; }
::-webkit-scrollbar-track { background:transparent; }
@keyframes slideIn  { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
@keyframes fadeUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes bounceY  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes shimmer  { 0%{opacity:0.6} 100%{opacity:1} }
@keyframes advisorPopIn { from{opacity:0;transform:translate(-50%,-50%) scale(0.94)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
@keyframes fadeIn   { from{opacity:0} to{opacity:1} }
.fp-card:hover { box-shadow:0 4px 20px rgba(0,0,0,0.09),0 1px 4px rgba(0,0,0,0.05) !important; }
.nav-item { transition:all 0.15s ease; cursor:pointer; position:relative; }
.nav-bg { position: absolute; inset:0; border-radius:7px; transition:background 0.15s; }
.nav-ico { color: var(--text-secondary); transition:color 0.15s; }
.nav-lbl { color: var(--text-secondary); transition:color 0.15s; }

/* ── Hover State ── */
.nav-item:hover .nav-bg  { background: var(--border-subtle) !important; }
.nav-item:hover .nav-lbl { color: var(--text-primary) !important; }
.nav-item:hover .nav-ico { color: var(--text-primary) !important; }

/* ── Active State ── */
.nav-item.active .nav-bg  { background: var(--accent-transparent) !important; }
.nav-item.active .nav-lbl { color: var(--accent) !important; font-weight: 600 !important; }
.nav-item.active .nav-ico { color: var(--accent) !important; stroke-width: 2px !important; }
.nav-item.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  background: var(--accent);
  border-radius: 4px;
  z-index: 2;
}

.tx-row { border-radius:12px; transition:background 0.15s; cursor:pointer; }
.sug-btn { transition:all 0.15s; }
.sug-btn:hover { background:${C.greenBg} !important; border-color:#6ee7b7 !important; color:${C.greenMid} !important; }
.tab-pill { transition:all 0.15s; border:none; cursor:pointer; font-family:var(--font-sans); }
.tab-pill:hover { background:#e8e5de !important; }
.stat-badge-up   { background:${C.greenBg}; color:${C.greenMid}; }
.stat-badge-down { background:${C.redBg};   color:${C.red}; }
.mobile-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;backdrop-filter:blur(2px); }
@media (max-width:767px) {
  .center-grid3 { grid-template-columns:1fr !important; }
  .stat-grid    { grid-template-columns:1fr 1fr !important; }
  .right-strip  { width:100% !important; padding-left:16px !important; padding-right:16px !important; padding-bottom:80px !important; }
  .mobile-stack > .main-content:not(:last-child) { padding-bottom: 20px !important; }
  .mobile-hide  { display:none !important; }
  .mobile-full  { width:100% !important; min-width:0 !important; flex:1 1 100% !important; }
  .mobile-stack { flex-direction:column !important; }
  .tx-mobile-list   { display:block !important; }
  .tx-desktop-table { display:none !important; }
  .spend-header { flex-direction:column !important; align-items:flex-start !important; }
  .spend-subtabs { overflow-x:auto !important; }
  .goal-grid { grid-template-columns:1fr !important; }
  .header-greeting { font-size:16px !important; }
  .main-content { padding:6px 12px 80px !important; }
  .mobile-bottom-nav { display:flex !important; }
  .goals-form-grid { grid-template-columns:1fr !important; }
  .forecast-grid { grid-template-columns:1fr !important; }
  .add-tx-modal { width:calc(100vw - 24px) !important; max-height:90vh !important; overflow-y:auto !important; }
  .nw-stat-row { grid-template-columns:1fr 1fr !important; }
}
@media (min-width:768px) {
  .tx-mobile-list   { display:none !important; }
  .tx-desktop-table { display:block !important; }
  .tx-col-notes { display:none !important; }
  .tx-col-type  { display:none !important; }
}
@media (min-width:768px) and (max-width:1099px) {
  .center-grid3 { grid-template-columns:1fr 1fr !important; }
  .stat-grid    { grid-template-columns:1fr 1fr !important; }
  .right-strip  { display:none !important; }
  .benefits-grid { grid-template-columns:1fr 1fr !important; }
  .main-content { padding:8px 16px 40px !important; }
}
@media (min-width:1100px) {
  .mobile-bottom-strip { display:none !important; }
  .mobile-bottom-nav   { display:none !important; }
}
.tooltip-container { position:relative; display:inline-block; }
.tooltip-text { visibility:hidden;opacity:0;background:#111;color:#fff;font-size:11px;
  border-radius:6px;padding:4px 8px;position:absolute;left:calc(100% + 8px);top:50%;
  transform:translateY(-50%);white-space:nowrap;pointer-events:none;
  transition:opacity 0.15s;z-index:100; }
.tooltip-container:hover .tooltip-text { visibility:visible;opacity:1; }
.display-serif { font-family: var(--font-sans); letter-spacing: -0.01em; }
.anim-1, .anim-2, .anim-3, .anim-4 { opacity: 1; transform: none; animation: none; }
.fp-dashboard-shell,
.fp-dashboard-shell *,
.fp-dashboard-shell *::before,
.fp-dashboard-shell *::after,
.fp-advisor-overlay,
.fp-advisor-overlay *,
.fp-advisor-overlay *::before,
.fp-advisor-overlay *::after {
  animation: none !important;
  transition: none !important;
}
      `}</style>

      {/* ── AI ADVISOR OVERLAY ── */}
      {showAdvisor && (
        <>
          <div className="fp-advisor-overlay" onClick={() => setShowAdvisor(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--bg-overlay)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", animation: "none" }} />
          <div className="fp-advisor-overlay" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 201, width: isCompactAdvisor ? "min(430px, calc(100vw - 20px))" : "min(900px, calc(100vw - 48px))", height: isCompactAdvisor ? "min(82dvh, 760px)" : "min(720px, 90vh)", maxWidth: "calc(100vw - 20px)", maxHeight: "calc(100dvh - 20px)", display: "flex", flexDirection: "column", animation: "none" }}>
            <PortfolioProvider>
              <AIAdvisorCard
                C={C} isMobile={isCompactAdvisor} onClose={() => setShowAdvisor(false)}
                aiLimitReached={aiLimitReached} summary={summary}
                categoryBreakdown={categoryBreakdown} apiGoals={apiGoals}
                dashboard={dashboard} apiTransactions={apiTransactions}
                monthlyChart={monthlyChart} messages={advisorMessages}
                setMessages={setAdvisorMessages} aiService={aiService}
                navigate={navigate} sessions={advisorSessions}
                setSessions={setAdvisorSessions} activeSession={advisorActiveSession}
                setActiveSession={setAdvisorActiveSession} sidebarOpen={advisorSidebarOpen}
                setSidebarOpen={setAdvisorSidebarOpen} sessionsLoading={advisorSessionsLoading}
                memoryAssistEnabled={user?.memoryAssistEnabled !== false}
              />
            </PortfolioProvider>
          </div>
        </>
      )}

      <div className="fp-dashboard-shell" style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "var(--font-sans)", color: C.text, position: "relative", alignItems: "flex-start" }}>

        {/* ── MOBILE OVERLAY ── */}
        {mobileOpen && isMobile && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

        {/* ── ADD TRANSACTION MODAL ── */}
        {addModalOpen && (
          <AddTransactionModal
            C={C}
            onClose={() => { setAddModalOpen(false); setCsvFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
            txLimitReached={txLimitReached} txRemaining={txRemaining}
            resetLabel={resetLabel} isPro={isPro} navigate={navigate}
            toast={dedupToast} pushNotif={pushNotif}
            transactionService={transactionService} queryClient={queryClient}
            refreshUser={refreshUser} csvFile={csvFile} setCsvFile={setCsvFile}
            fileInputRef={fileInputRef} csvImportMutation={csvImportMutation}
          />
        )}

        {/* ── SIDEBAR ── */}
        <aside style={{ width: isMobile ? (mobileOpen ? 240 : 0) : sideW, flexShrink: 0, background: C.bg, display: "flex", flexDirection: "column", transition: "width 0.25s cubic-bezier(.4,0,.2,1)", overflow: "hidden", position: isMobile ? "fixed" : "sticky", top: 0, height: "100vh", zIndex: 50, borderRight: "1px solid var(--border-subtle)", boxShadow: isMobile && mobileOpen ? "4px 0 24px rgba(0,0,0,0.12)" : "none", alignSelf: "flex-start" }}>

          {/* Logo */}
          <div style={{ padding: "20px 16px 14px", display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            {(!sideCollapsed || isMobile) ? (
              <Logo size="sm" className="pointer-events-none" />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0A0A1A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #fff", position: "relative" }}>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />
                </div>
              </div>
            )}
            {isMobile && (
              <button onClick={() => setMobileOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex" }}>
                <X size={18} />
              </button>
            )}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "2px 8px", overflowY: "auto", overflowX: "hidden" }}>
            {navSections.map((section) => (
              <div key={section.label} style={{ marginBottom: 4 }}>
                {(!sideCollapsed || isMobile) && (
                  <div className="origin-section-label" style={{ padding: "10px 8px 3px" }}>
                    {section.label}
                  </div>
                )}
                {section.items.map(({ id, label, icon: Icon }) => {
                  const on = activeNav === id && id !== "ai_advisor";
                  return (
                    <div key={id} className={`nav-item tooltip-container ${on ? "active" : ""}`}
                      onClick={() => {
                        if ((id === "forecast" || id === "equity") && !isPro) { navigate("/subscription"); return; }
                        if (id === "ai_advisor") { setShowAdvisor(v => !v); if (isMobile) setMobileOpen(false); return; }
                        if (id === "spending") { goToSpending(); return; }
                        goToNav(id); if (isMobile) setMobileOpen(false);
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: 7, marginBottom: 1, position: "relative", userSelect: "none" }}
                    >
                      <div className="nav-bg" />
                      <Icon size={15} className="nav-ico" style={{ flexShrink: 0, zIndex: 1 }} />
                      {(!sideCollapsed || isMobile) && (
                        <span className="nav-lbl" style={{ fontSize: C.fSizeSm, fontWeight: on ? C.fWeightSemi : C.fWeightMed, zIndex: 1, whiteSpace: "nowrap", fontFamily: "var(--font-sans)", letterSpacing: "-0.05px", display: "flex", alignItems: "center", gap: 5, flex: 1 }}>
                          {label}
                          {(id === "forecast" || id === "equity") && !isPro && <Lock size={10} style={{ color: "currentColor", flexShrink: 0, marginLeft: 2 }} />}
                          {id === "ai_advisor" && !isPro && (
                            <span style={{ fontSize: C.fSizeXs, fontWeight: C.fWeightSemi, color: aiLimitReached ? "var(--accent)" : "var(--text-secondary)", background: aiLimitReached ? "var(--bg-secondary)" : "var(--border-subtle)", padding: "1px 5px", borderRadius: 20, flexShrink: 0 }}>
                              {aiLimitReached ? "0/5" : `${5 - aiRemaining}/5`}
                            </span>
                          )}
                        </span>
                      )}
                      {sideCollapsed && !isMobile && <span className="tooltip-text">{label}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Ask anything */}
          <div style={{ padding: "10px 10px 16px", borderTop: "1px solid var(--border-subtle)" }}>
            {(!sideCollapsed || isMobile) ? (
              <button type="button" onClick={() => setShowAdvisor(v => !v)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 16px", borderRadius: 12, background: C.white, border: "1px solid var(--border-subtle)", cursor: "pointer", transition: "all 0.15s", boxShadow: "(var(--bg-primary) === '#FFFFFF' ? '0 1px 4px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.2)')", fontFamily: "inherit" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--border-subtle)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.white; }}
              >
                <Star size={13} style={{ color: "var(--accent)", fill: "var(--accent)", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: C.text, letterSpacing: "-0.1px" }}>Ask anything</span>
              </button>
            ) : (
              <button type="button" onClick={() => setShowAdvisor(v => !v)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "9px", borderRadius: 10, background: C.white, border: "1px solid var(--border-subtle)", cursor: "pointer", transition: "all 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <Star size={14} style={{ color: "var(--accent)", fill: "var(--accent)" }} />
              </button>
            )}
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* ── TOP BAR ── */}
          <header style={{ height: 58, background: C.bg, display: "flex", alignItems: "center", padding: isMobile ? "0 12px" : "0 20px", gap: isMobile ? 8 : 12, flexShrink: 0, zIndex: 20, position: "sticky", top: 0 }}>
            <button onClick={() => isMobile ? setMobileOpen(p => !p) : setSideCollapsed(p => !p)}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.sub, display: "flex", alignItems: "center", padding: 4, borderRadius: 8, transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <Menu size={19} />
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              {activeNav === "dashboard" ? (
                <div className="header-greeting display-serif" style={{ fontSize: C.fSizeLg, fontWeight: C.fWeightMed, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.2px", lineHeight: C.lhTight }}>
                  {user?.name ? `${(() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening" })()}, ${user.name}` : "Dashboard"}
                </div>
              ) : (
                <div className="header-greeting display-serif" style={{ fontSize: C.fSizeLg, fontWeight: C.fWeightMed, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.2px", lineHeight: C.lhTight }}>
                  {navItems.find(n => n.id === activeNav)?.label ?? "Dashboard"}
                </div>
              )}
            </div>

            {/* AI Advisor button */}
            <button type="button" onClick={() => setShowAdvisor(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 7, background: showAdvisor ? "var(--accent)" : "var(--bg-secondary)", border: showAdvisor ? "1px solid var(--accent)" : "1px solid var(--border-subtle)", borderRadius: 8, padding: isMobile ? "6px 10px" : "7px 14px", cursor: "pointer", transition: "all 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", flexShrink: 0 }}
              onMouseEnter={e => { if (!showAdvisor) { e.currentTarget.style.borderColor = "var(--text-secondary)"; e.currentTarget.style.background = "var(--border-subtle)"; } }}
              onMouseLeave={e => { if (!showAdvisor) { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = "var(--bg-secondary)"; } }}
            >
              <Star size={13} style={{ color: showAdvisor ? "#ffffff" : "var(--text-primary)", fill: showAdvisor ? "#ffffff" : "var(--text-primary)", flexShrink: 0 }} />
              {!isMobile && <span style={{ fontSize: C.fSizeSm, fontWeight: C.fWeightMed, color: showAdvisor ? "#ffffff" : "var(--text-primary)", whiteSpace: "nowrap", letterSpacing: "-0.1px" }}>AI Advisor</span>}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>




              {/* Initials badge */}
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bg-secondary)", border: "1px solid var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>
                {(user?.name?.trim()?.charAt(0) || user?.email?.trim()?.charAt(0) || "U").toUpperCase()}
              </div>

              {/* Plus button */}
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-primary)", transition: "all 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-muted)"; e.currentTarget.style.borderColor = "var(--text-secondary)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-secondary)"; e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                aria-label="Add transaction"
              >
                <Plus size={18} strokeWidth={1.9} />
              </button>

              {/* Notifications */}
              <div ref={notifRef} style={{ position: "relative" }}>
                <button type="button"
                  onClick={() => { setNotifOpen(v => !v); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); }}
                  style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)", transition: "all 0.15s", position: "relative" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--border-subtle)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--bg-secondary)"}
                >
                  <Bell size={17} />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <div style={{ position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, background: C.red, borderRadius: 99, border: `2px solid var(--bg-primary)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff", padding: "0 3px" }}>
                      {notifications.filter(n => !n.read).length > 9 ? "9+" : notifications.filter(n => !n.read).length}
                    </div>
                  )}
                </button>

                {notifOpen && (
                  <div style={{ position: "absolute", top: 42, right: 0, width: isMobile ? "calc(100vw - 24px)" : 300, background: "var(--bg-primary)", border: `1px solid var(--border-subtle)`, borderRadius: 14, boxShadow: "0 18px 40px rgba(0,0,0,0.15)", zIndex: 100, overflow: "hidden", animation: "fadeUp 0.15s ease" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid var(--border-subtle)` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Notifications</div>
                      {notifications.length > 0 && (
                        <button type="button" onClick={() => setNotifications([])} style={{ fontSize: 10, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          Clear all
                        </button>
                      )}
                    </div>
                    <div style={{ maxHeight: 320, overflowY: "auto" }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: "32px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><Bell size={20} style={{ color: "var(--text-secondary)", opacity: 0.5 }} /></div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>No notifications yet</div>
                        </div>
                      ) : notifications.map(n => {
                        const iconMap = { success: Check, error: X, warning: ArrowUpRight, info: Bell };
                        const colorMap = { success: "#16a34a", error: "#dc2626", warning: "#d97706", info: "#374151" };
                        const bgMap = { success: "var(--bg-secondary)", error: "var(--bg-secondary)", warning: "var(--bg-secondary)", info: "var(--bg-secondary)" };
                        const NIcon = iconMap[n.type] || Bell;
                        const timeStr = n.time ? n.time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
                        return (
                          <div key={n.id} style={{ display: "flex", gap: 10, padding: "10px 14px", borderBottom: `1px solid var(--border-subtle)`, alignItems: "flex-start", background: n.read ? "transparent" : "var(--bg-secondary)" }}>
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: bgMap[n.type], border: `1px solid var(--border-subtle)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <NIcon size={12} style={{ color: colorMap[n.type] || "#6b7280", strokeWidth: 2 }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11.5, color: "var(--text-primary)", lineHeight: 1.45 }}>{n.message}</div>
                              <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 3 }}>{timeStr}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile dropdown */}
              <ProfileDropdown />
            </div>
          </header>

          <TransactionDetailSidebar />
          <SpendingSettingsSidebar open={spendingSettingsOpen} onClose={closeSpendingSettings} />

          {/* ── BODY ── */}
          <div className={isMobile ? "mobile-stack" : ""} style={{ flex: 1, display: "flex", minWidth: 0, minHeight: 0 }}>
            <div className="main-content" style={{ flex: 1, padding: "8px 20px 40px", display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>

              {/* HOME — wrapped in PortfolioProvider so HomeTabWrapper can call usePortfolio() */}
              {activeNav === "dashboard" && (
                <PortfolioProvider>
                  <HomeTabWrapper
                    C={C} user={user} isPro={isPro} isMobile={isMobile} isTablet={isTablet}
                    dashSubTab={dashSubTab} setDashSubTab={setDashSubTab}
                    activeTab={activeTab} setActiveTab={setActiveTab}
                    cashFlowData={cashFlowData}
                    categoryData={categoryData} transactions={transactions}
                    summary={summary} apiTransactions={apiTransactions}
                    monthlyChart={monthlyChart} setActiveNav={goToNav}
                    setShowAdvisor={setShowAdvisor} handleExportData={handleExportData}
                    isExporting={isExporting} messages={messages} isTyping={isTyping}
                    chatInput={chatInput} setChatInput={setChatInput}
                    handleSend={handleSend} msgsEndRef={msgsEndRef}
                    aiLimitReached={aiLimitReached} categoryBreakdown={categoryBreakdown}
                    apiGoals={apiGoals} dashCalc={dashCalc} apiBudget={apiBudget}
                    queryClient={queryClient} navigate={navigate}
                    setGlobalSelectedTxId={setGlobalSelectedTxId}
                    dashboard={dashboard}
                  />
                </PortfolioProvider>
              )}

              {/* SPENDING — extracted */}
              {activeNav === "spending" && (
                <SpendingPage
                  key={user?._id}
                  transactionService={transactionService}
                  queryClient={queryClient} C={C} isPro={isPro}
                  txLimitReached={txLimitReached} navigate={navigate}
                  toast={dedupToast} setAddModalOpen={setAddModalOpen}
                  pushNotif={pushNotif} summary={summary}
                  monthlyChart={monthlyChart} apiTransactions={apiTransactions}
                  isMobile={isMobile} refreshUser={refreshUser}
                  budget={apiBudget} categoryBreakdown={categoryBreakdown}
                  onBudgetSaved={() => queryClient.invalidateQueries({ queryKey: ["dashboard"] })}
                  setShowAdvisor={setShowAdvisor}
                  spendingSettings={dashboard?.spendingSettings}
                  setGlobalSelectedTxId={setGlobalSelectedTxId}
                />
              )}

              {/* PORTFOLIO — already separate */}
              {activeNav === "portfolio" && <Portfolio key={user?._id} isMobile={isMobile} />}
              {activeNav === "equity" && (
                isPro ? (
                  <Equity key={user?._id} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 16, gap: 16, maxWidth: 600, margin: "40px auto" }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: "#0A0A1A", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
                      <Lock size={24} color="#FFFFFF" strokeWidth={2.5} />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>Unlock Equity Tracking</div>
                    <p style={{ fontSize: 14, color: "var(--text-secondary)", textAlign: "center", maxWidth: 400, margin: 0 }}>Track and analyze your equity investments with detailed performance metrics and insights. Upgrade to Pro to access this feature.</p>
                    <button onClick={() => navigate(ROUTES.SUBSCRIPTION)} style={{ marginTop: 8, padding: "11px 24px", borderRadius: 10, background: "var(--accent)", color: "#FFFFFF", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.88"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                      Upgrade to Pro
                    </button>
                  </div>
                )
              )}

              {/* PLANNING */}
              {activeNav === "planning" && (
                <GoalsPage key={user?._id} C={C} aiService={aiService} pushNotif={pushNotif} />
              )}

              {/* FORECAST — extracted */}
              {activeNav === "forecast" && (
                isPro ? (
                  <ForecastPage
                    key={user?._id} C={C} summary={summary}
                    monthlyChart={monthlyChart} apiTransactions={apiTransactions}
                    effectiveForecast={effectiveForecast}
                    isMobile={isMobile} isTablet={isTablet}
                    pushNotif={pushNotif}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 16, gap: 16, maxWidth: 600, margin: "40px auto" }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: "#0A0A1A", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
                      <Lock size={24} color="#FFFFFF" strokeWidth={2.5} />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>
                      Cash Flow Forecasting
                    </div>
                    <div style={{ fontSize: 14, color: "var(--text-secondary)", textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>
                      Unlock predictive cash flow insights, net worth projections, and life event planning tools.
                    </div>
                    <button type="button" onClick={() => navigate("/subscription")}
                      style={{ marginTop: 8, padding: "12px 32px", borderRadius: 999, border: "none", background: "#0A0A1A", color: "#FFFFFF", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                      Upgrade to Pro
                    </button>
                    <button type="button" onClick={() => goToNav("dashboard")}
                      style={{ marginTop: 4, padding: "8px 24px", borderRadius: 999, border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      Back to Home
                    </button>
                  </div>
                )
              )}

              {/* BENEFITS */}
              {activeNav === "benefits" && (
                <BenefitsTab isPro={isPro} navigate={navigate} />
              )}

            </div>

            {/* RIGHT STRIP */}
            {activeNav === "dashboard" && (
              <div className="right-strip" style={{ width: 300, flexShrink: 0, background: "transparent", display: "flex", flexDirection: "column", gap: 10, paddingLeft: 10, paddingRight: 10, boxSizing: "border-box", alignSelf: "flex-start", paddingTop: 46, paddingBottom: 20 }}>
                <HealthScoreWidget C={C} dashCalc={dashCalc} apiGoals={apiGoals} apiBudget={apiBudget} apiTransactions={apiTransactions} setActiveNav={goToNav} setShowAdvisor={setShowAdvisor} />
                <MonthlyBudgetWidget C={C} budget={apiBudget} totalExpense={summary.totalExpense ?? 0} setActiveNav={goToNav} onBudgetSaved={() => queryClient.invalidateQueries({ queryKey: ["dashboard"] })} pushNotif={pushNotif} />
                <SavingsGoalsWidget C={C} apiGoals={apiGoals} setActiveNav={goToNav} />
                <CryptoHoldingsWidget C={C} setActiveNav={goToNav} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-bottom-nav" style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 60, background: C.white, borderTop: `1px solid ${C.border}`, padding: "8px 4px 12px", justifyContent: "space-around", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
        {navItems.slice(0, 6).map(({ id, label, icon: Icon }) => {
          const on = activeNav === id && id !== "ai_advisor";
          return (
            <button key={id} type="button"
              onClick={() => { if (id === "ai_advisor") { setShowAdvisor(v => !v); return; } goToNav(id); }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", minWidth: 0, flex: 1 }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: on ? C.strong : "transparent", transition: "background 0.15s" }}>
                <Icon size={17} style={{ color: on ? C.onStrong : C.sub, strokeWidth: on ? 2 : 1.6 }} />
              </div>
              <span style={{ fontSize: 9.5, fontWeight: on ? 700 : 400, color: on ? C.text : C.muted, letterSpacing: "0.01em" }}>
                {label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

/* ─── HomeTabWrapper — adds real portfolio assets to net worth ── */
// DashboardContext can't call usePortfolio() (it's not inside PortfolioProvider there).
// This wrapper sits inside <PortfolioProvider> and computes the real netWorthData
// = cumulative cash savings + current portfolio asset value per month.
function HomeTabWrapper(props) {
  const { netWorthAssets: assets = [] } = usePortfolio();
  const { monthlyChart, apiTransactions, activeTab } = props;

  const toLocalKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  // Real net worth = cumulative cash (from monthlyChart) + current total asset value
  // Since we don't have historical asset prices, we show:
  //   - Historical bars: cumulative cash savings per month
  //   - Latest point: cash + total current asset value (most accurate number)
  const totalAssetsNow = assets.reduce((s, a) => s + (a.currentValue || 0), 0);

  // Canonical baseline used by both Home and Forecast: all-time cumulative cash + current assets.
  const canonicalCurrentNetWorth = useMemo(() => {
    const sortedMonthly = [...(monthlyChart || [])].sort((a, b) => (a.month || "").localeCompare(b.month || ""));
    const cumulativeCash = sortedMonthly.reduce((sum, m) => sum + ((m.income || 0) - (m.expense || 0)), 0);
    return Math.round(cumulativeCash + totalAssetsNow);
  }, [monthlyChart, totalAssetsNow]);

  const netWorthData = useMemo(() => {
    const txs = (apiTransactions || []).filter((t) => t?.date);
    const sortedMonthly = [...(monthlyChart || [])].sort((a, b) => (a.month || "").localeCompare(b.month || ""));
    const now = new Date();

    const addAssetsToAllPoints = (points) => {
      if (!points.length) return points;
      return points.map((point, idx) => ({
        ...point,
        v: Math.round(point.v + (idx === points.length - 1 ? totalAssetsNow : 0)),
      }));
    };

    const dailyFromTransactions = (days) => {
      const dayBuckets = {};
      for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const key = toLocalKey(d);
        dayBuckets[key] = { income: 0, expense: 0 };
      }

      txs.forEach((t) => {
        const d = new Date(t.date);
        if (Number.isNaN(d.getTime())) return;
        d.setHours(0, 0, 0, 0);
        const key = toLocalKey(d);
        if (!dayBuckets[key]) return;
        const amt = Math.abs(Number(t.amount) || 0);
        const isInc = t.type === "income" || t.type === "deposit" || t.type === "credit";
        const isExp = t.type === "expense" || t.type === "debit" || t.type === "withdrawal" || t.type === "payment";
        if (isInc) dayBuckets[key].income += amt;
        if (isExp) dayBuckets[key].expense += amt;
      });

      let cumulative = 0;
      return Object.entries(dayBuckets).map(([key, val]) => {
        cumulative += (val.income || 0) - (val.expense || 0);
        const d = new Date(key);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return { d: label, v: Math.round(cumulative) };
      });
    };

    const monthlyFromChart = (mode) => {
      let slice = sortedMonthly;
      if (mode === "3M") slice = sortedMonthly.slice(-3);
      if (mode === "YTD") {
        const year = now.getFullYear();
        slice = sortedMonthly.filter((m) => (m.month || "").startsWith(String(year)));
      }

      let cumulative = 0;
      return slice.map((m) => {
        cumulative += (m.income || 0) - (m.expense || 0);
        const [y, mo] = (m.month || "").split("-").map(Number);
        const label = (y && mo)
          ? new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
          : (m.month || "—");
        return { d: label, v: Math.round(cumulative) };
      });
    };

    if (activeTab === "1W") return addAssetsToAllPoints(dailyFromTransactions(7));
    if (activeTab === "1M") return addAssetsToAllPoints(dailyFromTransactions(Math.max(1, now.getDate())));
    if (activeTab === "3M") return addAssetsToAllPoints(monthlyFromChart("3M"));
    if (activeTab === "YTD") return addAssetsToAllPoints(monthlyFromChart("YTD"));
    return addAssetsToAllPoints(monthlyFromChart("ALL"));
  }, [activeTab, apiTransactions, monthlyChart, totalAssetsNow]);

  return (
    <HomeTab
      {...props}
      netWorthData={netWorthData}
      totalAssetsNow={totalAssetsNow}
      canonicalCurrentNetWorth={canonicalCurrentNetWorth}
    />
  );
}

/* ─── HomeTab ────────────────────────────────────────────── */
function HomeTab({ C, isPro, isMobile, dashSubTab, setDashSubTab, activeTab, setActiveTab, netWorthData, totalAssetsNow, canonicalCurrentNetWorth, transactions, summary, apiTransactions, monthlyChart, categoryBreakdown, setActiveNav, setShowAdvisor, handleExportData, isExporting, setGlobalSelectedTxId, dashboard }) {
  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
        {[{ id: "overview", label: "Overview" }, { id: "networth", label: "Net worth" }].map(({ id, label }) => (
          <button key={id} onClick={() => setDashSubTab(id)}
            style={{
              padding: "7px 16px", borderRadius: 10,
              background: dashSubTab === id ? C.white : "transparent",
              border: dashSubTab === id ? `1px solid ${C.border}` : "1px solid transparent",
              fontSize: C.fSizeSm, fontWeight: dashSubTab === id ? C.fWeightSemi : C.fWeightReg,
              color: dashSubTab === id ? C.text : C.muted,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: dashSubTab === id ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.15s"
            }}>
            {label}
          </button>
        ))}
      </div>

      {dashSubTab === "overview" && (
        <OverviewSubTab
          C={C} isPro={isPro} activeTab={activeTab} setActiveTab={setActiveTab}
          netWorthData={netWorthData} totalAssetsNow={totalAssetsNow} canonicalCurrentNetWorth={canonicalCurrentNetWorth} transactions={transactions}
          summary={summary} apiTransactions={apiTransactions} dashboard={dashboard} monthlyChart={monthlyChart} categoryBreakdown={categoryBreakdown}
          setActiveNav={setActiveNav} setShowAdvisor={setShowAdvisor}
          handleExportData={handleExportData} isExporting={isExporting}
          setDashSubTab={setDashSubTab}
          setGlobalSelectedTxId={setGlobalSelectedTxId}
          isMobile={isMobile}
        />
      )}

      {dashSubTab === "networth" && (
        <NetWorthView C={C} netWorthData={netWorthData} summary={summary} monthlyChart={monthlyChart} isMobile={isMobile} apiTransactions={apiTransactions} categoryBreakdown={categoryBreakdown} canonicalCurrentNetWorth={canonicalCurrentNetWorth} setActiveNav={setActiveNav} />
      )}
    </>
  );
}

/* ─── BenefitsTab ────────────────────────────────────────── */
function BenefitsTab({ isPro, navigate }) {
  const FREE_FEATURES = [
    "10 transactions / month",
    "5 AI queries / month",
    "Goal tracking & planning",
    "Cash flow forecasting",
    "Spending calendar",
    "Basic credit score",
  ];
  const PRO_FEATURES = [
    "Unlimited transactions",
    "Unlimited AI queries",
    "AI auto-categorization",
    "Advanced analytics & reports",
    "CSV data export anytime",
    "Priority support",
    "Full net worth tracking",
    "Equity tracking & analysis",
    "Forecast & projection tools",
  ];
  const { data: billingStatus } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => subscriptionService.getBillingStatus(),
    retry: false,
  });
  const livePrice = billingStatus?.proPrice || null;
  const liveInterval = livePrice?.interval || "month";
  const displayAmount = livePrice?.unitAmount != null
    ? formatCurrencyAmount(livePrice.unitAmount / 100, String(livePrice.currency || "usd").toUpperCase(), {
      maximumFractionDigits: 0,
    })
    : "$12";
  const displayInterval = livePrice?.intervalCount && livePrice.intervalCount > 1
    ? `${livePrice.intervalCount} ${liveInterval}s`
    : liveInterval;

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="7.5" stroke="var(--border-subtle)" strokeWidth="1" />
      <path d="M5 8.5L7 10.5L11 6" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div style={{
      borderRadius: 20,
      overflow: "hidden",
      position: "relative",
      minHeight: 480,
      background: "linear-gradient(145deg, var(--bg-secondary) 0%, var(--surface-muted) 100%)",
      border: `1px solid ${C.border}`,
    }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "var(--info-transparent)", filter: "blur(80px)", top: -80, left: -60 }} />
        <div style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", background: "var(--accent-transparent)", filter: "blur(90px)", bottom: -60, right: -40 }} />
        <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", background: "var(--warning-transparent)", filter: "blur(60px)", top: "40%", left: "50%" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "52px 32px 48px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: C.fSizeXl, fontWeight: C.fWeightSemi, color: "var(--text-primary)", margin: 0, lineHeight: C.lhTight, fontFamily: "var(--font-sans)", letterSpacing: "-0.5px" }}>
            <em style={{ fontStyle: "italic" }}>Your plan,</em> your benefits
          </h2>
          <p style={{ fontSize: C.fSizeBase, color: "var(--text-secondary)", marginTop: 10, lineHeight: C.lhBase, maxWidth: 400 }}>
            Everything included in your current FinPilot plan and what you unlock with Pro.
          </p>
        </div>

        <div style={{ display: "flex", gap: 16, width: "100%", maxWidth: 720, flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{
            flex: "1 1 300px", minWidth: 280, maxWidth: 340,
            background: "color-mix(in srgb, var(--bg-secondary) 88%, transparent)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: "28px 26px 24px",
            display: "flex", flexDirection: "column", gap: 0,
            boxShadow: "var(--shadow-elevated)",
          }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Free plan
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, color: "var(--text-primary)", textAlign: "center", letterSpacing: "-1px", marginBottom: 4, fontFamily: "var(--font-sans)" }}>
              $0
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", marginBottom: 22 }}>
              forever
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", marginBottom: 24, lineHeight: 1.5 }}>
              Core tools to start tracking your finances.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 28, flex: 1 }}>
              {FREE_FEATURES.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckIcon />
                  <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{f}</span>
                </div>
              ))}
            </div>
            <div style={{
              padding: "13px 0", borderRadius: 10, textAlign: "center",
              border: "1px solid color-mix(in srgb, var(--text-primary) 16%, transparent)",
              fontSize: 14, fontWeight: 500, color: "var(--text-secondary)",
              background: "var(--surface-muted)",
              letterSpacing: "0.01em",
            }}>
              {isPro ? "Previous plan" : "Current plan"}
            </div>
          </div>

          <div style={{
            flex: "1 1 300px", minWidth: 280, maxWidth: 340,
            background: "color-mix(in srgb, var(--surface-muted) 90%, transparent)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid var(--accent)",
            borderRadius: 16,
            padding: "28px 26px 24px",
            display: "flex", flexDirection: "column", gap: 0,
            boxShadow: "var(--shadow-elevated)",
          }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "center", marginBottom: 16, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {isPro ? "Your plan" : "Pro plan"}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 42, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-1px", fontFamily: "var(--font-sans)" }}>{displayAmount}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", marginBottom: 22 }}>
              per {displayInterval}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", marginBottom: 24, lineHeight: 1.5 }}>
              Everything in Free, plus unlimited access and advanced tools.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 28, flex: 1 }}>
              {PRO_FEATURES.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckIcon />
                  <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{f}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.SUBSCRIPTION)}
              style={{
                padding: "13px 0", borderRadius: 10, border: isPro ? "1px solid color-mix(in srgb, var(--text-primary) 16%, transparent)" : "1px solid var(--surface-strong)",
                background: isPro ? "var(--surface-muted)" : "var(--surface-strong)",
                color: isPro ? "var(--text-primary)" : "var(--text-on-strong)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                letterSpacing: "0.01em", transition: "all 0.15s", fontFamily: "inherit",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              {isPro ? "Manage Subscription" : "Upgrade to Pro"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Overview Investments Card (simple single graph with visible axes) ─── */
function OverviewInvestmentsCard({ C, isMobile, categoryBreakdown, canonicalCurrentNetWorth, formatSignedAmount, formatAmount, setActiveNav }) {
  const { user: dashboardUser } = useAuthContext();
  const preferredCurrency = getUserCurrency(dashboardUser);
  const portfolio = usePortfolio() || {};
  const { netWorthAssets: assets = [] } = portfolio;
  const fmtNW = (n) => formatCurrencyAmount(Math.abs(n || 0), preferredCurrency, { maximumFractionDigits: 0 });

  // Build investment chart data from assets
  const investChartData = useMemo(() => {
    if (!assets.length) return [];

    const events = [];
    assets.forEach(a => {
      const invested = a.assetType === "crypto"
        ? (a.buyPrice || 0) * (a.quantity || 0)
        : (a.buyingPrice || a.purchasePrice || 0);
      const dateStr = a.buyDate || a.createdAt || a.purchaseDate;
      const d = dateStr ? new Date(dateStr) : null;
      const monthKey = (d && !isNaN(d))
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        : null;
      events.push({ monthKey, invested, currentValue: a.currentValue || 0 });
    });

    const datedEvents = events.filter(e => e.monthKey);
    const undatedEvents = events.filter(e => !e.monthKey);
    const nowDate = new Date();
    const nowKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`;

    if (!datedEvents.length) {
      const totalVal = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
      return Array.from({ length: 12 }, (_, i) => {
        const d2 = new Date(nowDate.getFullYear(), nowDate.getMonth() - 11 + i, 1);
        const lbl = d2.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        return { d: lbl, ts: d2.getTime(), v: i === 11 ? totalVal : 0 };
      });
    }

    const earliestKey = datedEvents.reduce((min, e) => e.monthKey < min ? e.monthKey : min, datedEvents[0].monthKey);
    undatedEvents.forEach(e => { e.monthKey = earliestKey; });

    const monthMap = {};
    events.forEach(({ monthKey, invested, currentValue }) => {
      if (!monthMap[monthKey]) monthMap[monthKey] = { invested: 0, currentValue: 0 };
      monthMap[monthKey].invested += invested;
      monthMap[monthKey].currentValue += currentValue;
    });

    const twelveAgo = new Date(nowDate.getFullYear(), nowDate.getMonth() - 11, 1);
    const twelveKey = `${twelveAgo.getFullYear()}-${String(twelveAgo.getMonth() + 1).padStart(2, "0")}`;
    const startKey = earliestKey < twelveKey ? earliestKey : twelveKey;
    const [sy, sm] = startKey.split("-").map(Number);
    const months = [];
    let y = sy, m = sm;
    while (true) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      months.push(key);
      if (key >= nowKey) break;
      m++; if (m > 12) { m = 1; y++; }
    }

    let cumCost = 0;
    const totalCurrentValue = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
    return months.map((key, idx) => {
      cumCost += (monthMap[key]?.invested || 0);
      const [ky, km] = key.split("-").map(Number);
      const d2 = new Date(ky, km - 1, 1);
      const lbl = d2.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const isLast = idx === months.length - 1;
      const fraction = months.length > 1 ? idx / (months.length - 1) : 1;
      const interpolatedValue = isLast ? totalCurrentValue : Math.round(totalCurrentValue * fraction);
      return { d: lbl, ts: d2.getTime(), v: Math.round(cumCost) };
    });
  }, [assets]);

  const totalValue = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
  const totalInvested = assets.reduce((s, a) => {
    const cost = a.assetType === "crypto"
      ? (a.buyPrice || 0) * (a.quantity || 0)
      : (a.buyingPrice || a.purchasePrice || 0);
    return s + (cost > 0 ? cost : (a.currentValue || 0));
  }, 0);
  const totalGain = totalValue - totalInvested;
  const gainPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : null;

  return (
    <Card style={{ padding: 0, overflow: "hidden", background: C.white, borderRadius: 18, marginTop: 16 }}>
      {/* Header */}
      <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border2}` }}>
        <div>
          <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.text }}>
            {fmtNW(totalValue)}
          </div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>
            Total portfolio value
          </div>
          {gainPct !== null && (
            <div style={{ fontSize: 12, fontWeight: 600, color: totalGain >= 0 ? C.greenMid : C.red, marginTop: 2 }}>
              {totalGain >= 0 ? "+" : ""}{fmtNW(totalGain)} ({totalGain >= 0 ? "+" : ""}{gainPct}%)
            </div>
          )}
        </div>
      </div>

      {/* Chart with visible axes */}
      <div style={{ width: "100%", height: isMobile ? 200 : 260 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={isMobile ? 200 : 260}>
          <AreaChart data={investChartData} margin={{ top: 10, right: isMobile ? 44 : 56, bottom: 18, left: 0 }}>
            <defs>
              <linearGradient id="overviewInvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="d"
              tick={{ fontSize: 10, fill: C.muted, fontFamily: "var(--font-sans)" }}
              axisLine={false} tickLine={false} interval="preserveStartEnd"
            />
            <YAxis orientation="right" axisLine={false} tickLine={false} width={isMobile ? 44 : 56}
              tickFormatter={v => fmtNW(v)}
              tick={{ fontSize: 10, fill: C.muted, fontFamily: "var(--font-sans)" }}
            />
            <CartesianGrid vertical={false} stroke={C.border2} strokeDasharray="4 4" />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload;
              return (
                <div style={{ background: C.white, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "10px 13px", boxShadow: "0 4px 16px rgba(0,0,0,0.09)" }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{row?.d}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{fmtNW(row?.v)}</div>
                </div>
              );
            }} />
            <Area type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={2.5}
              fill="url(#overviewInvGrad)" dot={false}
              activeDot={{ r: 5, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ─── OverviewSubTab ─────────────────────────────────────── */
function OverviewSubTab({ C, isPro, activeTab, setActiveTab, netWorthData, totalAssetsNow, canonicalCurrentNetWorth, transactions, summary, apiTransactions, monthlyChart, categoryBreakdown, setActiveNav, setShowAdvisor, handleExportData, isExporting, setDashSubTab, setGlobalSelectedTxId, dashboard, isMobile }) {
  const { user: dashboardUser } = useAuthContext();
  const preferredCurrency = getUserCurrency(dashboardUser);
  const formatAmount = (value, options = {}) => formatCurrencyAmount(value, preferredCurrency, options);
  const formatSignedAmount = (value, options = {}) => {
    const numeric = Number(value || 0);
    const formatted = formatAmount(Math.abs(numeric), options);
    return numeric < 0 ? `-${formatted}` : formatted;
  };

  return (
    <>
      {/* Net Worth Chart Card */}
      <Card className="anim-2" style={{ padding: 0, overflow: "hidden", background: C.white, borderRadius: 18 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 12px", borderBottom: `1px solid ${C.border2}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setDashSubTab("networth")}>
            <span className="origin-section-label">NET WORTH</span>
            <ChevronRight size={12} style={{ color: C.muted }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button type="button" onClick={() => setShowAdvisor(v => !v)} style={{ width: 28, height: 28, borderRadius: 7, background: C.bg, border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Star size={13} style={{ color: "var(--text-secondary)", fill: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Net Worth value + change + Forecast button — real data (cash + assets) */}
        <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          {(() => {
            const nwArr = netWorthData || [];
            const trendLatest = nwArr.length ? nwArr[nwArr.length - 1].v : 0;
            const latest = Number.isFinite(canonicalCurrentNetWorth) ? canonicalCurrentNetWorth : trendLatest;
            const first = nwArr.length > 1 ? nwArr[0].v : 0;
            const change = latest - first;
            const changePct = first !== 0 ? ((change / Math.abs(first)) * 100) : 0;
            const changePctLabel = (Math.abs(changePct) < 0.1 && change !== 0) ? changePct.toFixed(2) : changePct.toFixed(1);
            const fmtNW = (n) => {
              if (n == null) return formatAmount(0, { maximumFractionDigits: 0 });
              return formatSignedAmount(n, { maximumFractionDigits: 0 });
            };
            return (
              <>
                <div>
                  <div className="origin-value" style={{ color: latest < 0 ? C.red : C.text }}>{fmtNW(latest)}</div>
                  {change !== 0 && (
                    <div style={{ fontSize: C.fSizeSm, fontWeight: C.fWeightSemi, color: change >= 0 ? C.greenMid : C.red, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                      {fmtNW(change)} ({change >= 0 ? "+" : ""}{changePctLabel}%)
                    </div>
                  )}
                  {(totalAssetsNow || 0) > 0 && (
                    <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3 }}>
                      Incl. {formatAmount(totalAssetsNow || 0, { maximumFractionDigits: 0 })} in assets
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setActiveNav("forecast")}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 100, border: "none", background: C.strong, color: C.onStrong, fontSize: C.fSizeSm, fontWeight: C.fWeightSemi, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", transition: "all 0.15s", flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  Forecast <ChevronRight size={13} />
                </button>
              </>
            );
          })()}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={180} minWidth={0} minHeight={180}>
          <AreaChart data={netWorthData} margin={{ top: 10, right: 56, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0D9488" stopOpacity={0.56} />
                <stop offset="100%" stopColor="#0D9488" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="d" hide />
            <YAxis orientation="right" axisLine={false} tickLine={false} width={56}
              tickFormatter={v => {
                const abs = Math.abs(v);
                const sign = v < 0 ? "-" : "";
                if (abs >= 1000000) return `${sign}${formatAmount(abs / 1000000, { maximumFractionDigits: 1 })}M`;
                if (abs >= 1000) return `${sign}${formatAmount(abs / 1000, { maximumFractionDigits: 1 })}K`;
                return formatSignedAmount(v, { maximumFractionDigits: 0 });
              }}
              tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
            />
            <CartesianGrid vertical={false} stroke={C.border2} strokeDasharray="3 3" />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const v = payload[0]?.value ?? 0;
                const fmt = formatSignedAmount(v, { maximumFractionDigits: 0 });
                return (
                  <div style={{ background: C.white, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "8px 12px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{payload[0]?.payload?.d}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: v < 0 ? C.red : C.text }}>{fmt}</div>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="v" stroke="#0D9488" strokeWidth={2} fill="url(#nwGrad)" dot={false}
              activeDot={{ r: 5, fill: "#0D9488", stroke: C.white, strokeWidth: 2 }}
            />
            {netWorthData && netWorthData.length > 0 && (
              <ReferenceDot
                x={netWorthData[netWorthData.length - 1].d}
                y={netWorthData[netWorthData.length - 1].v}
                r={4}
                fill="#0D9488"
                stroke="#0D9488"
                isFront={true}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>

        {/* Time filter tabs */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, padding: "8px 0 14px" }}>
          {timeTabs.map(t => (
            <button key={t} type="button" onClick={() => setActiveTab(t)}
              style={{
                padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 12, fontWeight: activeTab === t ? 700 : 400,
                background: activeTab === t ? C.strong : "transparent", color: activeTab === t ? C.onStrong : C.muted,
                transition: "all 0.15s",
              }}
            >{t}</button>
          ))}
        </div>
      </Card>

      {/* Combined Calendar + Recent Transactions Card */}
      <Card className="anim-3" style={{ padding: "16px 18px", overflow: "hidden", background: C.white, borderRadius: 18, fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 0.9fr) minmax(0, 1fr)", gap: isMobile ? 24 : 18, minHeight: "auto" }}>
          
          {/* LEFT: Calendar Section */}
          <div style={{ minWidth: 0 }}>
            {/* Calendar Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setActiveNav("spending")}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Spent in {new Date().toLocaleString("default", { month: "long" })}</span>
                <ChevronRight size={10} style={{ color: C.muted }} />
              </div>
              <button type="button" onClick={() => setShowAdvisor(v => !v)} style={{ width: 22, height: 22, borderRadius: 5, background: C.bg, border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontSize: 13, padding: 0 }}>
                <Star size={11} style={{ color: "var(--text-secondary)", fill: "var(--text-secondary)" }} />
              </button>
            </div>

            {/* Total Spent */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: C.text, letterSpacing: "-0.5px" }}>
                {formatAmount(summary?.totalExpense ?? 0, { maximumFractionDigits: 0 })}
              </div>
            </div>

            {/* Calendar Grid */}
            <SpendingCalendarGrid C={C} apiTransactions={apiTransactions} onDayClick={(day) => {
              const txsOnDay = apiTransactions?.filter(t => {
                const d = new Date(t.date);
                const isExp = t.type === "expense" || t.type === "debit" || t.type === "withdrawal" || t.type === "payment";
                return isExp && d.getFullYear() === new Date().getFullYear() && d.getMonth() === new Date().getMonth() && d.getDate() === day;
              });
              if (txsOnDay?.length > 0) {
                setGlobalSelectedTxId?.(txsOnDay[0].id || txsOnDay[0]._id);
              }
            }} />
          </div>

          {/* RIGHT: Recent Transactions Section */}
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", paddingLeft: isMobile ? 0 : 18, paddingTop: isMobile ? 24 : 0, borderTop: isMobile ? `1px solid ${C.border2}` : "none" }}>
            {/* Header */}
            <div style={{ marginBottom: 12, flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Recent transactions</div>
            </div>

            {/* Transactions List */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {transactions.slice(0, 6).map(tx => {
                const txMeta = getSpendingCategoryMeta(tx.category);
                const TxIcon = txMeta?.icon || catToIcon[tx.category] || BadgeDollarSign;
                const iconColor = txMeta?.color || C.text;
                return (
                  <div key={tx.id} 
                    onClick={() => setGlobalSelectedTxId?.(tx.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      paddingBottom: 8, borderBottom: `1px solid ${C.border2}`,
                      cursor: "pointer", transition: "all 0.15s ease"
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 6, background: "var(--surface-muted)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, border: `1px solid ${C.border}`,
                      }}>
                        <TxIcon size={14} style={{ color: iconColor, strokeWidth: 2 }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: C.text, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.merchant}</div>
                        <div style={{ fontSize: 9.5, color: C.muted, marginTop: 1 }}>{tx.date}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: tx.amount > 0 ? C.greenMid : C.text }}>
                        {tx.amount > 0 ? "+" : ""}{formatAmount(Math.abs(tx.amount), { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View All Button */}
            <button type="button" onClick={() => setActiveNav("spending")} 
              style={{ marginTop: 10, padding: "9px 10px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 11, fontWeight: 600, color: C.text, cursor: "pointer", transition: "all 0.15s", textAlign: "center", fontFamily: "inherit" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-muted)"; e.currentTarget.style.borderColor = C.muted; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border; }}
            >
              View all transactions
            </button>
          </div>
        </div>
      </Card>

      <OverviewInvestmentsCard C={C} isMobile={isMobile} categoryBreakdown={categoryBreakdown} canonicalCurrentNetWorth={canonicalCurrentNetWorth} formatSignedAmount={formatSignedAmount} formatAmount={formatAmount} setActiveNav={setActiveNav} />

    </>
  );
}



function AddTransactionModal({ C, onClose, txLimitReached, txRemaining, resetLabel, isPro, navigate, pushNotif, transactionService, queryClient, refreshUser, csvFile, setCsvFile, fileInputRef, csvImportMutation }) {
  const { user: dashboardUser } = useAuthContext();
  const preferredCurrency = getUserCurrency(dashboardUser);
  const [tab, setTab] = useState("manual"); // "manual" | "csv"
  const [saving, setSaving] = useState(false);
  const [csvImportCount, setCsvImportCount] = useState(isPro ? "All" : "10");
  const BLANK = { merchant: "", amount: "", type: "expense", category: "", date: formatDateInputValue(new Date()), notes: "" };
  const [form, setForm] = useState(BLANK);

  const { data: categoryData } = useQuery({
    queryKey: ["transaction-categories", dashboardUser?._id],
    queryFn: () => transactionCategoryService.list().then((r) => r.data),
    enabled: !!dashboardUser?._id,
    staleTime: 0,
    refetchOnMount: true,
  });
  const categoryRecords = categoryData?.categories || [];

  const customExpenses = categoryRecords.filter(c => c.type === "expense").map(c => c.name);
  const customIncomes = categoryRecords.filter(c => c.type === "income").map(c => c.name);

  const INCOME_CATS = ["Salary", "Freelance", "Investment", "Other Income", ...customIncomes];
  const EXPENSE_CATS = ["Dining", "Groceries", "Transport", "Subscriptions", "Shopping", "Health", "Education", "Utilities", "Rent", "Entertainment", "Travel", "Other Expense", ...customExpenses];
  const CATEGORIES = form.type === "income" ? INCOME_CATS : EXPENSE_CATS;

  const inputSx = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
    padding: "8px 12px", fontSize: 13, color: C.text, background: C.bg,
    outline: "none", fontFamily: "var(--font-sans)", boxSizing: "border-box",
    appearance: "none", WebkitAppearance: "none", MozAppearance: "textfield",
  };
  const labelSx = { fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: "0.04em" };

  const handleManualSave = async () => {
    if (!form.merchant.trim()) return dedupToast.error("Merchant / description is required", { duration: 1500 });
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) return dedupToast.error("Enter a valid amount", { duration: 1500 });
    setSaving(true);
    try {
      await transactionService.create({
        merchant: form.merchant.trim(),
        amount: parseFloat(form.amount),
        type: form.type,
        category: form.category || (form.type === "income" ? "Other Income" : "Other Expense"),
        date: form.date || new Date().toISOString(),
        notes: form.notes || undefined,
      });
      const amountLabel = formatCurrencyAmount(parseFloat(form.amount), preferredCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const msg = `Transaction added: ${form.type === "income" ? "+" : "-"}${amountLabel} · ${form.merchant}`;
      dedupToast.success("Transaction added");
      if (pushNotif) pushNotif("success", msg);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-page"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      refreshUser?.(); // refresh user quota (transactionsUsed) in auth context
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to add transaction";
      dedupToast.error(msg);
      if (pushNotif) pushNotif("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCsvUpload = () => {
    if (txLimitReached) {
      dedupToast.error("Free limit reached. Upgrade to Pro to add more transactions.", { duration: 1500 });
      if (pushNotif) pushNotif("warning", "Transaction limit reached — upgrade to Pro");
      return;
    }
    if (!csvFile) return;
    const MAX = 2 * 1024 * 1024;
    if (csvFile.size > MAX) { dedupToast.error("File too large. Max 2MB.", { duration: 1500 }); return; }
    csvImportMutation.mutate({ file: csvFile, limit: csvImportCount === "All" ? undefined : parseInt(csvImportCount) });
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", padding: 16 }}
      onClick={() => !csvImportMutation.isPending && !saving && onClose()}>
      <style>{`
        .fp-no-spin::-webkit-outer-spin-button,
        .fp-no-spin::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .fp-no-spin {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>
      <div className="add-tx-modal" style={{ background: "var(--bg-secondary)", borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", maxWidth: 460, width: "100%", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px 0" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "var(--font-sans)" }}>Add Transaction</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
              {txLimitReached
                ? <span style={{ color: C.red, fontWeight: 600 }}>Free limit reached · <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate && navigate("/subscription")}>Upgrade to Pro</span></span>
                : isPro ? "Pro plan — unlimited transactions"
                  : <span>Free plan: <strong>{txRemaining}</strong> of 10 remaining{resetLabel ? ` · resets ${resetLabel}` : ""}</span>
              }
            </div>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, padding: "14px 22px 0", borderBottom: `1px solid ${C.border2}` }}>
          {[["manual", "Manual Entry"], ["csv", "CSV Import"]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              style={{
                padding: "7px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                background: "none", border: "none", borderBottom: tab === id ? `2px solid ${C.text}` : "2px solid transparent",
                color: tab === id ? C.text : C.muted, marginBottom: -1, transition: "all 0.15s",
                fontFamily: "var(--font-sans)",
              }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: "20px 22px 22px" }}>

          {/* ── Manual Entry Tab ── */}
          {tab === "manual" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Type toggle */}
              <div>
                <label style={labelSx}>Type</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["expense", "income"].map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t, category: '' }))}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        cursor: "pointer", border: `1px solid ${form.type === t ? (t === "income" ? C.greenMid : C.red) : C.border}`,
                        background: form.type === t ? (t === "income" ? C.greenBg : C.redBg) : "var(--bg-secondary)",
                        color: form.type === t ? (t === "income" ? C.greenMid : C.red) : C.muted,
                        transition: "all 0.15s", textTransform: "capitalize",
                      }}>
                      {t === "income" ? "＋ Income" : "－ Expense"}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Merchant */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelSx}>Merchant / Description *</label>
                  <input value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))}
                    placeholder="e.g. Starbucks, Salary" style={inputSx} autoFocus />
                </div>

                {/* Amount */}
                <div>
                  <label style={labelSx}>Amount ($) *</label>
                  <input className="fp-no-spin" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00" style={{ ...inputSx, appearance: 'textfield', WebkitAppearance: 'none', MozAppearance: 'textfield' }} />
                </div>

                {/* Date */}
                <div>
                  <label style={labelSx}>Date</label>
                  <CalendarPicker C={C} value={form.date} onChange={(value) => setForm((f) => ({ ...f, date: value }))} />
                </div>

                {/* Category */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelSx}>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputSx}>
                    <option value="">Select category…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Notes */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelSx}>Notes (optional)</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any extra details…" style={inputSx} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={handleManualSave} disabled={saving || txLimitReached}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: txLimitReached ? C.border : C.strong, color: txLimitReached ? C.muted : C.onStrong, fontSize: 13, fontWeight: 700, cursor: saving || txLimitReached ? "not-allowed" : "pointer", opacity: saving ? 0.75 : 1 }}>
                  {saving ? "Saving…" : "Add Transaction"}
                </button>
                <button type="button" onClick={onClose}
                  style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surfaceMuted || C.bg, color: C.sub, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── CSV Import Tab ── */}
          {tab === "csv" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* One-line format hint */}
              <div style={{ background: C.bg, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 11.5, color: C.sub, lineHeight: 1.5 }}>
                  Required columns: <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.teal }}>date</span>
                  <span style={{ color: C.muted }}>, </span><span style={{ fontFamily: "monospace", fontWeight: 700, color: C.teal }}>merchant</span>
                  <span style={{ color: C.muted }}>, </span><span style={{ fontFamily: "monospace", fontWeight: 700, color: C.teal }}>amount</span>
                  <span style={{ color: C.muted }}>, </span><span style={{ fontFamily: "monospace", fontWeight: 700, color: C.teal }}>type</span>
                  <span style={{ color: C.muted, fontStyle: "italic" }}> · category, notes (optional)</span>
                </div>
                <button type="button"
                  onClick={() => {
                    const sample = "date,type,amount,merchant,category,notes\n2024-03-01,expense,45.50,Whole Foods,Groceries,weekly shop\n2024-03-02,income,3500.00,Employer,Salary,March salary\n2024-03-05,expense,12.99,Netflix,Subscriptions,\n";
                    const blob = new Blob([sample], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = "finpilot-sample.csv";
                    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11, fontWeight: 600, color: C.teal, fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                >
                  <Download size={11} /> Sample
                </button>
              </div>

              {/* File drop zone */}
              <input ref={fileInputRef} type="file" accept=".csv" disabled={txLimitReached} style={{ display: "none" }}
                onChange={e => setCsvFile(e.target.files?.[0] || null)} />

              <div onClick={() => { if (!txLimitReached) fileInputRef.current?.click(); }}
                style={{ border: `2px dashed ${csvFile ? C.greenMid : C.border}`, borderRadius: 12, padding: csvFile ? "14px 16px" : "22px 16px", textAlign: "center", cursor: txLimitReached ? "not-allowed" : "pointer", background: csvFile ? C.greenBg : C.bg, transition: "all 0.15s" }}>
                {csvFile ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: C.white, border: `1px solid ${C.greenMid}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Upload size={15} style={{ color: C.greenMid }} />
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.greenMid }}>{csvFile.name}</div>
                      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>Tap to change file</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload size={20} style={{ color: C.muted, marginBottom: 6 }} />
                    <div style={{ fontSize: 13, color: C.sub }}>Click to choose your CSV file</div>
                    <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3 }}>Max 2MB · .csv only</div>
                  </>
                )}
              </div>

              {/* Import count selector */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, color: C.sub, fontWeight: 500 }}>Import how many rows?</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {(isPro ? ["10", "25", "50", "All"] : ["10"]).map(opt => {
                    const isSelected = (csvImportCount ?? (isPro ? "All" : "10")) === opt;
                    return (
                      <button key={opt} type="button" onClick={() => setCsvImportCount(opt)}
                        style={{ padding: "4px 12px", borderRadius: 20, border: isSelected ? "none" : `1px solid ${C.border}`, background: isSelected ? C.text : C.bg, color: isSelected ? C.bg : C.sub, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.1s" }}>
                        {opt}
                      </button>
                    );
                  })}
                  {!isPro && <span style={{ fontSize: 11, color: C.muted, alignSelf: "center" }}>· Pro unlocks more</span>}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={handleCsvUpload}
                  disabled={!csvFile || csvImportMutation.isPending || txLimitReached}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: csvFile && !csvImportMutation.isPending && !txLimitReached ? C.strong : C.border, color: csvFile && !csvImportMutation.isPending && !txLimitReached ? C.onStrong : C.muted, fontSize: 13, fontWeight: 700, cursor: csvFile && !csvImportMutation.isPending && !txLimitReached ? "pointer" : "not-allowed" }}>
                  {txLimitReached ? "Limit reached" : csvImportMutation.isPending ? "Importing…" : "Import CSV"}
                </button>
                <button type="button" onClick={onClose}
                  style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surfaceMuted || C.bg, color: C.sub, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ─── Goals Page Component ──────────────────────────────── */

function GoalsPage({ C, aiService, pushNotif }) {
  const queryClient = useQueryClient();

  // ── Data ──────────────────────────────────────────────
  const { user: goalUser } = useAuthContext();
  const preferredCurrency = getUserCurrency(goalUser);
  const formatAmount = (value, options = {}) => formatCurrencyAmount(value, preferredCurrency, options);
  const { data: goalsRes, isLoading } = useQuery({
    queryKey: ["goals", goalUser?._id],
    queryFn: () => import("../services/goalService").then(m => m.goalService.getList()).then(r => r.data),
    enabled: !!goalUser?._id,
    staleTime: 0,
    refetchOnMount: true,
  });
  const apiGoals = goalsRes?.goals || [];

  // ── State ─────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);   // inline add form
  const [editingId, setEditingId] = useState(null);    // which goal is being edited
  const [deletingId, setDeletingId] = useState(null);    // confirm delete
  const [aiLoading, setAiLoading] = useState(null);    // goal id getting AI advice
  const [aiTips, setAiTips] = useState({});      // id → tip string
  const [saving, setSaving] = useState(false);

  const BLANK = { title: "", category: "Emergency Fund", targetAmount: "", currentAmount: "", deadline: "", notes: "" };
  const [form, setForm] = useState(BLANK);

  const CATEGORIES = ["Emergency Fund", "Travel", "Education", "Home", "Car", "Retirement", "Business", "Other"];
  const GOAL_COLORS = ["#0d9488", "#6366f1", "#d97706", "#ec4899", "#4ade80", "#3b82f6", "#c07a3a", "#f59e0b"];
  const catColor = (cat) => GOAL_COLORS[CATEGORIES.indexOf(cat) % GOAL_COLORS.length] || C.greenMid;

  const daysLeft = (deadline) => {
    if (!deadline) return null;
    const d = Math.ceil((new Date(deadline) - new Date()) / 86400000);
    return d;
  };

  const resetForm = () => { setForm(BLANK); setShowForm(false); setEditingId(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return dedupToast.error("Title is required", { duration: 1500 });
    if (!form.targetAmount || isNaN(Number(form.targetAmount)) || Number(form.targetAmount) <= 0)
      return dedupToast.error("Enter a valid target amount", { duration: 1500 });
    setSaving(true);
    try {
      const { goalService } = await import("../services/goalService");
      const payload = {
        title: form.title.trim(),
        category: form.category,
        targetAmount: parseFloat(form.targetAmount),
        currentAmount: parseFloat(form.currentAmount) || 0,
        deadline: form.deadline || undefined,
        notes: form.notes || undefined,
      };
      if (editingId) {
        await goalService.update(editingId, payload);
        dedupToast.success("Goal updated"); if (pushNotif) pushNotif("success", `Goal updated: ${form.title}`);
      } else {
        await goalService.create(payload);
        dedupToast.success("Goal created"); if (pushNotif) pushNotif("success", `New goal created: ${form.title}`);
      }
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      resetForm();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to save goal";
      dedupToast.error(msg);
      pushNotif?.("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { goalService } = await import("../services/goalService");
      await goalService.delete(id);
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      dedupToast.success("Goal deleted"); if (pushNotif) pushNotif("info", "A goal was removed from your plan");
      setDeletingId(null);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to delete";
      dedupToast.error(msg);
      pushNotif?.("error", msg);
    }
  };

  const startEdit = (g) => {
    setForm({
      title: g.title || "",
      category: g.category || "Emergency Fund",
      targetAmount: g.targetAmount ?? "",
      currentAmount: g.currentAmount ?? "",
      deadline: g.deadline ? g.deadline.slice(0, 10) : "",
      notes: g.notes || "",
    });
    setEditingId(g._id);
    setShowForm(true);
  };

  const getAiTip = async (g) => {
    setAiLoading(g._id);
    try {
      const pct = Math.round(clampPercent(((g.currentAmount || 0) / (g.targetAmount || 1)) * 100));
      const days = daysLeft(g.deadline);
      const prompt = `I have a financial goal: "${g.title}" (${g.category}). Currency: ${preferredCurrency}. Target: ${formatAmount(g.targetAmount || 0, { maximumFractionDigits: 0 })}, saved so far: ${formatAmount(g.currentAmount || 0, { maximumFractionDigits: 0 })} (${pct}%).${days != null ? ` Deadline: ${days} days away.` : ""} Give me 2-3 specific, actionable tips to reach this goal faster. Be concise.`;
      const { data } = await aiService.chat(prompt, []);
      setAiTips(t => ({ ...t, [g._id]: data.reply || "No tips available." }));
    } catch {
      setAiTips(t => ({ ...t, [g._id]: "Could not load AI tips. Try again." }));
    } finally {
      setAiLoading(null);
    }
  };

  const inputSx = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
    padding: "8px 12px", fontSize: 13, color: C.text, background: C.white,
    outline: "none", fontFamily: "var(--font-sans)", boxSizing: "border-box",
  };
  const labelSx = { fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 4, display: "block" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp 0.3s ease" }}>

      {/* ── Delete confirm modal ── */}
      {deletingId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", padding: 16 }}
          onClick={() => setDeletingId(null)}>
          <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", maxWidth: 360, width: "100%", padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.redBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Trash2 size={20} style={{ color: C.red }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>Delete this goal?</div>
            <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 20, lineHeight: 1.55 }}>
              This will permanently remove the goal and all its progress. This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => handleDelete(deletingId)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: C.red, color: C.textInverse, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Yes, delete
              </button>
              <button type="button" onClick={() => setDeletingId(null)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.sub, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Goal add / edit MODAL ── */}
      {showForm && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(4px)", padding: 16 }}
          onClick={() => !saving && resetForm()}
        >
          <div
            style={{ background: C.white, borderRadius: 24, border: `1px solid ${C.border}`, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", width: "100%", maxWidth: 480, overflow: "hidden", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header (Premium Overline Style) */}
            <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4
                }}>
                  {editingId ? "Financial Planning" : "New savings goal"}
                </span>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                  {editingId ? (form.title || "Goal") : "Define your objective"}
                </div>
              </div>
              <button type="button" onClick={resetForm}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "none",
                  background: "var(--surface-muted)", color: "var(--text-muted)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s"
                }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ height: 1, background: "var(--border-subtle)", width: "100%" }} />

            <div style={{ padding: 24, maxHeight: "70vh", overflowY: "auto" }}>
              {!editingId && !form.category ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 4 }}>Goal category</p>
                  {CATEGORIES.map((cat) => {
                    const Icon = goalIcons[cat] || Target;
                    const color = catColor(cat);
                    return (
                      <button key={cat} type="button" onClick={() => setForm(f => ({ ...f, category: cat }))}
                        style={{
                          padding: "12px 16px", borderRadius: 16, border: `1px solid ${C.border}`,
                          background: C.bg, cursor: "pointer", display: "flex", alignItems: "center",
                          gap: 14, transition: "all 0.15s", fontFamily: "inherit", textAlign: "left"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}08`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 12, background: `${color}14`,
                          display: "flex", alignItems: "center", justifyContent: "center", color: color
                        }}>
                          <Icon size={20} strokeWidth={1.5} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{cat}</div>
                        </div>
                        <ChevronRight size={18} color={C.muted} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="goals-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {/* Title */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelSx}>Goal title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Emergency Fund, MacBook" style={inputSx} autoFocus />
                  </div>

                  {/* Category Selection (Inline for edits) */}
                  {editingId && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelSx}>Category</label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                        {CATEGORIES.map(cat => {
                          const active = form.category === cat;
                          const color = catColor(cat);
                          return (
                            <button key={cat} type="button" onClick={() => setForm(f => ({ ...f, category: cat }))}
                              style={{
                                padding: "8px 4px", borderRadius: 10, border: `1px solid ${active ? color : C.border}`,
                                background: active ? `${color}10` : C.bg, color: active ? C.text : C.sub,
                                fontSize: 11, fontWeight: active ? 600 : 400, cursor: "pointer", transition: "all 0.15s"
                              }}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Target */}
                  <div>
                    <label style={labelSx}>Target amount ($) *</label>
                    <input type="number" min="1" step="0.01" value={form.targetAmount}
                      onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))}
                      placeholder="5000" style={inputSx} />
                  </div>
                  {/* Current savings */}
                  <div>
                    <label style={labelSx}>Already saved ($)</label>
                    <input type="number" min="0" step="0.01" value={form.currentAmount}
                      onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))}
                      placeholder="0" style={inputSx} />
                  </div>
                  {/* Deadline */}
                  <div>
                    <label style={labelSx}>Deadline (optional)</label>
                    <CalendarPicker
                      C={C}
                      value={form.deadline}
                      onChange={(value) => setForm((f) => ({ ...f, deadline: value }))}
                    />
                  </div>
                  {/* Notes */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelSx}>Notes (optional)</label>
                    <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Any extra context…" style={inputSx} />
                  </div>
                </div>
              )}
            </div>

            {(editingId || form.category) && (
              <div style={{ padding: "0 24px 24px", display: "flex", gap: 12 }}>
                {!editingId && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, category: null }))}
                    style={{
                      padding: "12px 16px", borderRadius: 14, border: `1px solid ${C.border}`,
                      background: "transparent", color: C.text, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit"
                    }}>
                    Back
                  </button>
                )}
                <button type="button" onClick={handleSave} disabled={saving}
                  style={{ flex: 1, padding: "12px 0", borderRadius: 14, border: "none", background: C.strong, color: C.onStrong, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, transition: "all 0.15s", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Create goal"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Financial Planning</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "var(--font-sans)", letterSpacing: "-0.3px" }}>Goals & Planning</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>Track targets, deadlines and get AI-powered tips</div>
        </div>
        <button type="button" onClick={() => { setForm(BLANK); setEditingId(null); setShowForm(true); }}
          style={{ display: "flex", alignItems: "center", gap: 6, background: C.strong, color: C.onStrong, border: "none", borderRadius: 100, padding: "8px 18px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <Plus size={13} /> New Goal
        </button>
      </div>

      {/* ── Goals grid ── */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 48, color: C.muted, fontSize: 13 }}>Loading goals…</div>
      ) : apiGoals.length === 0 ? (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <Target size={20} style={{ color: C.greenMid }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>No goals yet</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Set a savings target and track your progress here.</div>
          <button type="button" onClick={() => { setForm(BLANK); setEditingId(null); setShowForm(true); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.strong, color: C.onStrong, border: "none", borderRadius: 100, padding: "7px 18px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={12} /> Create your first goal
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {apiGoals.map((g) => {
            const pct = Math.round(clampPercent(((g.currentAmount || 0) / (g.targetAmount || 1)) * 100));
            const color = catColor(g.category);
            const days = daysLeft(g.deadline);
            const tip = aiTips[g._id];
            const aiActive = aiLoading === g._id;
            const remaining = Math.max(0, (g.targetAmount || 0) - (g.currentAmount || 0));
            const monthlyNeeded = days > 0
              ? Math.ceil(remaining / Math.max(1, Math.ceil(days / 30)))
              : null;
            const isUrgent = days != null && days >= 0 && days < 30;
            const isOverdue = days != null && days < 0;

            return (
              <div key={g._id} style={{
                background: C.white, border: `1px solid ${C.border}`, borderRadius: 14,
                padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                transition: "box-shadow 0.2s", display: "flex", flexDirection: "column", gap: 12,
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"}
              >
                {/* ── Card header ── */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${color}20` }}>
                      <Target size={15} style={{ color }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.title}</div>
                      <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 100, background: `${color}12`, color, fontSize: 10, fontWeight: 600, marginTop: 2 }}>{g.category}</span>
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button type="button" onClick={() => startEdit(g)} title="Edit"
                      style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.text; }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.muted; }}>
                      <Pencil size={11} />
                    </button>
                    <button type="button" onClick={() => setDeletingId(g._id)} title="Delete"
                      style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.redBg; e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = `${C.red}30`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* ── Progress ── */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: C.text, letterSpacing: "-0.3px" }}>
                      {formatAmount(g.currentAmount || 0, { maximumFractionDigits: 0 })}
                    </span>
                    <span style={{ fontSize: 11, color: C.muted }}>
                      of <strong style={{ color: C.text }}>{formatAmount(g.targetAmount || 0, { maximumFractionDigits: 0 })}</strong>
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 100, background: C.border, overflow: "hidden", marginBottom: 5 }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 100, background: pct >= 100 ? C.greenMid : color, transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color }}>{pct}% complete</span>
                    {pct >= 100
                      ? <span style={{ fontSize: 10.5, fontWeight: 700, color: C.greenMid, display: "flex", alignItems: "center", gap: 3 }}><Check size={10} /> Reached!</span>
                      : <span style={{ fontSize: 10.5, color: C.muted }}>{formatAmount(remaining, { maximumFractionDigits: 0 })} to go</span>
                    }
                  </div>
                </div>

                {/* ── Deadline + monthly tracker ── */}
                {(g.deadline || monthlyNeeded != null) && (
                  <div style={{ display: "flex", gap: 8 }}>
                    {g.deadline && (
                      <div style={{ flex: 1, padding: "7px 10px", borderRadius: 8, background: isOverdue ? C.redBg : isUrgent ? C.goldBg : C.bg, border: `1px solid ${isOverdue ? C.red + "20" : isUrgent ? C.gold + "20" : C.border2}` }}>
                        <div style={{ fontSize: 9.5, fontWeight: 600, color: isOverdue ? C.red : isUrgent ? C.gold : C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                          {isOverdue ? "Overdue" : "Deadline"}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isOverdue ? C.red : C.text }}>
                          {isOverdue ? `${Math.abs(days)}d ago` : `${days}d left`}
                        </div>
                      </div>
                    )}
                    {monthlyNeeded != null && (
                      <div style={{ flex: 1, padding: "7px 10px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border2}` }}>
                        <div style={{ fontSize: 9.5, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Monthly</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{formatAmount(monthlyNeeded, { maximumFractionDigits: 0 })}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── AI Tips ── */}
                <button type="button" onClick={() => getAiTip(g)} disabled={aiActive}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 0", borderRadius: 8, border: `1px solid ${tip ? C.teal + "40" : C.border}`, background: tip ? C.greenBg : C.bg, color: tip ? C.teal : C.sub, fontSize: 11.5, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", opacity: aiActive ? 0.7 : 1, width: "100%" }}>
                  <Wand2 size={11} style={{ color: tip ? C.teal : C.muted }} />
                  {aiActive ? "Getting tips…" : tip ? "Refresh AI Tips" : "AI Optimize"}
                </button>

                {/* AI tip content */}
                {(aiActive || tip) && (
                  <div style={{ padding: "10px 12px", background: C.greenBg, border: `1px solid ${C.teal}20`, borderRadius: 9, animation: "fadeUp 0.2s ease", position: "relative" }}>
                    {/* Close button */}
                    {!aiActive && tip && (
                      <button type="button"
                        onClick={() => setAiTips(t => { const n = { ...t }; delete n[g._id]; return n; })}
                        style={{ position: "absolute", top: 6, right: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 2, borderRadius: 4, lineHeight: 1 }}
                        onMouseEnter={e => e.currentTarget.style.color = C.text}
                        onMouseLeave={e => e.currentTarget.style.color = C.muted}
                      ><X size={12} /></button>
                    )}
                    {aiActive ? (
                      <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
                        {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.teal, opacity: 0.7, animation: `bounceY 1s ${i * 0.18}s infinite` }} />)}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.6, paddingRight: 16 }}>
                        {renderMd(tip, C.teal)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Transactions Page Component ──────────────────────── */
/* ─── SpendingPage ───────────────────────────────────────── */

function MonthlyBudgetWidget({ C, budget, totalExpense, setActiveNav, onBudgetSaved, pushNotif }) {
  const { user: dashboardUser } = useAuthContext();
  const preferredCurrency = getUserCurrency(dashboardUser);
  const [modalOpen, setModalOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = now.toLocaleDateString("en-US", { month: "long" });

  const spent = totalExpense || 0;
  const limit = budget?.amount || 0;
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const over = limit > 0 && spent > limit;
  const diff = limit > 0 ? Math.abs(spent - limit) : 0;

  const fmt = (n) => formatCurrencyAmount(Math.abs(n || 0), preferredCurrency, { maximumFractionDigits: 0 });

  const barColor = over ? "#ef4444" : pct > 80 ? "#f59e0b" : "#0d9488";
  const currencySymbol = getCurrencySymbol(preferredCurrency);
  const padLeft = Math.max(44, 24 + currencySymbol.length * 10);

  const handleSave = async () => {
    const amount = parseFloat(inputVal);
    if (!amount || isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      await api.post("/dashboard/budget", { month: currentMonth, amount });
      onBudgetSaved?.();
      setModalOpen(false);
      setInputVal("");
      pushNotif?.("success", `Budget for ${monthLabel} updated to ${fmt(amount)}`);
    } catch {
      const msg = "Failed to save budget";
      dedupToast.error(msg);
      pushNotif?.("error", msg);
    } finally { setSaving(false); }
  };

  return (
    <>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px 14px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setActiveNav("spending")}>
            <span className="origin-section-label" style={{ fontSize: C.fSizeXs }}>
              BUDGET IN {monthLabel.toUpperCase()}
            </span>
            <ChevronRight size={10} style={{ color: C.muted }} />
          </div>
          <button type="button"
            onClick={() => { setInputVal(budget?.amount?.toString() || ""); setModalOpen(true); }}
            style={{ width: 26, height: 26, borderRadius: 7, background: C.bg, border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={12} style={{ color: "#6366f1" }} />
          </button>
        </div>

        {!budget ? (
          <div style={{ textAlign: "center", padding: "12px 0 6px" }}>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
              No budget set for {monthLabel}
            </div>
            <button type="button"
              onClick={() => { setInputVal(""); setModalOpen(true); }}
              style={{ padding: "8px 18px", borderRadius: 100, border: "none", background: C.strong, color: C.onStrong, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Set Monthly Budget
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="origin-value-sm" style={{ color: over ? C.red : C.text, fontSize: C.fSizeLg }}>{fmt(spent)}</span>
                <span style={{ fontSize: C.fSizeSm, color: C.muted, fontWeight: C.fWeightReg }}>of {fmt(limit)}</span>
              </div>
              <div style={{ fontSize: C.fSizeXs, color: over ? C.red : C.greenMid, marginTop: 2, fontWeight: C.fWeightSemi, letterSpacing: "0.02em" }}>
                {over ? `${fmt(diff)} over budget` : `${fmt(diff)} remaining`}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 5, borderRadius: 99, background: C.border2, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: barColor, transition: "width 0.6s ease" }} />
              </div>
              <span style={{ fontSize: C.fSizeXs, fontWeight: C.fWeightSemi, color: barColor, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{Math.round(pct)}%</span>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", padding: 16 }}
          onClick={() => setModalOpen(false)}>
          <div style={{ background: C.white, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", width: "100%", maxWidth: 380, padding: "28px 28px 24px" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{budget ? "Edit Budget" : "Set Monthly Budget"}</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{monthLabel} {now.getFullYear()}</div>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.sub, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Total budget for {monthLabel}
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.muted, fontWeight: 700, letterSpacing: "0.01em" }}>{getCurrencySymbol(preferredCurrency)}</span>
                <input
                  type="number" min="0" step="100"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
                  placeholder="e.g. 15000"
                  autoFocus
                  style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: `12px 14px 12px ${padLeft}px`, fontSize: 16, fontWeight: 600, color: C.text, background: C.bg, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>
              {budget && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Current: {fmt(budget.amount)} · You can update anytime</div>}
            </div>
            <button type="button" onClick={handleSave} disabled={saving || !inputVal}
              style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", background: C.strong, color: C.onStrong, fontSize: 14, fontWeight: 700, cursor: saving || !inputVal ? "not-allowed" : "pointer", opacity: saving || !inputVal ? 0.65 : 1, transition: "opacity 0.15s" }}>
              {saving ? "Saving…" : budget ? "Update Budget" : "Set Budget"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── BreakdownTab ───────────────────────────────────── */

function PortfolioGlanceCard({ C, setActiveNav }) {
  const { user: dashboardUser } = useAuthContext();
  const preferredCurrency = getUserCurrency(dashboardUser);
  const { netWorthAssets: assets, loading } = usePortfolio();
  const ASSET_COLORS = ["#0d9488", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

  const totalValue = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
  const totalCost = assets.reduce((s, a) => s + getAssetCostBasis(a), 0);
  const portfolioTotalGain = totalValue - totalCost;
  const portfolioTotalGainPct = totalCost > 0 ? ((portfolioTotalGain / totalCost) * 100) : 0;

  const fmt = (n) => {
    return formatCurrencyAmount(n || 0, preferredCurrency, { maximumFractionDigits: 0 });
  };

  // Mini sparkline using SVG polyline
  const MiniLine = ({ asset, color }) => {
    const raw = asset.priceHistory?.length
      ? asset.priceHistory.slice(-10).map(p => p.price || p.close || p)
      : (() => {
        const base = asset.currentValue || 100;
        const up = (asset.currentValue || 0) >= ((asset.purchasePrice || 0) * (asset.quantity || 1) || asset.currentValue || 0);
        return Array.from({ length: 10 }, (_, i) => base * (0.88 + i * 0.015 * (up ? 1 : -1) + Math.sin(i * 0.9) * 0.015));
      })();
    if (!raw.length) return null;
    const mn = Math.min(...raw), mx = Math.max(...raw), rng = mx - mn || 1;
    const W = 64, H = 28;
    const pts = raw.map((v, i) => `${(i / (raw.length - 1)) * W},${H - ((v - mn) / rng) * H}`).join(" ");
    const area = `0,${H} ${pts} ${W},${H}`;
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id={`pg-${asset._id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#pg-${asset._id})`} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  };

  return (
    <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border2}` }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Investment Portfolio</div>
        <button type="button" onClick={() => setActiveNav("portfolio")}
          style={{ fontSize: 10, fontWeight: 600, color: C.teal, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 2, fontFamily: "inherit" }}>
          See all <ChevronRight size={10} />
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[1, 2].map(i => <div key={i} style={{ height: 52, borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, animation: "shimmer 1.2s ease infinite alternate" }} />)}
        </div>
      )}

      {/* Empty */}
      {!loading && assets.length === 0 && (
        <div style={{ textAlign: "center", padding: "16px 0 10px" }}>
          <TrendingUp size={20} style={{ color: C.muted, marginBottom: 5 }} />
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>No investments yet</div>
          <button type="button" onClick={() => setActiveNav("portfolio")}
            style={{ fontSize: 10.5, fontWeight: 600, color: C.onStrong, background: C.strong, border: "none", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" }}>
            Add Investment
          </button>
        </div>
      )}

      {/* Total value row — compact */}
      {!loading && assets.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "6px 10px", background: C.bg, borderRadius: 9, border: `1px solid ${C.border2}` }}>
          <div>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 1 }}>Total Value</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "-0.3px" }}>{fmt(totalValue)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 1 }}>All time</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: portfolioTotalGain >= 0 ? C.greenMid : C.red, display: "flex", alignItems: "center", gap: 2, justifyContent: "flex-end" }}>
              {portfolioTotalGain >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {portfolioTotalGain >= 0 ? "+" : ""}{fmt(portfolioTotalGain)} ({portfolioTotalGain >= 0 ? "+" : ""}{(Math.abs(portfolioTotalGainPct) < 0.1 && portfolioTotalGain !== 0 ? portfolioTotalGainPct.toFixed(2) : portfolioTotalGainPct.toFixed(1))}%)
            </div>
          </div>
        </div>
      )}

      {/* Max 2 asset rows */}
      {!loading && assets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {assets.slice(0, 2).map((a, i) => {
            const color = ASSET_COLORS[i % ASSET_COLORS.length];
            const cost = getAssetCostBasis(a) || a.currentValue || 0;
            const gain = (a.currentValue || 0) - cost;
            const gainPct = cost > 0 ? ((gain / cost) * 100) : 0;
            const isUp = gain >= 0;
            const allocPct = totalValue > 0 ? Math.round(clampPercent(((a.currentValue || 0) / totalValue) * 100)) : 0;
            return (
              <div key={a._id} onClick={() => setActiveNav("portfolio")}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, cursor: "pointer", transition: "box-shadow 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.07)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
              >
                {/* Left: symbol + alloc */}
                <div style={{ minWidth: 40 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>{(a.symbol || a.name || "—").toUpperCase().slice(0, 5)}</div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{allocPct}% alloc</div>
                </div>
                {/* Sparkline */}
                <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                  <MiniLine asset={a} color={color} />
                </div>
                {/* Right: value + gain */}
                <div style={{ textAlign: "right", minWidth: 48 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>{fmt(a.currentValue)}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: isUp ? C.greenMid : C.red, display: "flex", alignItems: "center", gap: 1, justifyContent: "flex-end", marginTop: 2 }}>
                    {isUp ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                    {Math.abs(gainPct).toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}

          {/* +N more pill */}
          {assets.length > 2 && (
            <button type="button" onClick={() => setActiveNav("portfolio")}
              style={{ width: "100%", padding: "5px", background: "none", border: `1px dashed ${C.border}`, borderRadius: 8, fontSize: 10, color: C.muted, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.color = C.teal; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
            >+{assets.length - 2} more assets</button>
          )}
        </div>
      )}

      {/* View Portfolio button */}
      {!loading && assets.length > 0 && (
        <button type="button" onClick={() => setActiveNav("portfolio")}
          style={{ width: "100%", marginTop: 8, padding: "7px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 11, fontWeight: 600, color: C.sub, cursor: "pointer", transition: "background 0.15s", fontFamily: "inherit" }}
          onMouseEnter={e => e.currentTarget.style.background = "#edeae4"}
          onMouseLeave={e => e.currentTarget.style.background = C.bg}
        >View Portfolio</button>
      )}
    </div>
  );
}

/* ─── Spending Calendar Grid (inline version for combined card) ── */
function SpendingCalendarGrid({ C, apiTransactions, onDayClick, year = new Date().getFullYear(), month = new Date().getMonth() }) {
  const now = new Date();
  const { user: dashboardUser } = useAuthContext();
  const preferredCurrency = getUserCurrency(dashboardUser);

  const daySpend = useMemo(() => {
    const map = {};
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    (apiTransactions || []).forEach(t => {
      const isExp = t.type === "expense" || t.type === "debit" || t.type === "withdrawal" || t.type === "payment";
      if (!isExp) return;
      const d = new Date(t.date);
      
      // Only show transactions that have actually occurred (up to today)
      if (d <= todayEnd && d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map[day] = (map[day] || 0) + Math.abs(t.amount);
      }
    });
    return map;
  }, [apiTransactions, year, month]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const fmt = (n) => {
    if (!n) return "$0";
    const formatted = formatCurrencyAmount(Math.round(n), preferredCurrency, { maximumFractionDigits: 0 });
    return formatted;
  };

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <>
      {/* Day-of-week labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8, flexShrink: 0 }}>
        {dayLabels.map((d, i) => (
          <div key={i} style={{ fontSize: 8, fontWeight: 700, color: C.muted, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.02em" }}>{d}</div>
        ))}
      </div>

      {/* Calendar cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const amt = daySpend[day];
          const isFuture = (year > now.getFullYear()) || (year === now.getFullYear() && month > now.getMonth()) || (year === now.getFullYear() && month === now.getMonth() && day > now.getDate());
          return (
            <div key={day} onClick={() => { if (amt > 0 && onDayClick) onDayClick(day); }} style={{
              borderRadius: 6,
              background: C.bg,
              border: `1px solid ${C.border2}`,
              padding: "4px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              minHeight: 42,
              opacity: isFuture ? 0.45 : 1,
              cursor: amt > 0 ? "pointer" : "default",
              transition: "all 0.15s"
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.text, lineHeight: 1 }}>{day}</div>
              <div style={{ fontSize: 7.5, fontWeight: 600, color: amt ? C.greenMid : C.muted, lineHeight: 1, marginTop: 2 }}>
                {amt ? fmt(amt) : "$0"}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}


/* ─── Spending Calendar Component ───────────────────────── */

function SpendingCalendar({ C, apiTransactions, summary, setActiveNav }) {
  const { user: dashboardUser } = useAuthContext();
  const preferredCurrency = getUserCurrency(dashboardUser);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const daySpend = useMemo(() => {
    const map = {};
    (apiTransactions || []).forEach(t => {
      const isExp = t.type === "expense" || t.type === "debit" || t.type === "withdrawal" || t.type === "payment";
      if (!isExp) return;
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map[day] = (map[day] || 0) + Math.abs(t.amount);
      }
    });
    return map;
  }, [apiTransactions]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const maxSpend = Math.max(...Object.values(daySpend), 1);

  const fmt = (n) => {
    if (!n) return "–";
    return formatCurrencyAmount(Math.round(n), preferredCurrency, { maximumFractionDigits: 0 });
  };

  const cellBg = (day) => {
    const amt = daySpend[day];
    if (!amt) return C.bg;
    const r = amt / maxSpend;
    if (r > 0.75) return C.green;
    if (r > 0.45) return C.greenMid;
    if (r > 0.20) return "#86efac";
    return C.greenBg2;
  };

  const cellColor = (day) => {
    const amt = daySpend[day];
    if (!amt) return C.muted;
    const r = amt / maxSpend;
    if (r > 0.45) return "#fff";
    return C.green;
  };

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Card style={{ padding: "16px 20px", minWidth: 0, overflow: "hidden", height: 420, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            Spent in {now.toLocaleString("default", { month: "long" })} &rsaquo;
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--font-sans)", letterSpacing: "-0.5px", color: C.text }}>
            {formatCurrencyAmount(summary.totalExpense ?? 0, preferredCurrency, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <button type="button" onClick={() => setActiveNav?.("spending")} style={{ width: 28, height: 28, borderRadius: "50%", background: C.bg, border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.sub }}>
          <Plus size={13} />
        </button>
      </div>

      {/* Day-of-week labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4, flexShrink: 0, marginTop: 10 }}>
        {dayLabels.map((d, i) => (
          <div key={i} style={{ fontSize: 9.5, fontWeight: 600, color: C.muted, textAlign: "center", letterSpacing: "0.02em" }}>{d}</div>
        ))}
      </div>

      {/* Calendar cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, flex: 1, alignContent: "start" }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const amt = daySpend[day];
          const isToday = day === today;
          const isFuture = day > today;
          return (
            <div key={day} style={{
              borderRadius: 8,
              background: isToday ? "#3b82f6" : isFuture ? C.bg : C.white,
              border: `1px solid ${isToday ? "#3b82f6" : C.border2}`,
              padding: "5px 4px",
              display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start",
              minHeight: 44,
              opacity: isFuture ? 0.45 : 1,
            }}>
              <div style={{ fontSize: 10, fontWeight: isToday ? 700 : 500, color: isToday ? "#fff" : C.text, lineHeight: 1.2, paddingLeft: 2 }}>{day}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: isToday ? "rgba(255,255,255,0.85)" : amt ? C.sub : C.muted, lineHeight: 1.2, marginTop: 2, paddingLeft: 2 }}>
                {amt ? fmt(amt) : isFuture ? "" : formatCurrencyAmount(0, preferredCurrency, { maximumFractionDigits: 0 })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ─── AI Copilot Sub-Component ──────────────────────────── */

function AICopilotContent({ messages, isTyping, chatInput, setChatInput, handleSend, msgsEndRef, C, aiLimitReached, summary, categoryBreakdown, apiGoals }) {
  const topCat = categoryBreakdown?.[0]?.category;
  const hasGoals = apiGoals?.length > 0;
  const quickPrompts = [
    topCat ? `Top spending?` : `Overspending?`,
    hasGoals ? `Goals on track?` : `Save more?`,
    `Improve score`,
  ];

  // Internal scroll container ref — scrolls reliably regardless of parent layout
  const scrollContainerRef = useRef(null);

  // Auto-scroll to bottom whenever messages or typing state changes
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      // Use scrollTop = scrollHeight for instant reliable scroll
      el.scrollTop = el.scrollHeight;
    }
    // Also call scrollIntoView on the sentinel as a fallback
    if (msgsEndRef?.current) {
      msgsEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isTyping]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* ── Header ── */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 9, flexShrink: 0, background: C.white }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg,${C.teal},${C.greenMid})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 2px 8px ${C.teal}33` }}>
          <Wand2 size={14} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="display-serif" style={{ fontSize: 15, fontWeight: 500, color: C.text, lineHeight: 1.1 }}>AI Co-Pilot</div>
          <div style={{ fontSize: 9.5, color: C.muted, lineHeight: 1.2 }}>FinPilot Assistant</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 100, background: C.greenBg, border: `1px solid ${C.greenBg2}` }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.greenMid, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: C.greenMid }}>Live</span>
        </div>
      </div>

      {/* ── Upgrade banner ── */}
      {aiLimitReached && (
        <div style={{ padding: "6px 14px", background: C.redBg, borderBottom: `1px solid ${C.border2}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: C.red, fontWeight: 600 }}>Limit reached (5/mo)</span>
          <Link to={ROUTES.SUBSCRIPTION} style={{ fontSize: 10, fontWeight: 700, color: C.greenMid, textDecoration: "none" }}>Upgrade →</Link>
        </div>
      )}

      {/* ── Messages ── */}
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "12px 12px 6px", display: "flex", flexDirection: "column", gap: 10, background: C.bg }}>

        {/* Welcome message */}
        {messages.length === 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: `linear-gradient(135deg,${C.teal},${C.greenMid})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              <Wand2 size={11} color="#fff" />
            </div>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "3px 12px 12px 12px", padding: "10px 12px", maxWidth: "90%", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <p style={{ fontSize: 11.5, lineHeight: 1.65, color: C.text, margin: 0 }}>
                Hi! Ask me about your <strong style={{ color: C.greenMid }}>spending</strong>, <strong style={{ color: C.teal }}>goals</strong>, or how to improve your <strong style={{ color: C.greenMid }}>financial score</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
            {m.role === "bot" && (
              <div style={{ width: 24, height: 24, borderRadius: 7, background: `linear-gradient(135deg,${C.teal},${C.greenMid})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Wand2 size={11} color="#fff" />
              </div>
            )}
            <div style={{
              maxWidth: "83%", padding: "9px 12px", fontSize: 11.5, lineHeight: 1.6,
              borderRadius: m.role === "user" ? "12px 3px 12px 12px" : "3px 12px 12px 12px",
              background: m.role === "user" ? C.text : C.white,
              color: m.role === "user" ? "#f9fafb" : C.text,
              border: m.role === "user" ? "none" : `1px solid ${C.border}`,
              boxShadow: m.role === "user" ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              {renderMd(m.text, m.role === "user" ? "#5eead4" : C.greenMid)}
            </div>
          </div>
        ))}

        {/* Typing dots */}
        {isTyping && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: `linear-gradient(135deg,${C.teal},${C.greenMid})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Wand2 size={11} color="#fff" />
            </div>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "3px 12px 12px 12px", padding: "11px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.teal, opacity: i === 1 ? 0.9 : 0.55 }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={msgsEndRef} />
      </div>

      {/* ── Quick prompts ── */}
      {!aiLimitReached && messages.length === 0 && (
        <div style={{ padding: "8px 12px", background: C.bg, borderTop: `1px solid ${C.border2}`, display: "flex", gap: 5, flexWrap: "wrap", flexShrink: 0 }}>
          {quickPrompts.map(s => (
            <button key={s} type="button" onClick={() => handleSend(s)}
              style={{ padding: "4px 10px", borderRadius: 100, border: `1px solid ${C.border}`, background: C.white, fontSize: 10, color: C.sub, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s", whiteSpace: "nowrap" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.color = C.teal; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.sub; }}
            >{s}</button>
          ))}
        </div>
      )}

      {/* ── Input ── */}
      <div style={{ padding: "10px 12px", background: C.white, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 7, alignItems: "center", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "7px 8px 7px 13px", transition: "border-color 0.15s,box-shadow 0.15s" }}
          onFocusCapture={e => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.boxShadow = `0 0 0 3px ${C.teal}14`; }}
          onBlurCapture={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
        >
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !aiLimitReached && handleSend()}
            placeholder={aiLimitReached ? "Upgrade to continue…" : "Ask about your finances…"}
            disabled={!!aiLimitReached}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 12.5, color: C.text, fontFamily: "var(--font-sans)",
              opacity: aiLimitReached ? 0.5 : 1,
              minWidth: 0, WebkitAppearance: "none",
            }}
          />
          <button type="button" onClick={() => !aiLimitReached && handleSend()} disabled={!!aiLimitReached}
            style={{ width: 28, height: 28, borderRadius: 8, background: aiLimitReached ? C.border : `linear-gradient(135deg,${C.teal},${C.greenMid})`, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: aiLimitReached ? "not-allowed" : "pointer", flexShrink: 0, transition: "opacity 0.15s", opacity: aiLimitReached ? 0.5 : 1 }}
          >
            <ArrowUpRight size={13} color="#fff" />
          </button>
        </div>
      </div>

    </div>
  );
}

/* ─── Spending Sub-Component ────────────────────────────── */

function SpendingContent({ transactions, totalExpense, C }) {
  const { user: dashboardUser } = useAuthContext();
  const preferredCurrency = getUserCurrency(dashboardUser);
  const spent = totalExpense ?? 0;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Spending</span>
        <Link to={ROUTES.TRANSACTIONS} style={{ color: C.muted }}><ChevronRight size={13} /></Link>
      </div>
      <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 3 }}>Spent this month</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-sans)", color: C.text, marginBottom: 12 }}>{formatCurrencyAmount(spent, preferredCurrency, { maximumFractionDigits: 0 })}</div>

      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 9 }}>Latest transactions</div>
      {transactions.slice(0, 3).map(tx => (
        <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border2}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: C.sub, letterSpacing: "0.02em" }}>{getMerchantMonogram(tx.merchant, tx.category)}</span>
            </div>
            <span style={{ fontSize: 12, color: C.text }}>{tx.merchant}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: tx.amount > 0 ? C.greenMid : C.text }}>
            {tx.amount > 0 ? "+" : ""}{formatCurrencyAmount(Math.abs(tx.amount), preferredCurrency, { maximumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </>
  );
}

/* ─── AI Advisor Card ────────────────────────────────────── */

function AIAdvisorCard({
  C, isMobile, onClose,
  aiLimitReached, summary, categoryBreakdown,
  apiGoals, dashboard, apiTransactions, monthlyChart,
  messages, setMessages, aiService, navigate,
  sessions, setSessions, activeSession, setActiveSession,
  sidebarOpen, setSidebarOpen, sessionsLoading,
  memoryAssistEnabled = true,
}) {
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const msgsEndRef = useRef(null);
  const inputRef = useRef(null);
  const { netWorthAssets: portfolioAssets = [] } = usePortfolio();
  const { user } = useAuthContext();

  useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 120); }, []);

  // ── Colors ────────────────────────────────────────────
  const INDIGO = "#6366f1";
  const INDIGO_LT = "color-mix(in srgb, var(--bg-secondary) 72%, #6366f1 28%)";
  const INDIGO_MID = "color-mix(in srgb, var(--border-subtle) 45%, #6366f1 55%)";
  const TEXT = "var(--text-primary)";
  const SUB = "var(--text-secondary)";
  const MUTED = "var(--text-secondary)";
  const BORDER = "var(--border-subtle)";
  const BORDER2 = "var(--surface-muted)";
  const BG = "var(--bg-primary)";
  const SURFACE = "var(--bg-secondary)";
  const STRONG = "var(--surface-strong)";
  const TEXT_INVERSE = "var(--text-inverse)";

  // ── Group sessions by date ────────────────────────────
  const groupedSessions = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const groups = { Today: [], "Last week": [], Older: [] };
    (sessions || []).forEach(s => {
      const d = new Date(s.updatedAt);
      if (d >= today) groups["Today"].push(s);
      else if (d >= weekAgo) groups["Last week"].push(s);
      else groups["Older"].push(s);
    });
    return groups;
  }, [sessions]);

  const handleLoadSession = async (sessionId) => {
    if (sessionId === activeSession) return;
    setTyping(true);
    try {
      const res = await aiService.getMessages(sessionId);
      const loaded = (res.data.messages || []).map(m => ({ role: m.role, text: m.text }));
      setMessages(loaded.length ? loaded : []);
      setActiveSession(sessionId);
    } catch (e) { console.error("Failed to load session", e); }
    finally { setTyping(false); }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveSession(null);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await aiService.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      if (activeSession === sessionId) handleNewChat();
    } catch (e) { console.error("Failed to delete session", e); }
  };

  // ── Financial context — tightly capped to stay under 413 payload limit ──
  // Rules: max 20 tx, max 6 trend months, terse field format, no redundant whitespace.
  const buildContext = () => {
    const f = n => Math.abs(n || 0).toFixed(2);
    const now = new Date();

    const inc = summary.totalIncome ?? 0;
    const exp = summary.totalExpense ?? 0;
    const net = summary.netSavings ?? summary.netBalance ?? (inc - exp);
    const sr = inc > 0 ? clampPercent((net / inc) * 100, { min: -100, max: 100 }).toFixed(1) : "0";
    const fs = dashboard.financialScore;
    const score = fs ? `${fs.score}/100 ${fs.label}` : "n/a";

    // Transactions — newest 20 only (keeps payload well under 413 limit)
    const txSorted = [...(apiTransactions || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const txLines = txSorted.slice(0, 20).map(t => {
      const d = t.date ? t.date.slice(0, 10) : "?";
      return `${d}|${(t.merchant || "?").slice(0, 20)}|${t.category || "?"}|${t.type === "income" ? "+" : "-"}$${f(t.amount)}`;
    }).join("\n");
    const txSuffix = txSorted.length > 20 ? `\n(+${txSorted.length - 20} older not shown)` : "";

    // Categories — compact
    const catTotal = (categoryBreakdown || []).reduce((s, c) => s + (c.amount || c.total || 0), 0) || 1;
    const catLines = (categoryBreakdown || []).map(c => {
      const amt = c.amount || c.total || 0;
      return `${c.category}:$${f(amt)}(${((amt / catTotal) * 100).toFixed(0)}%)`;
    }).join(", ");

    // Goals
    const goalLines = (apiGoals || []).map(g => {
      const pct = g.targetAmount > 0 ? Math.round(clampPercent(((g.currentAmount || 0) / g.targetAmount) * 100)) : 0;
      const dl = g.deadline ? g.deadline.slice(0, 10) : "none";
      return `${g.title}:$${f(g.currentAmount)}/$${f(g.targetAmount)}(${pct}%)due ${dl}`;
    }).join("\n");

    // Trend — last 6 months only
    const trendSorted = [...(monthlyChart || [])].sort((a, b) => (a.month || "").localeCompare(b.month || ""));
    const trendLines = trendSorted.slice(-6).map(m => {
      return `${m.month}:inc$${f(m.income)} exp$${f(m.expense)} net$${f((m.income || 0) - (m.expense || 0))}`;
    }).join("\n");

    // Net worth
    let cumCash = 0;
    trendSorted.forEach(m => { cumCash += (m.income || 0) - (m.expense || 0); });

    // Assets — from PortfolioContext
    const allAssets = portfolioAssets || [];
    let assetsStr = "none";
    if (allAssets.length > 0) {
      const totalVal = allAssets.reduce((s, a) => s + (a.currentValue || 0), 0);
      const totalCost = allAssets.reduce((s, a) => s + (a.totalCost || (a.purchasePrice * (a.quantity || 1)) || 0), 0);
      const lines = allAssets.map(a => {
        const cost = a.totalCost || (a.purchasePrice * (a.quantity || 1)) || 0;
        const gain = (a.currentValue || 0) - cost;
        let extra = "";
        if (a.assetType === "equity") {
           extra = ` tkr:${a.ticker || "?"} type:${a.grantType || "?"} vstd:${a.vestedQuantity || 0}`;
        }
        return `${a.name || a.symbol || "?"}[${a.assetType || "?"}]:$${f(a.currentValue)} gain$${f(gain)}${a.quantity ? ` x${a.quantity}` : ""}${extra}`;
      }).join("\n");
      assetsStr = `total$${f(totalVal)} cost$${f(totalCost)} gain$${f(totalVal - totalCost)}\n${lines}`;
    }
    const assetVal = allAssets.reduce((s, a) => s + (a.currentValue || 0), 0);

    // Forecast
    const fc = dashboard.forecast;
    const fcStr = fc ? `inc$${f(fc.predictedIncome)} exp$${f(fc.predictedExpense)} (${fc.confidence || "?"})` : "n/a";

    return `[FinPilot ${now.toISOString().slice(0, 7)}]
USER:${user?.name || "?"} email:${user?.email || "?"} pro:${user?.isPro ? "yes" : "no"}
SUM:inc$${f(inc)} exp$${f(exp)} net$${f(net)} sr${sr}% score:${score}
NW:cash$${f(cumCash)} assets$${f(assetVal)} total$${f(cumCash + assetVal)}
CATS:${catLines || "none"}
TX(last20of${txSorted.length}):
${txLines || "none"}${txSuffix}
GOALS:
${goalLines || "none"}
TREND(6mo):
${trendLines || "none"}
FORECAST:${fcStr}
ASSETS:
${assetsStr}
---
FinPilot AI: answer using ONLY the data above. Never invent figures.`;
  };

  const sendMessage = async (txt) => {
    const msg = (txt || input).trim();
    if (!msg || aiLimitReached) return;

    // Snapshot messages BEFORE state update (used to build history)
    const prevMessages = messages;
    const isFirstMessage = prevMessages.length === 0;

    setMessages(p => [...p, { role: "user", text: msg }]);
    setInput("");
    setTyping(true);

    try {
      let sid = activeSession;
      if (memoryAssistEnabled && !sid) {
        const sessionRes = await aiService.createSession("ai_advisor", msg);
        sid = sessionRes.data.session._id;
        setActiveSession(sid);
        setSessions(prev => [sessionRes.data.session, ...prev]);
      }

      let historyToSend;

      if (isFirstMessage) {
        // First message: inject full context so AI has all financial data
        const ctx = buildContext();
        historyToSend = [
          { role: "user", content: ctx },
          { role: "assistant", content: "Got it, I have your financial data." },
          { role: "user", content: msg },
        ];
      } else {
        // Subsequent messages: context already established in session.
        // Only send the last 4 exchanges (8 messages) including the new message.
        // This keeps payload tiny and avoids 413.
        const recentHistory = prevMessages
          .slice(-7)
          .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
        historyToSend = [
          ...recentHistory,
          { role: "user", content: msg },
        ];
      }

      const { data } = await aiService.chat(msg, historyToSend, sid);
      setMessages(p => [...p, { role: "bot", text: data.reply || "I couldn't generate a response." }]);
      if (sid) {
        setSessions(prev => prev.map(s => s._id === sid ? { ...s, updatedAt: new Date().toISOString() } : s));
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || "Something went wrong. Please try again.";
      if (err?.response?.status === 403) navigate(ROUTES.SUBSCRIPTION);
      else setMessages(p => [...p, { role: "bot", text: errMsg }]);
    } finally {
      setTyping(false);
    }
  };

  // ── Quick prompts (data-driven) ───────────────────────
  const topCat = categoryBreakdown?.[0]?.category;
  const hasGoals = (apiGoals || []).length > 0;
  const quickPrompts = [
    "Why is my net worth zero?",
    topCat ? `Why am I spending on ${topCat}?` : "Do I have any assets now?",
    hasGoals ? "Am I on track with my goals?" : "What debts do I currently have?",
    "How can I build wealth?",
  ];

  const isEmpty = messages.length === 0;

  // ── Sidebar width ─────────────────────────────────────
  const SIDEBAR_W = isMobile ? 0 : 230;

  return (
    <div style={{
      display: "flex", height: "100%", borderRadius: isMobile ? 0 : 20, overflow: "hidden",
      background: BG,
      boxShadow: "0 32px 80px rgba(0,0,0,0.18), 0 4px 24px rgba(0,0,0,0.07)",
    }}>

      {/* ══ LEFT SIDEBAR ══════════════════════════════════ */}
      {/* On mobile, this becomes an overlay that slides in */}
      <div style={{
        width: isMobile ? "min(280px, 80vw)" : SIDEBAR_W,
        minWidth: isMobile ? "min(280px, 80vw)" : SIDEBAR_W,
        background: BG,
        display: "flex", flexDirection: "column",
        height: "100%",
        borderRight: `1px solid ${BORDER}`,
        zIndex: isMobile ? 120 : 1,
        position: isMobile ? "absolute" : "relative",
        left: 0, top: 0,
        boxShadow: (isMobile && sidebarOpen) ? "12px 0 40px rgba(0,0,0,0.25)" : "none",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "none",
        visibility: isMobile && !sidebarOpen ? "hidden" : "visible",
      }}>
        {/* Header */}
        <div style={{
          padding: "22px 20px 14px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.10em" }}>
            {isMobile ? "CONVERSATIONS" : "AI ADVISOR"}
          </span>
          {isMobile ? (
            <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 4, display: "flex" }}>
              <X size={17} />
            </button>
          ) : (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 4, display: "flex", borderRadius: 6, transition: "background 0.12s" }}
              onMouseEnter={e => e.currentTarget.style.background = BORDER2}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <X size={15} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Session list — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 0" }}>
          {sessionsLoading ? (
            <div style={{ padding: 20, fontSize: 11, color: MUTED, textAlign: "center" }}>Loading…</div>
          ) : (
            Object.entries(groupedSessions).map(([group, list]) =>
              list.length === 0 ? null : (
                <div key={group} style={{ marginBottom: 12 }}>
                  <div style={{ padding: "4px 8px 6px", fontSize: 12, fontWeight: 700, color: TEXT, letterSpacing: "-0.1px" }}>
                    {group}
                  </div>
                  {list.map(s => (
                    <div key={s._id}
                      onClick={() => {
                        handleLoadSession(s._id);
                        if (isMobile) setSidebarOpen(false);
                      }}
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        fontSize: 13.5,
                        color: activeSession === s._id ? TEXT : SUB,
                        background: activeSession === s._id ? BORDER2 : "transparent",
                        borderRadius: 8, marginBottom: 1,
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
                        transition: "background 0.12s",
                        fontWeight: activeSession === s._id ? 500 : 400,
                      }}
                      onMouseEnter={e => { if (activeSession !== s._id) e.currentTarget.style.background = BORDER2; }}
                      onMouseLeave={e => { if (activeSession !== s._id) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {s.title}
                      </span>
                      <button
                        onClick={e => handleDeleteSession(e, s._id)}
                        style={{ 
                          width: 24, height: 24, borderRadius: 6, border: "none", 
                          background: "transparent", cursor: "pointer", color: MUTED, 
                          display: "flex", alignItems: "center", justifyContent: "center", 
                          flexShrink: 0, transition: "all 0.15s", opacity: 0.6 
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"; e.currentTarget.style.opacity = "1"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.background = "transparent"; e.currentTarget.style.opacity = "0.6"; }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            )
          )}
          {!sessionsLoading && Object.values(groupedSessions).every(l => l.length === 0) && (
            <div style={{ padding: "32px 12px", textAlign: "center", color: MUTED, fontSize: 12 }}>
              No conversations yet
            </div>
          )}
        </div>

        {/* Bottom action buttons */}
        <div style={{ padding: "12px 12px 16px", borderTop: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => { handleNewChat(); if (isMobile) setSidebarOpen(false); }}
            style={{
              width: "100%", padding: "10px 14px",
              background: STRONG, border: `1px solid ${STRONG}`,
              borderRadius: 10, cursor: "pointer", color: "var(--text-on-strong)",
              fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontFamily: "inherit", transition: "opacity 0.15s",
            }}
          >
            New chat
            <Plus size={15} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => {
              onClose?.();
              navigate("/profile?tab=aiprofile");
            }}
            style={{
              width: "100%", padding: "10px 14px",
              background: SURFACE, border: `1px solid ${BORDER}`,
              borderRadius: 10, cursor: "pointer", color: TEXT,
              fontSize: 13, fontWeight: 500,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontFamily: "inherit", transition: "background 0.12s",
            }}
          >
            Financial Profile
            <SlidersHorizontal size={13} style={{ color: MUTED }} />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 110, animation: "fadeIn 0.2s ease", backdropFilter: "blur(2px)" }} 
        />
      )}

      {/* ══ RIGHT PANEL ═══════════════════════════════════ */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        height: "100%", overflow: "hidden",
        background: BG,
        position: "relative",
      }}>

        {/* Desktop top bar */}
        {!isMobile && (
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "flex-end", flexShrink: 0 }}>
            <button onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, background: "none", border: `1px solid ${BORDER}`, cursor: "pointer", color: MUTED, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
              onMouseEnter={e => { e.currentTarget.style.background = BORDER2; e.currentTarget.style.color = TEXT; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = MUTED; }}
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Mobile header */}
        {isMobile && (
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: BG }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, display: "flex", padding: 4 }}>
                <Menu size={20} />
              </button>
              <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>AI Advisor</span>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, display: "flex", padding: 4 }}>
              <X size={20} />
            </button>
          </div>
        )}
        {/* Upgrade banner */}
        {aiLimitReached && (
          <div style={{ padding: isMobile ? "10px 14px" : "10px 20px", background: "var(--error-transparent, rgba(239, 68, 68, 0.12))", borderBottom: "1px solid rgba(239, 68, 68, 0.25)", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: isMobile ? 10 : 0, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={14} style={{ color: "#b91c1c", flexShrink: 0 }} />
              <span style={{ fontSize: isMobile ? 11.5 : 12, color: "#b91c1c", fontWeight: 600, lineHeight: 1.4 }}>Free limit reached (5 queries/month)</span>
            </div>
            <button type="button" onClick={() => navigate(ROUTES.SUBSCRIPTION)}
              style={{ padding: isMobile ? "9px 14px" : "5px 14px", borderRadius: 100, border: "none", background: "#ef4444", color: TEXT_INVERSE, fontSize: 11, fontWeight: 700, cursor: "pointer", alignSelf: isMobile ? "stretch" : "auto" }}>
              Upgrade →
            </button>
          </div>
        )}

        {/* ── Messages / empty state ────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column" }}>
          {isEmpty ? (
            /* ── Empty state: Origin design ── */
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: isMobile ? "flex-start" : "center",
              padding: isMobile ? "24px 16px 12px" : "48px 40px 24px",
              textAlign: "center",
            }}>
              {/* Sparkle */}
              <div style={{ marginBottom: 18 }}>
                <svg width={30} height={30} viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L13.5 9L20 10L13.5 11L12 18L10.5 11L4 10L10.5 9L12 2Z" fill={INDIGO} opacity={0.9} />
                  <path d="M19 15L19.8 18L22 19L19.8 20L19 23L18.2 20L16 19L18.2 18L19 15Z" fill={INDIGO} opacity={0.55} />
                  <path d="M5 3L5.5 5L7 5.5L5.5 6L5 8L4.5 6L3 5.5L4.5 5L5 3Z" fill={INDIGO} opacity={0.45} />
                </svg>
              </div>

              {/* Heading — italic serif, exactly like reference */}
              <div style={{
                fontSize: isMobile ? 20 : 28,
                color: TEXT,
                lineHeight: 1.35,
                marginBottom: isMobile ? 22 : 32,
                fontFamily: "var(--font-serif)",
                letterSpacing: "-0.2px",
                maxWidth: isMobile ? 300 : 380,
              }}>
                Your AI <em style={{ fontStyle: "italic", fontWeight: 400 }}>financial advisor</em><br />
                is ready to help you.
              </div>

              {/* Quick prompts — 2×2 grid of pills */}
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 10,
                width: "100%",
                maxWidth: 500,
              }}>
                {quickPrompts.map(p => (
                  <button key={p} type="button"
                    onClick={() => sendMessage(p)}
                    style={{
                      padding: "11px 16px",
                      borderRadius: 10,
                      border: `1px solid ${BORDER}`,
                      background: SURFACE,
                      fontSize: isMobile ? 12.5 : 13, fontWeight: 400, color: TEXT,
                      cursor: "pointer", fontFamily: "inherit",
                      textAlign: "left",
                      transition: "all 0.15s",
                      lineHeight: 1.4,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = BORDER2; e.currentTarget.style.borderColor = INDIGO_MID; }}
                    onMouseLeave={e => { e.currentTarget.style.background = SURFACE; e.currentTarget.style.borderColor = BORDER; }}
                  >{p}</button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Conversation messages ── */
            <div style={{ flex: 1, padding: isMobile ? "16px 14px" : "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  display: "flex",
                  flexDirection: m.role === "user" ? "row-reverse" : "row",
                  alignItems: "flex-end", gap: isMobile ? 8 : 10,
                }}>
                  {m.role !== "user" && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: INDIGO_LT, border: `1px solid ${INDIGO_MID}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L13.5 9L20 10L13.5 11L12 18L10.5 11L4 10L10.5 9L12 2Z" fill={INDIGO} />
                      </svg>
                    </div>
                  )}
                  <div style={{
                    maxWidth: isMobile ? "90%" : "72%",
                    padding: isMobile ? "10px 13px" : "11px 16px",
                    borderRadius: m.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                    background: m.role === "user" ? TEXT : SURFACE,
                    color: m.role === "user" ? TEXT_INVERSE : TEXT,
                    fontSize: isMobile ? 12.75 : 13.5, lineHeight: 1.6,
                    boxShadow: m.role === "user" ? "0 2px 8px rgba(0,0,0,0.15)" : "0 1px 4px rgba(0,0,0,0.06)",
                    border: m.role === "user" ? "none" : `1px solid ${BORDER}`,
                    overflowWrap: "anywhere",
                  }}>
                    {renderMd(m.text, m.role === "user" ? "#a5b4fc" : INDIGO)}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {typing && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: INDIGO_LT, border: `1px solid ${INDIGO_MID}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none"><path d="M12 2L13.5 9L20 10L13.5 11L12 18L10.5 11L4 10L10.5 9L12 2Z" fill={INDIGO} /></svg>
                  </div>
                  <div style={{ padding: "12px 16px", borderRadius: "4px 18px 18px 18px", background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      {[0, 1, 2].map(j => (
                        <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: INDIGO, opacity: 0.5, animation: `bounceY 1s ${j * 0.18}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={msgsEndRef} />
            </div>
          )}
        </div>

        {/* ── Input bar — pinned to bottom, full width ───── */}
        <div style={{
          padding: isMobile ? "10px 14px 14px" : "12px 20px 16px",
          borderTop: `1px solid ${BORDER}`,
          background: SURFACE,
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", gap: 8, alignItems: "center",
            background: BORDER2,
            border: `1.5px solid ${BORDER}`,
            borderRadius: 14,
            padding: "9px 10px 9px 16px",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
            onFocusCapture={e => { e.currentTarget.style.borderColor = INDIGO_MID; e.currentTarget.style.boxShadow = `0 0 0 3px ${INDIGO_LT}`; e.currentTarget.style.background = SURFACE; }}
            onBlurCapture={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = BORDER2; }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !aiLimitReached && sendMessage()}
              placeholder={aiLimitReached ? "Upgrade to continue…" : "Ask anything…"}
              disabled={!!aiLimitReached}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                fontSize: 14, color: TEXT, fontFamily: "inherit",
                opacity: aiLimitReached ? 0.5 : 1,
                minWidth: 0,
              }}
            />
            {input.trim() && (
              <button type="button" onClick={() => { setInput(""); inputRef.current?.focus(); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 3, display: "flex", color: MUTED, borderRadius: 6 }}>
                <X size={13} />
              </button>
            )}
            {/* Send button */}
            <button type="button"
              onClick={() => sendMessage()}
              disabled={!!aiLimitReached || !input.trim()}
              style={{
                width: 34, height: 34, borderRadius: 10, border: "none", flexShrink: 0,
                background: (!aiLimitReached && input.trim()) ? TEXT : BORDER2,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: (!aiLimitReached && input.trim()) ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (!aiLimitReached && input.trim()) e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <ArrowUpRight size={15} color={(!aiLimitReached && input.trim()) ? TEXT_INVERSE : MUTED} strokeWidth={2.5} />
            </button>
          </div>
          {isMobile && (
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={handleNewChat} style={{ width: "100%", padding: "10px 12px", background: STRONG, border: `1px solid ${STRONG}`, borderRadius: 10, cursor: "pointer", color: "var(--text-on-strong)", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
                New chat <Plus size={14} strokeWidth={2.5} />
              </button>
              <button onClick={() => { onClose?.(); navigate("/profile?tab=aiprofile"); }} style={{ width: "100%", padding: "10px 12px", background: "var(--bg-secondary)", border: `1px solid ${BORDER}`, borderRadius: 10, cursor: "pointer", color: "var(--text-primary)", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
                <SlidersHorizontal size={13} style={{ color: "var(--text-secondary)" }} />
                Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function MiniSparkline({ prices, up, width = 80, height = 36 }) {
  if (!prices || prices.length < 2) return (
    <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "80%", height: 1, background: "var(--border-subtle)" }} />
    </div>
  );
  const mn = Math.min(...prices), mx = Math.max(...prices);
  const range = mx - mn || 1;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((p - mn) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const color = up ? "#2e7d5e" : "#ef4444";
  const fillId = `sf${String(prices[0] || 0).replace(/[^0-9a-z]/gi, '')}-${prices.length}-${width}-${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible", flexShrink: 0 }}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${pts} ${width},${height}`}
        fill={`url(#${fillId})`}
      />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


const COIN_MAPPING = {
  btc: "bitcoin", eth: "ethereum", usdt: "tether", bnb: "binancecoin", sol: "solana",
  usdc: "usd-coin", xrp: "ripple", ada: "cardano", avax: "avalanche-2", doge: "dogecoin",
  dot: "polkadot", matic: "matic-network", shib: "shiba-inu", ltc: "litecoin", trx: "tron",
  link: "chainlink", bch: "bitcoin-cash", ton: "the-open-network", xlm: "stellar",
  atom: "cosmos", uni: "uniswap", xmr: "monero", etc: "ethereum-classic"
};

const getCoinGeckoId = (coinStr) => {
  if (!coinStr) return "";
  const lower = coinStr.toLowerCase().trim();
  return COIN_MAPPING[lower] || lower;
};

function CryptoHoldingsWidget({ C, setActiveNav }) {
  const { netWorthAssets: assets, loading } = usePortfolio();
  const cryptos = (assets || []).filter(a => a.assetType === "crypto" || (!a.assetType && a.coin));
  const [sparklines, setSparklines] = useState({});
  const { user: dashboardUser } = useAuthContext();
  const preferredCurrency = getUserCurrency(dashboardUser);

  // Fetch 7-day sparkline data from CoinGecko for each unique coin
  useEffect(() => {
    if (!cryptos.length) return;
    const unique = [...new Set(cryptos.map(a => a.coin?.toLowerCase()).filter(Boolean))];
    unique.forEach(async (coin) => {
      if (sparklines[coin]) return; // already fetched
      try {
        const cgId = getCoinGeckoId(coin);
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=7&interval=daily`
        );
        const data = await res.json();
        if (data.prices) {
          setSparklines(prev => ({ ...prev, [coin]: data.prices.map(p => p[1]) }));
        }
      } catch {
        // silently fail — sparkline just won't show
      }
    });
  }, [assets]);

  const fmtP = (n) => {
    const abs = Math.abs(n ?? 0);
    if (abs >= 1_000_000) {
      return formatCurrencyAmount(abs / 1_000_000, preferredCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "M";
    }
    if (abs >= 1_000) {
      return formatCurrencyAmount(abs / 1_000, preferredCurrency, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "k";
    }
    return formatCurrencyAmount(abs, preferredCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "14px 18px 16px", flexShrink: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="origin-section-label" style={{ fontSize: C.fSizeXs }}>
          Crypto Holdings
        </span>
        <button type="button" onClick={() => setActiveNav("portfolio")}
          style={{
            fontSize: 9, fontWeight: 600, color: C.teal, background: "none", border: "none",
            cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 2
          }}>
          View all <ChevronRight size={10} />
        </button>
      </div>

      {loading ? (
        <div style={{ fontSize: 11, color: C.muted, textAlign: "center", padding: "8px 0" }}>Loading...</div>
      ) : cryptos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>No crypto assets yet</div>
          <button type="button" onClick={() => setActiveNav("portfolio")}
            style={{
              fontSize: 11, fontWeight: 600, color: C.teal, background: "none", border: "none",
              cursor: "pointer", fontFamily: "inherit"
            }}>+ Add crypto</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {cryptos.slice(0, 3).map((a, i) => {
            const invested = (a.buyPrice || 0) * (a.quantity || 0);
            const value = a.currentValue || 0;
            const gain = a.gainLoss ?? (value - invested);
            const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
            const up = gain >= 0;
            const spark = sparklines[a.coin?.toLowerCase()];
            const isLast = i === Math.min(cryptos.length, 3) - 1;

            return (
              <div key={i} style={{
                paddingBottom: isLast ? 0 : 12,
                marginBottom: isLast ? 0 : 12,
                borderBottom: isLast ? "none" : `1px solid ${C.border2}`,
              }}>
                {/* Sparkline chart */}
                <div style={{ marginBottom: 8, borderRadius: 8, overflow: "hidden" }}>
                  <MiniSparkline prices={spark} up={up} width={236} height={70} />
                </div>
                {/* Name row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 7, background: "#f59e0b14",
                      border: "1px solid #f59e0b22", display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0
                    }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: "#f59e0b" }}>
                        {(a.symbol || "?").slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: C.fSizeSm, fontWeight: C.fWeightSemi, color: C.text, textTransform: "capitalize" }}>
                        {a.coin?.charAt(0).toUpperCase() + a.coin?.slice(1)}
                      </div>
                      <div style={{ fontSize: C.fSizeXs, color: C.muted, fontWeight: C.fWeightReg }}>
                        {a.symbol?.toUpperCase()} · {a.quantity} held
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: C.fSizeSm, fontWeight: C.fWeightSemi, color: C.text, fontVariantNumeric: "tabular-nums" }}>{fmtP(value)}</div>
                    <div style={{ fontSize: C.fSizeXs, fontWeight: C.fWeightSemi, color: up ? C.greenMid : C.red, fontVariantNumeric: "tabular-nums" }}>
                      {up ? "▲" : "▼"} {Math.abs(gainPct).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {cryptos.length > 3 && (
            <button type="button" onClick={() => setActiveNav("portfolio")}
              style={{
                fontSize: 11, fontWeight: 600, color: C.teal, background: "none", border: "none",
                cursor: "pointer", fontFamily: "inherit", marginTop: 10, padding: 0,
                display: "flex", alignItems: "center", gap: 3
              }}>
              +{cryptos.length - 3} more <ChevronRight size={10} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Financial Score Widget ─────────────────────────────── */
/* ─── Savings Goals Widget ──────────────────────────────── */

function SavingsGoalsWidget({ C, apiGoals, setActiveNav }) {
  const { user: dashboardUser } = useAuthContext();
  const preferredCurrency = getUserCurrency(dashboardUser);
  const goals = (apiGoals || []).slice(0, 3);

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "14px 18px 16px", flexShrink: 0 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="origin-section-label" style={{ fontSize: C.fSizeXs }}>Savings Goals</span>
        <button type="button" onClick={() => setActiveNav("planning")}
          style={{ width: 22, height: 22, borderRadius: "50%", background: C.bg, border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, flexShrink: 0 }}
        ><Plus size={10} /></button>
      </div>

      {/* Empty state */}
      {goals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>No goals yet</div>
          <button type="button" onClick={() => setActiveNav("planning")}
            style={{ fontSize: 11, fontWeight: 600, color: C.teal, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            + Add your first goal
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {goals.map((g, i) => {
            const current = g.currentAmount || g.current || 0;
            const target = g.targetAmount || g.target || 1;
            const pct = Math.min(Math.round((current / target) * 100), 100);
            const fmt = (n) => formatCurrencyAmount(Math.round(n || 0), preferredCurrency, { maximumFractionDigits: 0 });
            return (
              <div key={i}>
                {/* Name + amounts */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                  <span style={{ fontSize: C.fSizeSm, fontWeight: C.fWeightMed, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{g.title}</span>
                  <span style={{ fontSize: C.fSizeXs, color: C.muted, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ fontWeight: C.fWeightSemi, color: C.text }}>{fmt(current)}</span>
                    {" / "}{fmt(target)}
                  </span>
                </div>
                {/* Bar */}
                <div style={{ height: 5, borderRadius: 99, background: C.border2, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%", borderRadius: 99,
                    background: pct >= 100 ? C.greenMid : C.teal,
                    transition: "width 0.8s ease",
                  }} />
                </div>
              </div>
            );
          })}

          {/* See all link */}
          {apiGoals.length > 0 && (
            <button type="button" onClick={() => setActiveNav("planning")}
              style={{ fontSize: 11, fontWeight: 600, color: C.teal, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", padding: 0, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
              See all in Planning <ChevronRight size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Health Score Widget ────────────────────────────────── */
/* ─── Net Worth View (Net Worth tab) ─────────────────────── */
function NetWorthView({ C, netWorthData = [], summary = {}, monthlyChart = [], isMobile, apiTransactions = [], categoryBreakdown = [], canonicalCurrentNetWorth, setActiveNav }) {
  return (
    <>
      <Card className="anim-4" style={{ padding: 0, overflow: "hidden", background: C.white, borderRadius: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 12px", borderBottom: `1px solid ${C.border2}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setActiveNav("portfolio")}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.10em" }}>INVESTMENTS</span>
            <ChevronRight size={12} style={{ color: C.muted }} />
          </div>
          <button type="button" onClick={() => setActiveNav("portfolio")}
            style={{ width: 28, height: 28, borderRadius: 7, background: C.bg, border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16, color: "var(--text-secondary)", fontWeight: 300, lineHeight: 1 }}>+</span>
          </button>
        </div>

        <InvestmentsChartCard C={C} setActiveNav={setActiveNav} isMobile={isMobile}
          summary={summary} monthlyChart={monthlyChart} apiTransactions={apiTransactions} categoryBreakdown={categoryBreakdown} canonicalCurrentNetWorth={canonicalCurrentNetWorth}
          initialTab="investments" initialPeriod="YTD"
        />
      </Card>
    </>
  );
}

/* ─── Investments Chart Card (overview dashboard row) ───── */
function InvestmentsChartCard({ C, setActiveNav, isMobile, summary, monthlyChart, apiTransactions, categoryBreakdown, canonicalCurrentNetWorth, initialTab = "all", initialPeriod = "ALL" }) {
  const { user: dashboardUser } = useAuthContext();
  const preferredCurrency = getUserCurrency(dashboardUser);
  const portfolio = usePortfolio() || {};
  const { netWorthAssets: assets = [], loading } = portfolio;
  const formatAmount = (value, options = {}) => formatCurrencyAmount(value, preferredCurrency, options);
  const fmtNW = (n) => formatCurrencyAmount(Math.abs(n || 0), preferredCurrency, { maximumFractionDigits: 0 });

  const [nwTab, setNwTab] = useState(initialTab);
  const [nwPeriod, setNwPeriod] = useState(initialPeriod);

  const ASSET_COLORS = ["#0d9488", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];
  const SPEND_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#0d9488", "#ec4899"];

  const totalSpend = (categoryBreakdown || []).reduce((s, c) => s + (c.amount || c.total || 0), 0);

  const assetGroups = Object.values((Array.isArray(assets) ? assets : []).reduce((acc, a) => {
    const key = a?.assetType || "Other";
    acc[key] = acc[key] || { label: key, total: 0, items: [] };
    acc[key].total += (a?.currentValue || 0);
    acc[key].items.push(a);
    return acc;
  }, {}));

  const spendGroups = (categoryBreakdown || []).map(c => ({ label: c.category || c.name || "Other", total: c.amount || c.total || 0 }));
  const chartRef = useRef(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 260 });

  useEffect(() => {
    if (!chartRef.current) return undefined;

    const updateSize = () => {
      const rect = chartRef.current?.getBoundingClientRect();
      const width = Math.max(0, Math.floor(rect?.width || 0));
      const height = Math.max(0, Math.floor(rect?.height || 0));
      setChartSize((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(chartRef.current);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  // ── Totals ────────────────────────────────────────────────
  const totalValue = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
  const totalAssets = totalValue;
  const totalInvested = assets.reduce((s, a) => {
    if (a.assetType === "crypto") return s + (a.buyPrice || 0) * (a.quantity || 0);
    return s + (a.buyingPrice || a.purchasePrice || 0);
  }, 0);
  const investTotalGain = totalValue - totalInvested;
  const investGainPct = totalInvested > 0 ? ((investTotalGain / totalInvested) * 100).toFixed(1) : null;
  const hasCostData = assets.some(a =>
    (a.assetType === "crypto" && (a.buyPrice || 0) > 0) ||
    (a.assetType !== "crypto" && ((a.buyingPrice || 0) > 0 || (a.purchasePrice || 0) > 0))
  );

  // ── Two-line chart: cumulative cost basis + current value over time ──
  const chartData = useMemo(() => {
    if (!assets.length) return [];

    const events = [];
    assets.forEach(a => {
      const invested = a.assetType === "crypto"
        ? (a.buyPrice || 0) * (a.quantity || 0)
        : (a.buyingPrice || a.purchasePrice || 0);
      const dateStr = a.buyDate || a.createdAt || a.purchaseDate;
      const d = dateStr ? new Date(dateStr) : null;
      const monthKey = (d && !isNaN(d))
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        : null;
      events.push({ monthKey, invested: invested || 0, currentValue: a.currentValue || 0 });
    });

    const datedEvents = events.filter(e => e.monthKey);
    const undatedEvents = events.filter(e => !e.monthKey);
    const now = new Date();
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // If no dated events, show flat lines for 6 months
    if (!datedEvents.length) {
      const totalCost = events.reduce((s, e) => s + e.invested, 0);
      const totalCurr = events.reduce((s, e) => s + e.currentValue, 0);
      return Array.from({ length: 6 }, (_, i) => {
        const d2 = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const label = d2.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const isNow = i === 5;
        return { month: label, costBasis: isNow ? Math.round(totalCost) : 0, currentValue: isNow ? Math.round(totalCurr) : 0 };
      });
    }

    const earliestKey = datedEvents.reduce((min, e) => e.monthKey < min ? e.monthKey : min, datedEvents[0].monthKey);
    undatedEvents.forEach(e => { e.monthKey = earliestKey; });

    const monthMap = {};
    events.forEach(({ monthKey, invested, currentValue }) => {
      if (!monthMap[monthKey]) monthMap[monthKey] = { invested: 0, currentValue: 0 };
      monthMap[monthKey].invested += invested;
      monthMap[monthKey].currentValue += currentValue;
    });

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const sixKey = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, "0")}`;
    const startKey = earliestKey < sixKey ? earliestKey : sixKey;

    const [sy, sm] = startKey.split("-").map(Number);
    const months = [];
    let y = sy, mo = sm;
    while (true) {
      const key = `${y}-${String(mo).padStart(2, "0")}`;
      months.push(key);
      if (key >= nowKey) break;
      mo++; if (mo > 12) { mo = 1; y++; }
    }

    // Cumulative cost basis; current value appears only on last point
    let cumCost = 0;
      const totalCurrentValue = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
      const fullMap = months.map((key, idx) => {
      cumCost += (monthMap[key]?.invested || 0);
      const [ky, km] = key.split("-").map(Number);
      const lbl = new Date(ky, km - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const isLast = idx === months.length - 1;
      const fraction = months.length > 1 ? idx / (months.length - 1) : 1;
      const interpolatedValue = isLast ? totalCurrentValue : Math.round(totalCurrentValue * fraction);
      return { d: lbl, v: Math.round(cumCost), costBasis: Math.round(cumCost), currentValue: interpolatedValue, cum: Math.round(cumCost) };
    });
    return fullMap.slice(-12);
  }, [assets]);

  const latest = chartData.length ? chartData[chartData.length - 1].nw : 0;
  const first = chartData.length > 1 ? chartData[0].nw : 0;
  const change = latest - first;
  const changePct = first !== 0 ? ((change / Math.abs(first)) * 100).toFixed(1) : null;

  // Fix 8+9: Build investment chart from asset purchase data (always available)
  // Uses buy date + cost to show cumulative invested over time — no priceHistory needed
  const investChartData = (() => {
    if (!assets.length) return [];

    // Build monthly buckets of cumulative invested value
    const events = [];
    assets.forEach(a => {
      const invested = a.assetType === "crypto"
        ? (a.buyPrice || 0) * (a.quantity || 0)
        : (a.buyingPrice || a.purchasePrice || 0);
      const dateStr = a.buyDate || a.createdAt || a.purchaseDate;
      const d = dateStr ? new Date(dateStr) : null;
      const monthKey = (d && !isNaN(d))
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        : null;
      events.push({ monthKey, invested, currentValue: a.currentValue || 0 });
    });

    const datedEvents = events.filter(e => e.monthKey);
    const undatedEvents = events.filter(e => !e.monthKey);

    // If no dated events, show a flat line across 12 months at total value
    const nowDate = new Date();
    const nowKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`;

    if (!datedEvents.length) {
      const totalVal = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
      return Array.from({ length: 12 }, (_, i) => {
        const d2 = new Date(nowDate.getFullYear(), nowDate.getMonth() - 11 + i, 1);
        const lbl = d2.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        return { d: lbl, ts: d2.getTime(), v: i === 11 ? totalVal : 0, cum: totalVal };
      });
    }

    // Bucket undated into earliest known month
    const earliestKey = datedEvents.reduce((min, e) => e.monthKey < min ? e.monthKey : min, datedEvents[0].monthKey);
    undatedEvents.forEach(e => { e.monthKey = earliestKey; });

    // Sum per month (use currentValue for last month, invested for earlier)
    const monthMap = {};
    events.forEach(({ monthKey, invested, currentValue }) => {
      if (!monthMap[monthKey]) monthMap[monthKey] = { invested: 0, currentValue: 0 };
      monthMap[monthKey].invested += invested;
      monthMap[monthKey].currentValue += currentValue;
    });

    // Build range from earliest to now, at least 6 months
    const twelveAgo = new Date(nowDate.getFullYear(), nowDate.getMonth() - 11, 1);
    const twelveKey = `${twelveAgo.getFullYear()}-${String(twelveAgo.getMonth() + 1).padStart(2, "0")}`;
    const startKey = earliestKey < twelveKey ? earliestKey : twelveKey;
    const [sy, sm] = startKey.split("-").map(Number);
    const months = [];
    let y = sy, m = sm;
    while (true) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      months.push(key);
      if (key >= nowKey) break;
      m++; if (m > 12) { m = 1; y++; }
    }

    // Cumulative cost basis; distribute current value proportionally across months
    let cumCost = 0;
    const totalCurrentValue = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
    return months.map((key, idx) => {
      cumCost += (monthMap[key]?.invested || 0);
      const [ky, km] = key.split("-").map(Number);
      const d2 = new Date(ky, km - 1, 1);
      const lbl = d2.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const isLast = idx === months.length - 1;
      // currentValue only known at last point; interpolate linearly between 0 and totalCurrentValue
      const fraction = months.length > 1 ? idx / (months.length - 1) : 1;
      const interpolatedValue = isLast ? totalCurrentValue : Math.round(totalCurrentValue * fraction);
      return { d: lbl, ts: d2.getTime(), v: Math.round(cumCost), costBasis: Math.round(cumCost), currentValue: interpolatedValue, cum: Math.round(cumCost) };
    });
  })();

  const filteredInvestChartData = useMemo(() => {
    if (!investChartData.length) return [];
    const now = new Date();
    const sorted = [...investChartData].sort((a, b) => (a.ts || 0) - (b.ts || 0));
    if (nwPeriod === "1W" || nwPeriod === "1M") return sorted.slice(-3); // Show last 3 months minimum for better visualization
    if (nwPeriod === "3M") return sorted.slice(-3);
    if (nwPeriod === "YTD") {
      const y = now.getFullYear();
      const start = new Date(y, 0, 1).getTime();
      return sorted.filter((p) => (p.ts || 0) >= start);
    }
    return sorted;
  }, [investChartData, nwPeriod]);

  // Filter chartData by period for "All" tab
  const filteredChartData = useMemo(() => {
    if (!chartData.length) return [];
    if (nwPeriod === "1W" || nwPeriod === "1M") return chartData.slice(-3);
    if (nwPeriod === "3M") return chartData.slice(-3);
    if (nwPeriod === "YTD") return chartData.slice(-12);
    return chartData;
  }, [chartData, nwPeriod]);

  const totalCostAll = assets.reduce((s, a) => {
    const cost = getAssetCostBasis(a);
    return s + (cost > 0 ? cost : (a.currentValue || 0));
  }, 0);
  const hasCostDataNW = assets.some(a => getAssetCostBasis(a) > 0);
  const nwTotalGain = totalValue - totalCostAll;
  const nwGainPct = (hasCostDataNW && totalCostAll > 0) ? ((nwTotalGain / totalCostAll) * 100).toFixed(1) : null;

  const ASSET_TYPE_ICONS = {
    Stock: TrendingUp, Crypto: TrendingUp, Cash: BadgeDollarSign, Bond: TrendingUp, "Real Estate": Building2, Other: Gem,
  };

  // (moved to top-level)

  // Active chart config per tab
  const chartColor = nwTab === "spending" ? "#ef4444" : nwTab === "investments" ? "#8b5cf6" : "#0D9488";
  const activeGrad = `nwGrad_${nwTab}`;
  const activeKey = nwTab === "spending" ? "expense" : "v"; // Use "v" key which exists in both chartData and investChartData
  const mainValue = nwTab === "investments"
    ? totalValue
    : nwTab === "spending"
      ? totalSpend
      : (Number.isFinite(canonicalCurrentNetWorth) ? canonicalCurrentNetWorth : latest);
  // For investments: use filteredInvestChartData with period applied
  // For all: use filteredChartData with period applied
  // For spending: use monthlyChart (filtered separately in spending section)
  const activeData = nwTab === "investments"
    ? filteredInvestChartData
    : filteredChartData;

  const tabs = [["all", "All"], ["spending", "Income vs Expenses"], ["investments", "Investments"]];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Main chart card (tabs + value + chart + period) ── */}
      <Card style={{ padding: 0, overflow: "hidden", background: C.white, borderRadius: 18 }}>
        {/* Tab row */}
        <div style={{ display: "flex", alignItems: "center", padding: `14px ${isMobile ? "14px" : "20px"} 0`, borderBottom: `1px solid ${C.border2}` }}>
          <div style={{ display: "flex", flex: 1 }}>
            {tabs.map(([id, label]) => (
              <button key={id} type="button" onClick={() => setNwTab(id)}
                style={{
                  padding: `6px ${isMobile ? "12px" : "18px"} 12px`, border: "none", background: "transparent", cursor: "pointer",
                  fontFamily: "inherit", fontSize: isMobile ? 12 : 13, fontWeight: nwTab === id ? 600 : 400,
                  color: nwTab === id ? C.text : C.muted,
                  borderBottom: nwTab === id ? `2px solid ${C.greenMid}` : "2px solid transparent",
                  transition: "all 0.15s",
                  opacity: nwTab === id ? 1 : 0.7
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Value */}
        <div style={{ padding: `14px ${isMobile ? "14px" : "20px"} 4px` }}>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 600, letterSpacing: "-0.5px", color: nwTab === "spending" ? C.red : mainValue < 0 ? C.red : C.text }}>
            {fmtNW(mainValue)}
          </div>
          {/* All tab headline uses canonical current net worth; chart below remains period trend. */}
          {nwTab === "all" && (
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2, letterSpacing: "0.02em" }}>
              Current net worth; chart shows selected-period trend
            </div>
          )}
          {nwTab === "investments" && (
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2, letterSpacing: "0.02em" }}>
              Total portfolio value
            </div>
          )}
          {nwTab === "all" && changePct !== null && (
            <div style={{ fontSize: 12, fontWeight: 600, color: change >= 0 ? C.greenMid : C.red, marginTop: 2 }}>
              {change >= 0 ? "+" : ""}{fmtNW(change)} ({change >= 0 ? "+" : ""}{changePct}%)
            </div>
          )}
          {nwTab === "investments" && nwGainPct !== null && (
            <div style={{ fontSize: 12, fontWeight: 600, color: nwTotalGain >= 0 ? C.greenMid : C.red, marginTop: 2 }}>
              {nwTotalGain >= 0 ? "+" : ""}{fmtNW(nwTotalGain)} ({nwTotalGain >= 0 ? "+" : ""}{nwGainPct}%)
            </div>
          )}
        </div>

        {/* Chart — conditional per tab */}
        <div ref={chartRef} style={{ width: "100%" }}>
        {nwTab === "investments" ? (
          <>
            <ResponsiveContainer width="100%" height={isMobile ? 170 : 220} minWidth={0} minHeight={isMobile ? 170 : 220}>
              <AreaChart data={filteredInvestChartData} margin={{ top: 10, right: isMobile ? 44 : 56, bottom: 18, left: 0 }}>
                <defs>
                  <linearGradient id="nwInvCostGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d"
                  tick={{ fontSize: 10, fill: C.muted, fontFamily: "var(--font-sans)" }}
                  axisLine={false} tickLine={false} interval="preserveStartEnd"
                />
                <YAxis orientation="right" axisLine={false} tickLine={false} width={isMobile ? 44 : 56}
                  tickFormatter={v => fmtNW(v)}
                  tick={{ fontSize: 10, fill: C.muted, fontFamily: "var(--font-sans)" }}
                />
                <CartesianGrid vertical={false} stroke={C.border2} strokeDasharray="4 4" />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload;
                  return (
                    <div style={{ background: C.white, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "10px 13px", boxShadow: "0 4px 16px rgba(0,0,0,0.09)" }}>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{row?.d}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{fmtNW(row?.v)}</div>
                    </div>
                  );
                }} />
                <Area type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={2.5}
                  fill="url(#nwInvCostGrad)" dot={false}
                  activeDot={{ r: 5, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        ) : nwTab === "spending" ? (() => {
          const sorted2 = [...(monthlyChart || [])].sort((a, b) => (a.month || "").localeCompare(b.month || ""));
          let slice2 = sorted2;
          const nowD = new Date();
          if (nwPeriod === "1W" || nwPeriod === "1M") slice2 = sorted2.slice(-1);
          else if (nwPeriod === "3M") slice2 = sorted2.slice(-3);
          else if (nwPeriod === "YTD") slice2 = sorted2.filter(m => (m.month || "").startsWith(String(nowD.getFullYear())));
          const lineData = slice2.map(m => {
            const [y, mo] = (m.month || "").split("-").map(Number);
            const label = (y && mo) ? new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : m.month;
            return { d: label, income: m.income || 0, expense: m.expense || 0 };
          });
          return (
            <>
              {/* Summary Metrics */}
              <div style={{ display: "flex", gap: 32, padding: "0 20px 20px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Monthly Income</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: C.greenMid, letterSpacing: "-0.5px" }}>
                    {formatAmount(summary?.totalIncome ?? 0, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Savings Rate</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: C.text, letterSpacing: "-0.5px" }}>
                    {summary?.savingsPercent ?? 0}%
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: "flex", gap: 16, padding: "0 20px 4px", justifyContent: "flex-end" }}>
                {[{ color: "#16a34a", label: "Income" }, { color: "#ef4444", label: "Expenses" }].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 10, height: 3, borderRadius: 2, background: l.color }} />
                    <span style={{ fontSize: 10.5, color: C.muted }}>{l.label}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={isMobile ? 160 : 210} minWidth={0} minHeight={isMobile ? 160 : 210}>
                <LineChart data={lineData} margin={{ top: 6, right: isMobile ? 44 : 56, bottom: 0, left: 0 }}>
                  <XAxis dataKey="d"
                    tick={{ fontSize: 10, fill: C.muted, fontFamily: "var(--font-sans)" }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis orientation="right" axisLine={false} tickLine={false} width={isMobile ? 44 : 56}
                    tickFormatter={v => fmtNW(v)}
                    tick={{ fontSize: 10, fill: C.muted, fontFamily: "var(--font-sans)" }}
                  />
                  <CartesianGrid vertical={false} stroke={C.border2} strokeDasharray="4 4" />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload;
                    const net = (row?.income || 0) - (row?.expense || 0);
                    return (
                      <div style={{ background: C.white, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "10px 13px", boxShadow: "0 4px 16px rgba(0,0,0,0.09)" }}>
                        <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>{row?.d}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a" }} />
                          <span style={{ fontSize: 11, color: C.sub }}>Income:</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>{fmtNW(row?.income)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                          <span style={{ fontSize: 11, color: C.sub }}>Expenses:</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>{fmtNW(row?.expense)}</span>
                        </div>
                        <div style={{ borderTop: `1px solid ${C.border2}`, paddingTop: 4, fontSize: 12, fontWeight: 700, color: net >= 0 ? C.greenMid : C.red }}>
                          Net: {net >= 0 ? "+" : ""}{fmtNW(net)}
                        </div>
                      </div>
                    );
                  }} />
                  <Line type="monotone" dataKey="income" name="Income" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: "#16a34a", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="expense" name="Expenses" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: "#ef4444", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </>
          );
        })() : (
          <ResponsiveContainer width="100%" height={isMobile ? 160 : 210} minWidth={0} minHeight={isMobile ? 160 : 210}>
            <AreaChart data={activeData} margin={{ top: 10, right: isMobile ? 44 : 56, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={activeGrad} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.56} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" hide
                tick={{ fontSize: 10, fill: "#b0b8c8", fontFamily: "var(--font-sans)" }}
                axisLine={false} tickLine={false}
              />
              <YAxis orientation="right" axisLine={false} tickLine={false} width={isMobile ? 44 : 56}
                tickFormatter={v => {
                  const abs = Math.abs(v);
                  const sign = v < 0 ? "-" : "";
                  if (abs >= 1000000) return `${sign}${formatAmount(abs / 1000000, { maximumFractionDigits: 1 })}M`;
                  if (abs >= 1000) return `${sign}${formatAmount(abs / 1000, { maximumFractionDigits: 1 })}K`;
                  return fmtNW(v);
                }}
                tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
              />
              <CartesianGrid vertical={false} stroke={C.border2} strokeDasharray="3 3" />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload;
                const v = payload[0]?.value ?? 0;
                const fmtV = fmtNW(v);
                return (
                  <div style={{ background: C.white, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "8px 12px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{row?.d}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: v < 0 ? C.red : C.text }}>{fmtV}</div>
                  </div>
                );
              }} />
              <Area type="monotone" dataKey={activeKey} stroke={chartColor} strokeWidth={2} fill={`url(#${activeGrad})`} dot={false}
                activeDot={{ r: 5, fill: chartColor, stroke: "#fff", strokeWidth: 2 }}
              />
              {activeData && activeData.length > 0 && (
                <ReferenceDot
                  x={activeData[activeData.length - 1].d}
                  y={activeData[activeData.length - 1][activeKey]}
                  r={4}
                  fill={chartColor}
                  stroke={chartColor}
                  isFront={true}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
        </div>

        {/* Period tabs */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, padding: "8px 0 14px" }}>
          {["1W", "1M", "3M", "YTD", "ALL"].map(t => (
            <button key={t} type="button" onClick={() => setNwPeriod(t)}
              style={{
                padding: isMobile ? "4px 10px" : "4px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: isMobile ? 11 : 12, fontWeight: nwPeriod === t ? 700 : 400,
                background: nwPeriod === t ? C.strong : "transparent",
                color: nwPeriod === t ? C.onStrong : C.muted, transition: "all 0.15s"
              }}
            >{t}</button>
          ))}
        </div>
      </Card>

      {/* ── Data row below chart: left list + right breakdown ── */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12 }}>

        {/* LEFT — asset/spending list */}
        <Card style={{ flex: 1, padding: 0, overflow: "hidden", minWidth: 0 }}>
          {nwTab !== "spending" && (
            <>
              <div style={{ padding: "10px 18px 8px", borderBottom: `1px solid ${C.border2}` }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>ASSETS</span>
              </div>
              {loading && <div style={{ padding: 20, fontSize: 12, color: C.muted }}>Loading…</div>}
              {!loading && assetGroups.length === 0 && (
                <div style={{ padding: "24px 18px", textAlign: "center", color: C.muted, fontSize: 12 }}>
                  <TrendingUp size={20} style={{ color: C.muted, marginBottom: 6 }} /><div>No assets yet.</div>
                </div>
              )}
              {!loading && (assetGroups || []).map((group, gi) => {
                const pct = totalAssets > 0 ? Math.round(clampPercent((group.total / totalAssets) * 100)) : 0;
                return (
                  <div key={group.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 18px", background: C.bg, borderTop: gi > 0 ? `1px solid ${C.border2}` : "none" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.sub, textTransform: "uppercase", letterSpacing: "0.06em" }}>{group.label} ({pct}%)</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{fmtNW(group.total)}</span>
                    </div>
                    {(group.items || []).map(a => {
                      const ItemIcon = ASSET_TYPE_ICONS[a?.assetType || a?.type] || Gem;
                      const costRaw = getAssetCostBasis(a) || 0;
                      const currentVal = Number(a?.currentValue) || 0;
                      const gain = currentVal > 0 && costRaw > 0 ? (currentVal - costRaw) : (costRaw > 0 ? (currentVal - costRaw) : 0);
                      const gPct = (costRaw > 0) ? ((gain / costRaw) * 100).toFixed(1) : null;
                      const gainDisplay = a?.assetType === "crypto" && gain !== 0 ? fmtNW(gain) : (gain > 0 || gain < 0) ? fmtNW(gain) : "$0";
                      return (
                        <div key={a._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", borderTop: `1px solid ${C.border2}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <ItemIcon size={13} style={{ color: C.sub }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{a.name || a.symbol || "Asset"}</div>
                              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>
                                {a.quantity ? `${a.quantity} units` : ""}
                                {gPct !== null && <span style={{ color: gain >= 0 ? "#16a34a" : C.red, fontWeight: 600, marginLeft: 4 }}>{gain >= 0 ? "+" : ""}{gPct}%</span>}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmtNW(currentVal || 0)}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}

          {nwTab === "spending" && (
            <>
              <div style={{ padding: "10px 18px 8px", borderBottom: `1px solid ${C.border2}` }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>NET BY MONTH</span>
              </div>
              {!monthlyChart?.length
                ? <div style={{ padding: "24px 18px", textAlign: "center", color: C.muted, fontSize: 12 }}>No data yet.</div>
                : (() => {
                  const sorted2 = [...monthlyChart].sort((a, b) => (a.month || "").localeCompare(b.month || "")).slice(-6);
                  return (
                    <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {sorted2.map(m => {
                        const [y, mo] = (m.month || "").split("-").map(Number);
                        const label = (y && mo) ? new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : m.month;
                        const net = (m.income || 0) - (m.expense || 0);
                        return (
                          <div key={m.month} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 10, background: "transparent", border: `1px solid ${C.border2}` }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: C.muted }}>{label}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: net >= 0 ? C.greenMid : C.red }}>{net >= 0 ? "+" : ""}{fmtNW(net)}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              }
            </>
          )}
        </Card>

        {/* RIGHT — breakdown bars */}
        <Card style={{ width: isMobile ? "100%" : 260, flexShrink: 0, padding: "16px 18px" }}>
          {nwTab === "all" && (
            <>
              <BreakdownBars groups={assetGroups} total={totalAssets} colors={ASSET_COLORS} title="Assets" titleTotal={totalAssets} C={C} fmtNW={fmtNW} />
              <div style={{ borderTop: `1px solid ${C.border2}`, marginTop: 16, paddingTop: 16 }}>
                <BreakdownBars groups={spendGroups} total={totalSpend} colors={SPEND_COLORS} title="Spending" titleTotal={totalSpend} C={C} fmtNW={fmtNW} />
              </div>
            </>
          )}
          {nwTab === "investments" && (
            <BreakdownBars groups={assetGroups} total={totalAssets} colors={ASSET_COLORS} title="Investments" titleTotal={totalAssets} C={C} fmtNW={fmtNW} />
          )}
          {nwTab === "spending" && (
            <>
              <BreakdownBars groups={spendGroups.length ? spendGroups : [{ label: "Expenses", total: totalSpend }]} total={totalSpend} colors={SPEND_COLORS} title="Expenses" titleTotal={totalSpend} C={C} fmtNW={fmtNW} />
              <div style={{ borderTop: `1px solid ${C.border2}`, marginTop: 14, paddingTop: 14 }}>
                {/* Income summary */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Income</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.greenMid }}>{fmtNW(monthlyChart.reduce((s, m) => s + (m.income || 0), 0))}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Net savings</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: (monthlyChart.reduce((s, m) => s + (m.income || 0), 0) - totalSpend) >= 0 ? C.greenMid : C.red }}>
                    {fmtNW(monthlyChart.reduce((s, m) => s + (m.income || 0), 0) - totalSpend)}
                  </span>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─── Forecast Page ─────────────────────────────────────── */
/* ─── Forecast Page ─────────────────────────────────────── */

function HealthScoreWidget({ C, dashCalc, apiGoals, apiBudget, apiTransactions, setActiveNav, setShowAdvisor }) {
  const { user: dashboardUser } = useAuthContext();
  const preferredCurrency = getUserCurrency(dashboardUser);
  const formatAmount = (value, options = {}) => formatCurrencyAmount(value, preferredCurrency, options);
  const { score, label, color, p1, p2, p3, p4, p5, inc, sr, cv, discPct } = dashCalc;
  const [showBreakdown, setShowBreakdown] = useState(false);



  const insights = [
    {
      label: "Savings rate",
      value: Math.round(p1),
      barColor: p1 < 50 ? C.red : "#16a34a",
      insight: p1 >= 80 ? `Saving ${sr.toFixed(0)}% of income — excellent.`
        : p1 >= 50 ? `Savings rate ${sr.toFixed(0)}% — try to hit 20%+.`
          : `Only saving ${sr.toFixed(0)}% of income. Reduce expenses.`,
      status: p1 >= 80 ? "good" : p1 >= 50 ? "ok" : "bad",
    },
    {
      label: "Consistency",
      value: Math.round(p2),
      barColor: p2 < 50 ? C.red : "#16a34a",
      insight: p2 >= 80 ? "Monthly spending is very stable."
        : p2 >= 50 ? `Some variation in spending (CV ${cv.toFixed(0)}%).`
          : `High spending variance (CV ${cv.toFixed(0)}%). Erratic months hurt this.`,
      status: p2 >= 80 ? "good" : p2 >= 50 ? "ok" : "bad",
    },
    {
      label: apiBudget?.amount > 0 ? "Budget" : "Discipline",
      value: Math.round(p3),
      barColor: p3 < 50 ? C.red : "#16a34a",
      insight: apiBudget?.amount > 0
        ? (p3 >= 80
          ? `On track — ${formatAmount(Math.max(0, Math.round(apiBudget.amount - (dashCalc.exp || 0))), { maximumFractionDigits: 0 })} under budget.`
          : p3 >= 50
            ? `Spent ${formatAmount(Math.round(dashCalc.exp || 0), { maximumFractionDigits: 0 })} of ${formatAmount(apiBudget.amount, { maximumFractionDigits: 0 })} budget.`
            : `Over budget by ${formatAmount(Math.round((dashCalc.exp || 0) - apiBudget.amount), { maximumFractionDigits: 0 })}. Reduce spending.`)
        : (p3 >= 80 ? "Low discretionary spend — spending wisely."
          : p3 >= 50 ? `Dining/Entertainment/Shopping is ${discPct.toFixed(0)}% of income.`
            : `Overspending on Dining & Entertainment (${discPct.toFixed(0)}% of income).`),
      status: p3 >= 80 ? "good" : p3 >= 50 ? "ok" : "bad",
    },
    {
      label: "Goal progress",
      value: Math.round(p4),
      barColor: "#818cf8",
      insight: apiGoals.length === 0 ? "No goals set. Add goals to earn points."
        : p4 >= 70 ? "Good progress on your financial goals."
          : p4 >= 30 ? `${apiGoals.length} goal${apiGoals.length > 1 ? "s" : ""} active but progress is low.`
            : "Goals barely started. Small contributions help.",
      status: apiGoals.length === 0 ? "bad" : p4 >= 70 ? "good" : p4 >= 30 ? "ok" : "bad",
    },
    {
      label: "Income stability",
      value: Math.round(p5),
      barColor: "#16a34a",
      insight: "Recurring income sources improve this score.",
      status: p5 >= 70 ? "good" : "ok",
    },
  ];

  const statusIcon = (s) => s === "good" ? "✓" : s === "bad" ? "✕" : "~";
  const statusColor = (s) => s === "good" ? "#16a34a" : s === "bad" ? C.red : C.gold;

  const R = 28, cx = 36, cy = 36, sw = 5;
  const circ = 2 * Math.PI * R;
  const dash = (Math.min(score, 100) / 100) * circ;
  const hasTransactions = Array.isArray(apiTransactions) && apiTransactions.length > 0;
  const noData = !hasTransactions && inc === 0 && (dashCalc.exp || 0) === 0;

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px 14px", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="origin-section-label" style={{ fontSize: C.fSizeXs }}>Credit Score</span>
        {!noData && (
          <button type="button" onClick={() => setShowBreakdown(v => !v)}
            style={{ fontSize: 9, fontWeight: 700, color: showBreakdown ? C.muted : C.teal, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "inherit" }}>
            {showBreakdown ? "CLOSE ✕" : "BREAKDOWN ›"}
          </button>
        )}
      </div>

      {noData ? (
        <div style={{ textAlign: "center", padding: "16px 0", color: C.muted, fontSize: 11 }}>
          Add transactions to calculate your credit score.
        </div>
      ) : (
        <>
          {/* Ring + label */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <svg width={72} height={72} viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
              <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.border2} strokeWidth={sw} />
              <circle cx={cx} cy={cy} r={R} fill="none"
                stroke={color} strokeWidth={sw}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: "stroke-dasharray 0.8s ease" }}
              />
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: C.fSizeSm, fontWeight: C.fWeightSemi, fill: C.text, fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{score}</text>
              <text x={cx} y={cy + 13} textAnchor="middle"
                style={{ fontSize: 7.5, fill: C.muted, fontFamily: "var(--font-sans)" }}>/100</text>
            </svg>
            <div>
              <div style={{ fontSize: C.fSizeBase, fontWeight: C.fWeightSemi, color: C.text, marginBottom: 3 }}>{label}</div>
            </div>
          </div>

          {/* Pillar bars — always visible as thin summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: showBreakdown ? 10 : 7, marginBottom: 12 }}>
            {insights.map((p, i) => (
              <div key={i}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: C.fSizeXs, color: C.sub, width: 96, flexShrink: 0, fontWeight: C.fWeightReg }}>{p.label}</div>
                  <div style={{ flex: 1, height: 5, borderRadius: 99, background: C.border2, overflow: "hidden" }}>
                    <div style={{ width: `${p.value}%`, height: "100%", borderRadius: 99, background: p.barColor, transition: "width 0.8s ease" }} />
                  </div>
                  <div style={{ fontSize: C.fSizeXs, fontWeight: C.fWeightSemi, width: 26, textAlign: "right", flexShrink: 0, color: p.value < 50 ? C.red : C.text, fontVariantNumeric: "tabular-nums" }}>
                    {p.value}
                  </div>
                </div>
                {/* Insight line — only when breakdown open */}
                {showBreakdown && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 5, marginTop: 3, paddingBottom: 6, borderBottom: `1px solid ${C.border2}`, animation: "fadeUp 0.15s ease" }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: statusColor(p.status), flexShrink: 0 }}>{statusIcon(p.status)}</span>
                    <span style={{ fontSize: 10.5, color: C.sub, lineHeight: 1.4 }}>{p.insight}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}
