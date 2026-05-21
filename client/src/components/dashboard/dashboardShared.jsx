// ─── src/components/dashboard/dashboardShared.js ─────────────
// Shared design tokens, helpers, and reusable components
// used across all dashboard tab files.
// No path imports needed here — only third-party packages.
// ─────────────────────────────────────────────────────────────

import { toast } from "sonner";
import { formatCurrencyAmount } from "../../utils/currency";
import {
  Lock,
  ShoppingCart, BadgeDollarSign, Bolt, Bus, Utensils,
  TrendingUp, HeartPulse, GraduationCap, Building2,
  Gem, Car, ReceiptText, HousePlus, Sparkles, Plane,
  Target, PiggyBank,
  House, ChartPie, SlidersHorizontal, Gift, Wand2,
  Wallet, Briefcase, BarChart3, LineChart, Award, CreditCard, Activity,
} from "lucide-react";

/* ─── Toast dedup helper ─────────────────────────────────
   Wraps sonner so the same message can never appear more than
   once at a time. Uses the message text as the toast ID.      */
export const _activeToasts = new Set();
export const formatAmount = (val, opts = { maximumFractionDigits: 0 }) => {
  return formatCurrencyAmount(val || 0, "USD", opts);
};

export const dedupToast = {
  success: (msg, opts = {}) => {
    const id = opts.id ?? msg;
    if (_activeToasts.has(id)) return;
    _activeToasts.add(id);
    toast.success(msg, {
      duration: 1500, ...opts, id,
      onDismiss:   () => { _activeToasts.delete(id); opts.onDismiss?.(); },
      onAutoClose: () => { _activeToasts.delete(id); opts.onAutoClose?.(); },
    });
    if (!opts.skipDrawer) window.dispatchEvent(new CustomEvent("fp-notification", { detail: { type: "success", message: msg } }));
  },
  error: (msg, opts = {}) => {
    const id = opts.id ?? msg;
    if (_activeToasts.has(id)) return;
    _activeToasts.add(id);
    toast.error(msg, {
      duration: 1500, ...opts, id,
      onDismiss:   () => { _activeToasts.delete(id); opts.onDismiss?.(); },
      onAutoClose: () => { _activeToasts.delete(id); opts.onAutoClose?.(); },
    });
    if (!opts.skipDrawer) window.dispatchEvent(new CustomEvent("fp-notification", { detail: { type: "error", message: msg } }));
  },
  info: (msg, opts = {}) => {
    const id = opts.id ?? msg;
    if (_activeToasts.has(id)) return;
    _activeToasts.add(id);
    toast.info(msg, {
      duration: 1500, ...opts, id,
      onDismiss:   () => { _activeToasts.delete(id); opts.onDismiss?.(); },
      onAutoClose: () => { _activeToasts.delete(id); opts.onAutoClose?.(); },
    });
    if (!opts.skipDrawer) window.dispatchEvent(new CustomEvent("fp-notification", { detail: { type: "info", message: msg } }));
  },
  warning: (msg, opts = {}) => {
    const id = opts.id ?? msg;
    if (_activeToasts.has(id)) return;
    _activeToasts.add(id);
    toast.warning(msg, {
      duration: 1500, ...opts, id,
      onDismiss:   () => { _activeToasts.delete(id); opts.onDismiss?.(); },
      onAutoClose: () => { _activeToasts.delete(id); opts.onAutoClose?.(); },
    });
    if (!opts.skipDrawer) window.dispatchEvent(new CustomEvent("fp-notification", { detail: { type: "warning", message: msg } }));
  },
};

