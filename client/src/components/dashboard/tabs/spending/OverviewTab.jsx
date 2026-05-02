import { useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, Bar, PieChart, Pie, Cell, Line, BarChart } from "recharts";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, GitBranch, PenLine, Plus, Sparkles, Tag, X, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { catToIcon, getSpendingCategoryLabel, getSpendingCategoryMeta, ProGate, SPENDING_CATEGORY_META, getOccurrencesInMonth } from "../../dashboardShared.jsx";
import api from "../../../../services/api";
import { formatCurrencyAmount } from "../../../../utils/currency";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function panelStyle(C) {
  return { background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" };
}

function sectionLabel(text) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.26em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
      {text}
    </div>
  );
}

function IconChip({ children, onClick, title }) {
  return (
    <button type="button" onClick={onClick} title={title}
      style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}>
      {children}
    </button>
  );
}

function ChartGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="8" width="2.25" height="5" rx="1.1" fill="currentColor" />
      <rect x="6.125" y="5.5" width="2.25" height="7.5" rx="1.1" fill="currentColor" />
      <rect x="10.25" y="3" width="2.25" height="10" rx="1.1" fill="currentColor" />
    </svg>
  );
}

function RowButton({ label, value, action, trailing }) {
  return (
    <button type="button" onClick={action}
      style={{ width: "100%", border: "none", background: "var(--bg-secondary)", padding: "17px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left", cursor: action ? "pointer" : "default" }}>
      <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span style={{ fontSize: 14, color: value ? "var(--text-primary)" : "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value || ""}</span>
        {trailing}
      </span>
    </button>
  );
}

function Toggle({ checked, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ width: 42, height: 26, borderRadius: 999, border: "none", background: checked ? "#3b82f6" : "var(--surface-muted)", padding: 3, cursor: "pointer", position: "relative" }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#ffffff", display: "block", transform: checked ? "translateX(16px)" : "translateX(0)", transition: "transform 0.16s ease", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

// ─── Helper: is this transaction an expense? ─────────────────────────────────
function isExpenseTx(tx) {
  const t = (tx.type || "").toLowerCase();
  return t === "expense" || t === "debit" || t === "withdrawal" || t === "payment";
}
function isIncomeTx(tx) {
  const t = (tx.type || "").toLowerCase();
  return t === "income" || t === "deposit" || t === "credit";
}

export default function OverviewTab({
  C,
  setSpendTab,
  setShowAdvisor,
  transactionService,
  queryClient,
  pushNotif,
  isMobile,
  isPro,
  navigate,
  thisSpend = 0,
  thisMonthData = {},
  apiTransactions = [],
  recentTx = [],
  fmtMoney,
  preferredCurrency,
  budget,
  monthlyChart = [],
  onBudgetSaved,
}) {
  const formatAmount = (value, options = {}) => formatCurrencyAmount(value, preferredCurrency, options);

  // ─── State ────────────────────────────────────────────────────────────────
  const [breakdownMode, setBreakdownMode] = useState("expenses");
  const [spendViewMode, setSpendViewMode] = useState("chart");
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [selectedSpendMonthKey, setSelectedSpendMonthKey] = useState(null);
  const [upcomingMonthOffset, setUpcomingMonthOffset] = useState(0);
  const [selectedTxId, setSelectedTxId] = useState(null);
  const [txDraft, setTxDraft] = useState(null);
  const [txEdit, setTxEdit] = useState(false);
  const [txSaving, setTxSaving] = useState(false);
  const [hoveredTxId, setHoveredTxId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categoryBudget, setCategoryBudget] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryHistoryOffset, setCategoryHistoryOffset] = useState(0);

  const monthMenuRef = useRef(null);
  const openAdvisor = () => setShowAdvisor?.(true);

  // ─── Derived date values from actual transaction data ─────────────────────
  const latestTransactionDate = useMemo(() => {
    const timestamps = (apiTransactions || [])
      .map((tx) => new Date(tx?.date).getTime())
      .filter((v) => Number.isFinite(v));
    return timestamps.length ? new Date(Math.max(...timestamps)) : new Date();
  }, [apiTransactions]);

  // Close month menu on outside click
  useEffect(() => {
    const h = (e) => {
      if (monthMenuRef.current && !monthMenuRef.current.contains(e.target)) setMonthMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const currentMonth = latestTransactionDate.getMonth();
  const currentYear = latestTransactionDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthLabel = MONTH_NAMES[currentMonth];
  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  const effectiveBudget = budget?.amount || 0;

  // ─── Month selector options (last 6 months) ───────────────────────────────
  const spendMonthOptions = useMemo(() => {
    const options = [];
    for (let offset = 0; offset < 6; offset += 1) {
      const d = new Date(currentYear, currentMonth - offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      options.push({
        key,
        label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        month: d.getMonth(),   // 0-indexed
        year: d.getFullYear(),
        daysInMonth: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
      });
    }
    return options;
  }, [currentMonth, currentYear]);

  // Default to current month
  useEffect(() => {
    if (!selectedSpendMonthKey && spendMonthOptions.length > 0) {
      setSelectedSpendMonthKey(spendMonthOptions[0].key);
    }
  }, [spendMonthOptions, selectedSpendMonthKey]);

  const selectedSpendMonthOption = useMemo(
    () => spendMonthOptions.find((o) => o.key === selectedSpendMonthKey) || spendMonthOptions[0] || null,
    [spendMonthOptions, selectedSpendMonthKey],
  );

  // ─── Daily chart data for the selected month ──────────────────────────────
  // FIX: Build the per-day expense map directly from apiTransactions for the
  // chosen month. We match on (year, month) explicitly so there is no chance
  // of an off-by-one from the key-parsing path.
  const spendChartData = useMemo(() => {
    if (!selectedSpendMonthOption) return { points: [], totalSpend: 0, daysInSelectedMonth: 0 };

    const { month, year, daysInMonth: daysInSelectedMonth } = selectedSpendMonthOption;

    // Build per-day totals
    const dayTotals = new Array(daysInSelectedMonth + 1).fill(0); // index 1..daysInSelectedMonth
    (apiTransactions || []).forEach((tx) => {
      if (!isExpenseTx(tx)) return;
      if (!tx.date) return;
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const day = d.getDate(); // 1-based
      if (day >= 1 && day <= daysInSelectedMonth) {
        dayTotals[day] += Math.abs(tx.amount || 0);
      }
    });

    // Build cumulative series
    let running = 0;
    const points = [];
    for (let day = 1; day <= daysInSelectedMonth; day += 1) {
      running += dayTotals[day];
      points.push({ day, spend: running, budget: effectiveBudget });
    }

    return { points, totalSpend: running, daysInSelectedMonth };
  }, [apiTransactions, selectedSpendMonthOption, effectiveBudget]);

  // ─── Current-month transaction slices (for categories, calendar, etc.) ────
  const monthTransactions = useMemo(() => apiTransactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [apiTransactions, currentMonth, currentYear]);

  const expenseTransactions = useMemo(() => monthTransactions.filter(isExpenseTx), [monthTransactions]);
  const incomeTransactions = useMemo(() => monthTransactions.filter(isIncomeTx), [monthTransactions]);

  // ─── Expense by day (current month) for calendar heat-map ─────────────────
  const expenseByDay = useMemo(() => {
    const map = new Map();
    for (let day = 1; day <= daysInMonth; day += 1) map.set(day, 0);
    expenseTransactions.forEach((tx) => {
      if (!tx?.date) return;
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) return;
      map.set(d.getDate(), (map.get(d.getDate()) || 0) + Math.abs(tx.amount || 0));
    });
    return map;
  }, [daysInMonth, expenseTransactions]);

  // ─── Category maps ────────────────────────────────────────────────────────
  const currentExpenseByCategory = useMemo(() => {
    const map = {};
    expenseTransactions.forEach((tx) => {
      const meta = getSpendingCategoryMeta(tx.category);
      map[meta.id] = (map[meta.id] || 0) + Math.abs(tx.amount || 0);
    });
    return map;
  }, [expenseTransactions]);

  const currentIncomeByCategory = useMemo(() => {
    const map = {};
    incomeTransactions.forEach((tx) => {
      const cat = tx.category || "Other Income";
      map[cat] = (map[cat] || 0) + Math.abs(tx.amount || 0);
    });
    return map;
  }, [incomeTransactions]);

  const expenseRows = useMemo(() => SPENDING_CATEGORY_META
    .map((meta) => ({ key: meta.id, label: meta.label, color: meta.color, amount: currentExpenseByCategory[meta.id] || 0 }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount),
    [currentExpenseByCategory]);

  const incomeRows = useMemo(() => Object.entries(currentIncomeByCategory)
    .filter(([, amount]) => amount > 0)
    .map(([key, amount], index) => ({ key, label: key, color: SPENDING_CATEGORY_META[index % SPENDING_CATEGORY_META.length].color, amount }))
    .sort((a, b) => b.amount - a.amount),
    [currentIncomeByCategory]);

  // ─── Breakdown derived values ─────────────────────────────────────────────
  const activeRows = breakdownMode === "income" ? incomeRows : expenseRows;
  const thisIncome = thisMonthData?.income || 0;
  const activeTotal = breakdownMode === "budget" ? effectiveBudget : breakdownMode === "income" ? thisIncome : thisSpend;
  const activeSpent = breakdownMode === "budget" ? thisSpend : activeTotal;
  const donutColor = breakdownMode === "budget" ? "#3b82f6" : breakdownMode === "income" ? "#16a34a" : "#ffb95a";
  const categoryPercentBase = breakdownMode === "budget" ? effectiveBudget : activeSpent;
  const categoryPercentLabel = breakdownMode === "budget" ? "of budget" : breakdownMode === "income" ? "of income" : "of expenses";
  const remainingBudget = Math.max(effectiveBudget - thisSpend, 0);

  // ─── Transactions ─────────────────────────────────────────────────────────
  const latestTransactions = recentTx.slice(0, 8);
  const selectedTransaction = apiTransactions.find((tx) => tx._id === selectedTxId) || null;

  // ─── Upcoming calendar ────────────────────────────────────────────────────
  const upcomingCalendarDate = useMemo(
    () => new Date(currentYear, currentMonth + upcomingMonthOffset, 1),
    [currentMonth, currentYear, upcomingMonthOffset],
  );
  const upcomingCalendarMonth = upcomingCalendarDate.getMonth();
  const upcomingCalendarYear = upcomingCalendarDate.getFullYear();
  const upcomingCalendarDaysInMonth = new Date(upcomingCalendarYear, upcomingCalendarMonth + 1, 0).getDate();

  const upcomingTransactions = useMemo(() => {
    const recurringTemplates = (apiTransactions || []).filter((tx) => tx.isRecurring);
    const occurrences = [];
    recurringTemplates.forEach((tx) => {
      const dates = getOccurrencesInMonth(tx, upcomingCalendarDate);
      dates.forEach((date) => {
        if (date > latestTransactionDate) {
          occurrences.push({ ...tx, date: date.toISOString() });
        }
      });
    });
    return occurrences.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [apiTransactions, latestTransactionDate, upcomingCalendarDate]);

  const calendarCells = useMemo(() => {
    const firstDay = (new Date(upcomingCalendarYear, upcomingCalendarMonth, 1).getDay() + 6) % 7;
    const days = [];
    for (let i = 0; i < firstDay; i += 1) days.push(null);
    for (let day = 1; day <= upcomingCalendarDaysInMonth; day += 1) days.push(day);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [upcomingCalendarDaysInMonth, upcomingCalendarMonth, upcomingCalendarYear]);

  const upcomingTransactionsInView = useMemo(
    () => upcomingTransactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getMonth() === upcomingCalendarMonth && d.getFullYear() === upcomingCalendarYear;
    }),
    [upcomingCalendarMonth, upcomingCalendarYear, upcomingTransactions],
  );

  // ─── Spend calendar heat-map rows ─────────────────────────────────────────
  const spendCalendarRows = useMemo(() => {
    const rows = [];
    for (let start = 1; start <= daysInMonth; start += 7) {
      const row = [];
      for (let offset = 0; offset < 7; offset += 1) {
        const day = start + offset;
        if (day <= daysInMonth) row.push({ day, amount: expenseByDay.get(day) || 0, active: (expenseByDay.get(day) || 0) > 0 });
      }
      rows.push(row);
    }
    return rows;
  }, [daysInMonth, expenseByDay]);

  // ─── Reports (last 6 months) ──────────────────────────────────────────────
  const reportChartData = useMemo(() => {
    const items = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const d = new Date(currentYear, currentMonth - offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = (monthlyChart || []).find((m) => m.month === key) || { income: 0, expense: 0 };
      items.push({ month: MONTH_NAMES[d.getMonth()], key, net: (row.income || 0) - (row.expense || 0), income: row.income || 0, expense: row.expense || 0 });
    }
    return items;
  }, [currentMonth, currentYear, monthlyChart]);

  const reportSummary = useMemo(() => {
    const totalIncome = reportChartData.reduce((s, r) => s + r.income, 0);
    const totalExpenses = reportChartData.reduce((s, r) => s + r.expense, 0);
    const net = totalIncome - totalExpenses;
    const monthCount = reportChartData.filter((r) => r.income > 0 || r.expense > 0).length || 1;
    return { totalIncome, totalExpenses, net, avg: net / monthCount };
  }, [reportChartData]);

  const reportRangeLabel = useMemo(() => {
    if (!reportChartData.length) return "";
    const s = new Date(`${reportChartData[0].key}-01`);
    const eBase = new Date(`${reportChartData[reportChartData.length - 1].key}-01`);
    const e = new Date(eBase.getFullYear(), eBase.getMonth() + 1, 0);
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }, [reportChartData]);

  const avgDailySpend = useMemo(() => {
    const totalDays = reportChartData.reduce((acc, row) => {
      if (row.expense > 0) {
        const d = new Date(`${row.key}-01`);
        return acc + new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      }
      return acc;
    }, 0);
    return totalDays > 0 ? reportSummary.totalExpenses / totalDays : 0;
  }, [reportChartData, reportSummary.totalExpenses]);

  // ─── Category detail ──────────────────────────────────────────────────────
  const selectedCategoryMeta = selectedCategoryId ? getSpendingCategoryMeta(selectedCategoryId) : null;
  const SelectedCategoryIcon = selectedCategoryMeta?.icon || Plus;

  const selectedCategoryMonthHistory = useMemo(() => {
    if (!selectedCategoryId) return [];
    return [...Array(5)].map((_, idx) => {
      const d = new Date(currentYear, currentMonth - (4 - idx) - categoryHistoryOffset, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const total = apiTransactions
        .filter(isExpenseTx)
        .filter((tx) => { const date = new Date(tx.date); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === mk; })
        .filter((tx) => getSpendingCategoryMeta(tx.category).id === selectedCategoryId)
        .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
      return { key: mk, label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '"), amount: total };
    });
  }, [apiTransactions, currentMonth, currentYear, selectedCategoryId, categoryHistoryOffset]);

  const selectedCategoryMonthTransactions = useMemo(() => {
    if (!selectedCategoryId) return [];
    return apiTransactions.filter((tx) => {
      const d = new Date(tx.date);
      return isExpenseTx(tx)
        && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === currentMonthKey
        && getSpendingCategoryMeta(tx.category).id === selectedCategoryId;
    });
  }, [apiTransactions, currentMonthKey, selectedCategoryId]);

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedTransaction) return;
    setTxDraft({
      merchant: selectedTransaction.merchant || "",
      category: selectedTransaction.category || transactionService?.CATEGORIES?.[0] || "",
      date: selectedTransaction.date ? new Date(selectedTransaction.date).toISOString().slice(0, 10) : "",
      notes: selectedTransaction.notes || "",
      tag: selectedTransaction.tag || "",
      isRecurring: !!selectedTransaction.isRecurring,
      isHidden: !!selectedTransaction.isHidden,
      reviewStatus: selectedTransaction.reviewStatus || "needs_review",
    });
    setTxEdit(false);
  }, [selectedTransaction, transactionService]);

  useEffect(() => {
    if (!selectedCategoryId) return;
    setCategoryBudget(String(budget?.amount || ""));
    setCategoryHistoryOffset(0);
  }, [budget?.amount, selectedCategoryId]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const refreshQueries = () => {
    queryClient?.invalidateQueries?.({ queryKey: ["transactions"] });
    queryClient?.invalidateQueries?.({ queryKey: ["transactions-page"] });
    queryClient?.invalidateQueries?.({ queryKey: ["dashboard"] });
  };

  const patchTx = async (patch, successMessage) => {
    if (!selectedTransaction) return;
    try {
      setTxSaving(true);
      await transactionService.update(selectedTransaction._id, patch);
      refreshQueries();
      if (successMessage) pushNotif?.("success", successMessage);
    } catch (e) {
      pushNotif?.("error", e?.response?.data?.message || e?.message || "Failed to update transaction");
    } finally {
      setTxSaving(false);
    }
  };

  const saveTxEdits = async () => { await patchTx(txDraft, "Transaction updated"); setTxEdit(false); };

  const splitTransaction = async () => {
    if (!selectedTransaction) return;
    const total = Math.abs(selectedTransaction.amount || 0);
    const first = Number((total / 2).toFixed(2));
    const second = Number((total - first).toFixed(2));
    try {
      setTxSaving(true);
      const base = { category: selectedTransaction.category, type: selectedTransaction.type, date: selectedTransaction.date, notes: selectedTransaction.notes, tag: selectedTransaction.tag, isRecurring: selectedTransaction.isRecurring, isHidden: selectedTransaction.isHidden, reviewStatus: "needs_review" };
      await transactionService.create({ ...base, merchant: selectedTransaction.merchant, amount: first });
      await transactionService.create({ ...base, merchant: `${selectedTransaction.merchant || "Split"} (Part 2)`, amount: second });
      await transactionService.delete(selectedTransaction._id);
      refreshQueries();
      setSelectedTxId(null);
      pushNotif?.("success", "Transaction split into two entries");
    } catch (e) {
      pushNotif?.("error", e?.response?.data?.message || e?.message || "Failed to split transaction");
    } finally {
      setTxSaving(false);
    }
  };

  const saveCategoryBudget = async () => {
    const amount = Number(categoryBudget);
    if (!amount || isNaN(amount) || amount <= 0) return;
    try {
      setCategorySaving(true);
      await api.post("/dashboard/budget", { month: currentMonthKey, amount });
      refreshQueries();
      onBudgetSaved?.();
      pushNotif?.("success", "Budget saved for this month.");
    } catch {
      pushNotif?.("error", "Failed to save budget");
    } finally {
      setCategorySaving(false);
    }
  };

  const transactionDateLabel = (date) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // ─── Chart Y-axis max: tight to actual data, never hardcoded large floor ──
  // Y-axis domain is always anchored to actual spend data.
  // The budget reference line is shown regardless, but if budget >> spend
  // we don't let it crush the spend curve to a flat baseline.
  const spendChartMax = useMemo(() => {
    const dataMax = spendChartData.totalSpend || 0;
    if (dataMax > 0) {
      // Give 25% headroom above actual spend so the curve has breathing room.
      // If budget is within 3x of spend, extend to show it fully; otherwise
      // let the ReferenceLine draw outside the visible area (still shows label).
      const headroom = dataMax * 1.25;
      if (effectiveBudget > 0 && effectiveBudget <= dataMax * 3) {
        return Math.max(headroom, effectiveBudget * 1.05);
      }
      return headroom;
    }
    // No spend data yet — show budget scale if set, else small placeholder
    if (effectiveBudget > 0) return effectiveBudget * 1.2;
    return 100;
  }, [spendChartData.totalSpend, effectiveBudget]);

  // ─── Tooltips ─────────────────────────────────────────────────────────────
  const renderReportTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", boxShadow: "0 12px 30px rgba(0,0,0,0.22)" }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{row.month}</div>
        <div style={{ fontSize: 12, color: "#16a34a", marginBottom: 4 }}>Income: <strong>{fmtMoney(row.income)}</strong></div>
        <div style={{ fontSize: 12, color: C.text, marginBottom: 4 }}>Expenses: <strong>{fmtMoney(row.expense)}</strong></div>
        <div style={{ fontSize: 12, fontWeight: 700, color: row.net >= 0 ? "#16a34a" : "#ef4444" }}>Net: {fmtMoney(row.net)}</div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        .spending-category-row:hover, .spending-category-row:focus { background: var(--surface-muted) !important; }
        .performance-row:hover { background: var(--surface-muted) !important; }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 308px", gap: 16, alignItems: "start" }}>

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Spend chart panel ── */}
          <ProGate isPro={isPro} navigate={navigate}>
            <div style={panelStyle(C)}>
              <div style={{ padding: "16px 16px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                {sectionLabel("Spend this month")}
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>

                  {/* Chart / Calendar toggle */}
                  <div style={{ display: "flex", background: "var(--surface-muted)", borderRadius: 10, padding: 2 }}>
                    {[{ mode: "chart", Icon: ChartGlyph, isCustom: true }, { mode: "calendar", Icon: CalendarDays }].map(({ mode, Icon, isCustom }) => (
                      <button key={mode} type="button" onClick={() => setSpendViewMode(mode)}
                        style={{ width: 36, height: 32, borderRadius: 8, border: "none", background: spendViewMode === mode ? "var(--bg-secondary)" : "transparent", color: spendViewMode === mode ? C.text : C.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", boxShadow: spendViewMode === mode ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                        {isCustom ? <Icon /> : <Icon size={16} />}
                      </button>
                    ))}
                  </div>

                  {/* Month picker — only shown in chart mode */}
                  {spendViewMode === "chart" && (
                    <div ref={monthMenuRef} style={{ position: "relative" }}>
                      <button type="button" onClick={() => setMonthMenuOpen((p) => !p)}
                        style={{ border: `1px solid ${C.border}`, borderRadius: 99, background: C.white, color: C.text, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{selectedSpendMonthOption?.label || "Select month"}</span>
                        <ChevronDown size={14} />
                      </button>
                      {monthMenuOpen && (
                        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 200, maxHeight: 280, overflowY: "auto", background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: "0 18px 44px rgba(0,0,0,0.18)", zIndex: 20 }}>
                          {spendMonthOptions.map((option) => (
                            <button key={option.key} type="button" onClick={() => { setSelectedSpendMonthKey(option.key); setMonthMenuOpen(false); }}
                              style={{ width: "100%", border: "none", background: option.key === selectedSpendMonthKey ? "var(--surface-muted)" : "transparent", color: C.text, padding: "12px 16px", fontSize: 13, fontWeight: option.key === selectedSpendMonthKey ? 600 : 500, textAlign: "left", cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Spend summary bar (spend vs budget) ── */}
              {spendViewMode === "chart" && (
                <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: "-0.03em", lineHeight: 1 }}>
                      {formatAmount(spendChartData.totalSpend || 0, { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>spent in {selectedSpendMonthOption?.label || ""}</div>
                  </div>
                  {effectiveBudget > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: (spendChartData.totalSpend || 0) > effectiveBudget ? "#ef4444" : "#16a34a" }}>
                        {formatAmount(Math.max(0, effectiveBudget - (spendChartData.totalSpend || 0)), { maximumFractionDigits: 0 })} left
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>of {formatAmount(effectiveBudget, { maximumFractionDigits: 0 })} budget</div>
                      {/* Budget progress bar */}
                      <div style={{ width: 120, height: 4, borderRadius: 99, background: "var(--border-subtle)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 99, background: (spendChartData.totalSpend || 0) > effectiveBudget ? "#ef4444" : "#ffb95a", width: `${Math.min(100, ((spendChartData.totalSpend || 0) / effectiveBudget) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Chart view ── */}
              {spendViewMode === "chart" ? (
                spendChartData.points.length > 0 && spendChartData.totalSpend > 0 ? (
                  <div style={{ width: "100%", padding: "10px 0 0" }}>
                    <ResponsiveContainer width="100%" height={248}>
                      <AreaChart
                        data={spendChartData.points}
                        margin={{ top: 16, right: 52, left: 0, bottom: 20 }}
                        key={`spend-${selectedSpendMonthKey}`}
                      >
                        <defs>
                          <linearGradient id="colorSpend" gradientTransform="rotate(90)">
                            <stop offset="0%" stopColor="#ffb95a" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#ffb95a" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="day"
                          axisLine={false} tickLine={false}
                          ticks={[1, 8, 15, 22, 29].filter((d) => d <= spendChartData.daysInSelectedMonth)}
                          tickFormatter={(d) => String(d).padStart(2, "0")}
                          tick={{ fill: C.muted, fontSize: 11 }}
                          height={24}
                        />
                        <YAxis
                          axisLine={false} tickLine={false}
                          orientation="right"
                          domain={[0, spendChartMax]}
                          tickFormatter={(v) => formatAmount(v, { maximumFractionDigits: 0 })}
                          tick={{ fill: C.muted, fontSize: 11 }}
                          width={50}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const data = payload[0].payload;
                            return (
                              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", boxShadow: "0 12px 30px rgba(0,0,0,0.22)" }}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Day {String(data.day).padStart(2, "0")}</div>
                                <div style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>
                                  {selectedSpendMonthOption ? MONTH_NAMES[selectedSpendMonthOption.month] : ""}: {formatAmount(data.spend, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                {effectiveBudget > 0 && (
                                  <div style={{ fontSize: 11, color: data.spend > effectiveBudget ? "#ef4444" : C.muted, marginTop: 3 }}>
                                    Budget: {formatAmount(effectiveBudget, { maximumFractionDigits: 0 })}
                                  </div>
                                )}
                              </div>
                            );
                          }}
                        />
                        <CartesianGrid vertical={false} stroke="var(--border-subtle)" strokeDasharray="4 4" />
                        {effectiveBudget > 0 && effectiveBudget <= (spendChartData.totalSpend || 0) * 3 && (
                          <ReferenceLine y={effectiveBudget} stroke="#94a3b8" strokeDasharray="5 5"
                            label={{ value: `${formatAmount(effectiveBudget, { maximumFractionDigits: 0 })} budget`, position: "insideTopRight", fill: C.muted, fontSize: 11, dx: -4 }}
                          />
                        )}
                        <Area type="monotone" dataKey="spend" stroke="#ffb95a" strokeWidth={2.5} fill="url(#colorSpend)" connectNulls={false}
                          activeDot={{ r: 5, stroke: C.white, strokeWidth: 2, fill: "#ffb95a" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ width: "100%", minHeight: 248, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                    <div style={{ textAlign: "center", color: C.muted }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>No spending data for {selectedSpendMonthOption?.label}</div>
                      <div style={{ fontSize: 12 }}>Add transactions to see your spending chart</div>
                    </div>
                  </div>
                )
              ) : (
                /* ── Calendar heat-map view ── */
                <div style={{ padding: "20px 16px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                    {spendCalendarRows.flat().map(({ day, amount, active }) => (
                      <div key={day} style={{ height: 36, borderRadius: 8, border: `1px solid ${active ? "transparent" : C.border}`, background: active ? "#ffb95a" : "transparent", color: active ? "#fff" : C.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 700 }}>{day}</div>
                        {amount > 0 && <div style={{ fontSize: 8, fontWeight: 600 }}>{formatAmount(Math.round(amount), { maximumFractionDigits: 0, style: "decimal" })}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ProGate>

          {/* ── Latest & Upcoming ── */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 16 }}>

            {/* Latest transactions */}
            <div style={{ ...panelStyle(C), display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 16px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {sectionLabel("Latest transactions")}
                <button type="button" onClick={openAdvisor} title="AI Advisor"
                  style={{ border: `1px solid ${C.border}`, background: C.white, color: C.muted, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Sparkles size={15} />
                </button>
              </div>
              <div style={{ padding: "12px 0", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                {latestTransactions.length === 0 ? (
                  <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "40px 20px" }}>No transactions yet</div>
                ) : latestTransactions.map((tx) => {
                  const Icon = catToIcon[tx.category] || Plus;
                  const isInc = isIncomeTx(tx);
                  return (
                    <button key={tx._id} type="button" onClick={() => setSelectedTxId(tx._id)}
                      onMouseEnter={() => setHoveredTxId(tx._id)} onMouseLeave={() => setHoveredTxId(null)}
                      style={{ width: "calc(100% - 16px)", border: "none", margin: "0 8px", borderRadius: 12, background: hoveredTxId === tx._id ? "var(--surface-muted)" : "transparent", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: C.white, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", flexShrink: 0 }}>
                          <Icon size={14} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: C.text, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.merchant || tx.category || "Transaction"}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{transactionDateLabel(tx.date)}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isInc ? "#16a34a" : C.text }}>
                          {formatAmount(Math.abs(tx.amount || 0), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        {tx.reviewStatus === "needs_review" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
                <button type="button" onClick={() => setSpendTab("transactions")}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-muted)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = C.white}
                  style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.06em" }}>
                  SEE ALL TRANSACTIONS
                </button>
              </div>
            </div>

            {/* Upcoming transactions */}
            <div style={panelStyle(C)}>
              <div style={{ padding: "16px 16px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {sectionLabel("Upcoming transactions")}
                <button type="button" onClick={openAdvisor} title="AI Advisor"
                  style={{ border: `1px solid ${C.border}`, background: C.white, color: C.muted, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Sparkles size={15} />
                </button>
              </div>
              <div style={{ padding: "20px 20px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>
                    {MONTH_NAMES[upcomingCalendarMonth]} <span style={{ color: C.muted, fontWeight: 400 }}>{upcomingCalendarYear}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <IconChip onClick={() => setUpcomingMonthOffset((p) => p - 1)} title="Previous month"><ChevronLeft size={16} /></IconChip>
                    <IconChip onClick={() => setUpcomingMonthOffset((p) => p + 1)} title="Next month"><ChevronRight size={16} /></IconChip>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} style={{ fontSize: 10, color: C.muted, textAlign: "center", fontWeight: 700, textTransform: "uppercase" }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                  {calendarCells.map((day, index) => {
                    const isToday = day === latestTransactionDate.getDate() && upcomingCalendarMonth === latestTransactionDate.getMonth() && upcomingCalendarYear === latestTransactionDate.getFullYear();
                    const hasUpcoming = day && upcomingTransactionsInView.some((tx) => new Date(tx.date).getDate() === day);
                    let bg = "transparent", border = "1px solid transparent", color = day ? C.text : "transparent", fontWeight = 500;
                    if (isToday) { bg = "#3b82f6"; border = "1px solid #3b82f6"; color = "#fff"; fontWeight = 700; }
                    else if (hasUpcoming) { bg = "rgba(13,115,119,0.13)"; border = "1px solid rgba(13,115,119,0.40)"; color = "#0D7377"; fontWeight = 700; }
                    return (
                      <div key={`${day ?? "empty"}-${index}`} style={{ height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight, color, background: bg, border, transition: "all 0.15s" }}>
                        {day}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 20, fontSize: 13, color: C.muted, lineHeight: 1.5, textAlign: "center" }}>
                  {upcomingTransactionsInView.length === 0
                    ? "Add your recurring bills and subscriptions to see what's coming up."
                    : `${upcomingTransactionsInView.length} upcoming scheduled.`}
                </div>
                <div style={{ marginTop: 16, textAlign: "center" }}>
                  <button type="button" onClick={() => setSpendTab("recurring")}
                    style={{ border: "none", background: "none", color: "var(--brand-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Manage recurring bills
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Reports ── */}
          <ProGate isPro={isPro} navigate={navigate}>
            <div style={panelStyle(C)}>
              <div style={{ padding: "16px 16px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setSpendTab("reports")}>
                  {sectionLabel("Reports")}
                  <ChevronRight size={14} style={{ color: C.muted }} />
                </div>
                <button type="button" onClick={() => setSpendTab("reports")}
                  style={{ border: `1px solid ${C.border}`, background: C.white, color: C.text, borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  View full reports
                </button>
              </div>
              <div style={{ padding: "20px 16px 16px" }}>
                {/* Stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Total income", value: fmtMoney(reportSummary.totalIncome), color: "#16a34a" },
                    { label: "Total expenses", value: fmtMoney(reportSummary.totalExpenses) },
                    { label: "Net cash flow", value: fmtMoney(reportSummary.net), color: reportSummary.net >= 0 ? "#16a34a" : "#ef4444" },
                    { label: "Avg monthly net", value: fmtMoney(reportSummary.avg) },
                  ].map((item) => (
                    <div key={item.label} style={{ padding: 14, background: "var(--surface-muted)", borderRadius: 12 }}>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 500 }}>{item.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: item.color || C.text }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Chart header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Last 6 months</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{reportRangeLabel}</div>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.02em" }}>Income vs Expenses</div>
                </div>

                {/* Grouped bar chart */}
                <div style={{ width: "100%", minHeight: 248, marginBottom: 4 }}>
                  <ResponsiveContainer width="100%" height={248}>
                    <BarChart data={reportChartData} margin={{ top: 4, right: 10, bottom: 0, left: 0 }} barGap={6}>
                      <CartesianGrid vertical={false} stroke="var(--border-subtle)" strokeDasharray="4 4" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} orientation="right"
                        tickFormatter={(v) => formatAmount(v, { maximumFractionDigits: 0 })}
                        tick={{ fontSize: 11, fill: C.muted }} />
                      <Tooltip content={renderReportTooltip} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                      <Bar dataKey="income" name="Income" radius={[6, 6, 0, 0]} fill="#0d9488" barSize={22} />
                      <Bar dataKey="expense" name="Expenses" radius={[6, 6, 0, 0]} fill="#ffb95a" barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── Monthly Performance Table ── */}
            <div style={{ ...panelStyle(C), marginTop: 4 }}>
              <div style={{ padding: "18px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-muted)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}` }}>
                    <CalendarDays size={14} color={C.muted} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: "0.05em" }}>Monthly Performance</span>
                </div>
                <button type="button" onClick={() => setSpendTab("reports")} style={{ fontSize: 12, fontWeight: 600, color: "var(--brand-primary)", background: "transparent", border: "none", cursor: "pointer" }}>View full reports</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: "var(--bg-card)" }}>
                      {["Month", "Income", "Expenses", "Net Change"].map((h, i) => (
                        <th key={h} style={{ padding: "12px 20px", textAlign: i === 0 ? "left" : "right", fontSize: 11, fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.border}`, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportChartData.slice().reverse().map((row, idx, arr) => (
                      <tr key={row.key} className="performance-row"
                        style={{ cursor: "pointer", transition: "background 0.15s" }}>
                        <td style={{ padding: "14px 20px", fontSize: 14, color: C.text, fontWeight: 600, borderBottom: idx === arr.length - 1 ? "none" : `1px solid ${C.border}` }}>{row.month}</td>
                        <td style={{ padding: "14px 20px", textAlign: "right", fontSize: 14, color: "#16a34a", fontWeight: 500, borderBottom: idx === arr.length - 1 ? "none" : `1px solid ${C.border}` }}>
                          {formatAmount(row.income, { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ padding: "14px 20px", textAlign: "right", fontSize: 14, color: C.text, fontWeight: 500, borderBottom: idx === arr.length - 1 ? "none" : `1px solid ${C.border}` }}>
                          {formatAmount(row.expense, { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ padding: "14px 20px", textAlign: "right", fontSize: 14, fontWeight: 700, color: row.net >= 0 ? "#16a34a" : "#ef4444", borderBottom: idx === arr.length - 1 ? "none" : `1px solid ${C.border}` }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                            {row.net >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {formatAmount(Math.abs(row.net), { maximumFractionDigits: 0 })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ProGate>
        </div>

        {/* ── Right column ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Category breakdown ── */}
          <ProGate isPro={isPro} navigate={navigate}>
            <div style={panelStyle(C)}>
              <div style={{ padding: "16px 16px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {sectionLabel("Category breakdown")}
                <button type="button" onClick={openAdvisor} title="AI Advisor"
                  style={{ border: `1px solid ${C.border}`, background: C.white, color: C.muted, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Sparkles size={15} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: `1px solid ${C.border}` }}>
                {[{ id: "expenses", label: "Expenses" }, { id: "budget", label: "Budget" }, { id: "income", label: "Income" }].map((tab) => (
                  <button key={tab.id} type="button" onClick={() => setBreakdownMode(tab.id)}
                    style={{ border: "none", background: "transparent", padding: "12px 8px", fontSize: 12, fontWeight: 600, color: breakdownMode === tab.id ? C.text : C.muted, borderBottom: breakdownMode === tab.id ? `2px solid ${C.text}` : "2px solid transparent", cursor: "pointer", transition: "all 0.2s ease" }}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div style={{ padding: "18px 16px 16px" }}>
                {/* Donut */}
                <div style={{ padding: 18, borderRadius: 20, background: "var(--surface-muted)", display: "flex", justifyContent: "center", marginBottom: 18 }}>
                  <div style={{ position: "relative", width: 180, height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        {(() => {
                          const pieData = breakdownMode === "budget"
                            ? [
                              { value: activeSpent > 0 ? activeSpent : 0, fill: activeSpent > 0 ? donutColor : "var(--border-subtle)" },
                              { value: Math.max(0, activeTotal - activeSpent), fill: "var(--border-subtle)", opacity: 0.5 },
                            ]
                            : activeRows.length > 0
                              ? activeRows.map((r) => ({ value: r.amount, fill: r.color }))
                              : [{ value: 1, fill: "var(--border-subtle)" }];
                          const pAngle = breakdownMode === "budget"
                            ? (activeSpent > 0 && activeTotal > activeSpent ? 1 : 0)
                            : (activeRows.length > 1 ? 2 : 0);
                          return (
                            <Pie data={pieData} cx="50%" cy="50%" startAngle={90} endAngle={-270} innerRadius={68} outerRadius={84} paddingAngle={pAngle} dataKey="value" stroke="none">
                              {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} opacity={entry.opacity ?? 1} />)}
                            </Pie>
                          );
                        })()}
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 8px" }}>
                      <div style={{ fontSize: activeSpent > 999999 ? 16 : 22, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>
                        {formatAmount(activeSpent, { maximumFractionDigits: 0 })}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>
                        {breakdownMode === "expenses" ? "Spent this month" : breakdownMode === "budget" ? `of ${formatAmount(effectiveBudget, { maximumFractionDigits: 0 })} budget` : "Earned this month"}
                      </div>
                      {breakdownMode === "budget" && effectiveBudget > 0 && (
                        <div style={{ fontSize: 11, color: activeSpent > effectiveBudget ? "#ef4444" : "#16a34a", marginTop: 3, fontWeight: 600 }}>
                          {Math.round((activeSpent / effectiveBudget) * 100)}% used
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top 2 category cards */}
                {activeRows.length > 0 ? (
                  <>
                    <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                      {activeRows.slice(0, 2).map((row) => {
                        const pct = categoryPercentBase > 0 ? Math.round((row.amount / categoryPercentBase) * 100) : 0;
                        const Icon = getSpendingCategoryMeta(row.key)?.icon || catToIcon[row.key] || Plus;
                        return (
                          <button key={row.key} type="button" onClick={() => setSelectedCategoryId(row.key)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderRadius: 16, background: "var(--surface-card)", border: `1px solid ${C.border}`, cursor: "pointer", textAlign: "left", width: "100%" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 12, background: `${row.color}20`, display: "grid", placeItems: "center", color: row.color, flexShrink: 0 }}><Icon size={16} /></div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, color: C.text, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.label}</div>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{pct}% {categoryPercentLabel}</div>
                              </div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, flexShrink: 0 }}>{formatAmount(Math.round(row.amount), { maximumFractionDigits: 0 })}</div>
                          </button>
                        );
                      })}
                    </div>
                    <button type="button" onClick={() => setSpendTab("breakdown")}
                      style={{ width: "100%", border: `1px solid ${C.border}`, background: C.white, borderRadius: 14, padding: "14px 16px", fontSize: 13, fontWeight: 700, color: C.text, cursor: "pointer" }}>
                      See all {activeRows.length} categories
                    </button>
                  </>
                ) : (
                  <div style={{ padding: 16, borderRadius: 16, background: "var(--surface-muted)", color: C.muted, fontSize: 13, textAlign: "center" }}>
                    {breakdownMode === "income" ? "No income recorded this month." : "No expenses recorded this month."}
                  </div>
                )}
              </div>
            </div>
          </ProGate>

          {/* ── Key Metrics ── */}
          <div style={panelStyle(C)}>
            <div style={{ padding: "16px 16px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {sectionLabel("Key Metrics")}
              <button type="button" onClick={openAdvisor} title="AI Advisor"
                style={{ border: `1px solid ${C.border}`, background: C.white, color: C.muted, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Sparkles size={15} />
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { label: "6-Month Savings", value: fmtMoney(reportSummary.net), color: reportSummary.net >= 0 ? "#16a34a" : "#ef4444" },
                  { label: "Avg Daily Spend", value: fmtMoney(avgDailySpend), suffix: "/day" },
                  { label: "Budget Remaining", value: effectiveBudget > 0 ? formatAmount(remainingBudget, { maximumFractionDigits: 0 }) : "—", color: effectiveBudget > 0 && remainingBudget === 0 ? "#ef4444" : "var(--brand-primary)" },
                  { label: "Top Expense", value: expenseRows.length > 0 ? expenseRows[0].label : "—" },
                ].map((metric) => (
                  <div key={metric.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{metric.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: metric.color || C.text }}>
                      {metric.value}
                      {metric.suffix && <span style={{ fontSize: 11, color: C.muted, marginLeft: 4, fontWeight: 500 }}>{metric.suffix}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Transaction detail drawer ── */}
      {selectedTransaction && txDraft ? (
        <>
          <div onClick={() => setSelectedTxId(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 80 }} />
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: isMobile ? "100vw" : 420, background: C.white, borderLeft: `1px solid ${C.border}`, boxShadow: "-18px 0 40px rgba(0,0,0,0.35)", zIndex: 81, overflowY: "auto" }}>
            <div style={{ padding: "20px 20px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button type="button" onClick={() => setSelectedTxId(null)}
                  style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronLeft size={16} />
                </button>
                <div style={{ fontSize: 11, letterSpacing: "0.26em", textTransform: "uppercase", color: C.muted, fontWeight: 700 }}>{selectedTransaction.merchant || "Transaction"}</div>
              </div>
              <button type="button" onClick={() => txEdit ? saveTxEdits() : setTxEdit(true)} disabled={txSaving}
                style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${C.border}`, background: txEdit ? C.text : "var(--bg-secondary)", cursor: "pointer", color: txEdit ? C.white : C.text, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                title={txEdit ? "Save changes" : "Edit transaction"}>
                <PenLine size={14} />
              </button>
            </div>

            <div style={{ padding: "22px 24px 20px", textAlign: "center" }}>
              {txDraft.reviewStatus === "needs_review" && (
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#ef4444", marginBottom: 10 }}>Needs review</div>
              )}
              <div style={{ fontSize: 30, lineHeight: 1, letterSpacing: "-0.04em", color: C.text, marginBottom: 18 }}>
                {formatAmount(Math.abs(selectedTransaction.amount || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--surface-muted)", borderRadius: 999, padding: "10px 14px", border: `1px solid ${C.border}` }}>
                <Tag size={14} color="#f59e0b" />
                {txEdit ? (
                  <select value={txDraft.category} onChange={(e) => setTxDraft((p) => ({ ...p, category: e.target.value }))}
                    style={{ border: "none", background: "transparent", color: C.text, fontSize: 14, outline: "none" }}>
                    {transactionService.CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <span style={{ fontSize: 14, color: C.text }}>
                    {isExpenseTx(selectedTransaction) ? getSpendingCategoryLabel(txDraft.category) : txDraft.category}
                  </span>
                )}
                <ChevronDown size={14} color={C.muted} />
              </div>
            </div>

            <div style={{ padding: "0 20px 18px" }}>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden" }}>
                {/* Date */}
                {txEdit ? (
                  <div style={{ padding: "17px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 14, color: C.muted }}>Date</span>
                    <input type="date" value={txDraft.date} onChange={(e) => setTxDraft((p) => ({ ...p, date: e.target.value }))}
                      style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", fontSize: 12.5, background: "var(--surface-muted)", color: C.text }} />
                  </div>
                ) : (
                  <div style={{ borderBottom: `1px solid ${C.border}` }}>
                    <RowButton label="Date" value={new Date(selectedTransaction.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })} trailing={<ChevronRight size={16} color={C.muted} />} />
                  </div>
                )}
                {/* Merchant */}
                {txEdit && (
                  <div style={{ padding: "17px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 14, color: C.muted }}>Name</span>
                    <input value={txDraft.merchant} onChange={(e) => setTxDraft((p) => ({ ...p, merchant: e.target.value }))} placeholder="Merchant name"
                      style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 12.5, background: "var(--surface-muted)", color: C.text }} />
                  </div>
                )}
                {/* Tag */}
                {txEdit ? (
                  <div style={{ padding: "17px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 14, color: C.muted }}>Tag</span>
                    <input value={txDraft.tag} onChange={(e) => setTxDraft((p) => ({ ...p, tag: e.target.value }))} placeholder="Add tag"
                      style={{ border: `1px solid ${C.border}`, borderRadius: 999, padding: "8px 12px", fontSize: 12.5, background: "var(--surface-muted)", color: C.text }} />
                  </div>
                ) : (
                  <div style={{ borderBottom: `1px solid ${C.border}` }}>
                    <RowButton label="Tag" value={txDraft.tag || "—"} trailing={<ChevronRight size={16} color={C.muted} />} />
                  </div>
                )}
                {/* Hide */}
                <div style={{ padding: "17px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 14, color: C.muted }}>Hide transaction</span>
                  <Toggle checked={!!txDraft.isHidden} onClick={async () => { const next = !txDraft.isHidden; setTxDraft((p) => ({ ...p, isHidden: next })); await patchTx({ isHidden: next }, next ? "Transaction hidden" : "Transaction visible"); }} />
                </div>
                {/* Split */}
                <div style={{ borderBottom: `1px solid ${C.border}` }}>
                  <RowButton label="Split transaction" action={txSaving ? undefined : splitTransaction} trailing={<GitBranch size={16} color={C.muted} />} />
                </div>
                {/* Notes */}
                {txEdit ? (
                  <div style={{ padding: "17px 20px", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 14, color: C.muted, marginBottom: 10 }}>Notes</div>
                    <textarea value={txDraft.notes} onChange={(e) => setTxDraft((p) => ({ ...p, notes: e.target.value }))} rows={4} placeholder="Add a note…"
                      style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", fontSize: 12.5, resize: "vertical", background: "var(--surface-muted)", color: C.text, boxSizing: "border-box" }} />
                  </div>
                ) : (
                  <div style={{ borderBottom: `1px solid ${C.border}` }}>
                    <RowButton label="Notes" value={txDraft.notes || undefined} trailing={<ChevronRight size={16} color={C.muted} />} />
                  </div>
                )}
                {/* Recurring */}
                <div style={{ padding: "17px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 14, color: C.muted }}>Recurring</span>
                  <Toggle checked={!!txDraft.isRecurring} onClick={async () => { const next = !txDraft.isRecurring; setTxDraft((p) => ({ ...p, isRecurring: next })); await patchTx({ isRecurring: next }, next ? "Marked as recurring" : "Recurring removed"); }} />
                </div>
              </div>
            </div>

            {/* Review status */}
            <div style={{ padding: "0 20px 18px" }}>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontSize: 14, color: C.muted }}>Review status</div>
                <button type="button"
                  onClick={async () => { const next = txDraft.reviewStatus === "reviewed" ? "needs_review" : "reviewed"; setTxDraft((p) => ({ ...p, reviewStatus: next })); await patchTx({ reviewStatus: next }, next === "reviewed" ? "Marked as reviewed" : "Marked as needs review"); }}
                  style={{ padding: "11px 16px", borderRadius: 12, border: "none", background: C.strong, color: C.onStrong, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {txDraft.reviewStatus === "reviewed" ? "Mark as needs review" : "Mark as reviewed"}
                </button>
              </div>
            </div>

            {(selectedTransaction.accountName || selectedTransaction.account) && (
              <div style={{ padding: "0 20px 28px", textAlign: "center", color: C.muted }}>
                <div style={{ fontSize: 13 }}>{selectedTransaction.accountName || selectedTransaction.account}</div>
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* ── Category detail drawer ── */}
      {selectedCategoryMeta ? (
        <>
          <div onClick={() => setSelectedCategoryId(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 80 }} />
          <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: isMobile ? "100vw" : 420, background: C.white, borderLeft: `1px solid ${C.border}`, boxShadow: "-18px 0 40px rgba(0,0,0,0.35)", zIndex: 81, overflowY: "auto" }}>
            <div style={{ padding: "20px 20px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.26em", textTransform: "uppercase", color: C.muted, fontWeight: 700 }}>Category Detail</div>
              <button type="button" onClick={() => setSelectedCategoryId(null)}
                style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${selectedCategoryMeta.color}22`, color: selectedCategoryMeta.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SelectedCategoryIcon size={18} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{selectedCategoryMeta.label}</div>
              </div>

              {/* Budget control */}
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", marginBottom: 28 }}>
                <div style={{ padding: 18 }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Overall monthly budget for {monthLabel}</div>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", background: "var(--surface-muted)" }}>
                    <input value={categoryBudget} onChange={(e) => setCategoryBudget(e.target.value)} placeholder={`Amount (${preferredCurrency})`} type="number" min="0"
                      style={{ width: "100%", border: "none", outline: "none", fontSize: 16, color: C.text, background: "transparent" }} />
                    <button type="button" onClick={saveCategoryBudget} disabled={!categoryBudget || categorySaving}
                      style={{ height: 42, padding: "0 16px", borderRadius: 12, border: "none", background: !categoryBudget || categorySaving ? "var(--surface-strong)" : C.text, color: "var(--text-inverse)", fontSize: 13, fontWeight: 600, cursor: !categoryBudget || categorySaving ? "not-allowed" : "pointer", opacity: !categoryBudget || categorySaving ? 0.45 : 1 }}>
                      {categorySaving ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={() => setCategoryBudget("")}
                      style={{ width: 42, height: 42, borderRadius: 12, border: `1px solid ${C.border}`, background: "var(--bg-secondary)", color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <X size={16} />
                    </button>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: C.muted }}>
                    Remaining budget: <strong style={{ color: remainingBudget > 0 ? C.text : "#ef4444" }}>{effectiveBudget > 0 ? fmtMoney(remainingBudget) : "No budget set"}</strong>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>This updates the overall monthly budget for {monthLabel}.</div>
                </div>
              </div>

              {/* Month history */}
              <div style={{ display: "grid", gridTemplateColumns: "36px repeat(5, 1fr) 36px", alignItems: "center", gap: 8, marginBottom: 28 }}>
                <button type="button" onClick={() => setCategoryHistoryOffset((p) => Math.min(p + 1, 24))}
                  style={{ width: 36, height: 36, borderRadius: 99, border: `1px solid ${C.border}`, background: "var(--bg-secondary)", cursor: "pointer", color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronLeft size={16} />
                </button>
                {selectedCategoryMonthHistory.map((item) => (
                  <div key={item.key} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: item.key === currentMonthKey ? C.text : C.muted, marginBottom: 4 }}>
                      {formatAmount(Math.round(item.amount), { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontSize: 11, color: item.key === currentMonthKey ? C.text : C.muted, fontWeight: item.key === currentMonthKey ? 700 : 400 }}>{item.label}</div>
                  </div>
                ))}
                <button type="button" onClick={() => setCategoryHistoryOffset((p) => Math.max(p - 1, 0))}
                  style={{ width: 36, height: 36, borderRadius: 99, border: `1px solid ${C.border}`, background: "var(--bg-secondary)", cursor: "pointer", color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Category transactions this month */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>{monthLabel} transactions</div>
                {selectedCategoryMonthTransactions.length === 0 ? (
                  <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "20px 0" }}>No transactions in this category for {monthLabel}.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedCategoryMonthTransactions.map((tx) => (
                      <button key={tx._id} type="button" onClick={() => { setSelectedCategoryId(null); setSelectedTxId(tx._id); }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: "var(--surface-muted)", cursor: "pointer", textAlign: "left", width: "100%" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: C.text, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.merchant || tx.category || "Transaction"}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{transactionDateLabel(tx.date)}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, flexShrink: 0 }}>
                          {formatAmount(Math.abs(tx.amount || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}