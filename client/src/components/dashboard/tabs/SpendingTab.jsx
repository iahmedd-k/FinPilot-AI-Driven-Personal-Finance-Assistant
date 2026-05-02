// ─── src/components/dashboard/tabs/SpendingTab.jsx ───────────
//
// FILE LOCATION: src/components/dashboard/tabs/SpendingTab.jsx
//
// Path map (relative to THIS file):
//   dashboardShared  →  ../dashboardShared        (one level up)
//   services         →  ../../../services/...     (three levels up)
//   constants        →  ../../../constants/routes
//   api              →  ../../../services/api
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, LineChart, Line, ComposedChart,
} from "recharts";
import {
  ChevronLeft, ChevronRight, ChevronDown, Plus, X, Download, Upload, Check,
  Filter, CalendarDays, SortAsc, SortDesc, XCircle,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
  ShoppingCart, Utensils, Bus, Building2, Bolt,
  BadgeDollarSign, HeartPulse, TrendingUp, Wallet,
  GraduationCap, Gem, Lock, Trash2, Pencil,
  Search, Car, ReceiptText, Wand2, Gift, HelpCircle, Settings,
} from "lucide-react";

// ── Shared (../dashboardShared — one level up from tabs/) ─────
import { C, CAT_COLORS, catToIcon, dedupToast, ProGate, getSpendingCategoryMeta } from "../dashboardShared.jsx";

// ── Services (../../../services/...) ─────────────────────────
import { transactionService } from "../../../services/transactionService";
import api from "../../../services/api";

// ── Constants (../../../constants/routes) ────────────────────
import { ROUTES } from "../../../constants/routes";
import { formatCurrencyAmount, getUserCurrency } from "../../../utils/currency";

// ── Hooks (../../../hooks/) ──────────────────────────────────
import { useAuthContext } from "../../../hooks/useAuthContext";
import SpendingOverviewTab from "./spending/OverviewTab";
import SpendingBreakdownTab from "./spending/BreakdownTab";
import SpendingTransactionsPage from "./spending/TransactionsPage";
import SpendingReportsTab from "./spending/ReportsTab";
import SpendingRecurringTab from "./spending/RecurringTab";
import SpendingSettingsTab from "./spending/SettingsTab";

// ── Mobile hook ───────────────────────────────────────────────
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const clampPercent = (value, { min = 0, max = 100 } = {}) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return clamp(numeric, min, max);
};

const sortTransactionsNewestFirst = (items = []) =>
  [...items].sort((a, b) => {
    const dateDiff = new Date(b?.date || 0) - new Date(a?.date || 0);
    if (dateDiff !== 0) return dateDiff;
    const createdDiff = new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
    if (createdDiff !== 0) return createdDiff;
    return String(b?._id || "").localeCompare(String(a?._id || ""));
  });

/**
 * FIX: Build a monthly chart that always includes the last N months
 * (defaulting to 6), even if there are no transactions — so the chart
 * never renders empty due to a missing month range.
 *
 * Also fixed a subtle bug in the original: `new Date(year, month - 1, 1)`
 * was called with already-decremented month values from `split("-").map(Number)`,
 * which could produce NaN months when the key was malformed.
 */