/* ─── Design Tokens — Dynamic Theme (Light / Dark) ──────── */
export const C = {
  bg:       "var(--bg-primary)",
  white:    "var(--bg-card)",
  border:   "var(--border-default)",
  border2:  "var(--border-subtle)",
  text:     "var(--text-primary)",
  textInverse: "var(--text-inverse)",
  strong:   "var(--text-primary)",
  onStrong: "var(--text-on-strong)",
  sub:      "var(--text-secondary)",
  muted:    "var(--text-muted)",
  green:    "#1A8B5C",
  greenMid: "#0D7377",
  greenLt:  "#86efac",
  greenBg:  "rgba(26,139,92,0.10)",
  greenBg2: "rgba(13,115,119,0.10)",
  teal:     "#0D7377",
  tealLt:   "#5eead4",
  blue:     "#5A8BB8",
  red:      "#EF4444",
  redBg:    "rgba(239,68,68,0.10)",
  gold:     "#D4A853",
  goldBg:   "rgba(212,168,83,0.10)",
  indigo:   "#7B8BA0",
  pink:     "#f472b6",
  amber:    "#fcd34d",
  sidebar:  "var(--bg-card)",
  sidebarT: "var(--text-primary)",
  sidebarM: "var(--text-secondary)",
  sidebarB: "var(--border-default)",
  sidebarA: "rgba(13,115,119,0.10)",

  /* Typography */
  fSizeXs: "var(--font-size-xs)",
  fSizeSm: "var(--font-size-sm)",
  fSizeBase: "var(--font-size-base)",
  fSizeLg: "var(--font-size-lg)",
  fSizeXl: "var(--font-size-xl)",
  
  fWeightReg: "var(--font-weight-regular)",
  fWeightMed: "var(--font-weight-medium)",
  fWeightSemi: "var(--font-weight-semibold)",

  lhTight: "var(--leading-tight)",
  lhBase: "var(--leading-normal)",
  lhRelax: "var(--leading-relaxed)",

  /* Font Family */
  fFamilySans: "var(--font-sans)",
};

/* ─── Category/transaction icon & color map ───────────────── */
export const CAT_COLORS = [
  "#0d9488","#6366f1","#d97706","#ec4899",
  "#4ade80","#d1d5db","#3b82f6","#c07a3a",
];

export const catToIcon = {
  Groceries:     ShoppingCart,
  Income:        BadgeDollarSign,
  Subscriptions: Bolt,
  Transport:     Bus,
  Dining:        Utensils,
  Salary:        BadgeDollarSign,
  Freelance:     TrendingUp,
  Investment:    TrendingUp,
  "Other Income":BadgeDollarSign,
  Shopping:      ShoppingCart,
  Health:        HeartPulse,
  Education:     GraduationCap,
  Utilities:     Bolt,
  Rent:          Building2,
  Entertainment: Gem,
  Travel:        Car,
  "Other Expense": ReceiptText,
  ChildcareEducation: GraduationCap,
  DrinksDining:  Utensils,
  AutoTransport: Car,
  Financial:     TrendingUp,
  Healthcare:    HeartPulse,
  Household:     HousePlus,
  PersonalCare:  Sparkles,
  TravelVacation: Plane,
  Taxes:         ReceiptText,
  Other:         ReceiptText,
};

export const SPENDING_CATEGORY_META = [
  { id: "ChildcareEducation", label: "Childcare & education", color: "#14b8e0", icon: GraduationCap, keys: ["Education"] },
  { id: "DrinksDining", label: "Drinks & dining", color: "#ffb95a", icon: Utensils, keys: ["Dining"] },
  { id: "AutoTransport", label: "Auto & transport", color: "#c26741", icon: Car, keys: ["Transport"] },
  { id: "Entertainment", label: "Entertainment", color: "#8b80ff", icon: Gem, keys: ["Entertainment"] },
  { id: "Groceries", label: "Groceries", color: "#0f766e", icon: ShoppingCart, keys: ["Groceries"] },
  { id: "Other", label: "Other", color: "#c79a26", icon: ReceiptText, keys: ["Other Expense", "Subscriptions"] },
  { id: "Shopping", label: "Shopping", color: "#ff7a45", icon: ShoppingCart, keys: ["Shopping"] },
  { id: "Financial", label: "Financial", color: "#e3c500", icon: TrendingUp, keys: ["Investment"] },
  { id: "Healthcare", label: "Healthcare", color: "#dc8cdb", icon: HeartPulse, keys: ["Health"] },
  { id: "Household", label: "Household", color: "#8ecfff", icon: HousePlus, keys: ["Rent", "Utilities"] },
  { id: "PersonalCare", label: "Personal care", color: "#3f7a18", icon: Sparkles, keys: [] },
  { id: "TravelVacation", label: "Travel & vacation", color: "#0d5f9a", icon: Plane, keys: ["Travel"] },
  { id: "Taxes", label: "Taxes", color: "#0f8aa8", icon: ReceiptText, keys: [] },
];

const spendingKeyToMeta = new Map(
  SPENDING_CATEGORY_META.flatMap((item) => item.keys.map((key) => [key, item]))
);

