import { useState, useEffect, useRef, useMemo } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  ComposedChart,
  Line,
} from "recharts";
import { ChevronDown, Filter, X, ArrowDownRight } from "lucide-react";
import { C, dedupToast, formatAmount } from "../../dashboardShared.jsx";
import { CalendarPicker } from "../SpendingTab.jsx";
import { useAuthContext } from "../../../../hooks/useAuthContext";
import { formatCurrencyAmount, getUserCurrency } from "../../../../utils/currency";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const rangeToDates = (range, earliestTxDate, todayStr) => {
  const today = new Date(todayStr);
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
  if (range === "year_to_date") {
    return { from: `${today.getFullYear()}-01-01`, to: todayStr };
  }
  if (range === "all_time") {
    return { from: earliestTxDate || todayStr, to: todayStr };
  }
  const sixMonthStart = new Date(today);
  sixMonthStart.setMonth(sixMonthStart.getMonth() - 5);
  sixMonthStart.setDate(1);
  return { from: sixMonthStart.toISOString().slice(0, 10), to: todayStr };
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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
function ReportsTab({
  apiTransactions = [],
  isMobile = false,
  preferredCurrency: preferredCurrencyProp,
  reportPreferences,
}) {
  const { user } = useAuthContext();
  const preferredCurrency = preferredCurrencyProp || getUserCurrency(user);

  // ── Core state ────────────────────────────────────────────────────────────
  // reportTab controls which sub-tab is active: cashflow | expenses | income
  const [reportTab, setReportTab] = useState(reportPreferences?.defaultTab || "cashflow");

  // viewBy controls table + chart breakdown: Month | Category | Summary
  // IMPORTANT: viewBy is INDEPENDENT of reportTab — changing one must never reset the other.
  const [viewBy, setViewBy] = useState(reportPreferences?.defaultViewBy || "Month");

  // showIncomeOnCashflow / showExpenseOnCashflow are LOCAL cashflow legend toggles.
  // They only affect which bars render on the cashflow chart.
  // They do NOT change reportTab. This fixes the "legend buttons break the chart" bug.
  const [showIncome, setShowIncome] = useState(true);
  const [showExpense, setShowExpense] = useState(true);
  const [showNetTrend, setShowNetTrend] = useState(false);

  const [tableSort, setTableSort] = useState({ key: "month", dir: "desc" });
  const [viewByOpen, setViewByOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);
  const [saveName, setSaveName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);

  const REPORTS_STORAGE_KEY = "finpilot:spending:reports:v1";
  const [savedReports, setSavedReports] = useState(() => {
    try {
      if (typeof window === "undefined") return [];
      const raw = window.localStorage.getItem(REPORTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((r) => r?.id && r?.name && r?.tab && r?.dateFrom && r?.dateTo);
    } catch { return []; }
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

  const defaultRange = useMemo(
    () => rangeToDates(reportPreferences?.defaultRange, earliestTxDate, latestTxDate),
    [reportPreferences?.defaultRange, earliestTxDate, latestTxDate]
  );
  const defaultFrom = defaultRange.from || earliestTxDate || sixMonthsAgo;
  const defaultTo = defaultRange.to || latestTxDate;

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [draftFrom, setDraftFrom] = useState(defaultFrom);
  const [draftTo, setDraftTo] = useState(defaultTo);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setDraftFrom(defaultFrom);
    setDraftTo(defaultTo);
    setSelectedMonthKey(null);
  }, [defaultFrom, defaultTo]);

  // Reset sort only — never touch viewBy when reportTab changes.
  // Old bug: viewBy was reset to "Month" here, breaking the dropdown.
  useEffect(() => {
    setTableSort({ key: "month", dir: "desc" });
    setSelectedMonthKey(null);
  }, [reportTab]);

  // Outside-click closes viewBy dropdown
  useEffect(() => {
    const h = (e) => { if (viewByRef.current && !viewByRef.current.contains(e.target)) setViewByOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Persist saved reports
  useEffect(() => {
    try { window.localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(savedReports)); } catch { /* noop */ }
  }, [savedReports]);

  // ── User saved reports ────────────────────────────────────────────────────
  const userSavedReports = useMemo(() => {
    const uid = String(user?._id || "");
    return savedReports.filter((r) => r?.userId && String(r.userId) === uid);
  }, [savedReports, user?._id]);

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
    const from = new Date(dateFrom);
    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
    return normalizedTransactions.filter((t) => t._date >= from && t._date <= to);
  }, [normalizedTransactions, dateFrom, dateTo]);

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
    const dedup = userSavedReports.some((r) => r.name.toLowerCase() === name.toLowerCase())
      ? `${name} (${userSavedReports.length + 1})` : name;
    setSavedReports((prev) => [...prev, { id: Date.now(), name: dedup, userId: user?._id || "anonymous", tab: reportTab, dateFrom, dateTo }]);
    dedupToast.success("Report saved");
    setSaveName(""); setSaveOpen(false);
  };

  const loadReport = (r) => {
    setReportTab(r.tab); setDateFrom(r.dateFrom); setDateTo(r.dateTo);
    setDraftFrom(r.dateFrom); setDraftTo(r.dateTo);
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

  const getSortIcon = (key) => tableSort.key === key ? (tableSort.dir === "asc" ? " ↑" : " ↓") : "";

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

  // ── Render chart ───────────────────────────────────────────────────────────
  // Three mutually-exclusive branches. No shared/overlapping conditions.
  const renderChart = () => {

    // ── (A) Cash flow: grouped income + expense bars + optional net line ──
    if (reportTab === "cashflow") {
      return (
        <div>
          {/* Legend — clicking toggles bar visibility, does NOT change reportTab */}
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
            {showNetTrend && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted }}>
                <span style={{ width: 20, height: 2, background: CHART.net, display: "inline-block" }} />
                Net
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 60, bottom: 0, left: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="var(--border-subtle, rgba(0,0,0,0.06))" strokeDasharray="4 4" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis
                orientation="right"
                domain={cashFlowDomain}
                tickFormatter={(v) => formatAmount(v, { maximumFractionDigits: 0 })}
                tick={{ fontSize: 10, fill: C.muted }}
                axisLine={false} tickLine={false} width={55}
              />
              <Tooltip content={<CashFlowTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
              {showIncome && (
                <Bar dataKey="income" name="Income" fill={CHART.income} radius={[4, 4, 0, 0]} maxBarSize={28} />
              )}
              {showExpense && (
                <Bar dataKey="expense" name="Expenses" fill={CHART.expense} radius={[4, 4, 0, 0]} maxBarSize={28} />
              )}
              {showNetTrend && (
                <Line
                  type="monotone" dataKey="net" name="Net"
                  stroke={CHART.net} strokeWidth={2.5} dot={false}
                  activeDot={{ r: 4, fill: CHART.net, stroke: "var(--bg-secondary)", strokeWidth: 2 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // ── (B) Expenses / Income — Category horizontal bars ──
    if (viewBy === "Category") {
      const barColor = reportTab === "expenses" ? CHART.expense : CHART.income;
      if (!categoryChartData.length) {
        return <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: C.muted }}>No category data for this period.</div>;
      }
      return (
        <ResponsiveContainer width="100%" height={Math.max(180, categoryChartData.length * 36 + 20)}>
          <ComposedChart data={categoryChartData} layout="vertical" margin={{ top: 4, right: 60, bottom: 4, left: 0 }}>
            <CartesianGrid horizontal={false} stroke="var(--border-subtle, rgba(0,0,0,0.06))" strokeDasharray="4 4" />
            <XAxis type="number" hide />
            <YAxis
              dataKey="name" type="category"
              axisLine={false} tickLine={false} width={110}
              tick={{ fontSize: 11, fill: C.muted, fontWeight: 500 }}
            />
            <Tooltip content={<CategoryTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
            <Bar dataKey="value" fill={barColor} radius={[0, 4, 4, 0]} maxBarSize={22} />
          </ComposedChart>
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
          <Bar dataKey={barDataKey} fill={barColor} radius={[4, 4, 0, 0]} maxBarSize={36} />
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
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

      {/* ════════ LEFT: main panel ════════ */}
      <div style={{ flex: 1, minWidth: 0, background: "var(--bg-secondary)", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Reports</span>
          <button
            type="button" onClick={() => setFilterOpen((v) => !v)}
            style={{
              width: 30, height: 30, borderRadius: 7, cursor: "pointer", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1px solid ${filterOpen ? "var(--color-text-primary)" : C.border}`,
              background: filterOpen ? "var(--color-text-primary)" : "var(--bg-secondary)",
              appearance: "none", outline: "none",
            }}
          >
            <Filter size={13} style={{ color: filterOpen ? "var(--color-background-primary)" : C.muted }} />
          </button>
        </div>

        {/* Filter panel */}
        {filterOpen && (
          <div style={{ padding: "12px 20px", background: "var(--surface-muted)", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {[{ label: "From", val: draftFrom, set: setDraftFrom }, { label: "To", val: draftTo, set: setDraftTo }].map(({ label, val, set }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, flex: isMobile ? "1 1 100%" : "0 0 auto" }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{label}</label>
                <div style={{ minWidth: 120 }}><CalendarPicker C={C} value={val} onChange={set} /></div>
              </div>
            ))}
            <button type="button"
              onClick={() => { setDateFrom(draftFrom); setDateTo(draftTo); setFilterOpen(false); }}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: C.strong, color: C.onStrong, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Apply
            </button>
            <button type="button"
              onClick={() => { setDraftFrom(defaultFrom); setDraftTo(latestTxDate); setDateFrom(defaultFrom); setDateTo(latestTxDate); setFilterOpen(false); setSelectedMonthKey(null); }}
              style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "var(--bg-secondary)", color: C.sub, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
              Reset
            </button>
          </div>
        )}

        {/* Sub-tabs */}
        <div style={{ display: "flex", background: "var(--surface-muted)", borderRadius: 10, padding: 4, margin: "14px 20px" }}>
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
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 20px 12px", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Report Summary</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 13, color: C.muted }}>{dateRangeLabel}</span>
              {selectedMonthKey && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--bg-secondary)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 8px" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{selectedMonthSummary?.longLabel?.split(" ")[0]}</span>
                  <button type="button" onClick={() => setSelectedMonthKey(null)}
                    style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: C.muted, display: "flex" }}>
                    <X size={10} />
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Right controls: Net trend toggle (cashflow only) + View by dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {reportTab === "cashflow" && (
              <button type="button" onClick={() => setShowNetTrend((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
                  fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: "inherit",
                  border: `1px solid ${showNetTrend ? "var(--color-text-primary)" : C.border}`,
                  background: showNetTrend ? "var(--color-text-primary)" : "var(--bg-secondary)",
                  color: showNetTrend ? "var(--color-background-primary)" : "var(--color-text-primary)",
                  transition: "all 0.15s",
                }}
              >
                Net trend {showNetTrend ? "On" : "Off"}
              </button>
            )}

            {/* View by dropdown — always visible */}
            <div ref={viewByRef} style={{ position: "relative" }}>
              <button type="button" onClick={() => setViewByOpen((v) => !v)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: "var(--bg-secondary)", fontSize: 12, color: C.text, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, appearance: "none", outline: "none" }}>
                View by <strong style={{ fontWeight: 700 }}>{viewBy}</strong> <ChevronDown size={11} />
              </button>
              {viewByOpen && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "var(--bg-secondary)", border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.18)", zIndex: 300, minWidth: 150, overflow: "hidden" }}>
                  {["Month", "Category", "Summary"].map((v) => (
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
        </div>

        {/* Chart + KPIs + Table */}
        {!hasData ? <EmptyState /> : (
          <div style={{ padding: "0 20px 24px" }}>

            {/* Chart container — overflow:hidden prevents spill onto KPI cards */}
            <div style={{ background: "var(--surface-muted)", borderRadius: 16, padding: "20px 16px 16px", border: `1px solid ${C.border}`, overflow: "hidden", position: "relative" }}>
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
                  style={{ padding: "14px 16px", borderRadius: 12, textAlign: "left", cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s", display: "flex", flexDirection: "column", gap: 4, background: "var(--surface-muted)", border: `1px solid ${C.border}` }}
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
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "var(--surface-muted)" }}>
                  <tr>
                    {/* ── Month headers ── */}
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
                    {/* ── Category headers ── */}
                    {viewBy === "Category" && (
                      <>
                        <th onClick={() => toggleTableSort("month")} style={th({ textAlign: "left" })}>Category{getSortIcon("month")}</th>
                        {reportTab === "cashflow" && <th style={th({ textAlign: "left" })}>Type</th>}
                        <th onClick={() => toggleTableSort("value")} style={th({ textAlign: "right" })}>Amount{getSortIcon("value")}</th>
                        <th style={th({ textAlign: "right" })}>Txns</th>
                        <th onClick={() => toggleTableSort("change")} style={th({ textAlign: "right" })}>Share{getSortIcon("change")}</th>
                      </>
                    )}
                    {/* ── Summary headers ── */}
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

                    // ── Month row ──
                    if (viewBy === "Month") {
                      const bucket = monthlyBuckets.find((m) => m.key === row.key);
                      const isSel = selectedMonthKey === row.key;
                      return (
                        <tr key={row.key}
                          onClick={() => activateMonth(row.key, row.label)}
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

                    // ── Category row ──
                    if (viewBy === "Category") {
                      return (
                        <tr key={row.key}
                          style={{ borderTop: `1px solid ${C.border}`, transition: "background 0.12s" }}
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

                    // ── Summary row ──
                    // FIX: clicking navigates to that tab but Summary rows always show BOTH rows
                    // because summaryRows is computed from ALL data (not filtered by reportTab).
                    if (viewBy === "Summary") {
                      return (
                        <tr key={row.key}
                          onClick={() => setReportTab(row.key === "income" ? "income" : "expenses")}
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
        )}
      </div>

      {/* ════════ RIGHT: Saved Reports sidebar ════════ */}
      {!isMobile && (
        <div style={{ width: 220, flexShrink: 0, background: "var(--bg-secondary)", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
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
              {userSavedReports.map((r) => (
                <div key={r.id}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", transition: "background 0.12s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.bg; }}
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
                    onClick={(e) => { e.stopPropagation(); setSavedReports((p) => p.filter((x) => x.id !== r.id)); dedupToast.success("Report removed"); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 2, display: "flex", flexShrink: 0 }}>
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
                  style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", fontSize: 12.5, color: C.text, background: "var(--bg-secondary)", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
                  onFocus={(e) => { e.target.style.borderColor = "#6366f1"; }}
                  onBlur={(e) => { e.target.style.borderColor = C.border; }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={handleSave}
                    style={{ flex: 2, padding: "7px 0", borderRadius: 8, border: "none", background: C.strong, color: C.onStrong, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Save
                  </button>
                  <button type="button" onClick={() => { setSaveOpen(false); setSaveName(""); }}
                    style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "var(--bg-secondary)", color: C.sub, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setSaveOpen(true)}
                style={{ width: "100%", padding: "9px 0", borderRadius: 9, border: `1px solid ${C.border}`, background: "var(--bg-secondary)", color: C.text, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "background 0.12s", appearance: "none", outline: "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-muted)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-secondary)"; }}>
                Save
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsTab;