// ─── src/components/dashboard/DashboardContext.jsx ───────────
//
// FILE LOCATION:  src/components/dashboard/DashboardContext.jsx
//
// Path map (relative to THIS file):
//   services  →  ../../services/...
//   hooks     →  ../../hooks/...
//   constants →  ../../constants/routes
//   shared    →  ./dashboardShared   (same folder)
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

// ── Services (../../services/...) ───────────────────────────
import { dashboardService } from "../../services/dashboardService";
import { transactionService } from "../../services/transactionService";
import { aiService } from "../../services/aiService";

// ── Hooks (../../hooks/...) ─────────────────────────────────
import { useAuth } from "../../hooks/useAuth";
import { useAuthContext } from "../../hooks/useAuthContext";
import { getOccurrencesInMonth } from "./dashboardShared";

// ── Constants (../../constants/routes) ──────────────────────
import { ROUTES } from "../../constants/routes";

// ── Third-party ─────────────────────────────────────────────
import {
  TrendingUp, ReceiptText, BadgeDollarSign, Wallet,
  ShoppingCart, Utensils, Car,
} from "lucide-react";

// ── Shared (./dashboardShared — same folder) ─────────────────
import {
  CAT_COLORS, catToIcon, goalIcons,
  dedupToast, _activeToasts, aiInitial,
} from "./dashboardShared";
import { formatCurrencyAmount, getUserCurrency } from "../../utils/currency";

// ─────────────────────────────────────────────────────────────

const DashboardContext = createContext(null);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const clampPercent = (value, { min = 0, max = 100 } = {}) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return clamp(numeric, min, max);
};
const sortTransactionsNewestFirst = (items = []) => (
  [...items].sort((a, b) => {
    const dateDiff = new Date(b?.date || 0) - new Date(a?.date || 0);
    if (dateDiff !== 0) return dateDiff;
    const createdDiff = new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
    if (createdDiff !== 0) return createdDiff;
    return String(b?._id || "").localeCompare(String(a?._id || ""));
  })
);