export function getSpendingCategoryMeta(category) {
  const byId = SPENDING_CATEGORY_META.find((item) => item.id === category);
  if (byId) return byId;
  const byKey = spendingKeyToMeta.get(category);
  if (byKey) return byKey;
  const fallback = SPENDING_CATEGORY_META.find((item) => item.id === "Other");
  return category ? { ...fallback, label: category } : fallback;
}

export function getSpendingCategoryLabel(category) {
  return getSpendingCategoryMeta(category).label;
}

/**
 * Extracts recurring frequency from transaction notes or returns fallback.
 */
export function getRecurringFrequency(tx) {
  if (!tx) return "monthly";
  const freqFromNotes = tx.notes?.match(/\[Recurring:\s*(weekly|monthly|yearly)\]/i)?.[1]?.toLowerCase();
  return freqFromNotes || tx.recurringFrequency || "monthly";
}

/**
 * Projects occurrences of a recurring transaction within a specific month.
 */
export function getOccurrencesInMonth(tx, monthDate) {
  const start = new Date(tx.date);
  const freq = getRecurringFrequency(tx);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const occurrences = [];

  const originalDay = start.getDate();
  let cur = new Date(start);
  
  // Efficiently jump closer to the target month
  if (cur < monthStart) {
    if (freq === "weekly") {
      const diffWeeks = Math.floor((monthStart - cur) / (86400000 * 7));
      cur.setDate(cur.getDate() + (diffWeeks * 7));
    } else if (freq === "monthly") {
      const diffMonths = (monthDate.getFullYear() - cur.getFullYear()) * 12 + (monthDate.getMonth() - cur.getMonth());
      const targetYear = monthDate.getFullYear();
      const targetMonth = monthDate.getMonth();
      // Explicitly construct date to avoid setMonth() overflow (e.g. Jan 31 → Apr = May 1)
      const lastInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      cur = new Date(targetYear, targetMonth, Math.min(originalDay, lastInTargetMonth));
      // If we overshot (went past monthEnd), step back one month
      if (cur > monthEnd) {
        const prevMonth = targetMonth - 1 < 0 ? 11 : targetMonth - 1;
        const prevYear = targetMonth - 1 < 0 ? targetYear - 1 : targetYear;
        const lastInPrev = new Date(prevYear, prevMonth + 1, 0).getDate();
        cur = new Date(prevYear, prevMonth, Math.min(originalDay, lastInPrev));
      }
    } else if (freq === "yearly") {
      const diffYears = monthDate.getFullYear() - cur.getFullYear();
      const targetYear = cur.getFullYear() + diffYears;
      const lastInMonth = new Date(targetYear, cur.getMonth() + 1, 0).getDate();
      cur = new Date(targetYear, cur.getMonth(), Math.min(originalDay, lastInMonth));
    }
  }

  let iterations = 0;
  while (cur <= monthEnd && iterations < 50) {
    iterations++;
    
    if (cur >= monthStart && cur <= monthEnd) {
      occurrences.push(new Date(cur));
    }
    
    if (freq === "weekly") {
      cur.setDate(cur.getDate() + 7);
    } else if (freq === "monthly") {
      const nextMonth = cur.getMonth() + 1;
      const nextYear = cur.getFullYear() + (nextMonth > 11 ? 1 : 0);
      const normalizedMonth = nextMonth % 12;
      const lastInNext = new Date(nextYear, normalizedMonth + 1, 0).getDate();
      cur = new Date(nextYear, normalizedMonth, Math.min(originalDay, lastInNext));
    } else if (freq === "yearly") {
      const nextYear = cur.getFullYear() + 1;
      const lastInNext = new Date(nextYear, cur.getMonth() + 1, 0).getDate();
      cur = new Date(nextYear, cur.getMonth(), Math.min(originalDay, lastInNext));
    } else {
      break; 
    }
  }
  
  return occurrences;
}

export const goalIcons = [
  HeartPulse, Target, PiggyBank, TrendingUp,
  GraduationCap, Building2, Car, Gem,
];

/* ─── Plan Feature Definitions ──────────────────────────── */
export const FREE_FEATURES = [
  "10 transactions / month",
  "5 AI queries / month",
  "Goal tracking",
  "Cash flow forecasting",
  "Spending calendar",
];
export const PRO_FEATURES = [
  "Unlimited transactions",
  "Unlimited AI queries",
  "AI auto-categorization",
  "Advanced analytics",
  "Export data anytime",
  "Priority support",
];
export const PRO_ONLY_IDS = [
  "export","ai_unlimited","advanced_analytics",
  "auto_categorize","priority_support",
];

