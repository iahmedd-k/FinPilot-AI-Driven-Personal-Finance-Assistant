import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardService } from "../../../../services/dashboardService";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ChevronDown,
  Filter,
  X,
  ArrowDownRight,
  ChevronRight,
  CircleDot,
  Circle,
  Search,
  Check,
  MoreVertical,
  Plus,
  ArrowUpRight,
  BadgeDollarSign
} from "lucide-react";
import {
  C,
  dedupToast,
  formatAmount,
  getSpendingCategoryLabel,
  getSpendingCategoryMeta
} from "../../dashboardShared.jsx";
import { CalendarPicker } from "../SpendingTab.jsx";
import { useAuthContext } from "../../../../hooks/useAuthContext";
import { useDashboard } from "../../DashboardContext.jsx";
import { formatCurrencyAmount, getUserCurrency } from "../../../../utils/currency";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const rangeToDates = (range, earliestTxDate, todayStr, customStart, customEnd) => {
  const today = new Date(todayStr);
  if (range === "last_7_days") {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { from: d.toISOString().slice(0, 10), to: todayStr };
  }
  if (range === "last_30_days") {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    return { from: d.toISOString().slice(0, 10), to: todayStr };
  }
  if (range === "last_90_days") {
    const d = new Date(today);
    d.setDate(d.getDate() - 89);
    return { from: d.toISOString().slice(0, 10), to: todayStr };
  }
  if (range === "this_month") {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    // Local time offset issues can occur with toISOString(), but using local components avoids this if we pad manually or adjust timezone.
    // An easy way that avoids timezone shift in toISOString():
    const pad = n => String(n).padStart(2, '0');
    return { from: `${d.getFullYear()}-${pad(d.getMonth()+1)}-01`, to: todayStr };
  }
  if (range === "last_month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    const pad = n => String(n).padStart(2, '0');
    return { 
      from: `${start.getFullYear()}-${pad(start.getMonth()+1)}-01`, 
      to: `${end.getFullYear()}-${pad(end.getMonth()+1)}-${pad(end.getDate())}` 
    };
  }
  if (range === "this_year" || range === "year_to_date") {
    return { from: `${today.getFullYear()}-01-01`, to: todayStr };
  }
  if (range === "last_6_months") {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 5);
    d.setDate(1);
    const pad = n => String(n).padStart(2, '0');
    return { from: `${d.getFullYear()}-${pad(d.getMonth()+1)}-01`, to: todayStr };
  }
  if (range === "custom") {
    return { from: customStart || todayStr, to: customEnd || todayStr };
  }
  if (range === "all_time" || range === "all") {
    return { from: earliestTxDate || todayStr, to: todayStr };
  }
  const sixMonthStart = new Date(today);
  sixMonthStart.setMonth(sixMonthStart.getMonth() - 5);
  sixMonthStart.setDate(1);
  const pad = n => String(n).padStart(2, '0');
  return { from: `${sixMonthStart.getFullYear()}-${pad(sixMonthStart.getMonth()+1)}-01`, to: todayStr };
};

// ─────────────────────────────────────────────────────────────────────────────
// Chart colours — recharts needs real hex; UI text uses CSS vars via TOKEN
// ─────────────────────────────────────────────────────────────────────────────
const CHART = {
  income: "#0d9488",
  expense: "#f59e0b",
  net: "#2563eb",
};

const TOKEN = {
  income: "var(--color-text-success)",
  expense: "var(--color-text-danger)",
  positive: "var(--color-text-success)",
  negative: "var(--color-text-danger)",
  neutral: "var(--color-text-secondary)",
};

const REVIEW = { needs_review: "Needs review", reviewed: "Reviewed" };
const DEFAULT_FILTERS = {
  types: [],
  categories: [],
  merchants: [],
  tags: [],
  reviewStatus: [],
  visibility: "all",
  split: "all",
  notes: "all",
  account: "all",
  amount: "all",
  date: "last_6_months",
  startDate: "",
  endDate: "",
};
const INCOME_CATEGORY_SET = new Set(["Salary", "Freelance", "Investment", "Other Income", "salary", "freelance", "investment", "other income"]);

function FilterRow({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ width: "100%", border: "none", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-card)", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left", cursor: onClick ? "pointer" : "default", fontFamily: "inherit" }}>
      <span style={{ fontSize: 12.5, color: "var(--text-primary)" }}>{label}</span>
      <ChevronRight size={17} color="var(--text-secondary)" />
    </button>
  );
}