export function DashboardProvider({ children }) {
  const { user, refreshUser, updateUser } = useAuthContext();
  const { logout } = useAuth();
  const navigate = useNavigate();

  // ── Plan / limits ───────────────────────────────────────
  const isPro          = String(user?.subscriptionTier || "").toLowerCase() === "pro";
  const txLimitReached = !isPro && (user?.transactionsUsed ?? 0) >= 10;
  const aiLimitReached = !isPro && (user?.aiQueriesUsed   ?? 0) >= 5;
  const usageResetDate = user?.usageResetDate ? new Date(user.usageResetDate) : null;
  const txRemaining    = isPro ? Infinity : Math.max(0, 10 - (user?.transactionsUsed ?? 0));
  const aiRemaining    = isPro ? Infinity : Math.max(0, 5  - (user?.aiQueriesUsed   ?? 0));
  const resetLabel     = usageResetDate
    ? usageResetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  // ── UI state ────────────────────────────────────────────
  const [activeNav,      setActiveNav]      = useState("dashboard");
  const [activeTab,      setActiveTab]      = useState("YTD");
  const [dashSubTab,     setDashSubTab]     = useState("overview");
  const [globalSelectedTxId, setGlobalSelectedTxId] = useState(null);
  const [showForecast,   setShowForecast]   = useState(false);
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [sideCollapsed,  setSideCollapsed]  = useState(false);
  const [isMobile,       setIsMobile]       = useState(false);
  const [isTablet,       setIsTablet]       = useState(false);
  const [showSearch,     setShowSearch]     = useState(false);
  const [showAdvisor,    setShowAdvisor]    = useState(false);
  const [advisorMessages,setAdvisorMessages]= useState([]);
  const [addModalOpen,   setAddModalOpen]   = useState(false);
  const [csvFile,        setCsvFile]        = useState(null);
  const [isExporting,    setIsExporting]    = useState(false);
  const fileInputRef = useRef(null);
  const msgsEndRef   = useRef(null);

  // ── AI Copilot (inline) ─────────────────────────────────
  const [messages,  setMessages]  = useState(aiInitial);
  const [chatInput, setChatInput] = useState("");
  const [isTyping,  setIsTyping]  = useState(false);
  const copilotSessionRef = useRef(null);

  // ── AI Advisor sessions ─────────────────────────────────
  const [advisorSessions,         setAdvisorSessions]         = useState([]);
  const [advisorActiveSession,    setAdvisorActiveSession]    = useState(null);
  const [advisorSidebarOpen,      setAdvisorSidebarOpen]      = useState(true);
  const [advisorSessionsLoading,  setAdvisorSessionsLoading]  = useState(false);

  // ── Profile / Notifications ─────────────────────────────
  const [profileOpen,   setProfileOpen]   = useState(false);
  const profileRef      = useRef(null);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const notifRef        = useRef(null);
  const [notifications, setNotifications] = useState([]);

  const pushNotif = (type, message) => {
    const notify = dedupToast[type] || dedupToast.info;
    const duration = isMobile ? 1200 : 1800;
    notify(message, { id: message, duration });
  };

  // ── Global Notification Listener ────────────────────────
  useEffect(() => {
    const handleGlobalNotif = (e) => {
      const { type, message } = e.detail;
      setNotifications(prev => {
        if (prev.length > 0 && prev[0].message === message && (Date.now() - prev[0].time.getTime()) < 2000) {
          return prev;
        }
        return [{
          id: Date.now() + Math.random(),
          type, message,
          time: new Date(),
          read: false,
        }, ...prev].slice(0, 100);
      });
    };
    window.addEventListener("fp-notification", handleGlobalNotif);
    return () => window.removeEventListener("fp-notification", handleGlobalNotif);
  }, []);

  // ── Responsive detection ────────────────────────────────
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1100);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Close notification dropdown on outside click ────────
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Close profile dropdown ──────────────────────────────
  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (e) => {
      if (!profileRef.current) return;
      if (profileRef.current.contains(e.target)) return;
      setProfileOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === "Escape") setProfileOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

  // ── React Query ─────────────────────────────────────────
  const queryClient = useQueryClient();

  const prevUserIdRef = useRef(null);
  useEffect(() => {
    const prevId = prevUserIdRef.current;
    const currId = user?._id ?? null;
    if (prevId !== null && prevId !== currId) queryClient.clear();
    prevUserIdRef.current = currId;
  }, [user?._id, queryClient]);

  const { data: dashboardRes } = useQuery({
    queryKey: ["dashboard", user?._id],
    queryFn:  () => dashboardService.getDashboard().then((r) => r.data),
    enabled:  !!user?._id,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: customizationRes } = useQuery({
    queryKey: ["forecast-customizations", user?._id],
    queryFn: () => dashboardService.getForecastCustomizations().then((r) => r.data),
    enabled: !!user?._id,
  });

  const { data: txRes } = useQuery({
    queryKey: ["transactions", user?._id],
    queryFn:  () => transactionService.getList({ limit: 500 }).then((r) => r.data),
    enabled:  !!user?._id,
    staleTime: 0,
    refetchOnMount: true,
  });

  const csvImportMutation = useMutation({
    mutationFn: (payload) => {
      const file  = payload?.file ?? payload;
      const limit = payload?.limit;
      return transactionService.importCSV(file, limit);
    },
    onSuccess: (res) => {
      const count = res.data?.transactions?.length ?? res.data?.message?.match(/\d+/)?.[0] ?? 0;
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setAddModalOpen(false);
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      refreshUser?.();
      const msg = res.data?.message || `${count} transactions imported`;
      dedupToast.success(msg, { duration: 1200 });
      pushNotif("success", msg);
    },
    onError: (err) => {
      if (err.response?.status === 403) {
        pushNotif("error", err.response?.data?.message || "Free limit reached");
        dedupToast.error(err.response?.data?.message || "Free limit reached", {
          action: { label: "Upgrade to Pro", onClick: () => navigate(ROUTES.SUBSCRIPTION) },
        });
      } else {
        pushNotif("error", err.response?.data?.message || "CSV import failed");
        dedupToast.error(err.response?.data?.message || "CSV import failed");
      }
    },
  });

  // ── Derived dashboard data ──────────────────────────────
  const dashboard         = dashboardRes?.dashboard || {};
  const spendingSettings  = dashboard.spendingSettings || {};
  const customizations    = customizationRes?.customizations || {};
  const summary           = dashboard.summary         || {};
  const categoryBreakdown = dashboard.categoryBreakdown || [];
  const monthlyChart      = dashboard.monthlyChart    || [];
  const apiGoals          = dashboard.goals           || [];
  const apiBudget         = dashboard.budget          || null;
  const apiTransactions   = txRes?.transactions       || [];

  // ── Stat cards ──────────────────────────────────────────
  const statCards = useMemo(() => {
    const preferredCurrency = getUserCurrency(user);
    const fmt = (n) => formatCurrencyAmount(Number(n || 0), preferredCurrency, { maximumFractionDigits: 0 });
    const inc     = summary.totalIncome ?? 0;
    const net     = summary.netBalance  ?? (inc - (summary.totalExpense ?? 0));
    const localSR = inc > 0 ? Math.round(clampPercent((net / inc) * 100, { min: -100, max: 100 })) : 0;
    return [
      { label:"Total Income",   value:fmt(summary.totalIncome),  change:"—", up:true,  icon:TrendingUp,     accent:"#374151", accentBg:"#f9fafb" },
      { label:"Total Expenses", value:fmt(summary.totalExpense), change:"—", up:false, icon:ReceiptText,    accent:"#374151", accentBg:"#f9fafb" },
      { label:"Net Savings",    value:fmt(summary.netBalance),   change:"—", up:(summary.netBalance||0)>=0, icon:BadgeDollarSign, accent:"#374151", accentBg:"#f9fafb" },
      { label:"Savings Rate",   value:`${localSR}%`,             change:"—", up:localSR>=0, icon:Wallet,    accent:"#374151", accentBg:"#f9fafb" },
    ];
  }, [summary.totalIncome, summary.totalExpense, summary.netBalance]);

  // ── dashCalc ────────────────────────────────────────────
  const dashCalc = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const inc = summary.totalIncome  ?? 0;
    const exp = summary.totalExpense ?? 0;
    const net = summary.netBalance   ?? (inc - exp);
    const srRaw = inc > 0 ? (net / inc) * 100 : 0;
    const sr = clampPercent(srRaw, { min: -100, max: 100 });
    const sorted = [...monthlyChart].sort((a,b) => (a.month||"").localeCompare(b.month||""));
    const recent = sorted.slice(-3);
    const monthlyExp = recent.map(m => m.expense || 0);
    const mean = monthlyExp.length > 0 ? monthlyExp.reduce((s,v) => s+v, 0) / monthlyExp.length : 0;
    const variance = monthlyExp.length > 1
      ? monthlyExp.reduce((s,v) => s + Math.pow(v-mean, 2), 0) / monthlyExp.length
      : 0;
    const cv = clampPercent(mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0);
    const discCats  = ["Dining","Entertainment","Shopping"];
    const discSpend = apiTransactions
      .filter((t) => {
        const isExp = t.type === "expense" || t.type === "debit" || t.type === "withdrawal" || t.type === "payment";
        if (!isExp || !discCats.includes(t.category)) return false;
        if (!t.date) return false;
        const txDate = new Date(t.date);
        return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
      })
      .reduce((s,t) => s + Math.abs(t.amount||0), 0);
    const discPct = clampPercent(inc > 0 ? (discSpend / inc) * 100 : 0);
    const goalProgress = apiGoals.length > 0
      ? clampPercent(apiGoals.reduce((s,g) => {
          const pct = g.targetAmount > 0 ? clamp((g.currentAmount||0)/g.targetAmount, 0, 1) : 0;
          return s + pct;
        }, 0) / apiGoals.length * 100)
      : 0;
    const incomeMonths    = sorted.filter(m => (m.income||0) > 0).length;
    const totalMonths     = sorted.length || 1;
    const incomeStability = clampPercent((incomeMonths / totalMonths) * 100);
    const p1 = clampPercent(sr * 5);
    const p2 = clampPercent(100 - cv);
    const p3 = apiBudget?.amount > 0
      ? clampPercent((1 - (exp - apiBudget.amount) / apiBudget.amount) * 100)
      : clampPercent(100 - discPct * 2);
    const p4 = goalProgress;
    const p5 = incomeStability;
    const score = clampPercent(Math.round((p1*0.30) + (p2*0.20) + (p3*0.20) + (p4*0.15) + (p5*0.15)));
    const label = score>=80?"Excellent":score>=60?"Good":score>=40?"Fair":"Needs Work";
    const color = score>=80?"#16a34a":score>=60?"#0d9488":score>=40?"#d97706":"#ef4444";
    return { score, label, color, p1, p2, p3, p4, p5, inc, exp, net, sr, cv, discPct };
  }, [summary, monthlyChart, apiTransactions, apiGoals, apiBudget]);

  // ── Client-side forecast ────────────────────────────────
  const clientForecast = useMemo(() => {
    const sorted = [...monthlyChart].sort((a,b) => (a.month||"").localeCompare(b.month||""));
    const recent = sorted.slice(-3);
    if (!recent.length) return { predictedIncome:0, predictedExpense:0, predictedSavings:0, confidence:"low" };
    const weights = recent.length===3?[1,2,3]:recent.length===2?[1,2]:[1];
    const wTotal  = weights.reduce((s,w) => s+w, 0);
    const predictedIncome  = Math.round(recent.reduce((s,m,i) => s+(m.income ||0)*weights[i],0)/wTotal);
    const predictedExpense = Math.round(recent.reduce((s,m,i) => s+(m.expense||0)*weights[i],0)/wTotal);
    const predictedSavings = predictedIncome - predictedExpense;
    const confidence = sorted.length>=3?"high":sorted.length>=2?"medium":"low";
    return { predictedIncome, predictedExpense, predictedSavings, confidence };
  }, [monthlyChart]);

  const effectiveForecast = dashboard.forecast || clientForecast;

  // ── Upcoming / Recurring ────────────────────────────────
  const upcomingTransactions = useMemo(() => {
    if (!apiTransactions || !spendingSettings) return [];
    
    const recurringSettings = spendingSettings.recurringSettings || {};
    const showInferred = recurringSettings.showInferredRecurring ?? true;

    const explicit = apiTransactions.filter((tx) => tx.isRecurring);
    let inferred = [];
    
    if (showInferred) {
      const candidates = new Map();
      apiTransactions.forEach(tx => {
        if (tx.isRecurring || !tx.merchant) return;
        const amountRound = Math.round(Math.abs(tx.amount));
        const key = `${tx.type}:${tx.merchant}:${amountRound}`;
        if (!candidates.has(key)) candidates.set(key, []);
        candidates.get(key).push(tx);
      });
      candidates.forEach(txs => {
        if (txs.length >= 3) {
          const recent = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          inferred.push({ ...recent, isInferred: true });
        }
      });
    }

    const allRecurring = [...explicit, ...inferred];
    const merged = new Map();
    allRecurring.forEach(tx => {
      const merchant = tx.merchant || tx.category || "Transaction";
      const key = `${tx.type}:${merchant}:${tx.category || "Other"}:${Math.abs(tx.amount).toFixed(2)}`;
      if (!merged.has(key) || new Date(tx.date) > new Date(merged.get(key).date)) {
        merged.set(key, tx);
      }
    });

    const occurrences = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const next30Days = new Date(today);
    next30Days.setDate(next30Days.getDate() + 30);

    // Project for this month and next month
    const monthsToProject = [
      new Date(now.getFullYear(), now.getMonth(), 1),
      new Date(now.getFullYear(), now.getMonth() + 1, 1),
    ];

    [...merged.values()].forEach((tx) => {
      monthsToProject.forEach(monthDate => {
        const dates = getOccurrencesInMonth(tx, monthDate);
        dates.forEach((date) => {
          if (date >= today && date <= next30Days) {
            occurrences.push({ ...tx, date: date.toISOString() });
          }
        });
      });
    });

    return occurrences.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [apiTransactions, spendingSettings]);

  // ── Net worth data ──────────────────────────────────────
  const netWorthData = useMemo(() => {
    const sorted = [...monthlyChart].sort((a,b) => (a.month||"").localeCompare(b.month||""));
    let cum = 0;
    return sorted.map(m => {
      cum += (m.income||0) - (m.expense||0);
      const [y,mo] = (m.month||"").split("-").map(Number);
      const d = (y&&mo) ? new Date(y,mo-1,1).toLocaleDateString("en-US",{month:"short",year:"2-digit"}) : m.month;
      return { d, v: Math.round(cum) };
    });
  }, [monthlyChart]);

  // ── Cash flow data ──────────────────────────────────────
  const _monthLabel = (m) => {
    if (!m) return "";
    const [y,mo] = m.split("-").map(Number);
    return new Date(y,mo-1,1).toLocaleDateString("en-US",{month:"short"});
  };

  const cashFlowData = useMemo(() => {
    const now = new Date();
    const toLocalKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (activeTab === "1W") {
      const days = {};
      const dayMap = {};
      const todayMidnight = new Date(now);
      todayMidnight.setHours(0, 0, 0, 0);
      for (let i=6;i>=0;i--) {
        const d = new Date(now); d.setDate(now.getDate()-i);
        d.setHours(0, 0, 0, 0);
        const k = toLocalKey(d);
        const label = d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
        days[label] = { m:label, income:0, expense:0 };
        dayMap[k] = label;
      }
      (apiTransactions||[]).forEach(t => {
        if (!t.date) return;
        const d = new Date(t.date);
        if (Number.isNaN(d.getTime())) return;
        d.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((todayMidnight - d)/86400000);
        if (diffDays>6) return;
        if (diffDays < 0) return;
        const label = dayMap[toLocalKey(d)];
        if (!label || !days[label]) return;
        if (t.type==="income")  days[label].income  += Math.abs(t.amount)||0;
        if (t.type==="expense") days[label].expense += Math.abs(t.amount)||0;
      });
      return Object.values(days);
    }
    if (activeTab === "1M") {
      const days = {};
      const daysInMonth = new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
      for (let i=1;i<=daysInMonth;i++) days[String(i)] = { m:String(i), income:0, expense:0 };
      (apiTransactions||[]).forEach(t => {
        if (!t.date) return;
        const d = new Date(t.date);
        if (d.getFullYear()!==now.getFullYear()||d.getMonth()!==now.getMonth()) return;
        const key = String(d.getDate());
        if (days[key]) {
          if (t.type==="income")  days[key].income  += Math.abs(t.amount)||0;
          if (t.type==="expense") days[key].expense += Math.abs(t.amount)||0;
        }
      });
      return Object.values(days).filter(d => parseInt(d.m)<=now.getDate());
    }
    if (activeTab === "3M") {
      const sorted = (monthlyChart||[]).slice().sort((a,b)=>(a.month||"").localeCompare(b.month||""));
      const last3 = sorted.slice(-3);
      while (last3.length<3) {
        const offset = 3-last3.length;
        const d = new Date(now.getFullYear(),now.getMonth()-offset,1);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        if (!last3.find(m=>m.month===key)) last3.unshift({month:key,income:0,expense:0});
        else break;
      }
      return last3.map(m=>({m:_monthLabel(m.month),income:m.income||0,expense:m.expense||0}));
    }
    if (activeTab === "YTD") {
      const curYear=now.getFullYear(), curMonth=now.getMonth()+1;
      return (monthlyChart||[])
        .filter(m=>{if(!m.month)return false;const[y,mo]=m.month.split("-").map(Number);return y===curYear&&mo<=curMonth;})
        .sort((a,b)=>(a.month||"").localeCompare(b.month||""))
        .map(m=>({m:_monthLabel(m.month),income:m.income||0,expense:m.expense||0}));
    }
    const allSorted = (monthlyChart||[]).slice().sort((a,b)=>(a.month||"").localeCompare(b.month||""));
    while (allSorted.length<3) {
      const offset = 3-allSorted.length;
      const d = new Date(now.getFullYear(),now.getMonth()-offset,1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (!allSorted.find(m=>m.month===key)) allSorted.unshift({month:key,income:0,expense:0});
      else break;
    }
    return allSorted.map(m=>({m:_monthLabel(m.month),income:m.income||0,expense:m.expense||0}));
  }, [activeTab, monthlyChart, apiTransactions]);

  // ── Category pie data ───────────────────────────────────
  const categoryData = useMemo(() => {
    const totalAmt = categoryBreakdown.reduce((s,c)=>s+(c.amount||0),0)||1;
    return categoryBreakdown.map((c,i) => ({
      name: c.category||"Other",
      value: Math.round(((c.amount||0)/totalAmt)*1000)/10,
      color: CAT_COLORS[i%CAT_COLORS.length],
      amount: Math.round(c.amount||0),
    }));
  }, [categoryBreakdown]);

  // ── Goals display data ──────────────────────────────────
  const goals = useMemo(() => {
    return apiGoals.map((g,i) => ({
      title:   g.title,
      current: g.currentAmount ?? 0,
      target:  g.targetAmount  ?? 1,
      color:   CAT_COLORS[i%CAT_COLORS.length],
      icon:    goalIcons[i%goalIcons.length],
    }));
  }, [apiGoals]);

  // ── Transactions display data ───────────────────────────
  const transactions = useMemo(() => {
    return sortTransactionsNewestFirst(apiTransactions).map((t,i) => {
      const amt  = t.type==="income" ? t.amount : -t.amount;
      const Icon = catToIcon[t.category] || BadgeDollarSign;
      return {
        id:       t._id,
        merchant: t.merchant||t.category||(t.type==="income"?"Income":"Expense"),
        category: t.category||t.type,
        amount:   amt,
        date:     new Date(t.date).toLocaleDateString("en-US",{day:"numeric",month:"short"}),
        icon:     Icon,
        color:    CAT_COLORS[i%CAT_COLORS.length],
      };
    });
  }, [apiTransactions]);

  // ── Spend merchants (top 3) ─────────────────────────────
  const spendMerchants = useMemo(() => {
    const byName = {};
    apiTransactions.filter(t=>t.type==="expense"&&(t.merchant||t.category)).forEach(t=>{
      const n = t.merchant||t.category;
      byName[n] = (byName[n]||0)+1;
    });
    const arr   = Object.entries(byName).sort((a,b)=>b[1]-a[1]).slice(0,3);
    const icons = [ShoppingCart,Utensils,Car];
    return arr.map(([name,amount],i)=>({name,amount,icon:icons[i],color:CAT_COLORS[i]}));
  }, [apiTransactions]);

  // ── Reset on user switch ────────────────────────────────
  useEffect(() => {
    setMessages(aiInitial);
    setAdvisorMessages([]);
    setChatInput("");
    setActiveNav("dashboard");
    setActiveTab("1M");
    setDashSubTab("overview");
    setShowForecast(false);
    setNotifications([]);
    setNotifOpen(false);
    setProfileOpen(false);
    setAddModalOpen(false);
    setAdvisorSessions([]);
    setAdvisorActiveSession(null);
    copilotSessionRef.current = null;
    _activeToasts.clear();
  }, [user?._id]);

  // ── Load AI Advisor sessions ────────────────────────────
  useEffect(() => {
    if (!user?._id) return;

    if (user?.memoryAssistEnabled === false) {
      setAdvisorSessions([]);
      setAdvisorActiveSession(null);
      return;
    }

    const load = async () => {
      setAdvisorSessionsLoading(true);
      try {
        const res = await aiService.getSessions("ai_advisor");
        setAdvisorSessions(res.data.sessions || []);
      } catch (e) { console.error("Failed to load AI Advisor sessions", e); }
      finally { setAdvisorSessionsLoading(false); }
    };
    load();
  }, [user?._id, user?.memoryAssistEnabled]);

  // ── Auto-scroll copilot ─────────────────────────────────
  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, isTyping]);

  // ── Export CSV ──────────────────────────────────────────
  const escapeCsvValue = (value) => {
    if (value == null) return "";
    const str = String(value);
    if (str.includes('"')) return `"${str.replace(/"/g, '""')}"`;
    if (/[",\n]/.test(str)) return `"${str}"`;
    return str;
  };

  const handleExportData = async () => {
    if (!isPro) {
      const msg = "Export is a Pro feature. Upgrade to Pro to unlock.";
      dedupToast.error(msg, {
        action: { label:"Upgrade", onClick:()=>navigate(ROUTES.SUBSCRIPTION) },
      });
      pushNotif?.("warning", msg);
      return;
    }
    try {
      setIsExporting(true);
      const res = await dashboardService.exportData();
      const data = res.data?.data;
      if (!data) {
        throw new Error("No data returned from export endpoint");
      }

      const fmtNum  = (n) => (n==null||n===""||isNaN(Number(n)))?"":Number(n).toFixed(2);
      const fmtDate = (d) => { try{return d?new Date(d).toISOString().slice(0,10):""}catch{return""} };
      const buildSection = (title,header,rows) => {
        const r=[[title],header]; rows.forEach(row=>r.push(row)); r.push([]); return r;
      };
      const rows=[];
      rows.push(["FinPilot Dashboard Export"]);
      rows.push(["Generated At", data.user?.exportDate ? new Date(data.user.exportDate).toLocaleString("en-US",{dateStyle:"long",timeStyle:"short"}) : new Date().toLocaleString("en-US",{dateStyle:"long",timeStyle:"short"})]);
      rows.push(["User",data.user?.name||"","Plan",data.user?.plan||"Free"]);
      rows.push([]);

      const s = data.summary || {};
      rows.push(...buildSection("SUMMARY",["Metric","Value"],[
        ["Total Income",  `$${fmtNum(s.totalIncome)}`],
        ["Total Expenses",`$${fmtNum(s.totalExpense)}`],
        ["Net Balance",   `$${fmtNum(s.netBalance)}`],
        ["Savings Rate",  `${s.savingsPercent}%`],
        ["Financial Score",data.financialScore?.score??"N/A"],
      ]));

      rows.push(...buildSection("SPENDING BY CATEGORY",["Category","Amount ($)","% of Total"],
        (data.categoryBreakdown||[]).map(c=>[c.category||"Other",fmtNum(c.amount),c.percent!=null?`${Number(c.percent).toFixed(1)}%`:""])
      ));

      rows.push(...buildSection("MONTHLY TREND",["Month","Income ($)","Expenses ($)","Net ($)"],
        (data.monthlyChart||[]).map(m=>[m.month||"",fmtNum(m.income),fmtNum(m.expense),fmtNum(m.net)])
      ));

      rows.push(...buildSection("FORECAST",["Metric","Value"],[
        ["Predicted Income", `$${fmtNum(data.forecast?.predictedIncome)}`],
        ["Predicted Expense", `$${fmtNum(data.forecast?.predictedExpense)}`],
        ["Predicted Savings", `$${fmtNum(data.forecast?.predictedSavings)}`],
        ["Confidence", data.forecast?.confidence || "N/A"],
      ]));

      rows.push(...buildSection("SAVINGS GOALS",
        ["Title","Target ($)","Saved ($)","Progress %","Remaining ($)","Deadline","Days Left","Monthly Needed ($)"],
        (data.goals||[]).map(goal=>{
          const pct=goal.progressPercent??0;
          const remaining=Math.max(0,(goal.targetAmount||0)-(goal.currentAmount||0));
          return[goal.title||"",fmtNum(goal.targetAmount),fmtNum(goal.currentAmount),`${pct}%`,fmtNum(remaining),fmtDate(goal.deadline),goal.daysRemaining??"",fmtNum(goal.monthlySavingNeeded)];
        })
      ));

      rows.push(...buildSection("TRANSACTIONS",["Date","Type","Amount ($)","Category","Merchant","Notes"],
        (data.transactions||[]).map(t=>{
          const signedAmt=t.type==="income"?Number(t.amount).toFixed(2):(-Math.abs(Number(t.amount))).toFixed(2);
          return[fmtDate(t.date),t.type?t.type.charAt(0).toUpperCase()+t.type.slice(1):"",signedAmt,t.category||"",t.merchant||"",t.notes||""];
        })
      ));

      const csv="\uFEFF"+rows.map(row=>row.map(escapeCsvValue).join(",")).join("\r\n");
      const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=url;
      link.setAttribute("download",`finpilot-export-${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);

      const txCount=(data.transactions||[]).length;
      const msg=`Exported ${txCount} transaction${txCount!==1?"s":""} + summary data`;
      dedupToast.success(msg,{duration:1500});
      pushNotif("success",msg);
    } catch(err) {
      console.error("Export error:",err);
      if (err.response?.status === 403) {
        dedupToast.error("Export is a Pro feature. Upgrade to unlock.", {
          action: { label:"Upgrade", onClick:()=>navigate(ROUTES.SUBSCRIPTION) },
        });
      } else {
        dedupToast.error("Export failed — please try again.",{duration:1500});
      }
      pushNotif("error","Dashboard export failed");
    } finally { setIsExporting(false); }
  };

  // ── Context value ───────────────────────────────────────
  const value = {
    // auth
    user, refreshUser, updateUser, logout, isPro,
    txLimitReached, aiLimitReached, txRemaining, aiRemaining, resetLabel,
    // navigation
    navigate, activeNav, setActiveNav,
    activeTab, setActiveTab,
    dashSubTab, setDashSubTab,
    globalSelectedTxId, setGlobalSelectedTxId,
    showForecast, setShowForecast,
    // layout
    isMobile, isTablet,
    mobileOpen, setMobileOpen,
    sideCollapsed, setSideCollapsed,
    showSearch, setShowSearch,
    // advisor / copilot
    showAdvisor, setShowAdvisor,
    advisorMessages, setAdvisorMessages,
    advisorSessions, setAdvisorSessions,
    advisorActiveSession, setAdvisorActiveSession,
    advisorSidebarOpen, setAdvisorSidebarOpen,
    advisorSessionsLoading, setAdvisorSessionsLoading,
    messages, setMessages,
    chatInput, setChatInput,
    isTyping, setIsTyping,
    copilotSessionRef, msgsEndRef,
    // modals
    addModalOpen, setAddModalOpen,
    csvFile, setCsvFile,
    fileInputRef, isExporting,
    // profile / notifs
    profileOpen, setProfileOpen, profileRef,
    notifOpen, setNotifOpen, notifRef,
    notifications, setNotifications, pushNotif,
    // queries
    queryClient, dashboardRes, csvImportMutation,
    // raw data
    dashboard, summary, categoryBreakdown, monthlyChart,
    apiGoals, apiBudget, apiTransactions,
    // computed
    statCards, dashCalc, effectiveForecast,
    netWorthData, cashFlowData, categoryData,
    goals, transactions, spendMerchants,
    upcomingTransactions, spendingSettings, customizations,
    // actions
    handleExportData,
    // services (passed through for tabs)
    aiService, transactionService,
    ROUTES,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside <DashboardProvider>");
  return ctx;
}