/* ─── ProGate ────────────────────────────────────────────── */
export function ProGate({ isPro, navigate, children, blur = true }) {
  if (isPro) return children;
  return (
    <div style={{ position:"relative", borderRadius:16, overflow:"hidden" }}>
      {blur ? (
        <>
          <div style={{ filter:"blur(4px)", opacity:0.4, pointerEvents:"none", userSelect:"none" }}>
            {children}
          </div>
          <div style={{
            position:"absolute", inset:0,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            background: "var(--bg-overlay)",
            borderRadius:16, zIndex:10, gap:10,
          }}>
            <div style={{ width:36, height:36, borderRadius:10, background:C.strong, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(0,0,0,0.18)" }}>
              <Lock size={16} color={C.onStrong} strokeWidth={2.5}/>
            </div>
            <button type="button" onClick={() => navigate && navigate("/subscription")}
              style={{ padding:"7px 20px", borderRadius:100, border:"none", background:C.strong, color:C.onStrong, fontSize:12, fontWeight:600, cursor:"pointer", letterSpacing:"-0.1px" }}>
              Upgrade to Pro
            </button>
          </div>
        </>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", background:C.white, border:`1px solid ${C.border}`, borderRadius:16, gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:C.strong, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Lock size={16} color={C.onStrong} strokeWidth={2.5}/>
          </div>
          <div style={{ fontSize:13.5, fontWeight:600, color:C.text }}>Pro feature</div>
          <div style={{ fontSize:12, color:C.muted, textAlign:"center", maxWidth:220 }}>
            Upgrade your plan to access this.
          </div>
          <button type="button" onClick={() => navigate && navigate("/subscription")}
            style={{ marginTop:4, padding:"7px 22px", borderRadius:100, border:"none", background:C.strong, color:C.onStrong, fontSize:12, fontWeight:600, cursor:"pointer" }}>
            Upgrade to Pro
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── ChartTip ───────────────────────────────────────────── */
export const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", boxShadow:"0 8px 24px rgba(0,0,0,0.10)", fontSize:C.fSizeSm, lineHeight:C.lhTight }}>
      <div style={{ color:C.muted, marginBottom:6, fontWeight:C.fWeightSemi, fontSize:C.fSizeXs, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color, fontWeight:C.fWeightMed, marginBottom:3, display:"flex", justifyContent:"space-between", gap:16, fontVariantNumeric:"tabular-nums" }}>
          <span>{p.name}:</span>
          <span>{`$${typeof p.value==="number" && p.value>10000 ? (p.value/1000).toFixed(0)+"k" : p.value?.toLocaleString?.() ?? p.value}`}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Card ───────────────────────────────────────────────── */
export const Card = ({ children, style={}, className="" }) => (
  <div className={`fp-card ${className}`} style={{
    background:C.white, border:`1px solid ${C.border}`,
    borderRadius:16, padding:"20px",
    boxShadow:"0 1px 3px rgba(0,0,0,0.04),0 1px 2px rgba(0,0,0,0.03)",
    transition:"box-shadow 0.2s,transform 0.2s",
    fontFamily: "var(--font-sans)",
    ...style,
  }}>
    {children}
  </div>
);

/* ─── Nav sections ───────────────────────────────────────── */
export const navSections = [
  {
    label: "TRACK",
    items: [
      { id:"dashboard",  label:"Home",              icon: House       },
      { id:"spending",   label:"Spending",           icon: CreditCard  },
      { id:"portfolio",  label:"Assets",             icon: Wallet      },
      { id:"equity",     label:"Equity",             icon: Activity    },
      { id:"planning",   label:"Financial Planning", icon: Target      },
      { id:"forecast",   label:"Forecast",           icon: LineChart   },
      { id:"benefits",   label:"Benefits",           icon: Award       },
    ],
  },
  {
    label: "SERVICES",
    items: [
      { id:"ai_advisor", label:"AI Advisor", icon: Sparkles },
    ],
  },
];
export const navItems = navSections.flatMap(s => s.items);

export const timeTabs = ["1W","1M","3M","YTD","ALL"];
export const aiInitial = [{ role:"bot", text:"Ask me about your spending, goals, or how to improve your financial score." }];