function FilterChoice({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 10px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--text-primary)" : "var(--border-default)"}`,
        background: active ? "var(--text-primary)" : "var(--bg-card)",
        color: active ? "var(--text-inverse)" : "var(--text-secondary)",
        cursor: "pointer",
        fontSize: 11.5,
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

const getAccountLabel = (tx) => (tx?.isFromCSV ? "CSV Import" : "Manual Entry");

const isDateMatch = (dateValue, filter, customStart, customEnd) => {
  if (filter === "all") return true;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return false;

  if (filter === "custom") {
    const t = target.getTime();
    const s = customStart ? new Date(customStart).getTime() : 0;
    const eDay = customEnd ? new Date(customEnd) : null;
    if (eDay) eDay.setHours(23, 59, 59, 999);
    const eTime = eDay ? eDay.getTime() : Infinity;
    return t >= s && t <= eTime;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  if (filter === "last_7_days") { const b = new Date(todayStart); b.setDate(b.getDate() - 6); return targetStart >= b && targetStart <= todayStart; }
  if (filter === "last_30_days") { const b = new Date(todayStart); b.setDate(b.getDate() - 29); return targetStart >= b && targetStart <= todayStart; }
  if (filter === "last_6_months") { const b = new Date(now.getFullYear(), now.getMonth() - 5, 1); return targetStart >= b && targetStart <= todayStart; }
  if (filter === "this_month") return target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth();
  if (filter === "last_month") { const p = new Date(now.getFullYear(), now.getMonth() - 1, 1); return target.getFullYear() === p.getFullYear() && target.getMonth() === p.getMonth(); }
  if (filter === "this_year") return target.getFullYear() === now.getFullYear();
  return true;
};

const isAmountMatch = (amountValue, filter) => {
  if (filter === "all") return true;
  const amount = Math.abs(amountValue || 0);
  if (filter === "under_100") return amount < 100;
  if (filter === "100_to_500") return amount >= 100 && amount <= 500;
  if (filter === "500_to_1000") return amount > 500 && amount <= 1000;
  if (filter === "over_1000") return amount > 1000;
  return true;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
function ReportsTab({
  apiTransactions = [],
  isMobile = false,
  preferredCurrency: preferredCurrencyProp,
  reportPreferences,
  activeTab,
}) {
  const { user } = useAuthContext();
  const preferredCurrency = preferredCurrencyProp || getUserCurrency(user);

  // ── Core state ────────────────────────────────────────────────────────────
  // reportTab controls which sub-tab is active: cashflow | expenses | income
  const [reportTab, setReportTab] = useState(reportPreferences?.defaultTab || "cashflow");

  // viewBy controls table + chart breakdown: Month | Category | Summary
  // IMPORTANT: viewBy is INDEPENDENT of reportTab — changing one must never reset the other.
  // Default to "Month" unless a valid preference is provided.
  const [viewBy, setViewBy] = useState(() => {
    const pref = reportPreferences?.defaultViewBy;
    if (typeof pref === "string") {
      const normalized = pref.charAt(0).toUpperCase() + pref.slice(1).toLowerCase();
      if (["Month", "Category", "Summary"].includes(normalized)) return normalized;
    }
    return "Month";
  });

  // showIncomeOnCashflow / showExpenseOnCashflow are LOCAL cashflow legend toggles.
  // They only affect which bars render on the cashflow chart.
  // They do NOT change reportTab. This fixes the "legend buttons break the chart" bug.
  const [showIncome, setShowIncome] = useState(true);
  const [showExpense, setShowExpense] = useState(true);
  const [showNetTrend, setShowNetTrend] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [tableSort, setTableSort] = useState({ key: "month", dir: "desc" });
  const [viewByOpen, setViewByOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilterSection, setActiveFilterSection] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [saveName, setSaveName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);

  // ── Detail sidebar state ───────────────────────────────────────────────────
  const [selectedDetail, setSelectedDetail] = useState(null); // { type, key, label, value, ... }

  const queryClient = useQueryClient();

  const { data: savedReportsRes, isLoading: isLoadingSaved } = useQuery({
    queryKey: ["saved-reports"],
    queryFn: () => dashboardService.getSavedReports().then((res) => res.data),
  });

  const userSavedReports = useMemo(() => savedReportsRes?.reports || [], [savedReportsRes]);

  const saveReportMutation = useMutation({
    mutationFn: (payload) => dashboardService.saveReport(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-reports"] });
      dedupToast.success("Report saved");
      setSaveName("");
      setSaveOpen(false);
    },
    onError: () => dedupToast.error("Failed to save report"),
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id) => dashboardService.deleteSavedReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-reports"] });
      dedupToast.success("Report removed");
    },
    onError: () => dedupToast.error("Failed to remove report"),
  });

  const viewByRef = useRef(null);

  // ── Date range ────────────────────────────────────────────────────────────
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const sixMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  }, []);

  const earliestTxDate = useMemo(() => {
    if (!apiTransactions.length) return null;
    const ts = apiTransactions.map((t) => new Date(t?.date).getTime()).filter(Number.isFinite);
    return ts.length ? new Date(Math.min(...ts)).toISOString().slice(0, 10) : null;
  }, [apiTransactions]);

  const latestTxDate = useMemo(() => {
    if (!apiTransactions.length) return todayStr;
    const ts = apiTransactions.map((t) => new Date(t?.date).getTime()).filter(Number.isFinite);
    return ts.length ? new Date(Math.max(...ts)).toISOString().slice(0, 10) : todayStr;
  }, [apiTransactions, todayStr]);

  const defaultFrom = sixMonthsAgo;
  const defaultTo = todayStr;

  // Initialize date range on mount or when preferences change
  useEffect(() => {
    if (!dateFrom) setDateFrom(defaultFrom);
    if (!dateTo) setDateTo(defaultTo);
  }, [defaultFrom, defaultTo]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setSelectedMonthKey(null);
    setSelectedDetail(null); // Clear detail sidebar when date range changes
  }, [dateFrom, dateTo]);

  // Reset sort only — never touch viewBy when reportTab changes.
  // Old bug: viewBy was reset to "Month" here, breaking the dropdown.
  useEffect(() => {
    setTableSort({ key: "month", dir: "desc" });
    setSelectedMonthKey(null);
    setSelectedDetail(null); // Clear detail sidebar when tab changes
  }, [reportTab]);

  const previousActiveTabRef = useRef(null);

  useEffect(() => {
    if (activeTab === "reports" && previousActiveTabRef.current !== "reports") {
      setReportTab("cashflow");
    }
    previousActiveTabRef.current = activeTab;
  }, [activeTab]);

  // Filter states
  useEffect(() => {
    if (filterOpen) { setDraftFilters(filters); setActiveFilterSection(null); }
  }, [filterOpen, filters]);

  // Unique values for filter options
  const uniqueCategories = useMemo(() => Array.from(new Set(apiTransactions.map((tx) => tx.category).filter(Boolean))), [apiTransactions]);
  const uniqueMerchants = useMemo(() => Array.from(new Set(apiTransactions.map((tx) => tx.merchant).filter(Boolean))), [apiTransactions]);
  const uniqueTags = useMemo(() => Array.from(new Set(apiTransactions.map((tx) => tx.tag).filter(Boolean))), [apiTransactions]);
  const uniqueAccounts = useMemo(() => Array.from(new Set(apiTransactions.map((tx) => getAccountLabel(tx)))), [apiTransactions]);

  // Outside-click closes viewBy dropdown
  useEffect(() => {
    const h = (e) => { if (viewByRef.current && !viewByRef.current.contains(e.target)) setViewByOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Normalize transactions ────────────────────────────────────────────────
  const normalizedTransactions = useMemo(() => {
    const incomeCats = new Set(["salary", "freelance", "investment", "other income"]);
    return (apiTransactions || [])
      .map((t) => {
        const rawType = String(t?.type || "").trim().toLowerCase();
        const category = String(t?.category || "").trim().toLowerCase();
        let type;
        if (rawType === "income" || rawType === "credit") type = "income";
        else if (rawType === "expense" || rawType === "debit") type = "expense";
        else if (incomeCats.has(category)) type = "income";
        else type = "expense";
        const parsedDate = new Date(t?.date);
        return { ...t, _type: type, _amount: Math.abs(Number(t?.amount) || 0), _date: parsedDate };
      })
      .filter((t) => !Number.isNaN(t._date.getTime()));
  }, [apiTransactions]);

  // ── Filter by selected date range ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...normalizedTransactions];

    // Search filter (if search state were added later)
    // if (search.trim()) { ... }

    // Apply sidebar filters
    if (filters.types.length) list = list.filter((t) => filters.types.includes(t._type));
    if (filters.categories.length) list = list.filter((t) => filters.categories.includes(t.category));
    if (filters.merchants.length) list = list.filter((t) => filters.merchants.includes(t.merchant));
    if (filters.tags.length) list = list.filter((t) => filters.tags.includes(t.tag));
    if (filters.reviewStatus.length) list = list.filter((t) => filters.reviewStatus.includes(t.reviewStatus || "needs_review"));
    if (filters.visibility === "visible") list = list.filter((t) => !t.isHidden);
    if (filters.visibility === "hidden") list = list.filter((t) => !!t.isHidden);
    if (filters.split === "split") list = list.filter((t) => (t.merchant || "").toLowerCase().includes("part 2"));
    if (filters.split === "not_split") list = list.filter((t) => !(t.merchant || "").toLowerCase().includes("part 2"));
    if (filters.notes === "with_notes") list = list.filter((t) => !!(t.notes || "").trim());
    if (filters.notes === "without_notes") list = list.filter((t) => !(t.notes || "").trim());
    if (filters.account === "manual") list = list.filter((t) => !t.isFromCSV);
    if (filters.account === "csv") list = list.filter((t) => !!t.isFromCSV);
    
    // Amount filter
    if (filters.amount !== "all") list = list.filter((t) => isAmountMatch(t._amount, filters.amount));

    // Date filter
    if (filters.date !== "all") {
      list = list.filter((t) => isDateMatch(t.date, filters.date, filters.startDate, filters.endDate));
    } else {
      // Fallback to the default range selected via sub-tab or custom range if date filter is 'all'
      const from = new Date(dateFrom);
      const to = new Date(dateTo); 
      to.setHours(23, 59, 59, 999);
      list = list.filter((t) => t._date >= from && t._date <= to);
    }

    return list;
  }, [normalizedTransactions, filters, dateFrom, dateTo]);

  // ── Monthly buckets ────────────────────────────────────────────────────────
  const monthlyBuckets = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      const d = t._date;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { income: 0, expense: 0, expenseCats: {}, incomeCats: {} };
      const cat = t.category || "Other";
      if (t._type === "income") {
        map[key].income += t._amount;
        map[key].incomeCats[cat] = (map[key].incomeCats[cat] || 0) + t._amount;
      } else {
        map[key].expense += t._amount;
        map[key].expenseCats[cat] = (map[key].expenseCats[cat] || 0) + t._amount;
      }
    });
    // Fill every calendar month in the range (even empty months)
    const result = [];
    const cur = new Date(new Date(dateFrom).setDate(1));
    const end = new Date(dateTo);
    while (cur <= end) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
      const label = cur.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", "'");
      const longLabel = cur.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      result.push({ key, label, longLabel, ...(map[key] || { income: 0, expense: 0, expenseCats: {}, incomeCats: {} }) });
      cur.setMonth(cur.getMonth() + 1);
    }
    return result;
  }, [filtered, dateFrom, dateTo]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalIncome = monthlyBuckets.reduce((s, m) => s + m.income, 0);
  const totalExpenses = monthlyBuckets.reduce((s, m) => s + m.expense, 0);
  const netCashFlow = totalIncome - totalExpenses;
  const avgCashFlow = monthlyBuckets.length > 0 ? netCashFlow / monthlyBuckets.length : 0;

  // ── Chart data (monthly) ──────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const now = new Date();
    const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return monthlyBuckets.map((m) => ({
      key: m.key,
      month: m.longLabel.split(" ")[0],   // short month name for X-axis
      longLabel: m.longLabel,
      income: m.income,
      expense: m.expense,
      net: m.income - m.expense,
      topExpenseCat: Object.entries(m.expenseCats || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "General",
      topIncomeCat: Object.entries(m.incomeCats || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "General",
      isCurrent: m.key === curMonthKey,
    }));
  }, [monthlyBuckets]);

  // ── Y-axis domain for cash flow chart ─────────────────────────────────────
  // FIX: use separate domains per data series so bars aren't crushed to invisible
  // when one value is orders of magnitude larger than another.
  const cashFlowDomain = useMemo(() => {
    if (!chartData.length) return [0, 100];
    let min = 0, max = 0;
    chartData.forEach((r) => {
      if (showIncome) max = Math.max(max, r.income);
      if (showExpense) max = Math.max(max, r.expense);
      if (showNetTrend) {
        min = Math.min(min, r.net);
        max = Math.max(max, r.net);
      }
    });
    if (max === 0 && min === 0) return [0, 100];
    const absMax = Math.max(Math.abs(min), Math.abs(max));
    const limit = Math.ceil((absMax * 1.15) / 1000) * 1000 || 100;
    return [min < 0 ? -limit : 0, limit];
  }, [chartData, showIncome, showExpense, showNetTrend]);

  // ── Drill-down: filter to selected month ──────────────────────────────────
  const filteredForBreakdown = useMemo(() => {
    if (!selectedMonthKey) return filtered;
    return filtered.filter((t) => {
      const d = t._date;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return key === selectedMonthKey;
    });
  }, [filtered, selectedMonthKey]);

  const selectedMonthSummary = useMemo(
    () => (selectedMonthKey ? chartData.find((m) => m.key === selectedMonthKey) || null : null),
    [chartData, selectedMonthKey]
  );

  // ── Category rows ──────────────────────────────────────────────────────────
  // FIX: depends on filteredForBreakdown (not filtered) — drill-down works.
  // FIX: for cashflow tab, shows BOTH income and expense categories.
  const categoryRows = useMemo(() => {
    const map = {};
    filteredForBreakdown.forEach((t) => {
      const cat = t.category || "Other";
      const key = `${cat}__${t._type}`;
      if (!map[key]) map[key] = { category: cat, type: t._type, amount: 0, count: 0 };
      map[key].amount += t._amount;
      map[key].count++;
    });

    const all = Object.values(map);
    const relevant = all.filter((r) => {
      if (reportTab === "expenses") return r.type === "expense";
      if (reportTab === "income") return r.type === "income";
      return true; // cashflow: show all
    });

    const grandTotal = relevant.reduce((s, r) => s + r.amount, 0);
    return relevant
      .map((r) => ({
        key: `${r.category}__${r.type}`,
        label: r.category,
        typeLabel: r.type === "income" ? "Income" : "Expense",
        current: r.amount,
        count: r.count,
        pct: grandTotal > 0 ? Math.round((r.amount / grandTotal) * 100) : 0,
      }))
      .sort((a, b) => {
        const dir = tableSort.dir === "asc" ? 1 : -1;
        if (tableSort.key === "value") return (a.current - b.current) * dir;
        if (tableSort.key === "change") return (a.pct - b.pct) * dir;
        return a.label.localeCompare(b.label) * dir;
      });
  }, [filteredForBreakdown, reportTab, tableSort]);

  const categoryChartData = useMemo(
    () => categoryRows.slice(0, 10).map((r) => ({ name: r.label, value: r.current, type: r.typeLabel })),
    [categoryRows]
  );

  // ── Summary (type) rows ────────────────────────────────────────────────────
  // FIX: Summary rows show BOTH income and expenses regardless of reportTab.
  // Previously clicking an Income row triggered setReportTab("income") which
  // then caused the Expenses row to disappear from typeRows. Now the Summary
  // view always computes from all transactions in the period.
  const summaryRows = useMemo(() => {
    let inc = 0, exp = 0, incCount = 0, expCount = 0;
    filteredForBreakdown.forEach((t) => {
      if (t._type === "income") { inc += t._amount; incCount++; }
      else { exp += t._amount; expCount++; }
    });
    const total = inc + exp;
    return [
      { key: "income", label: "Income", current: inc, count: incCount, pct: total > 0 ? Math.round((inc / total) * 100) : 0 },
      { key: "expense", label: "Expenses", current: exp, count: expCount, pct: total > 0 ? Math.round((exp / total) * 100) : 0 },
    ].sort((a, b) => {
      const dir = tableSort.dir === "asc" ? 1 : -1;
      if (tableSort.key === "value") return (a.current - b.current) * dir;
      if (tableSort.key === "change") return (a.pct - b.pct) * dir;
      return a.label.localeCompare(b.label) * dir;
    });
  }, [filteredForBreakdown, tableSort]);

  // ── Month rows ─────────────────────────────────────────────────────────────
  const monthRows = useMemo(() => {
    const rows = [...monthlyBuckets].reverse().map((m, i, arr) => {
      const prev = arr[i + 1];
      const current = reportTab === "income" ? m.income
        : reportTab === "expenses" ? m.expense
          : m.income - m.expense;
      const prevVal = prev
        ? (reportTab === "income" ? prev.income
          : reportTab === "expenses" ? prev.expense
            : prev.income - prev.expense)
        : null;
      const changePct = prevVal != null && prevVal !== 0
        ? Math.round(((current - prevVal) / Math.abs(prevVal)) * 100)
        : 0;
      return { key: m.key, label: m.longLabel, current, changePct };
    });
    return rows.sort((a, b) => {
      const dir = tableSort.dir === "asc" ? 1 : -1;
      if (tableSort.key === "value") return (a.current - b.current) * dir;
      if (tableSort.key === "change") return (a.changePct - b.changePct) * dir;
      return a.key.localeCompare(b.key) * dir;
    });
  }, [monthlyBuckets, reportTab, tableSort]);

  // ── Active table rows ──────────────────────────────────────────────────────
  const tableRows = viewBy === "Category" ? categoryRows
    : viewBy === "Summary" ? summaryRows
      : monthRows;

  // ── Date range label ───────────────────────────────────────────────────────
  const dateRangeLabel = useMemo(() => {
    const fmt = (s) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
  }, [dateFrom, dateTo]);

  // ── Formatter ──────────────────────────────────────────────────────────────
  const fmt = (n) => {
    const abs = Math.abs(n || 0);
    const neg = n < 0 ? "-" : "";
    return neg + formatCurrencyAmount(abs, preferredCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ── Has data ───────────────────────────────────────────────────────────────
  const hasData = reportTab === "income" ? totalIncome > 0
    : reportTab === "expenses" ? totalExpenses > 0
      : totalIncome > 0 || totalExpenses > 0;

  // ── Save / load report ─────────────────────────────────────────────────────
  const handleSave = () => {
    const now = new Date();
    const fb = `Report ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })} ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    const name = saveName.trim() || fb;
    
    saveReportMutation.mutate({
      name,
      tab: reportTab,
      viewBy,
      dateFrom,
      dateTo,
      showIncome,
      showExpense,
      showNetTrend,
      selectedMonthKey
    });
  };

  const loadReport = (r) => {
    setReportTab(r.tab);
    setViewBy(r.viewBy || "Month");
    setDateFrom(r.dateFrom);
    setDateTo(r.dateTo);
    setShowIncome(r.showIncome !== undefined ? r.showIncome : true);
    setShowExpense(r.showExpense !== undefined ? r.showExpense : true);
    setShowNetTrend(r.showNetTrend !== undefined ? r.showNetTrend : false);
    setSelectedMonthKey(r.selectedMonthKey || null);
    dedupToast.info(`Loaded report: ${r.name}`);
  };

  const toggleTableSort = (key) => {
    setTableSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "month" ? "desc" : "desc" }
    );
  };

  const activateMonth = (key, label) => {
    setSelectedMonthKey((prev) => {
      const next = prev === key ? null : key;
      if (next && label) dedupToast.info(`Drilling into ${label}`);
      return next;
    });
  };

  // ── Detail sidebar handler ─────────────────────────────────────────────────
  const openDetailSidebar = (row) => {
    // Compute transactions for this selection
    let relatedTxs = [];
    
    if (viewBy === "Month") {
      // Get transactions for the selected month
      relatedTxs = filtered.filter((t) => {
        const d = t._date;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return key === row.key;
      });
    } else if (viewBy === "Category") {
      // Get transactions for the selected category
      relatedTxs = filtered.filter((t) => {
        return t.category === row.label && (reportTab === "cashflow" ? true : t._type === (reportTab === "income" ? "income" : "expense"));
      });
    } else if (viewBy === "Summary") {
      // Get transactions for income or expense type
      relatedTxs = filtered.filter((t) => {
        return row.key === "income" ? t._type === "income" : t._type === "expense";
      });
    }
    
    // Compute income, expense, and categories
    let income = 0, expense = 0;
    const catMap = {};
    relatedTxs.forEach((t) => {
      if (t._type === "income") income += t._amount;
      else expense += t._amount;
      const cat = t.category || "Other";
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    
    // Get largest transactions (top 5)
    const largestTxs = [...relatedTxs].sort((a, b) => b._amount - a._amount).slice(0, 5);
    
    // Get most frequent categories
    const freqCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
    
    setSelectedDetail({
      type: viewBy,
      key: row.key,
      label: row.label,
      value: row.current,
      count: row.count,
      pct: row.pct,
      changePct: row.changePct,
      typeLabel: row.typeLabel,
      income,
      expense,
      relatedTxs,
      relatedTxCount: relatedTxs.length,
    });
  };

  const renderTransactionList = (txs) => {
    if (!txs || txs.length === 0) {
      return <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "40px 0" }}>No transactions found for this period.</div>;
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[...txs].sort((a,b) => new Date(b.date) - new Date(a.date)).map(tx => {
          const meta = getSpendingCategoryMeta(tx.category);
          const color = meta?.color || C.sub;
          const Icon = meta?.icon || BadgeDollarSign;
          return (
            <div 
              key={tx._id} 
              onClick={() => setGlobalSelectedTxId(tx._id)}
              style={{ 
                display: "flex", alignItems: "center", gap: 12, padding: "12px", 
                borderRadius: 12, background: "var(--bg-card)", border: `1px solid ${C.border}`,
                cursor: "pointer", transition: "background 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-muted)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tx.merchant || meta?.label || "Transaction"}
                </div>
                <div style={{ fontSize: 11, color: C.muted, display: "flex", gap: 6 }}>
                  <span>{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <span>•</span>
                  <span>{meta?.label || "Other"}</span>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                {tx._type === 'expense' ? '-' : '+'}{fmt(Math.abs(tx._amount))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const closeDetailSidebar = () => {
    setSelectedDetail(null);
    setSelectedMonthKey(null);
  };

  const getSortIcon = (key) => tableSort.key === key ? (tableSort.dir === "asc" ? " ↑" : " ↓") : "";

  const viewByOptions = useMemo(() => {
    if (reportTab === "cashflow") return ["Month", "Summary"];
    return ["Month", "Category", "Summary"];
  }, [reportTab]);

  useEffect(() => {
    if (!viewByOptions.includes(viewBy)) {
      setViewBy("Month");
    }
  }, [viewByOptions, viewBy]);

  const REPORT_TABS = [
    { id: "cashflow", label: "Cash flow" },
    { id: "expenses", label: "Expenses" },
    { id: "income", label: "Income" },
  ];

  // ── Tooltips ───────────────────────────────────────────────────────────────
  const CashFlowTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    return (
      <div style={{ background: "var(--bg-secondary)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", boxShadow: "0 10px 28px rgba(0,0,0,0.22)", minWidth: 180 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>{row?.longLabel}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {showIncome && (
            <div style={{ fontSize: 12, display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: C.sub }}>Income</span>
              <strong style={{ color: TOKEN.income }}>{fmt(row?.income)}</strong>
            </div>
          )}
          {showExpense && (
            <div style={{ fontSize: 12, display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: C.sub }}>Expenses</span>
              <strong style={{ color: TOKEN.expense }}>{fmt(row?.expense)}</strong>
            </div>
          )}
          {showNetTrend && (
            <div style={{ fontSize: 12.5, display: "flex", justifyContent: "space-between", gap: 16, borderTop: `1px solid ${C.border}`, paddingTop: 6, marginTop: 2 }}>
              <span style={{ color: C.text }}>Net</span>
              <strong style={{ color: (row?.net || 0) >= 0 ? TOKEN.positive : TOKEN.negative }}>{fmt(row?.net)}</strong>
            </div>
          )}
        </div>
      </div>
    );
  };

  const BarTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    const val = payload[0]?.value ?? 0;
    const isExp = reportTab === "expenses";
    return (
      <div style={{ background: "var(--bg-secondary)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", boxShadow: "0 10px 24px rgba(0,0,0,0.22)", minWidth: 170 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>{row?.longLabel}</div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 3 }}>
          {isExp ? "Expenses" : "Income"}: <strong style={{ color: isExp ? TOKEN.expense : TOKEN.income }}>{fmt(val)}</strong>
        </div>
        <div style={{ fontSize: 12, color: C.sub }}>
          Category: <strong style={{ color: C.text }}>{isExp ? row?.topExpenseCat : row?.topIncomeCat}</strong>
        </div>
      </div>
    );
  };

  const CategoryTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    return (
      <div style={{ background: "var(--bg-secondary)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "8px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{row?.name}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 3 }}>{fmt(row?.value)}</div>
      </div>
    );
  };

  const renderFilterSection = () => {
    if (!activeFilterSection) return null;
    const wrapStyle = { padding: "16px 18px", borderTop: `1px solid ${C.border2}`, background: C.white };

    const sectionMap = {
      categories: uniqueCategories.slice(0, 14).map((c) => (
        <FilterChoice key={c} active={draftFilters.categories.includes(c)} label={getSpendingCategoryLabel(c)} onClick={() => toggleDraftArray("categories", c)} />
      )),
      date: [
        ["all", "All time"], ["last_6_months", "Last 6 months"], ["last_7_days", "Last 7 days"], ["last_30_days", "Last 30 days"],
        ["this_month", "This month"], ["last_month", "Last month"], ["this_year", "This year"],
        ["custom", "Custom Range"]
      ].map(([v, l]) => (
        <div key={v} style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
          <FilterChoice active={draftFilters.date === v} label={l} onClick={() => setDraftFilters((p) => ({ ...p, date: v }))} />
          {v === "custom" && draftFilters.date === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, padding: "0 4px" }}>
              <input
                type="date"
                value={draftFilters.startDate}
                onChange={(e) => setDraftFilters(p => ({ ...p, startDate: e.target.value }))}
                style={{ fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 6px", background: "var(--bg-card)", color: C.text }}
              />
              <span style={{ fontSize: 10, color: C.muted }}>to</span>
              <input
                type="date"
                value={draftFilters.endDate}
                onChange={(e) => setDraftFilters(p => ({ ...p, endDate: e.target.value }))}
                style={{ fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 6px", background: "var(--bg-card)", color: C.text }}
              />
            </div>
          )}
        </div>
      )),
      accounts: [["all", `All (${uniqueAccounts.length || 1})`], ["manual", "Manual"], ["csv", "CSV"]].map(([v, l]) => (
        <FilterChoice key={v} active={draftFilters.account === v} label={l} onClick={() => setDraftFilters((p) => ({ ...p, account: v }))} />
      )),
      tags: uniqueTags.length ? uniqueTags.slice(0, 12).map((t) => (
        <FilterChoice key={t} active={draftFilters.tags.includes(t)} label={t} onClick={() => toggleDraftArray("tags", t)} />
      )) : [<div key="none" style={{ fontSize: 13, color: "#98a2b3" }}>No tags available</div>],
      merchants: uniqueMerchants.slice(0, 12).map((m) => (
        <FilterChoice key={m} active={draftFilters.merchants.includes(m)} label={m} onClick={() => toggleDraftArray("merchants", m)} />
      )),
      amount: [["all", "All"], ["under_100", "Under $100"], ["100_to_500", "$100–$500"], ["500_to_1000", "$500–$1k"], ["over_1000", "Over $1k"]].map(([v, l]) => (
        <FilterChoice key={v} active={draftFilters.amount === v} label={l} onClick={() => setDraftFilters((p) => ({ ...p, amount: v }))} />
      )),
      visibility: [["all", "All"], ["visible", "Visible"], ["hidden", "Hidden"]].map(([v, l]) => (
        <FilterChoice key={v} active={draftFilters.visibility === v} label={l} onClick={() => setDraftFilters((p) => ({ ...p, visibility: v }))} />
      )),
      split: [["all", "All"], ["split", "Split"], ["not_split", "Not split"]].map(([v, l]) => (
        <FilterChoice key={v} active={draftFilters.split === v} label={l} onClick={() => setDraftFilters((p) => ({ ...p, split: v }))} />
      )),
      status: [["expense", "Expense"], ["income", "Income"]].map(([v, l]) => (
        <FilterChoice key={v} active={draftFilters.types.includes(v)} label={l} onClick={() => toggleDraftArray("types", v)} />
      )),
      notes: [["all", "All"], ["with_notes", "With notes"], ["without_notes", "No notes"]].map(([v, l]) => (
        <FilterChoice key={v} active={draftFilters.notes === v} label={l} onClick={() => setDraftFilters((p) => ({ ...p, notes: v }))} />
      )),
      reviewStatus: [["needs_review", "Needs review"], ["reviewed", "Reviewed"]].map(([v, l]) => (
        <FilterChoice key={v} active={draftFilters.reviewStatus.includes(v)} label={l} onClick={() => toggleDraftArray("reviewStatus", v)} />
      )),
    };

    const items = sectionMap[activeFilterSection];
    if (!items) return null;
    return <div style={wrapStyle}><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{items}</div></div>;
  };

  const toggleDraftArray = (key, value) => {
    setDraftFilters((prev) => {
      const next = new Set(prev[key]);
      next.has(value) ? next.delete(value) : next.add(value);
      return { ...prev, [key]: Array.from(next) };
    });
  };

  // ── Apply filters and update date range ────────────────────────────────────
  const applyFilters = () => {
    // Update filters
    setFilters({ ...draftFilters });
    
    // Update date range based on the selected date filter
    if (draftFilters.date !== "all") {
      const ranges = rangeToDates(draftFilters.date, earliestTxDate, todayStr, draftFilters.startDate, draftFilters.endDate);
      setDateFrom(ranges.from);
      setDateTo(ranges.to);
    } else {
      // If it's all, we still want to show the full range
      const ranges = rangeToDates("all", earliestTxDate, todayStr);
      setDateFrom(ranges.from);
      setDateTo(ranges.to);
    }
    
    setActiveFilterSection(null);
    setFilterOpen(false);
    setSelectedMonthKey(null);
    setSelectedDetail(null);
  };

  const selectedFilterCount = useMemo(() => [
    filters.types.length, filters.categories.length, filters.merchants.length, filters.tags.length, filters.reviewStatus.length,
    filters.visibility !== "all" ? 1 : 0, filters.split !== "all" ? 1 : 0, filters.notes !== "all" ? 1 : 0,
    filters.amount !== "all" ? 1 : 0, filters.account !== "all" ? 1 : 0, filters.date !== "all" ? 1 : 0
  ].reduce((s, v) => s + v, 0), [filters]);

  // ── Render chart ───────────────────────────────────────────────────────────
  const renderChart = () => {
    if (viewBy === "Summary") {
      const summaryData = [
        { name: "Income", value: totalIncome, fill: CHART.income },
        { name: "Expenses", value: totalExpenses, fill: CHART.expense },
      ];
      return (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={summaryData} margin={{ top: 20, right: 60, bottom: 20, left: 20 }}>
            <CartesianGrid vertical={false} stroke="var(--border-subtle, rgba(0,0,0,0.06))" strokeDasharray="4 4" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: C.text, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis
              orientation="right"
              tickFormatter={(v) => formatAmount(v, { maximumFractionDigits: 0 })}
              tick={{ fontSize: 10, fill: C.muted }}
              axisLine={false} tickLine={false} width={55}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", boxShadow: "0 10px 28px rgba(0,0,0,0.22)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>{data.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: data.fill }}>{fmt(data.value)}</div>
                  </div>
                );
              }}
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60} />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    // ── (A) Cash flow: grouped income + expense bars + net line ──
    if (reportTab === "cashflow") {
      return (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 14, paddingLeft: 6 }}>
            <button
              type="button"
              onClick={() => setShowIncome((v) => !v)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, border: "none", background: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", opacity: showIncome ? 1 : 0.4, transition: "opacity 0.15s", color: C.text }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 999, background: CHART.income, display: "inline-block", flexShrink: 0 }} />
              Income
            </button>
            <button
              type="button"
              onClick={() => setShowExpense((v) => !v)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, border: "none", background: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", opacity: showExpense ? 1 : 0.4, transition: "opacity 0.15s", color: C.text }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 999, background: CHART.expense, display: "inline-block", flexShrink: 0 }} />
              Expenses
            </button>
            <button
              type="button"
              onClick={() => setShowNetTrend((v) => !v)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, border: "none", background: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", opacity: showNetTrend ? 1 : 0.4, transition: "opacity 0.15s", color: C.text }}
            >
              <span style={{ width: 20, height: 2, background: CHART.net, display: "inline-block" }} />
              Net
            </button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 60, bottom: 0, left: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="var(--border-subtle, rgba(0,0,0,0.06))" strokeDasharray="4 4" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis
                orientation="right"
                tickFormatter={(v) => formatAmount(v, { maximumFractionDigits: 0 })}
                tick={{ fontSize: 10, fill: C.muted }}
                axisLine={false} tickLine={false} width={55}
              />
              <Tooltip content={<CashFlowTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
              {showIncome && (
                <Bar dataKey="income" name="Income" fill={CHART.income} radius={[4, 4, 0, 0]} maxBarSize={28} onClick={(data) => {
                  activateMonth(data.month, data.month);
                  openDetailSidebar({ key: data.month, label: data.month, value: data.income });
                }} cursor="pointer" />
              )}
              {showExpense && (
                <Bar dataKey="expense" name="Expenses" fill={CHART.expense} radius={[4, 4, 0, 0]} maxBarSize={28} onClick={(data) => {
                  activateMonth(data.month, data.month);
                  openDetailSidebar({ key: data.month, label: data.month, value: data.expense });
                }} cursor="pointer" />
              )}
              {showNetTrend && (
                <Line
                  type="monotone" dataKey="net" name="Net"
                  stroke={CHART.net} strokeWidth={2.5} dot={false}
                  activeDot={{ r: 4, fill: CHART.net, stroke: C.white, strokeWidth: 2 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // ── (B) Expenses / Income — Category pie chart ──
    if (viewBy === "Category") {
      if (!categoryChartData.length) {
        return <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: C.muted }}>No category data for this period.</div>;
      }
      return (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={categoryChartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
            >
              {categoryChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getSpendingCategoryMeta(entry.name)?.color || C.sub} style={{ outline: 'none' }} cursor="pointer" onClick={() => {
                  const categoryRow = categoryRows.find((r) => r.label === entry.name);
                  if (categoryRow) openDetailSidebar(categoryRow);
                }} />
              ))}
            </Pie>
            <Tooltip content={<CategoryTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    // ── (C) Expenses / Income — Monthly vertical bars ──
    const barColor = reportTab === "expenses" ? CHART.expense : CHART.income;
    const barDataKey = reportTab === "expenses" ? "expense" : "income";
    return (
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 60, bottom: 0, left: 0 }} barCategoryGap="35%">
          <CartesianGrid vertical={false} stroke="var(--border-subtle, rgba(0,0,0,0.06))" strokeDasharray="4 4" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
          <YAxis
            orientation="right"
            tickFormatter={(v) => formatAmount(v, { maximumFractionDigits: 0 })}
            tick={{ fontSize: 10, fill: C.muted }}
            axisLine={false} tickLine={false} width={55}
          />
          <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
          <Bar dataKey={barDataKey} fill={barColor} radius={[4, 4, 0, 0]} maxBarSize={36} onClick={(data) => {
            activateMonth(data.month, data.month);
            openDetailSidebar({ key: data.month, label: data.month, value: data[barDataKey] });
          }} cursor="pointer" />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  // ── Change badge ───────────────────────────────────────────────────────────
  const ChangeBadge = ({ changePct }) => {
    const isIncome = reportTab === "income";
    const isGood = changePct === 0 ? null : changePct > 0 ? isIncome : !isIncome;
    const color = isGood === null ? TOKEN.neutral : isGood ? TOKEN.positive : TOKEN.negative;
    const bg = isGood === null ? "var(--color-background-secondary)"
      : isGood ? "var(--color-background-success)"
        : "var(--color-background-danger)";
    const arrow = changePct > 0 ? "▲" : changePct < 0 ? "▼" : "•";
    return (
      <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: bg, color, display: "inline-block" }}>
        {changePct > 0 ? "+" : ""}{changePct}% {arrow}
      </span>
    );
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  const EmptyState = () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 18, color: C.muted, lineHeight: 1 }}>!</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Not enough data to create a report</div>
      <div style={{ fontSize: 13, color: C.muted, textAlign: "center" }}>Add transactions to create a report of your finances.</div>
    </div>
  );

  // ── Shared cell styles ─────────────────────────────────────────────────────
  const th = (extra = {}) => ({
    padding: "11px 16px", fontSize: 11, fontWeight: 600, color: C.muted,
    cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", ...extra,
  });
  const td = (extra = {}) => ({
    padding: "12px 16px", fontSize: 13.5, color: "var(--color-text-primary)", ...extra,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 16, alignItems: "flex-start" }}>

      {/* ════════ LEFT: main panel ════════ */}
      <div style={{ width: "100%", flex: 1, minWidth: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 16px" : "14px 20px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Reports</span>
          <button
            type="button" onClick={() => setFilterOpen((v) => !v)}
            style={{
              width: 30, height: 30, borderRadius: 7, cursor: "pointer", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1px solid ${filterOpen || selectedFilterCount ? "var(--color-text-primary)" : C.border}`,
              background: filterOpen || selectedFilterCount ? "var(--color-text-primary)" : "var(--bg-secondary)",
              appearance: "none", outline: "none",
              position: "relative",
            }}
          >
            <Filter size={13} style={{ color: filterOpen || selectedFilterCount ? "var(--color-background-primary)" : C.muted }} />
            {selectedFilterCount > 0 && !filterOpen && (
              <span style={{ position: "absolute", top: -2, right: -2, width: 6, height: 6, borderRadius: "50%", background: "#ef4444", border: `1px solid ${C.white}` }} />
            )}
          </button>
        </div>



        {/* Sub-tabs */}
        <div style={{ display: "flex", background: "var(--bg-subtle)", borderRadius: 10, padding: 4, margin: isMobile ? "10px 16px" : "14px 20px" }}>
          {REPORT_TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setReportTab(t.id)}
              style={{
                flex: 1, padding: "8px 0", border: "none", borderRadius: 8,
                cursor: "pointer", fontFamily: "inherit", fontSize: 13, transition: "all 0.15s",
                background: reportTab === t.id ? "var(--color-background-primary)" : "transparent",
                fontWeight: reportTab === t.id ? 700 : 500,
                color: reportTab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                boxShadow: reportTab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Title + controls */}
        <div style={{ display: "flex", alignItems: isMobile ? "stretch" : "flex-start", justifyContent: "space-between", padding: isMobile ? "12px 16px 12px" : "16px 20px 12px", flexDirection: isMobile ? "column" : "row", gap: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Report Summary</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
              <div style={{ color: C.text, fontSize: 13.5, fontWeight: 500, padding: "4px 0" }}>
                {(() => {
                  const formatShort = (value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  const rangeLabel = `Last 6 months (${formatShort(dateFrom || defaultFrom)} - ${formatShort(dateTo || defaultTo)})`;
                  if (filters.date !== "all") {
                    if (filters.date === "last_6_months") return rangeLabel;
                    if (filters.date === "last_30_days") return `Last 30 days (${formatShort(dateFrom || defaultFrom)} - ${formatShort(dateTo || defaultTo)})`;
                    if (filters.date === "last_90_days") return `Last 90 days (${formatShort(dateFrom || defaultFrom)} - ${formatShort(dateTo || defaultTo)})`;
                    if (filters.date === "this_month") return `This month (${formatShort(dateFrom || defaultFrom)} - ${formatShort(dateTo || defaultTo)})`;
                    if (filters.date === "last_month") return `Last month (${formatShort(dateFrom || defaultFrom)} - ${formatShort(dateTo || defaultTo)})`;
                    if (filters.date === "this_year") return `This year (${formatShort(dateFrom || defaultFrom)} - ${formatShort(dateTo || defaultTo)})`;
                    if (filters.date === "last_7_days") return `Last 7 days (${formatShort(dateFrom || defaultFrom)} - ${formatShort(dateTo || defaultTo)})`;
                    if (filters.date === "custom") {
                      if (!filters.startDate && !filters.endDate) return `Custom range (${formatShort(dateFrom || defaultFrom)} - ${formatShort(dateTo || defaultTo)})`;
                      const s = filters.startDate ? new Date(filters.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '...';
                      const e = filters.endDate ? new Date(filters.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '...';
                      return `Custom (${s} - ${e})`;
                    }
                    return rangeLabel;
                  }
                  return rangeLabel;
                })()}
              </div>
              {selectedMonthKey && (
                <div style={{ alignSelf: "flex-end", paddingBottom: 6 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--bg-secondary)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{selectedMonthSummary?.longLabel?.split(" ")[0]}</span>
                    <button type="button" onClick={() => setSelectedMonthKey(null)}
                      style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: C.muted, display: "flex" }}>
                      <X size={12} />
                    </button>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* View by dropdown */}
          <div ref={viewByRef} style={{ position: "relative" }}>
            <button type="button" onClick={() => setViewByOpen((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, fontSize: 12, color: C.text, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, appearance: "none", outline: "none" }}>
              View by <strong style={{ fontWeight: 700 }}>{viewBy}</strong> <ChevronDown size={11} />
            </button>
            {viewByOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.18)", zIndex: 300, minWidth: 150, overflow: "hidden" }}>
                {viewByOptions.map((v) => (
                  <button key={v} type="button"
                    onClick={() => { setViewBy(v); setViewByOpen(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left", padding: "10px 16px",
                      border: "none", fontFamily: "inherit", cursor: "pointer", fontSize: 13,
                      background: viewBy === v ? "var(--color-background-tertiary)" : "transparent",
                      fontWeight: viewBy === v ? 700 : 400,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chart + KPIs + Table */}
        {!hasData ? <EmptyState /> : (
          <div style={{ padding: isMobile ? "0 16px 24px" : "0 20px 24px" }}>

            <div style={{ background: C.white, borderRadius: 16, padding: isMobile ? "16px 8px 12px" : "20px 16px 16px", border: `1px solid ${C.border}`, overflow: "hidden", position: "relative", minWidth: 0, minHeight: 0 }}>
              {renderChart()}
            </div>

            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginTop: 12 }}>
              {[
                { label: "Total income", value: fmt(selectedMonthKey ? selectedMonthSummary?.income : totalIncome), color: TOKEN.income, onClick: () => setReportTab("income") },
                { label: "Total expenses", value: fmt(selectedMonthKey ? selectedMonthSummary?.expense : totalExpenses), color: TOKEN.expense, onClick: () => setReportTab("expenses") },
                { label: "Net cash flow", value: fmt(selectedMonthKey ? selectedMonthSummary?.net : netCashFlow), color: (selectedMonthKey ? (selectedMonthSummary?.net || 0) : netCashFlow) >= 0 ? TOKEN.positive : TOKEN.negative, onClick: () => setReportTab("cashflow") },
                { label: "Avg monthly net", value: fmt(selectedMonthKey ? selectedMonthSummary?.net : avgCashFlow), color: (selectedMonthKey ? (selectedMonthSummary?.net || 0) : avgCashFlow) >= 0 ? TOKEN.positive : TOKEN.negative, onClick: () => setReportTab("cashflow") },
              ].map((s) => (
                <button key={s.label} type="button" onClick={s.onClick}
                  style={{ padding: "14px 16px", borderRadius: 12, textAlign: "left", cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s", display: "flex", flexDirection: "column", gap: 4, background: "var(--bg-secondary)", border: `1px solid ${C.border}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.09)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                  <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, color: s.color }}>{s.value}</div>
                </button>
              ))}
            </div>

            {/* Hint text */}
            <div style={{ marginTop: 8, marginBottom: 4, fontSize: 12, color: C.muted }}>
              {viewBy === "Month"
                ? "Click any month row to drill into that month's data."
                : viewBy === "Category"
                  ? "Showing top categories. Click a KPI card to switch tab."
                  : "Click a row to navigate to that report view."}
            </div>

            {/* Table */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginTop: 6 }}>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? 450 : "auto" }}>
                <thead style={{ background: "var(--bg-secondary)" }}>
                  <tr>
                    {viewBy === "Month" && (
                      <>
                        <th onClick={() => toggleTableSort("month")} style={th({ textAlign: "left" })}>
                          Month{getSortIcon("month")} <ArrowDownRight size={9} style={{ verticalAlign: "middle", opacity: 0.5 }} />
                        </th>
                        {reportTab === "cashflow" ? (
                          <>
                            <th style={th({ textAlign: "right" })}>Income</th>
                            <th style={th({ textAlign: "right" })}>Expenses</th>
                            <th onClick={() => toggleTableSort("value")} style={th({ textAlign: "right" })}>Net{getSortIcon("value")}</th>
                          </>
                        ) : (
                          <>
                            <th onClick={() => toggleTableSort("value")} style={th({ textAlign: "right" })}>{reportTab === "expenses" ? "Expenses" : "Income"}{getSortIcon("value")}</th>
                            <th onClick={() => toggleTableSort("change")} style={th({ textAlign: "right" })}>vs prev month{getSortIcon("change")}</th>
                          </>
                        )}
                      </>
                    )}
                    {viewBy === "Category" && (
                      <>
                        <th onClick={() => toggleTableSort("month")} style={th({ textAlign: "left" })}>Category{getSortIcon("month")}</th>
                        {reportTab === "cashflow" && <th style={th({ textAlign: "left" })}>Type</th>}
                        <th onClick={() => toggleTableSort("value")} style={th({ textAlign: "right" })}>Amount{getSortIcon("value")}</th>
                        <th style={th({ textAlign: "right" })}>Txns</th>
                        <th onClick={() => toggleTableSort("change")} style={th({ textAlign: "right" })}>Share{getSortIcon("change")}</th>
                      </>
                    )}
                    {viewBy === "Summary" && (
                      <>
                        <th style={th({ textAlign: "left" })}>Type</th>
                        <th onClick={() => toggleTableSort("value")} style={th({ textAlign: "right" })}>Amount{getSortIcon("value")}</th>
                        <th style={th({ textAlign: "right" })}>Txns</th>
                        <th onClick={() => toggleTableSort("change")} style={th({ textAlign: "right" })}>Share{getSortIcon("change")}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: "28px 16px", textAlign: "center", color: C.muted, fontSize: 13 }}>No data for this period.</td></tr>
                  ) : tableRows.map((row) => {
                    if (viewBy === "Month") {
                      const bucket = monthlyBuckets.find((m) => m.key === row.key);
                      const isSel = selectedMonthKey === row.key;
                      return (
                        <tr key={row.key}
                          onClick={() => {
                            activateMonth(row.key, row.label);
                            openDetailSidebar(row);
                          }}
                          style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer", background: isSel ? "var(--surface-muted)" : "transparent", transition: "background 0.12s" }}
                          onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "var(--surface-muted)"; }}
                          onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
                        >
                          <td style={td({ fontWeight: 500 })}>{row.label}</td>
                          {reportTab === "cashflow" ? (
                            <>
                              <td style={td({ textAlign: "right", color: TOKEN.income })}>{fmt(bucket?.income || 0)}</td>
                              <td style={td({ textAlign: "right", color: TOKEN.expense })}>{fmt(bucket?.expense || 0)}</td>
                              <td style={td({ textAlign: "right", fontWeight: 700, color: row.current >= 0 ? TOKEN.positive : TOKEN.negative })}>{fmt(row.current)}</td>
                            </>
                          ) : (
                            <>
                              <td style={td({ textAlign: "right" })}>{fmt(row.current)}</td>
                              <td style={td({ textAlign: "right" })}><ChangeBadge changePct={row.changePct} /></td>
                            </>
                          )}
                        </tr>
                      );
                    }
                    if (viewBy === "Category") {
                      return (
                        <tr key={row.key}
                          onClick={() => openDetailSidebar(row)}
                          style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer", transition: "background 0.12s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-muted)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <td style={td({ fontWeight: 500 })}>{row.label}</td>
                          {reportTab === "cashflow" && (
                            <td style={td({ color: row.typeLabel === "Income" ? TOKEN.income : TOKEN.expense, fontWeight: 600, fontSize: 12 })}>
                              {row.typeLabel}
                            </td>
                          )}
                          <td style={td({ textAlign: "right" })}>{fmt(row.current)}</td>
                          <td style={td({ textAlign: "right", color: C.muted })}>{row.count}</td>
                          <td style={td({ textAlign: "right", fontWeight: 600 })}>{row.pct}%</td>
                        </tr>
                      );
                    }
                    if (viewBy === "Summary") {
                      return (
                        <tr key={row.key}
                          onClick={() => {
                            setReportTab(row.key === "income" ? "income" : "expenses");
                            openDetailSidebar(row);
                          }}
                          style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer", transition: "background 0.12s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-muted)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <td style={td({ fontWeight: 600, color: row.key === "income" ? TOKEN.income : TOKEN.expense })}>
                            {row.label}
                          </td>
                          <td style={td({ textAlign: "right", fontWeight: 600 })}>{fmt(row.current)}</td>
                          <td style={td({ textAlign: "right", color: C.muted })}>{row.count}</td>
                          <td style={td({ textAlign: "right", fontWeight: 700 })}>{row.pct}%</td>
                        </tr>
                      );
                    }
                    return null;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* ════════ RIGHT: Saved Reports & Drill Down sidebar ════════ */}
      {!isMobile && selectedMonthKey && (
        <div style={{ width: 300, flexShrink: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 120px)" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-subtle)" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{selectedMonthSummary?.longLabel || "Details"}</span>
            <button onClick={() => setSelectedMonthKey(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, display: "flex" }}><X size={16} /></button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            {(() => {
               const txs = selectedMonthSummary?.txs || [];
               if (!txs.length) return <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "40px 0" }}>No transactions found for this period.</div>;
               
               const income = txs.filter(t => t._type === "income").reduce((s, t) => s + t._amount, 0);
               const expense = txs.filter(t => t._type === "expense").reduce((s, t) => s + t._amount, 0);
               
               const catGroups = {};
               txs.filter(t => t._type === "expense").forEach(t => {
                 catGroups[t.category || "Uncategorized"] = (catGroups[t.category || "Uncategorized"] || 0) + t._amount;
               });
               const cats = Object.entries(catGroups).sort((a,b) => b[1]-a[1]).slice(0, 8);

               return renderTransactionList(txs);
            })()}
          </div>
        </div>
      )}
      {!isMobile && !selectedMonthKey && (
        <div style={{ width: 220, flexShrink: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Saved Reports</span>
          </div>

          {userSavedReports.length === 0 ? (
            <div style={{ padding: "24px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div style={{ fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>
                Save filters for quick access to your most used reports.
              </div>
            </div>
          ) : (
            <div style={{ padding: "8px 0" }}>
              {userSavedReports.map((r, i) => (
                <div key={r._id || i}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", transition: "background 0.12s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-muted)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  <button type="button" onClick={() => loadReport(r)}
                    style={{ flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, fontFamily: "inherit" }}>
                    <span style={{ fontSize: 12.5, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{r.name}</span>
                  </button>
                  <button type="button"
                    disabled={deleteReportMutation.isPending}
                    onClick={(e) => { e.stopPropagation(); deleteReportMutation.mutate(r._id); }}
                    style={{ background: "none", border: "none", cursor: deleteReportMutation.isPending ? "not-allowed" : "pointer", color: C.muted, padding: 2, display: "flex", flexShrink: 0 }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border}` }}>
            {saveOpen ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={saveName} onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Report name…" autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", fontSize: 12.5, color: C.text, background: "var(--bg-subtle)", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
                  onFocus={(e) => { e.target.style.borderColor = "#6366f1"; }}
                  onBlur={(e) => { e.target.style.borderColor = C.border; }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={handleSave}
                    disabled={saveReportMutation.isPending}
                    style={{ flex: 2, padding: "7px 0", borderRadius: 8, border: "none", background: C.strong, color: C.onStrong, fontSize: 12, fontWeight: 600, cursor: saveReportMutation.isPending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saveReportMutation.isPending ? 0.7 : 1 }}>
                    {saveReportMutation.isPending ? "Saving…" : "Save"}
                  </button>
                  <button type="button" onClick={() => { setSaveOpen(false); setSaveName(""); }}
                    style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.sub, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setSaveOpen(true)}
                style={{ width: "100%", padding: "9px 0", borderRadius: 9, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "background 0.12s", appearance: "none", outline: "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-muted)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.white; }}>
                Save
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══════ Detail Sidebar for Table/Chart Selections ═══════ */}
      {selectedDetail && (
        <>
          <div onClick={closeDetailSidebar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.18)", zIndex: 1000 }} />
          <div style={{
            position: "fixed",
            ...(isMobile
              ? { bottom: 0, left: 0, right: 0, height: "78vh", borderRadius: "20px 20px 0 0" }
              : { top: 12, right: 12, width: 380, maxWidth: "calc(100vw - 24px)", height: "calc(100vh - 24px)", borderRadius: 16 }),
            background: "var(--bg-secondary)",
            borderLeft: isMobile ? "none" : `1px solid ${C.border}`,
            borderTop: isMobile ? `1px solid ${C.border}` : "none",
            boxShadow: "var(--shadow-elevated)",
            zIndex: 1001,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            {isMobile && <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: "10px auto 0" }} />}
            <div style={{ padding: isMobile ? "14px 16px" : "15px 16px", borderBottom: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.18em", fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>
                {selectedDetail.type === "Month" ? `Report Details: ${selectedDetail.label}` : `${selectedDetail.type} Details: ${selectedDetail.label}`}
              </div>
              <button type="button" onClick={closeDetailSidebar} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={22} color={C.muted} /></button>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px" : "20px", display: "flex", flexDirection: "column", gap: 12 }}>
          
          {renderTransactionList(selectedDetail.relatedTxs)}

          {!isMobile && (
            <div style={{ padding: "12px 0 0", borderTop: `1px solid ${C.border2}`, marginTop: "auto" }}>
              <button onClick={() => setSelectedDetail(null)} style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
            </div>
          )}
            </div>
          </div>
        </>
      )}

      {/* ── Filter sidebar ── */}
      {filterOpen && (
        <>
          <div onClick={() => setFilterOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.18)", zIndex: 1000 }} />
          <div style={{
            position: "fixed",
            ...(isMobile
              ? { bottom: 0, left: 0, right: 0, height: "78vh", borderRadius: "20px 20px 0 0" }
              : { top: 12, right: 12, width: 380, maxWidth: "calc(100vw - 24px)", height: "calc(100vh - 24px)", borderRadius: 16 }),
            background: "var(--bg-secondary)",
            borderLeft: isMobile ? "none" : `1px solid ${C.border}`,
            borderTop: isMobile ? `1px solid ${C.border}` : "none",
            boxShadow: "var(--shadow-elevated)",
            zIndex: 1001,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            {isMobile && <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: "10px auto 0" }} />}
            <div style={{ padding: isMobile ? "14px 16px" : "15px 16px", borderBottom: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.18em", fontWeight: 700, color: C.muted }}>REPORT FILTERS</div>
              <button type="button" onClick={() => setFilterOpen(false)} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}><X size={22} color={C.muted} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0, scrollbarGutter: "stable", padding: isMobile ? "14px 16px 8px" : "14px 16px 8px" }}>
              <div style={{ fontSize: 12.5, color: C.text, marginBottom: 10 }}>Filter reports by</div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 18 }}>
                {["date", "accounts", "categories", "tags", "amount", "merchants", "status", "reviewStatus", "visibility", "split", "notes"].map((s) => (
                  <div key={s}>
                    <FilterRow label={
                      s === "reviewStatus" ? "Review Status" : s.charAt(0).toUpperCase() + s.slice(1)
                    } onClick={() => setActiveFilterSection((prev) => prev === s ? null : s)} />
                    {activeFilterSection === s ? renderFilterSection() : null}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: isMobile ? "12px 16px 16px" : "12px 16px 16px", display: "flex", gap: 8, flexShrink: 0, borderTop: `1px solid ${C.border2}` }}>
              <button type="button" onClick={() => { setDraftFilters(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); setActiveFilterSection(null); }} style={{ flex: 1, height: 42, borderRadius: 12, border: `1px solid ${C.border}`, background: "var(--bg-card)", color: C.text, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Clear</button>
              <button type="button" onClick={applyFilters} style={{ flex: 1.4, height: 42, borderRadius: 12, border: "none", background: C.strong, color: C.onStrong, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Apply</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ReportsTab;