import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  Eye,
  EyeOff,
  Filter,
  MoreVertical,
  PenLine,
  Plus,
  Search,
  SortAsc,
  SortDesc,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useAuthContext } from "../../../../hooks/useAuthContext";
import { CAT_COLORS, catToIcon, dedupToast, getSpendingCategoryLabel, getSpendingCategoryMeta } from "../../dashboardShared.jsx";
import { useDashboard } from "../../DashboardContext";
import { transactionCategoryService } from "../../../../services/transactionCategoryService";
import { formatCurrencyAmount, getUserCurrency } from "../../../../utils/currency";

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
  date: "all",
  startDate: "",
  endDate: "",
};
const INCOME_CATEGORY_SET = new Set(["Salary", "Freelance", "Investment", "Other Income"]);

const box = (C, extra = {}) => ({
  background: "var(--bg-card)",
  border: `1px solid ${C.border}`,
  borderRadius: 18,
  overflow: "hidden",
  boxShadow: "var(--shadow-card)",
  ...extra,
});

function RowButton({ label, value, action, trailing }) {
  return (
    <button type="button" onClick={action} style={{ width: "100%", border: "none", background: "var(--bg-card)", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, textAlign: "left", cursor: action ? "pointer" : "default" }}>
      <span className="origin-section-label" style={{ fontSize: "var(--font-size-xs)" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span style={{ fontSize: "var(--font-size-sm)", color: value ? "var(--text-primary)" : "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "var(--font-weight-medium)" }}>{value || "Not set"}</span>
        {trailing}
      </span>
    </button>
  );
}

function Toggle({ checked, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ width: 42, height: 26, borderRadius: 999, border: "none", background: checked ? "#3b82f6" : "var(--border-subtle)", padding: 3, cursor: "pointer", transition: "background 0.2s" }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", display: "block", transform: checked ? "translateX(16px)" : "translateX(0)", transition: "transform 0.16s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

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
    // Set e to end of that day
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

export default function TransactionsPage({ transactionService, queryClient, C, apiTransactions = [], txLimitReached, setAddModalOpen, pushNotif, spendingSettings }) {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { globalSelectedTxId: selectedId, setGlobalSelectedTxId: setSelectedId } = useDashboard();
  const preferredCurrency = getUserCurrency(user);
  const formatAmount = (value, options = {}) => formatCurrencyAmount(Math.abs(value || 0), preferredCurrency, options);
  const { data: categoryData } = useQuery({
    queryKey: ["transaction-categories", user?._id],
    queryFn: () => transactionCategoryService.list().then((r) => r.data),
    enabled: !!user?._id,
    staleTime: 0,
    refetchOnMount: true,
  });

  const customCategoryRecords = useMemo(() => categoryData?.categories || [], [categoryData]);
  const dotsRef = useRef(null);
  const [dotsOpen, setDotsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState(spendingSettings?.transactionPreferences?.defaultSortDirection || "desc");
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 640 : false));
  const [openPickerTxId, setOpenPickerTxId] = useState(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [activeFilterSection, setActiveFilterSection] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    setSortDir(spendingSettings?.transactionPreferences?.defaultSortDirection || "desc");
  }, [spendingSettings?.transactionPreferences?.defaultSortDirection]);

  useEffect(() => {
    const close = (e) => { if (dotsRef.current && !dotsRef.current.contains(e.target)) setDotsOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (filterOpen) { setDraftFilters(filters); setActiveFilterSection(null); }
  }, [filterOpen, filters]);

  useEffect(() => {
    if (!openPickerTxId) { setCategorySearch(""); setCategoryFormOpen(false); setNewCategoryName(""); }
  }, [openPickerTxId]);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const uniqueCategories = useMemo(() => Array.from(new Set(apiTransactions.map((tx) => tx.category).filter(Boolean))), [apiTransactions]);
  const uniqueMerchants = useMemo(() => Array.from(new Set(apiTransactions.map((tx) => tx.merchant).filter(Boolean))), [apiTransactions]);
  const uniqueTags = useMemo(() => Array.from(new Set(apiTransactions.map((tx) => tx.tag).filter(Boolean))), [apiTransactions]);
  const uniqueAccounts = useMemo(() => Array.from(new Set(apiTransactions.map((tx) => getAccountLabel(tx)))), [apiTransactions]);

  const allCategoryRecords = useMemo(() => {
    const defaults = transactionService.CATEGORIES.map((name) => ({ id: `default-${name}`, name, type: INCOME_CATEGORY_SET.has(name) ? "income" : "expense", isCustom: false }));
    const customs = customCategoryRecords.map((item) => ({ id: item._id, name: item.name, type: item.type, isCustom: true }));
    const seen = new Set();
    return [...defaults, ...customs].filter((item) => { const key = `${item.type}:${item.name.toLowerCase()}`; if (seen.has(key)) return false; seen.add(key); return true; });
  }, [customCategoryRecords, transactionService.CATEGORIES]);

  const filtered = useMemo(() => {
    let list = [...apiTransactions];
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter((t) => [t.merchant, t.category, t.notes, t.tag].some((v) => (v || "").toLowerCase().includes(q))); }
    if (filters.types.length) list = list.filter((t) => filters.types.includes(t.type));
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
    if (filters.date !== "all") list = list.filter((t) => isDateMatch(t.date, filters.date, filters.startDate, filters.endDate));
    if (filters.amount !== "all") list = list.filter((t) => isAmountMatch(t.amount, filters.amount));
    list.sort((a, b) => sortDir === "asc" ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date));
    return list;
  }, [apiTransactions, filters, search, sortDir]);

  const selectedTransaction = filtered.find((t) => t._id === selectedId) || null;

  useEffect(() => {
    if (!filtered.length) { setSelectedId(null); return; }
    if (selectedId && !filtered.some((t) => t._id === selectedId)) setSelectedId(null);
  }, [filtered, selectedId, setSelectedId]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["transactions-page"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["transaction-categories"] });
  };

  const summary = useMemo(() => {
    const income = filtered.filter((tx) => tx.type === "income").reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
    const expenses = filtered.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
    const dates = filtered.map((tx) => new Date(tx.date)).filter((d) => !Number.isNaN(d.getTime())).sort((a, b) => a - b);
    const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const dateRange = dates.length ? `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}` : "No transactions";
    return { income, expenses, count: filtered.length, dateRange };
  }, [filtered]);

  const exportCsv = () => {
    const rows = filtered.map((tx) => ({ date: tx.date ? new Date(tx.date).toISOString().slice(0, 10) : "", merchant: tx.merchant || "", category: tx.category || "", type: tx.type || "", amount: Math.abs(tx.amount || 0).toFixed(2), notes: tx.notes || "", tag: tx.tag || "", account: getAccountLabel(tx) }));
    if (!rows.length) { dedupToast.error("No transactions to export"); return; }
    const headers = ["date", "merchant", "category", "type", "amount", "notes", "tag", "account"];
    const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => `"${String(row[h]).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    setDotsOpen(false);
  };

  const toggleDraftArray = (key, value) => {
    setDraftFilters((prev) => { const next = new Set(prev[key]); next.has(value) ? next.delete(value) : next.add(value); return { ...prev, [key]: Array.from(next) }; });
  };

  const selectedFilterCount = useMemo(() => [filters.types.length, filters.categories.length, filters.merchants.length, filters.tags.length, filters.reviewStatus.length, filters.visibility !== "all" ? 1 : 0, filters.split !== "all" ? 1 : 0, filters.notes !== "all" ? 1 : 0, filters.amount !== "all" ? 1 : 0, filters.account !== "all" ? 1 : 0, filters.date !== "all" ? 1 : 0].reduce((s, v) => s + v, 0), [filters]);
  const selectedCount = selectedRows.size;
  const allVisibleSelected = filtered.length > 0 && filtered.every((tx) => selectedRows.has(tx._id));

  const toggleSelectAll = () => {
    setSelectedRows(() => {
      if (allVisibleSelected) return new Set();
      return new Set(filtered.map((tx) => tx._id));
    });
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedRows);
    if (!ids.length) return;

    if (!confirmingBulk) {
      setConfirmingBulk(true);
      setTimeout(() => setConfirmingBulk(false), 3000);
      return;
    }

    try {
      setSaving(true);
      await transactionService.bulkDelete(ids);
      setSelectedRows(new Set());
      setSelectMode(false);
      setConfirmingBulk(false);
      if (selectedId && ids.includes(selectedId)) setSelectedId(null);
      refresh();
      pushNotif?.("success", `${ids.length} transaction${ids.length === 1 ? "" : "s"} deleted`);
    } catch (e) {
      dedupToast.error(e?.response?.data?.message || e?.message || "Failed to delete selected transactions");
    } finally {
      setSaving(false);
    }
  };

  const renderFilterSection = () => {
    if (!activeFilterSection) return null;
    const wrapStyle = { padding: "16px 18px", borderTop: `1px solid ${C.border2}`, background: C.white };

    const sectionMap = {
      categories: allCategoryRecords.filter((c) => uniqueCategories.includes(c.name)).slice(0, 14).map((c) => (
        <FilterChoice key={c.id} active={draftFilters.categories.includes(c.name)} label={getSpendingCategoryLabel(c.name)} onClick={() => toggleDraftArray("categories", c.name)} />
      )),
      date: [
        ["all", "All time"], ["last_7_days", "Last 7 days"], ["last_30_days", "Last 30 days"],
        ["this_month", "This month"], ["last_month", "Last month"], ["this_year", "This year"],
        ["custom", "Custom Range"]
      ].map(([v, l]) => (
        <div key={v} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
      accounts: [["all", `All (${uniqueAccounts.length || 1})`],["manual","Manual"],["csv","CSV"]].map(([v, l]) => (
        <FilterChoice key={v} active={draftFilters.account === v} label={l} onClick={() => setDraftFilters((p) => ({ ...p, account: v }))} />
      )),
      tags: uniqueTags.length ? uniqueTags.slice(0, 12).map((t) => (
        <FilterChoice key={t} active={draftFilters.tags.includes(t)} label={t} onClick={() => toggleDraftArray("tags", t)} />
      )) : [<div key="none" style={{ fontSize: 13, color: "#98a2b3" }}>No tags available</div>],
      merchants: uniqueMerchants.slice(0, 12).map((m) => (
        <FilterChoice key={m} active={draftFilters.merchants.includes(m)} label={m} onClick={() => toggleDraftArray("merchants", m)} />
      )),
      amount: [["all","All"],["under_100","Under $100"],["100_to_500","$100–$500"],["500_to_1000","$500–$1k"],["over_1000","Over $1k"]].map(([v, l]) => (
        <FilterChoice key={v} active={draftFilters.amount === v} label={l} onClick={() => setDraftFilters((p) => ({ ...p, amount: v }))} />
      )),
      visibility: [["all","All"],["visible","Visible"],["hidden","Hidden"]].map(([v, l]) => (
        <FilterChoice key={v} active={draftFilters.visibility === v} label={l} onClick={() => setDraftFilters((p) => ({ ...p, visibility: v }))} />
      )),
      split: [["all","All"],["split","Split"],["not_split","Not split"]].map(([v, l]) => (
        <FilterChoice key={v} active={draftFilters.split === v} label={l} onClick={() => setDraftFilters((p) => ({ ...p, split: v }))} />
      )),
      status: [["expense","Expense"],["income","Income"]].map(([v, l]) => (
        <FilterChoice key={v} active={draftFilters.types.includes(v)} label={l} onClick={() => toggleDraftArray("types", v)} />
      )),
      notes: [["all","All"],["with_notes","With notes"],["without_notes","No notes"]].map(([v, l]) => (
        <FilterChoice key={v} active={draftFilters.notes === v} label={l} onClick={() => setDraftFilters((p) => ({ ...p, notes: v }))} />
      )),
      reviewStatus: [["needs_review","Needs review"],["reviewed","Reviewed"]].map(([v, l]) => (
        <FilterChoice key={v} active={draftFilters.reviewStatus.includes(v)} label={l} onClick={() => toggleDraftArray("reviewStatus", v)} />
      )),
    };

    const items = sectionMap[activeFilterSection];
    if (!items) return null;
    return <div style={wrapStyle}><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{items}</div></div>;
  };

  /* ─── Mobile card row ─── */
  const MobileRow = ({ tx }) => {
    const meta = tx.type === "expense" ? getSpendingCategoryMeta(tx.category) : null;
    const color = meta?.color || CAT_COLORS[Math.max(0, Object.keys(catToIcon).indexOf(tx.category)) % CAT_COLORS.length] || "#8b80ff";
    const Icon = meta?.icon || catToIcon[tx.category] || BadgeDollarSign;
    const displayCategory = tx.type === "expense" ? getSpendingCategoryLabel(tx.category) : (tx.category || "Income");
    const active = selectedTransaction?._id === tx._id;

    return (
      <div
        onClick={() => {
          if (selectMode) {
            setSelectedRows((prev) => {
              const next = new Set(prev);
              next.has(tx._id) ? next.delete(tx._id) : next.add(tx._id);
              return next;
            });
            return;
          }
          setSelectedId(tx._id);
        }}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: `1px solid ${C.border2}`, background: active ? "var(--surface-muted)" : C.white, cursor: "pointer" }}
      >
        {selectMode && (
          <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
            <input type="checkbox" checked={selectedRows.has(tx._id)} onChange={() => setSelectedRows((prev) => { const next = new Set(prev); next.has(tx._id) ? next.delete(tx._id) : next.add(tx._id); return next; })} />
          </div>
        )}
        {/* Icon */}
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface-muted)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: color }}>
          <Icon size={16} />
        </div>
        {/* Middle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: C.fSizeSm, fontWeight: C.fWeightMed, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.merchant || "Transaction"}</div>
            {(tx.reviewStatus === "needs_review" || !tx.reviewStatus) && (
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} title="Needs review" />
            )}
          </div>
          <div style={{ fontSize: C.fSizeXs, color: C.muted, marginTop: 2, fontWeight: C.fWeightReg }}>{displayCategory} · {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
        </div>
        {/* Amount + eye */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span className="origin-value-sm" style={{ fontSize: C.fSizeSm, color: tx.type === "income" ? "#22c55e" : C.text }}>
            {tx.type === "income" ? "+" : "-"}{formatAmount(tx.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {tx.isHidden && <EyeOff size={13} color={C.muted} />}
        </div>
      </div>
    );
  };

  /* ─── Desktop table row ─── */
  const DesktopRow = ({ tx }) => {
    const meta = tx.type === "expense" ? getSpendingCategoryMeta(tx.category) : null;
    const color = meta?.color || CAT_COLORS[Math.max(0, Object.keys(catToIcon).indexOf(tx.category)) % CAT_COLORS.length] || "#8b80ff";
    const Icon = meta?.icon || catToIcon[tx.category] || BadgeDollarSign;
    const displayCategory = tx.type === "expense" ? getSpendingCategoryLabel(tx.category) : (tx.category || "Income");
    const active = selectedTransaction?._id === tx._id;
    const accountLabel = getAccountLabel(tx);
    const cols = selectMode
      ? "56px minmax(200px,2.2fr) minmax(160px,1.35fr) minmax(140px,1.1fr) minmax(130px,0.95fr) minmax(120px,0.9fr)"
      : "minmax(220px,2.25fr) minmax(170px,1.45fr) minmax(150px,1.2fr) minmax(130px,1.1fr) minmax(120px,1fr)";

    return (
      <div onClick={() => { if (!selectMode) setSelectedId(tx._id); }} style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center", padding: "12px 18px", borderBottom: `1px solid ${C.border2}`, background: active ? "var(--surface-muted)" : "var(--bg-card)", cursor: selectMode ? "default" : "pointer" }}>
        {selectMode && (
          <div onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={selectedRows.has(tx._id)} onChange={() => setSelectedRows((prev) => { const next = new Set(prev); next.has(tx._id) ? next.delete(tx._id) : next.add(tx._id); return next; })} />
          </div>
        )}
        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: color, position: "relative" }}>
            <Icon size={16} />
            {(tx.reviewStatus === "needs_review" || !tx.reviewStatus) && (
              <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", border: `2px solid ${active ? "var(--surface-muted)" : "var(--bg-card)"}` }} title="Needs review" />
            )}
          </div>
          <div style={{ fontSize: C.fSizeSm, fontWeight: C.fWeightMed, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.merchant || "Transaction"}</div>
        </div>
        <div style={{ position: "relative" }}>
          <button type="button" onClick={(e) => { e.stopPropagation(); setOpenPickerTxId(openPickerTxId === tx._id ? null : tx._id); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--bg-card)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", maxWidth: "100%", cursor: "pointer", fontFamily: "inherit", boxShadow: "var(--shadow-card)", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.borderColor = C.text} onMouseLeave={(e) => e.currentTarget.style.borderColor = C.border}>
            <span style={{ fontSize: C.fSizeXs, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: C.fWeightMed }}>{displayCategory}</span>
            <ChevronDown size={12} color={C.muted} />
          </button>

          {openPickerTxId === tx._id && (
            <>
              {/* Invisible overlay to close */}
              <div onClick={(e) => { e.stopPropagation(); setOpenPickerTxId(null); }} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.2)", backdropFilter: "blur(2px)" }} />
              
              {/* Modal (Centered Popover) */}
              <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 340, background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", zIndex: 91, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Select Category</div>
                  <button type="button" onClick={() => setOpenPickerTxId(null)} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", padding: 4, borderRadius: 8 }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-muted)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <X size={18} color={C.muted} />
                  </button>
                </div>

                {!categoryFormOpen && (
                  <div style={{ padding: "12px 16px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-muted)", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}>
                      <Search size={16} color={C.muted} />
                      <input 
                        autoFocus
                        placeholder="Search categories..." 
                        value={categorySearch} 
                        onChange={(e) => setCategorySearch(e.target.value)} 
                        style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 13, color: C.text, fontFamily: "inherit" }} 
                      />
                    </div>
                  </div>
                )}
                
                <div style={{ flex: 1, maxHeight: 320, overflowY: "auto", padding: 16 }}>
                  {categoryFormOpen ? (
                    <div style={{ padding: "8px 0" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>New Category Name</div>
                      <input 
                        autoFocus
                        placeholder="e.g. Subscriptions"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const name = newCategoryName.trim();
                            if (!name) return;
                            try {
                              setCategorySaving(true);
                              const response = await transactionCategoryService.create({ name, type: tx.type });
                              queryClient.setQueryData(["transaction-categories", user?._id], (current) => ({ ...(current || {}), categories: [...(current?.categories || []), response.data.category] }));
                              await transactionService.update(tx._id, { category: name });
                              queryClient.invalidateQueries({ queryKey: ["transactions"] });
                              queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                              pushNotif?.("success", "Category created & applied");
                              setNewCategoryName(""); 
                              setCategoryFormOpen(false);
                              setOpenPickerTxId(null);
                            } catch (err) {
                              dedupToast.error(err?.response?.data?.message || err?.message || "Failed to create");
                            } finally {
                              setCategorySaving(false);
                            }
                          }
                        }}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", color: C.text, fontFamily: "inherit", background: "var(--surface-muted)" }}
                      />
                      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                        <button type="button" onClick={() => setCategoryFormOpen(false)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.text }}>Cancel</button>
                        <button type="button" disabled={!newCategoryName.trim() || categorySaving} onClick={async () => {
                          const name = newCategoryName.trim();
                          if (!name) return;
                          try {
                            setCategorySaving(true);
                            const response = await transactionCategoryService.create({ name, type: tx.type });
                            queryClient.setQueryData(["transaction-categories", user?._id], (current) => ({ ...(current || {}), categories: [...(current?.categories || []), response.data.category] }));
                            await transactionService.update(tx._id, { category: name });
                            queryClient.invalidateQueries({ queryKey: ["transactions"] });
                            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                            pushNotif?.("success", "Category created & applied");
                            setNewCategoryName(""); 
                            setCategoryFormOpen(false);
                            setOpenPickerTxId(null);
                          } catch (err) {
                            dedupToast.error(err?.response?.data?.message || err?.message || "Failed to create");
                          } finally {
                            setCategorySaving(false);
                          }
                        }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: C.text, color: C.white, cursor: newCategoryName.trim() ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600, opacity: newCategoryName.trim() ? 1 : 0.6 }}>{categorySaving ? "Saving..." : "Create"}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10, paddingLeft: 4 }}>
                        {tx.type === "expense" ? "All Expenses" : "All Income"}
                      </div>
                      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border2}`, fontSize: 14, color: C.text, fontWeight: 600, background: "var(--bg-subtle)" }}>
                          {tx.type === "expense" ? "Expense" : "Income"}
                        </div>
                        {allCategoryRecords
                          .filter(c => c.type === tx.type && (getSpendingCategoryLabel(c.name).toLowerCase().includes(categorySearch.toLowerCase()) || c.name.toLowerCase().includes(categorySearch.toLowerCase())))
                          .map((cat, idx, arr) => {
                            const isSelected = tx.category === cat.name;
                            const cMeta = getSpendingCategoryMeta(cat.name);
                            const CIcon = cMeta?.icon || BadgeDollarSign;
                            const cColor = cMeta?.color || "#8b80ff";
                            return (
                              <div 
                                key={cat.id} 
                                onClick={async () => {
                                  try {
                                    await transactionService.update(tx._id, { category: cat.name });
                                    queryClient.invalidateQueries({ queryKey: ["transactions"] });
                                    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                                    pushNotif?.("success", "Category updated");
                                    setOpenPickerTxId(null);
                                  } catch {
                                    dedupToast.error("Failed to update category");
                                  }
                                }}
                                style={{ 
                                  padding: "10px 14px", 
                                  display: "flex", 
                                  alignItems: "center", 
                                  justifyContent: "space-between", 
                                  cursor: "pointer", 
                                  background: isSelected ? "var(--surface-muted)" : C.white,
                                  borderBottom: idx < arr.length - 1 ? `1px solid ${C.border2}` : "none",
                                  transition: "background 0.2s"
                                }}
                                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--bg-subtle)" }}
                                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = C.white }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: cColor, color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <CIcon size={18} />
                                  </div>
                                  <span style={{ fontSize: 13.5, color: C.text, fontWeight: isSelected ? 600 : 400 }}>{getSpendingCategoryLabel(cat.name)}</span>
                                </div>
                                <div style={{ 
                                  width: 20, 
                                  height: 20, 
                                  borderRadius: "50%", 
                                  border: `2px solid ${isSelected ? C.text : C.muted}`, 
                                  display: "flex", 
                                  alignItems: "center", 
                                  justifyContent: "center" 
                                }}>
                                  {isSelected && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.text }} />}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  )}
                </div>

                {!categoryFormOpen && (
                  <div style={{ padding: "16px", borderTop: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "var(--bg-subtle)" }}>
                    <button type="button" onClick={() => setCategoryFormOpen(true)} style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer", flex: 1, transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-muted)"} onMouseLeave={(e) => e.currentTarget.style.background = C.white}>
                      Create new category
                    </button>
                    <button type="button" onClick={() => { navigate("/profile?tab=categories"); setOpenPickerTxId(null); }} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: C.text, color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.opacity = 0.8} onMouseLeave={(e) => e.currentTarget.style.opacity = 1}>
                      Manage
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.muted, fontSize: C.fSizeXs, fontWeight: C.fWeightReg }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--bg-subtle)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>P</div>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{accountLabel}</span>
        </div>
        <div style={{ fontSize: C.fSizeXs, color: C.muted, whiteSpace: "nowrap", fontWeight: C.fWeightReg }}>{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
          {tx.isHidden && <EyeOff size={13} color={C.muted} />}
          <span className="origin-value-sm" style={{ fontSize: C.fSizeSm, color: tx.type === "income" ? "#16a34a" : C.text }}>{tx.type === "income" ? "+" : "-"}{formatAmount(tx.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    );
  };

  const desktopCols = selectMode
    ? "56px minmax(200px,2.2fr) minmax(160px,1.35fr) minmax(140px,1.1fr) minmax(130px,0.95fr) minmax(120px,0.9fr)"
    : "minmax(220px,2.25fr) minmax(170px,1.45fr) minmax(150px,1.2fr) minmax(130px,1.1fr) minmax(120px,1fr)";

  return (
    <>
      <div style={{ display: "block" }}>
        <div style={box(C)}>

          {/* ── Toolbar ── */}
          <div style={{ padding: isMobile ? "14px 14px 10px" : "18px 18px 12px", borderBottom: `1px solid ${C.border2}`, background: "var(--bg-card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* Label — hide on very small screens */}
              {!isMobile && <div className="origin-section-label" style={{ marginRight: 4, fontSize: C.fSizeXs }}>TRANSACTIONS</div>}

              {/* Search — full width on mobile; on desktop the search sits beside the filter buttons */}
              {isMobile && (
                <div style={{ flex: "1 1 100%", maxWidth: "100%", height: 40, borderRadius: 12, border: `1px solid ${C.border}`, background: "var(--bg-card)", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", boxShadow: "var(--shadow-card)" }}>
                  <Search size={17} color={C.muted} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions…" style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 13.5, color: C.text, fontFamily: "inherit" }} />
                  {search ? <button type="button" onClick={() => setSearch("")} style={{ border: "none", background: "transparent", padding: 0, display: "flex", cursor: "pointer" }}><X size={16} color={C.text} /></button> : null}
                </div>
              )}

              {/* Icon buttons row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: isMobile ? 0 : "auto" }}>
                {/* Desktop search placed here so it sits next to filter and other action buttons */}
                {!isMobile && (
                  <div style={{ width: 260, height: 36, borderRadius: 10, border: `1px solid ${C.border}`, background: "var(--bg-card)", display: "flex", alignItems: "center", gap: 8, padding: "0 10px", boxShadow: "var(--shadow-card)", flexShrink: 0 }}>
                    <Search size={16} color={C.muted} />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions…" style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 13, color: C.text, fontFamily: "inherit" }} />
                    {search ? <button type="button" onClick={() => setSearch("")} style={{ border: "none", background: "transparent", padding: 0, display: "flex", cursor: "pointer" }}><X size={14} color={C.text} /></button> : null}
                  </div>
                )}
                <button type="button" onClick={() => setFilterOpen(true)} style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${C.border}`, background: "var(--bg-card)", cursor: "pointer", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-card)" }}>
                  <Filter size={16} color={C.sub} />
                  {selectedFilterCount ? <span style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: "50%", background: C.text }} /> : null}
                </button>
                <button type="button" onClick={() => { setSelectMode((v) => !v); setSelectedRows(new Set()); }} style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${C.border}`, background: selectMode ? C.strong : "var(--bg-secondary)", color: selectMode ? C.onStrong : C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={16} />
                </button>
                <div ref={dotsRef} style={{ position: "relative" }}>
                  <button type="button" onClick={() => setDotsOpen((v) => !v)} style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${C.border}`, background: "var(--bg-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-card)" }}>
                    <MoreVertical size={16} color={C.sub} />
                  </button>
                  {dotsOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 180, background: "var(--bg-card)", border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: "var(--shadow-elevated)", zIndex: 20, overflow: "hidden" }}>
                      <button type="button" onClick={exportCsv} style={{ width: "100%", border: "none", background: "var(--bg-card)", color: C.text, padding: "13px 14px", textAlign: "left", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "inherit", borderBottom: `1px solid ${C.border}` }}>
                        <Check size={15} />Export CSV
                      </button>
                      <button type="button" onClick={() => { setDotsOpen(false); if (txLimitReached) { dedupToast.error("Free limit reached. Upgrade to Pro."); return; } setAddModalOpen(true); }} style={{ width: "100%", border: "none", background: "var(--bg-card)", color: C.text, padding: "13px 14px", textAlign: "left", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "inherit" }}>
                        <Plus size={15} />Add transaction
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectMode && (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <button type="button" onClick={toggleSelectAll} style={{ height: 36, padding: "0 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: "var(--bg-secondary)", color: C.text, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>
                  {allVisibleSelected ? "Clear selection" : "Select all"}
                </button>
                <button type="button" onClick={handleDeleteSelected} disabled={!selectedCount || saving} 
                  style={{ 
                    height: 36, padding: "0 14px", borderRadius: 10, 
                    border: !selectedCount || saving ? `1px solid ${C.border}` : (confirmingBulk ? `1px solid ${C.red}` : "none"), 
                    background: !selectedCount || saving ? "var(--bg-secondary)" : (confirmingBulk ? C.red : C.red), 
                    color: !selectedCount || saving ? C.muted : "#fff", 
                    cursor: !selectedCount || saving ? "not-allowed" : "pointer", 
                    fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, 
                    display: "inline-flex", alignItems: "center", gap: 8, 
                    opacity: !selectedCount || saving ? 0.7 : 1,
                    transition: "all 0.2s ease"
                  }}>
                  <Trash2 size={14} />
                  {confirmingBulk ? "Confirm Delete?" : `Delete ${selectedCount ? `(${selectedCount})` : ""}`}
                </button>
              </div>
            )}
          </div>

          {/* ── Summary strip ── */}
          <div style={{ padding: isMobile ? "10px 14px" : "14px 16px", borderBottom: `1px solid ${C.border2}`, background: "var(--bg-subtle)" }}>
            <div style={{
              border: `1px solid ${C.border}`,
              background: "var(--bg-card)",
              borderRadius: 16,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))",
              overflow: "hidden",
            }}>
              {[
                ["Transactions", summary.count],
                ["Date range", isMobile ? (summary.dateRange.split(" – ")[0] || summary.dateRange) : summary.dateRange],
                ["Expenses", `-${formatAmount(summary.expenses, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ["Income", formatAmount(summary.income, { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
              ].map(([label, value], i) => (
                <div key={label} style={{ padding: isMobile ? "10px 12px" : "12px 16px", fontSize: isMobile ? C.fSizeXs : C.fSizeSm, color: C.muted, borderLeft: i > 0 && !(isMobile && i === 2) ? `1px solid ${C.border2}` : "none", borderTop: isMobile && i >= 2 ? `1px solid ${C.border2}` : "none" }}>
                  <span style={{ fontWeight: C.fWeightReg }}>{label}</span>
                  <span style={{ display: "block", color: C.text, fontWeight: C.fWeightSemi, marginTop: 2, fontSize: isMobile ? C.fSizeSm : C.fSizeBase, fontVariantNumeric: "tabular-nums" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Table / List ── */}
          {isMobile ? (
            /* Mobile: card list */
            <div style={{ minHeight: 300 }}>
              {filtered.length === 0 && <div style={{ padding: "40px 16px", textAlign: "center", color: C.muted }}>No transactions found.</div>}
              {filtered.map((tx) => <MobileRow key={tx._id} tx={tx} />)}
            </div>
          ) : (
            /* Desktop: table */
            <div style={{ minHeight: 420, overflowX: "auto" }}>
              <div style={{ minWidth: selectMode ? 880 : 820 }}>
                {/* Table header */}
                <div style={{ display: "grid", gridTemplateColumns: desktopCols, alignItems: "center", padding: "12px 18px", borderBottom: `1px solid ${C.border2}`, background: "var(--bg-subtle)" }}>
                  {selectMode && <div style={{ display: "flex", alignItems: "center" }}><input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="Select all transactions" /></div>}
                  <div className="origin-section-label" style={{ fontSize: C.fSizeXs }}>Merchant</div>
                  <button type="button" onClick={() => setSortDir((v) => v === "asc" ? "desc" : "asc")} style={{ border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "inherit" }}>
                    <span className="origin-section-label" style={{ fontSize: C.fSizeXs }}>Category</span> {sortDir === "asc" ? <SortAsc size={13} color={C.muted} /> : <SortDesc size={13} color={C.muted} />}
                  </button>
                  <div className="origin-section-label" style={{ fontSize: C.fSizeXs }}>Account</div>
                  <button type="button" onClick={() => setSortDir((v) => v === "asc" ? "desc" : "asc")} style={{ border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "inherit" }}>
                    <span className="origin-section-label" style={{ fontSize: C.fSizeXs }}>Date</span> {sortDir === "asc" ? <SortAsc size={13} color={C.muted} /> : <SortDesc size={13} color={C.muted} />}
                  </button>
                  <button type="button" onClick={() => setSortDir((v) => v === "asc" ? "desc" : "asc")} style={{ border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", cursor: "pointer", fontFamily: "inherit" }}>
                    <span className="origin-section-label" style={{ fontSize: C.fSizeXs }}>Amount</span> {sortDir === "asc" ? <SortAsc size={13} color={C.muted} /> : <SortDesc size={13} color={C.muted} />}
                  </button>
                </div>
                {filtered.length === 0 && <div style={{ padding: "46px 18px", textAlign: "center", color: C.muted }}>No transactions found.</div>}
                {filtered.map((tx) => <DesktopRow key={tx._id} tx={tx} />)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar is now handled globally */}

      {/* ── Filter panel ── */}
      {filterOpen && (
        <>
          <div onClick={() => setFilterOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.18)", zIndex: 80 }} />
          <div style={{
            position: "fixed",
            ...(isMobile
              ? { bottom: 0, left: 0, right: 0, height: "78vh", borderRadius: "20px 20px 0 0" }
              : { top: 12, right: 12, width: 380, maxWidth: "calc(100vw - 24px)", height: "calc(100vh - 24px)", borderRadius: 16 }),
            background: "var(--bg-secondary)",
            borderLeft: isMobile ? "none" : `1px solid ${C.border}`,
            borderTop: isMobile ? `1px solid ${C.border}` : "none",
            boxShadow: "var(--shadow-elevated)",
            zIndex: 81,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            {isMobile && <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: "10px auto 0" }} />}
            <div style={{ padding: isMobile ? "14px 16px" : "15px 16px", borderBottom: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.18em", fontWeight: 700, color: C.muted }}>FILTERS</div>
              <button type="button" onClick={() => setFilterOpen(false)} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}><X size={22} color={C.muted} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0, scrollbarGutter: "stable", padding: isMobile ? "14px 16px 8px" : "14px 16px 8px" }}>
              <div style={{ fontSize: 12.5, color: C.text, marginBottom: 10 }}>Filter by</div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 18 }}>
                {["date","accounts","categories","tags","amount","merchants"].map((s) => (
                  <div key={s}>
                    <FilterRow label={s.charAt(0).toUpperCase() + s.slice(1)} onClick={() => setActiveFilterSection((prev) => prev === s ? null : s)} />
                    {activeFilterSection === s ? renderFilterSection() : null}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: C.text, marginBottom: 10 }}>Show / hide</div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
                {["visibility","split","status","notes","reviewStatus"].map((s) => (
                  <div key={s}>
                    <FilterRow label={s === "reviewStatus" ? "Review Status" : s.charAt(0).toUpperCase() + s.slice(1)} onClick={() => setActiveFilterSection((prev) => prev === s ? null : s)} />
                    {activeFilterSection === s ? renderFilterSection() : null}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: isMobile ? "12px 16px 16px" : "12px 16px 16px", display: "flex", gap: 8, flexShrink: 0, borderTop: `1px solid ${C.border2}` }}>
              <button type="button" onClick={() => { setDraftFilters(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); setActiveFilterSection(null); }} style={{ flex: 1, height: 42, borderRadius: 12, border: `1px solid ${C.border}`, background: "var(--bg-card)", color: C.text, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Clear</button>
              <button type="button" onClick={() => { setFilters({ ...draftFilters }); setActiveFilterSection(null); setFilterOpen(false); }} style={{ flex: 1.4, height: 42, borderRadius: 12, border: "none", background: C.strong, color: C.onStrong, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Apply</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