const buildMonthlyChartFromTransactions = (items = [], minMonths = 6) => {
  const now = new Date();
  const monthlyMap = new Map();

  (items || []).forEach((tx) => {
    if (!tx?.date) return;
    const txDate = new Date(tx.date);
    if (Number.isNaN(txDate.getTime())) return;
    const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
    const row = monthlyMap.get(key) || { month: key, income: 0, expense: 0, net: 0 };
    const amount = Math.abs(Number(tx.amount) || 0);
    if (tx.type === "income") row.income += amount;
    else row.expense += amount;
    row.net = row.income - row.expense;
    monthlyMap.set(key, row);
  });

  // Determine start: either earliest transaction or (minMonths) ago — whichever is earlier
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - (minMonths - 1), 1);
  const defaultStartKey = `${defaultStartDate.getFullYear()}-${String(defaultStartDate.getMonth() + 1).padStart(2, "0")}`;

  const allKeys = [...monthlyMap.keys()].sort((a, b) => a.localeCompare(b));
  const earliestTxKey = allKeys[0] || currentMonthKey;

  // Use whichever is earlier: default window start or first transaction
  const startKey = earliestTxKey < defaultStartKey ? earliestTxKey : defaultStartKey;

  const [startYear, startMonthRaw] = startKey.split("-").map(Number);
  const cursor = new Date(startYear, startMonthRaw - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const rows = [];

  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    rows.push(monthlyMap.get(key) || { month: key, income: 0, expense: 0, net: 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return rows;
};

const getLatestTransactionMonthKey = (items = []) => {
  const timestamps = (items || [])
    .map((tx) => new Date(tx?.date).getTime())
    .filter((value) => Number.isFinite(value));
  if (!timestamps.length) return new Date().toISOString().slice(0, 7);
  return new Date(Math.max(...timestamps)).toISOString().slice(0, 7);
};

/**
 * FIX: `buildTrendData` is now a standalone helper (was inlined in render,
 * never memoized, and — critically — was computed but NEVER PASSED DOWN to
 * any child component that renders the chart).
 *
 * SpendingOverviewTab receives `trendData` as a dedicated prop now, so it
 * can render the chart directly without re-deriving it with different logic.
 */
const buildTrendData = (monthlyChart = [], months = 6) =>
  [...monthlyChart]
    .filter((m) => m && m.month)
    .sort((a, b) => (a.month || "").localeCompare(b.month || ""))
    .slice(-months)
    .map((m) => {
      const parts = (m.month || "").split("-");
      const y = Number(parts[0]);
      const mo = Number(parts[1]);
      const label =
        y && mo
          ? new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short" })
          : m.month || "";
      return {
        label,
        month: m.month,
        income: m.income || 0,
        expense: m.expense || 0,
        net: (m.income || 0) - (m.expense || 0),
      };
    });

const DEFAULT_SPENDING_SETTINGS = {
  budgetSettings: {
    defaultMonthlyBudget: 0,
    budgetWarning50: true,
    budgetWarning80: true,
    budgetWarning100: true,
    carryForwardBudget: true,
    resetPeriod: "monthly",
  },
  categorySettings: {
    hiddenCategoryIds: [],
  },
  alertSettings: {
    notificationsEnabled: true,
    categorySpikeAlerts: true,
    categorySpikePercent: 25,
    largeTransactionAlerts: true,
    largeTransactionAmount: 500,
    recurringReminderAlerts: true,
  },
  recurringSettings: {
    reminderDaysBefore: 3,
    autoDetectRecurring: true,
    showInferredRecurring: true,
    defaultExpenseCategory: "Subscriptions",
    defaultIncomeCategory: "Salary",
  },
  transactionPreferences: {
    defaultReviewStatus: "needs_review",
    includeHiddenInAnalytics: false,
    includeRecurringInBudget: true,
    defaultSortDirection: "desc",
  },
  reportPreferences: {
    defaultRange: "last_6_months",
    defaultTab: "cashflow",
    defaultViewBy: "Category",
  },
};

const normalizeSpendingSettings = (value = {}) => ({
  budgetSettings: {
    ...DEFAULT_SPENDING_SETTINGS.budgetSettings,
    ...(value?.budgetSettings || {}),
  },
  categorySettings: {
    ...DEFAULT_SPENDING_SETTINGS.categorySettings,
    ...(value?.categorySettings || {}),
    // FIX: guard against non-array (e.g. undefined/null from API) without silently
    // dropping valid IDs — also deduplicate to avoid double-filtering
    hiddenCategoryIds: Array.isArray(value?.categorySettings?.hiddenCategoryIds)
      ? [...new Set(value.categorySettings.hiddenCategoryIds.filter(Boolean))]
      : [],
  },
  alertSettings: {
    ...DEFAULT_SPENDING_SETTINGS.alertSettings,
    ...(value?.alertSettings || {}),
  },
  recurringSettings: {
    ...DEFAULT_SPENDING_SETTINGS.recurringSettings,
    ...(value?.recurringSettings || {}),
  },
  transactionPreferences: {
    ...DEFAULT_SPENDING_SETTINGS.transactionPreferences,
    ...(value?.transactionPreferences || {}),
  },
  reportPreferences: {
    ...DEFAULT_SPENDING_SETTINGS.reportPreferences,
    ...(value?.reportPreferences || {}),
  },
});

function SpendingPage({
  transactionService,
  queryClient,
  C,
  isPro,
  txLimitReached,
  navigate,
  toast,
  setAddModalOpen,
  pushNotif,
  summary,
  monthlyChart = [],
  apiTransactions = [],
  isMobile,
  refreshUser,
  budget,
  categoryBreakdown: apiCategoryBreakdown,
  onBudgetSaved,
  setShowAdvisor,
  spendingSettings,
}) {
  const { user } = useAuthContext();
  const location = useLocation();
  const preferredCurrency = getUserCurrency(user);
  const [spendTab, setSpendTab] = useState("overview");
  const [breakdownMode, setBreakdownMode] = useState("expenses");
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState("manual");
  const isMobileLocal = useIsMobile();
  const ROUTES_SP = ROUTES;

  const resolvedSettings = useMemo(
    () => normalizeSpendingSettings(spendingSettings),
    [spendingSettings]
  );

  const hiddenCategoryIds = resolvedSettings.categorySettings.hiddenCategoryIds || [];
  const includeHiddenInAnalytics =
    !!resolvedSettings.transactionPreferences.includeHiddenInAnalytics;

  /**
   * FIX: `analyticsTransactions` previously could return an empty array when
   * `getSpendingCategoryMeta` returned an object whose `.id` didn't match any
   * string in `hiddenCategoryIds` — yet the filter still excluded the tx because
   * `hiddenCategoryIds.includes(undefined)` is false but
   * `getSpendingCategoryMeta(undefined).id` might be an empty string that IS
   * in the array if a stale/blank ID slipped through normalizeSpendingSettings.
   *
   * The guard below short-circuits category filtering when `hiddenCategoryIds`
   * is empty (the common case), avoiding any edge-case mismatch entirely.
   */
  const analyticsTransactions = useMemo(() => {
    const hasHiddenCategories = hiddenCategoryIds.length > 0;
    return (apiTransactions || []).filter((tx) => {
      if (!includeHiddenInAnalytics && tx?.isHidden) return false;
      if (hasHiddenCategories && tx?.type === "expense") {
        const meta = getSpendingCategoryMeta(tx.category);
        if (meta?.id && hiddenCategoryIds.includes(meta.id)) return false;
      }
      return true;
    });
  }, [apiTransactions, hiddenCategoryIds, includeHiddenInAnalytics]);

  /**
   * FIX: `analyticsMonthlyChart` now uses `minMonths: 6` so the chart always
   * has at least 6 months of buckets, even when there are zero transactions.
   * Previously an empty transaction list produced an empty array, which
   * Recharts rendered as a blank chart with no axes.
   */
  const analyticsMonthlyChart = useMemo(
    () => buildMonthlyChartFromTransactions(analyticsTransactions, 6),
    [analyticsTransactions]
  );

  /**
   * FIX: `trendData` is now memoized and passed explicitly to SpendingOverviewTab.
   * In the original code it was computed inline during render but never forwarded
   * to any child — the chart was receiving `monthlyChart` (raw, untransformed)
   * instead of `trendData` (labeled, sliced to last 6 months).
   */
  const trendData = useMemo(
    () => buildTrendData(analyticsMonthlyChart, 6),
    [analyticsMonthlyChart]
  );

  const emptyForm = useMemo(
    () => ({
      merchant: "",
      category:
        resolvedSettings.recurringSettings.defaultExpenseCategory || "Dining",
      amount: "",
      type: "expense",
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    }),
    [resolvedSettings.recurringSettings.defaultExpenseCategory]
  );
  const [form, setForm] = useState(emptyForm);
  const [formLoading, setFormLoading] = useState(false);

  const [csvRows, setCsvRows] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvMapping, setCsvMapping] = useState({});
  const [csvFile, setCsvFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState("");

  const REQUIRED_FIELDS = ["date", "merchant", "amount", "type"];

  useEffect(() => {
    const spend = new URLSearchParams(location.search).get("spend");
    if (spend === "settings") setSpendTab("settings");
  }, [location.search]);

  useEffect(() => {
    setForm((prev) =>
      prev.merchant || prev.amount || prev.notes ? prev : emptyForm
    );
  }, [emptyForm]);

  const openAdd = () => {
    if (txLimitReached) {
      dedupToast.error("Free limit reached. Upgrade to Pro.");
      return;
    }
    setForm(emptyForm);
    setCsvRows([]);
    setCsvHeaders([]);
    setCsvMapping({});
    setCsvFile(null);
    setCsvError("");
    setAddOpen(true);
  };
  const closeAdd = () => setAddOpen(false);

  const submitManual = async () => {
    if (!form.merchant.trim()) {
      dedupToast.error("Merchant is required");
      return;
    }
    if (!form.amount || isNaN(parseFloat(form.amount))) {
      dedupToast.error("Enter a valid amount");
      return;
    }
    setFormLoading(true);
    try {
      await transactionService.create({
        merchant: form.merchant.trim(),
        category: form.category,
        amount: parseFloat(form.amount),
        type: form.type,
        date: form.date,
        notes: form.notes.trim(),
        reviewStatus:
          resolvedSettings.transactionPreferences.defaultReviewStatus,
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-page"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      refreshUser?.();
      dedupToast.success("Transaction added");
      pushNotif?.("success", "Transaction added");
      setForm(emptyForm);
      closeAdd();
      setSpendTab("transactions");
    } catch (e) {
      dedupToast.error(
        e?.response?.data?.message || "Failed to add transaction"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines
      .slice(1)
      .map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = cols[i] || "";
        });
        return obj;
      })
      .filter((r) => Object.values(r).some((v) => v));
    return { headers, rows };
  };

  const onCsvFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result);
      if (!headers.length) {
        setCsvError("Could not parse CSV — check the file format.");
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows.slice(0, 200));
      const autoMap = {};
      const fieldAliases = {
        date: ["date", "time", "datetime", "transaction date", "trans date"],
        merchant: [
          "merchant",
          "description",
          "name",
          "payee",
          "vendor",
          "memo",
        ],
        amount: ["amount", "sum", "total", "value", "debit", "credit"],
        type: ["type", "transaction type", "kind"],
        category: ["category", "cat", "label", "tag"],
        notes: ["notes", "note", "memo", "remarks"],
      };
      headers.forEach((h) => {
        const hl = h.toLowerCase();
        Object.entries(fieldAliases).forEach(([field, aliases]) => {
          if (!autoMap[field] && aliases.some((a) => hl.includes(a)))
            autoMap[field] = h;
        });
      });
      setCsvMapping(autoMap);
    };
    reader.readAsText(file);
  };

  const submitCSV = async () => {
    const missing = REQUIRED_FIELDS.filter((f) => !csvMapping[f]);
    if (missing.length) {
      setCsvError(`Please map: ${missing.join(", ")}`);
      return;
    }
    setCsvLoading(true);
    setCsvError("");
    try {
      const txns = csvRows
        .map((row) => {
          const rawAmt =
            parseFloat(
              (row[csvMapping.amount] || "0").replace(/[^0-9.-]/g, "")
            ) || 0;
          const typeRaw = (row[csvMapping.type] || "").toLowerCase();
          const type =
            typeRaw.includes("income") || typeRaw.includes("credit")
              ? "income"
              : "expense";
          return {
            merchant: row[csvMapping.merchant] || "Unknown",
            category: row[csvMapping.category] || "Other",
            amount: Math.abs(rawAmt),
            type,
            date:
              row[csvMapping.date] || new Date().toISOString().slice(0, 10),
            notes: csvMapping.notes ? row[csvMapping.notes] || "" : "",
            reviewStatus:
              resolvedSettings.transactionPreferences.defaultReviewStatus,
          };
        })
        .filter((t) => t.amount > 0);
      for (const tx of txns) {
        await transactionService.create(tx);
      }
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-page"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      refreshUser?.();
      dedupToast.success(`${txns.length} transactions imported`);
      pushNotif?.("success", `${txns.length} transactions imported`);
      closeAdd();
      setSpendTab("transactions");
    } catch (e) {
      setCsvError(e?.response?.data?.message || "Import failed");
    } finally {
      setCsvLoading(false);
    }
  };

  // ── Derived stats (for overview cards) ───────────────────────
  const catMap = {};
  analyticsTransactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      catMap[t.category || "Other"] =
        (catMap[t.category || "Other"] || 0) + Math.abs(t.amount || 0);
    });
  const catBreakdown = Object.entries(catMap)
    .map(([cat, total]) => ({ cat, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const totalSpendAll = catBreakdown.reduce((s, c) => s + c.total, 0);

  const thisMonth = getLatestTransactionMonthKey(analyticsTransactions);
  const thisMonthData =
    analyticsMonthlyChart.find((m) => m?.month === thisMonth) || {};
  const prevMonth = (() => {
    const [year, month] = thisMonth.split("-").map(Number);
    const d = new Date(year || new Date().getFullYear(), (month || 1) - 2, 1);
    return d.toISOString().slice(0, 7);
  })();
  const prevMonthData =
    analyticsMonthlyChart.find((m) => m?.month === prevMonth) || {};
  const thisSpend = thisMonthData.expense || 0;
  const prevSpend = prevMonthData.expense || 0;
  const spendChange =
    prevSpend > 0
      ? (((thisSpend - prevSpend) / prevSpend) * 100).toFixed(1)
      : null;

  const recentTx = sortTransactionsNewestFirst(analyticsTransactions).slice(
    0,
    5
  );

  const fmtMoney = (n, options = { maximumFractionDigits: 0 }) => {
    const numeric = Number(n || 0);
    const formatted = formatCurrencyAmount(
      Math.abs(numeric),
      preferredCurrency,
      options
    );
    return numeric < 0 ? `-${formatted}` : formatted;
  };

  const inputSx = {
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "8px 11px",
    fontSize: 12.5,
    background: C.white,
    color: C.text,
    outline: "none",
    fontFamily: "'DM Sans',sans-serif",
    width: "100%",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "textfield",
  };

  // Sub-tab labels — shorter on mobile
  const subTabs = [
    ["overview", isMobileLocal ? "Home" : "Overview"],
    ["breakdown", isMobileLocal ? "Budget" : "Breakdown & budget"],
    ["transactions", isMobileLocal ? "Transactions" : "Transactions"],
    ["recurring", isMobileLocal ? "Recurring" : "Recurring"],
    ["reports", "Reports"],
    ["settings", "Settings"],
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        animation: "fadeUp 0.3s ease",
      }}
    >
      {/* ── Mobile-friendly global styles ── */}
      <style>{`
        @media (max-width: 640px) {
          .spend-subtabs { gap: 0 !important; padding: 0 4px !important; }
          .spend-subtabs button { padding: 10px 10px !important; font-size: 12px !important; white-space: nowrap; }
          .mobile-stack { flex-direction: column !important; }
          .mobile-full { width: 100% !important; }
          .mobile-hide { display: none !important; }
          .mobile-p-sm { padding: 12px 14px !important; }
          .tx-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
      `}</style>

      {/* ── Add Transaction Modal ── */}
      {addOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
            padding: isMobileLocal ? 0 : 16,
          }}
          onClick={closeAdd}
        >
          <div
            style={{
              background: "var(--bg-secondary)",
              borderRadius: isMobileLocal ? "20px 20px 0 0" : 20,
              border: `1px solid ${C.border}`,
              boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
              width: "100%",
              maxWidth: isMobileLocal ? "100%" : 520,
              maxHeight: isMobileLocal ? "92vh" : "90vh",
              overflowY: "auto",
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              style={{
                padding: "20px 20px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontSize: C.fSizeBase,
                  fontWeight: C.fWeightSemi,
                  color: C.text,
                }}
              >
                Add Transaction
              </div>
              <button
                type="button"
                onClick={closeAdd}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: C.muted,
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode toggle */}
            <div
              style={{
                margin: "16px 20px 0",
                display: "flex",
                background: "var(--surface-muted)",
                borderRadius: 10,
                padding: 4,
                gap: 4,
              }}
            >
              {[
                ["manual", "✏️  Manual"],
                ["csv", "📄  Import CSV"],
              ].map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAddMode(m)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontWeight: addMode === m ? 700 : 500,
                    background:
                      addMode === m
                        ? "var(--bg-secondary)"
                        : "transparent",
                    color: addMode === m ? C.text : C.muted,
                    boxShadow:
                      addMode === m
                        ? "0 1px 4px rgba(0,0,0,0.10)"
                        : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ padding: "20px 20px 32px" }}>
              {/* ── Manual entry form ── */}
              {addMode === "manual" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 13,
                  }}
                >
                  {/* Merchant + Date — stack on mobile */}
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexDirection: isMobileLocal ? "column" : "row",
                    }}
                  >
                    <div style={{ flex: 2 }}>
                      <label
                        className="origin-section-label"
                        style={{ fontSize: C.fSizeXs, marginBottom: 5 }}
                      >
                        MERCHANT *
                      </label>
                      <input
                        value={form.merchant}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            merchant: e.target.value,
                          }))
                        }
                        placeholder="e.g. Starbucks"
                        style={inputSx}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label
                        className="origin-section-label"
                        style={{ fontSize: C.fSizeXs, marginBottom: 5 }}
                      >
                        DATE *
                      </label>
                      <CalendarPicker
                        C={C}
                        value={form.date}
                        onChange={(value) =>
                          setForm((f) => ({ ...f, date: value }))
                        }
                      />
                    </div>
                  </div>

                  {/* Amount + Type */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label
                        className="origin-section-label"
                        style={{ fontSize: C.fSizeXs, marginBottom: 5 }}
                      >
                        AMOUNT *
                      </label>
                      <div style={{ position: "relative" }}>
                        <span
                          style={{
                            position: "absolute",
                            left: 11,
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: 11,
                            fontWeight: 700,
                            color: C.muted,
                          }}
                        >
                          {preferredCurrency}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.amount}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              amount: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          style={{
                            ...inputSx,
                            paddingLeft: 58,
                            appearance: "textfield",
                            WebkitAppearance: "none",
                            MozAppearance: "textfield",
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label
                        className="origin-section-label"
                        style={{ fontSize: C.fSizeXs, marginBottom: 5 }}
                      >
                        TYPE *
                      </label>
                      <div style={{ display: "flex", gap: 6 }}>
                        {["expense", "income"].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() =>
                              setForm((f) => ({ ...f, type: t }))
                            }
                            style={{
                              flex: 1,
                              padding: "8px 0",
                              borderRadius: 8,
                              border: `1.5px solid ${form.type === t
                                ? t === "income"
                                  ? "#16a34a"
                                  : C.red
                                : C.border
                                }`,
                              background:
                                form.type === t
                                  ? t === "income"
                                    ? "#f0fdf4"
                                    : C.redBg
                                  : "var(--bg-secondary)",
                              color:
                                form.type === t
                                  ? t === "income"
                                    ? "#16a34a"
                                    : C.red
                                  : C.sub,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.12s",
                              textTransform: "capitalize",
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label
                      className="origin-section-label"
                      style={{ fontSize: C.fSizeXs, marginBottom: 5 }}
                    >
                      CATEGORY
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          category: e.target.value,
                        }))
                      }
                      style={inputSx}
                    >
                      {Object.keys(catToIcon).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="origin-section-label"
                      style={{ fontSize: C.fSizeXs, marginBottom: 5 }}
                    >
                      NOTES
                    </label>
                    <input
                      value={form.notes}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Optional note…"
                      style={inputSx}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={submitManual}
                    disabled={formLoading}
                    style={{
                      marginTop: 4,
                      padding: "13px 0",
                      borderRadius: 10,
                      border: "none",
                      background: C.strong,
                      color: C.onStrong,
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: formLoading ? "not-allowed" : "pointer",
                      opacity: formLoading ? 0.7 : 1,
                      transition: "opacity 0.15s",
                    }}
                  >
                    {formLoading ? "Adding…" : "Add Transaction"}
                  </button>
                </div>
              )}

              {/* ── CSV import ── */}
              {addMode === "csv" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      background: "#f8faff",
                      border: "1px solid #dbeafe",
                      borderRadius: 10,
                      padding: "9px 14px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "#1e40af",
                        lineHeight: 1.5,
                        marginBottom: 8,
                      }}
                    >
                      Required:{" "}
                      <strong>date</strong>,{" "}
                      <strong>merchant</strong>,{" "}
                      <strong>amount</strong>,{" "}
                      <strong>type</strong>
                      <span
                        style={{
                          color: "#60a5fa",
                          fontStyle: "italic",
                        }}
                      >
                        {" "}
                        · category, notes optional
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const sample =
                          "date,type,amount,merchant,category,notes\n2024-03-01,expense,45.50,Whole Foods,Groceries,weekly shop\n2024-03-02,income,3500.00,Employer,Salary,March salary\n";
                        const blob = new Blob([sample], {
                          type: "text/csv",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "finpilot-sample.csv";
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#3b82f6",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Download size={11} /> Download sample CSV
                    </button>
                  </div>

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "24px 20px",
                      border: `2px dashed ${csvFile ? C.greenMid : C.border
                        }`,
                      borderRadius: 12,
                      cursor: "pointer",
                      background: csvFile ? "#f0fdf4" : C.bg,
                      transition: "all 0.15s",
                    }}
                  >
                    <input
                      type="file"
                      accept=".csv"
                      onChange={onCsvFile}
                      style={{ display: "none" }}
                    />
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: csvFile ? "#dcfce7" : C.white,
                        border: `1px solid ${csvFile ? C.greenMid : C.border
                          }`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {csvFile ? (
                        <Check
                          size={18}
                          style={{ color: C.greenMid }}
                        />
                      ) : (
                        <Upload size={18} style={{ color: C.muted }} />
                      )}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: csvFile ? C.greenMid : C.text,
                        }}
                      >
                        {csvFile ? csvFile.name : "Tap to upload CSV"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: C.muted,
                          marginTop: 2,
                        }}
                      >
                        {csvFile
                          ? `${csvRows.length} rows ready`
                          : "Max 2MB · .csv only"}
                      </div>
                    </div>
                  </label>

                  {csvError && (
                    <div
                      style={{
                        padding: "8px 12px",
                        background: C.redBg,
                        borderRadius: 8,
                        color: C.red,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {csvError}
                    </div>
                  )}

                  {csvRows.length > 0 && (
                    <button
                      type="button"
                      onClick={submitCSV}
                      disabled={csvLoading}
                      style={{
                        padding: "13px 0",
                        borderRadius: 10,
                        border: "none",
                        background: C.strong,
                        color: C.onStrong,
                        fontSize: 13.5,
                        fontWeight: 700,
                        cursor: csvLoading ? "not-allowed" : "pointer",
                        opacity: csvLoading ? 0.7 : 1,
                        transition: "opacity 0.15s",
                        width: "100%",
                      }}
                    >
                      {csvLoading
                        ? "Importing…"
                        : `Import ${csvRows.length} Transactions`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-tab navigation ── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 16,
        }}
      >
        {subTabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSpendTab(id)}
            style={{
              border: "none",
              background:
                spendTab === id ? "var(--surface-muted)" : "transparent",
              color: "var(--text-primary)",
              borderRadius: 12,
              padding: "11px 15px",
              fontSize: C.fSizeXs,
              fontWeight:
                spendTab === id ? C.fWeightSemi : C.fWeightMed,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}

      {spendTab === "overview" && (
        <SpendingOverviewTab
          C={C}
          setSpendTab={(tab, mode) => {
            if (mode) setBreakdownMode(mode);
            setSpendTab(tab);
          }}
          setShowAdvisor={setShowAdvisor}
          transactionService={transactionService}
          queryClient={queryClient}
          pushNotif={pushNotif}
          isMobile={isMobileLocal || isMobile}
          isPro={isPro}
          navigate={navigate}
          thisSpend={thisSpend}
          thisMonthData={thisMonthData}
          apiTransactions={analyticsTransactions}
          recentTx={recentTx}
          fmtMoney={fmtMoney}
          preferredCurrency={preferredCurrency}
          budget={budget}
          // FIX: pass the fully-transformed trendData (labeled, last-6-months)
          // instead of the raw analyticsMonthlyChart. The overview tab's chart
          // expects { label, income, expense, net } objects — not { month, ... }.
          monthlyChart={analyticsMonthlyChart}
          trendData={trendData}
          openAdd={openAdd}
          onBudgetSaved={onBudgetSaved}
        />
      )}

      {spendTab === "transactions" && (
        <SpendingTransactionsPage
          transactionService={transactionService}
          queryClient={queryClient}
          C={C}
          apiTransactions={apiTransactions}
          isPro={isPro}
          txLimitReached={txLimitReached}
          navigate={navigate}
          toast={dedupToast}
          setAddModalOpen={() => openAdd()}
          pushNotif={pushNotif}
          hideHeader
          spendingSettings={resolvedSettings}
        />
      )}

      {spendTab === "breakdown" && (
        <SpendingBreakdownTab
          C={C}
          apiTransactions={analyticsTransactions}
          monthlyChart={analyticsMonthlyChart}
          budget={budget}
          onBudgetSaved={onBudgetSaved}
          isMobile={isMobileLocal || isMobile}
          preferredCurrency={preferredCurrency}
          setSpendTab={setSpendTab}
          initialTab={breakdownMode}
        />
      )}

      {spendTab === "reports" && (
        <SpendingReportsTab
          C={C}
          apiTransactions={analyticsTransactions}
          isMobile={isMobileLocal || isMobile}
          preferredCurrency={preferredCurrency}
          setSpendTab={setSpendTab}
          reportPreferences={resolvedSettings.reportPreferences}
        />
      )}

      {spendTab === "recurring" && (
        <SpendingRecurringTab
          C={C}
          apiTransactions={apiTransactions}
          openAdd={openAdd}
          transactionService={transactionService}
          queryClient={queryClient}
          pushNotif={pushNotif}
          refreshUser={refreshUser}
          txLimitReached={txLimitReached}
          preferredCurrency={preferredCurrency}
          spendingSettings={resolvedSettings}
        />
      )}

      {spendTab === "settings" && (
        <SpendingSettingsTab
          C={C}
          isMobile={isMobileLocal || isMobile}
          preferredCurrency={preferredCurrency}
          spendingSettings={resolvedSettings}
          budget={budget}
          apiTransactions={analyticsTransactions}
          monthlyChart={analyticsMonthlyChart}
          transactionService={transactionService}
          queryClient={queryClient}
          refreshUser={refreshUser}
          pushNotif={pushNotif}
          onBudgetSaved={onBudgetSaved}
          setSpendTab={setSpendTab}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CalendarPicker
// ─────────────────────────────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseDateInputValue(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatDateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function CalendarPicker({ C, value, onChange, minDate }) {
  const [open, setOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const date = parseDateInputValue(value) || new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const wrapperRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    const date = parseDateInputValue(value) || new Date();
    date.setDate(1);
    setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    const handle = (event) => {
      if (!open) return;
      const target = event.target;
      const insideTrigger = wrapperRef.current?.contains(target);
      const insidePopup = popupRef.current?.contains(target);
      if (!insideTrigger && !insidePopup) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const updatePopupPosition = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const width = Math.max(
        220,
        Math.min(Math.max(260, rect.width), viewportWidth - 24)
      );
      const estimatedHeight = 354;
      const roomBelow = window.innerHeight - rect.bottom;
      const roomAbove = rect.top;
      const top =
        roomBelow >= estimatedHeight || roomBelow >= roomAbove
          ? rect.bottom + 8
          : rect.top - estimatedHeight - 8;
      const left = Math.min(
        window.innerWidth - width - 12,
        Math.max(12, rect.left)
      );
      setPopupStyle({
        position: "fixed",
        top: Math.max(12, top),
        left,
        width,
      });
    };
    updatePopupPosition();
    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
    };
  }, [open]);

  const monthLabel = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const selectedDate = parseDateInputValue(value);
  const minimumDate = parseDateInputValue(minDate);
  if (minimumDate) minimumDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const displayText = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    : "Select date";

  const startDay = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth(),
    1
  ).getDay();
  const calendarStart = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth(),
    1 - startDay
  );
  const cells = Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(calendarStart);
    cellDate.setDate(calendarStart.getDate() + index);
    return {
      key: formatDateInputValue(cellDate),
      date: cellDate,
      day: cellDate.getDate(),
      isCurrentMonth:
        cellDate.getMonth() === viewMonth.getMonth() &&
        cellDate.getFullYear() === viewMonth.getFullYear(),
    };
  });

  const handleSelect = (next) => {
    if (!next) return;
    if (minimumDate && next < minimumDate) return;
    onChange(formatDateInputValue(next));
    if (
      next.getMonth() !== viewMonth.getMonth() ||
      next.getFullYear() !== viewMonth.getFullYear()
    ) {
      setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "10px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          background: "var(--bg-secondary)",
          color: C.text,
          cursor: "pointer",
          fontFamily: "inherit",
          boxSizing: "border-box",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        <span
          style={{
            fontSize: 12.5,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {displayText}
        </span>
        <ChevronDown
          size={16}
          color="var(--text-secondary)"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
            flexShrink: 0,
          }}
        />
      </button>
      {open &&
        popupStyle &&
        createPortal(
          <div
            ref={popupRef}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            style={{
              ...popupStyle,
              padding: "18px 18px 16px",
              borderRadius: 28,
              border: `1px solid ${C.border}`,
              boxShadow: "0 24px 64px rgba(0,0,0,0.26)",
              background: "var(--bg-secondary)",
              zIndex: 10001,
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: C.text,
                  letterSpacing: "-0.02em",
                }}
              >
                {monthLabel}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setViewMonth(
                      (prev) =>
                        new Date(
                          prev.getFullYear(),
                          prev.getMonth() - 1,
                          1
                        )
                    )
                  }
                  style={{
                    width: 30,
                    height: 30,
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    color: C.muted,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setViewMonth(
                      (prev) =>
                        new Date(
                          prev.getFullYear(),
                          prev.getMonth() + 1,
                          1
                        )
                    )
                  }
                  style={{
                    width: 30,
                    height: 30,
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    color: C.muted,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                fontSize: 11,
                color: C.muted,
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  style={{
                    padding: "4px 0 8px",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                  }}
                >
                  {day[0]}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                gap: 4,
              }}
            >
              {cells.map((cell) => {
                const dateForCell = cell.date;
                const isDisabled =
                  minimumDate && dateForCell < minimumDate;
                const isSelected =
                  selectedDate &&
                  selectedDate.getFullYear() ===
                  dateForCell.getFullYear() &&
                  selectedDate.getMonth() === dateForCell.getMonth() &&
                  selectedDate.getDate() === dateForCell.getDate();
                const isToday =
                  dateForCell.getTime() === today.getTime();
                const isOutsideMonth = !cell.isCurrentMonth;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => handleSelect(dateForCell)}
                    disabled={isDisabled}
                    style={{
                      height: 40,
                      width: "100%",
                      maxWidth: 40,
                      margin: "0 auto",
                      borderRadius: 999,
                      border:
                        isToday && !isSelected
                          ? `1px solid ${C.border}`
                          : "1px solid transparent",
                      background: isSelected
                        ? "var(--surface-muted)"
                        : "transparent",
                      color: isDisabled
                        ? C.muted
                        : isOutsideMonth
                          ? C.muted
                          : C.text,
                      cursor: isDisabled ? "default" : "pointer",
                      opacity: isDisabled
                        ? 0.35
                        : isOutsideMonth
                          ? 0.7
                          : 1,
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 600,
                      lineHeight: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxSizing: "border-box",
                      transition:
                        "background 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease",
                    }}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export {
  SpendingPage,
  CalendarPicker,
  parseDateInputValue,
  formatDateInputValue,
};