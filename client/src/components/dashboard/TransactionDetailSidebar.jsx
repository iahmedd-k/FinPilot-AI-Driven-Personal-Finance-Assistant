import { useState, useEffect, useMemo, useRef } from "react";
import { 
  ChevronLeft, ChevronDown, BadgeDollarSign, 
  Pencil, Check, X, Trash2, Eye, EyeOff,
  RotateCcw, Split
} from "lucide-react";
import { useDashboard } from "./DashboardContext";
import { 
  C, CAT_COLORS, catToIcon, dedupToast, 
  getSpendingCategoryLabel, getSpendingCategoryMeta 
} from "./dashboardShared.jsx";
import { transactionCategoryService } from "../../services/transactionCategoryService";
import { formatCurrencyAmount, getUserCurrency } from "../../utils/currency";
import { useQuery } from "@tanstack/react-query";
import CalendarPicker from "../common/CalendarPicker";

// ─── small primitives ──────────────────────────────────────────────────────────

function FieldRow({ label, value, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 16px",
      borderBottom: last ? "none" : "1px solid var(--border-subtle)"
    }}>
      <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.text, fontWeight: 500, textAlign: "right", maxWidth: "60%", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>
        {value || <span style={{ color: C.muted }}>�</span>}
      </span>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid var(--border-default, ${C.border})`,
  background: "var(--bg-card)",
  fontSize: 14,
  color: C.text,
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
};

// ─── main component ────────────────────────────────────────────────────────────

export default function TransactionDetailSidebar() {
  const {
    globalSelectedTxId, setGlobalSelectedTxId,
    apiTransactions, transactionService, queryClient, pushNotif,
    isMobile, user
  } = useDashboard();

  // form draft only used in edit mode
  const [draft, setDraft] = useState(null);
  const [editMode, setEditMode] = useState(false);      // controls edit sheet visibility
  const [saving, setSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitAmount, setSplitAmount] = useState("");
  const catRef = useRef(null);

  const preferredCurrency = getUserCurrency(user);
  const fmt = (val) => formatCurrencyAmount(Math.abs(val || 0), preferredCurrency);

  const { data: categoryData } = useQuery({
    queryKey: ["transaction-categories", user?._id],
    queryFn: () => transactionCategoryService.list().then((r) => r.data),
    enabled: !!user?._id,
  });
  const customCategoryRecords = categoryData?.categories || [];

  const tx = useMemo(
    () => {
      if (!globalSelectedTxId) return null;
      // Accept either a raw id string/number or an occurrence object containing _id or id
      let sel = globalSelectedTxId;
      if (typeof sel === "object" && sel !== null) {
        sel = sel._id || sel.id || null;
      }
      if (!sel) return null;
      return apiTransactions.find(t => t._id === sel || t.id === sel);
    },
    [apiTransactions, globalSelectedTxId]
  );

  // reset when tx changes
  useEffect(() => {
    if (tx) {
      const fresh = {
        merchant: tx.merchant || "",
        category: tx.category || "Other Expense",
        date: tx.date ? new Date(tx.date).toISOString().slice(0, 10) : "",
        notes: tx.notes || "",
        tag: tx.tag || "",
        amount: tx.amount || 0,
        isRecurring: !!tx.isRecurring,
        isHidden: !!tx.isHidden,
        reviewStatus: tx.reviewStatus || "needs_review",
      };
      setDraft(fresh);
    } else {
      setDraft(null);
    }
    setEditMode(false);
    setSplitMode(false);
    setSplitAmount("");
    setConfirmDelete(false);
  }, [tx]);

  // close category picker on outside click
  useEffect(() => {
    function handler(e) {
      if (catRef.current && !catRef.current.contains(e.target)) setShowCategoryPicker(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allCategories = useMemo(() => {
    if (!tx) return [];
    const defaults = transactionService.CATEGORIES.map(name => ({ name, type: name === "Salary" ? "income" : "expense" }));
    const customs = customCategoryRecords.map(item => ({ name: item.name, type: item.type }));
    return [...defaults, ...customs];
  }, [customCategoryRecords, transactionService.CATEGORIES, tx]);

  const filteredCategories = useMemo(() =>
    allCategories.filter(c =>
      c.type === tx?.type &&
      (getSpendingCategoryLabel(c.name).toLowerCase().includes(categorySearch.toLowerCase()) ||
        c.name.toLowerCase().includes(categorySearch.toLowerCase()))
    ),
    [allCategories, tx, categorySearch]
  );

  const meta = useMemo(() =>
    tx?.type === "expense" ? getSpendingCategoryMeta(draft?.category || tx?.category) : null,
    [tx, draft?.category]
  );
  const color = meta?.color || "#8b80ff";
  const Icon = meta?.icon || catToIcon[draft?.category || tx?.category || ""] || BadgeDollarSign;

  if (!globalSelectedTxId || !tx || !draft) return null;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["transactions-page"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const patchTx = async (patch, successMsg) => {
    try {
      setSaving(true);
      const userEdited = ["category", "date", "notes", "tag", "merchant", "amount", "isHidden", "isRecurring"].some(k => k in patch);
      const finalPatch = userEdited && !("reviewStatus" in patch)
        ? { ...patch, reviewStatus: "reviewed" }
        : patch;
      await transactionService.update(tx._id, finalPatch);
      refresh();
      if (successMsg) pushNotif?.("success", successMsg);
    } catch (e) {
      dedupToast.error(e?.response?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  // ── open edit: snapshot current tx into draft ──────────────────────────────
  const openEdit = () => {
    setDraft({
      merchant: tx.merchant || "",
      category: tx.category || "Other Expense",
      date: tx.date ? new Date(tx.date).toISOString().slice(0, 10) : "",
      notes: tx.notes || "",
      tag: tx.tag || "",
      amount: tx.amount || 0,
      isRecurring: !!tx.isRecurring,
      isHidden: !!tx.isHidden,
      reviewStatus: tx.reviewStatus || "needs_review",
    });
    setEditMode(true);
    setSplitMode(false);
  };

  const cancelEdit = () => {
    // restore draft from current tx
    setDraft({
      merchant: tx.merchant || "",
      category: tx.category || "Other Expense",
      date: tx.date ? new Date(tx.date).toISOString().slice(0, 10) : "",
      notes: tx.notes || "",
      tag: tx.tag || "",
      amount: tx.amount || 0,
      isRecurring: !!tx.isRecurring,
      isHidden: !!tx.isHidden,
      reviewStatus: tx.reviewStatus || "needs_review",
    });
    setEditMode(false);
    setShowCategoryPicker(false);
  };

  const saveAll = async () => {
    await patchTx({
      merchant: draft.merchant,
      amount: Number(draft.amount),
      date: draft.date,
      tag: draft.tag,
      notes: draft.notes,
      category: draft.category,
      isHidden: draft.isHidden,
      isRecurring: draft.isRecurring,
    }, "Changes saved");
    setEditMode(false);
    setShowCategoryPicker(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    try {
      setSaving(true);
      await transactionService.delete(tx._id);
      refresh();
      pushNotif?.("success", "Deleted");
      setGlobalSelectedTxId(null);
    } catch {
      dedupToast.error("Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const toggleReviewStatus = () => {
    const next = draft.reviewStatus === "reviewed" ? "needs_review" : "reviewed";
    patchTx({ reviewStatus: next }, next === "reviewed" ? "Marked as reviewed" : "Marked as needs review");
    setDraft(d => ({ ...d, reviewStatus: next }));
  };

  const handleSplit = async () => {
    const total = Math.abs(tx.amount || 0);
    const first = Number(Number(splitAmount).toFixed(2));
    if (isNaN(first) || first <= 0 || first >= total) {
      dedupToast.error("Invalid split amount");
      return;
    }
    const second = Number((total - first).toFixed(2));
    try {
      setSaving(true);
      await transactionService.create({ merchant: `${tx.merchant} (Part 1)`, category: tx.category, amount: first, type: tx.type, date: tx.date, notes: tx.notes, tag: tx.tag, reviewStatus: "reviewed" });
      await transactionService.create({ merchant: `${tx.merchant} (Part 2)`, category: tx.category, amount: second, type: tx.type, date: tx.date, notes: tx.notes, tag: tx.tag, reviewStatus: "reviewed" });
      await transactionService.delete(tx._id);
      refresh();
      pushNotif?.("success", "Transaction split");
      setGlobalSelectedTxId(null);
    } catch {
      dedupToast.error("Failed to split");
    } finally {
      setSaving(false);
    }
  };

  const accountLabel = tx.isFromCSV ? "CSV Import" : "Manual Entry";
  const accountInitial = tx.isFromCSV ? "C" : "M";

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* backdrop */}
      <div
        onClick={() => setGlobalSelectedTxId(null)}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.15)", zIndex: 1000, backdropFilter: "blur(4px)" }}
      />

      {/* sidebar shell */}
      <div style={{
        position: "fixed", top: 0, right: 0,
        width: isMobile ? "100%" : 420, height: "100vh",
        background: C.bg,
        boxShadow: "-10px 0 40px rgba(0,0,0,0.08)",
        zIndex: 1001, display: "flex", flexDirection: "column", overflow: "hidden",
        animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}>

        {/* ── HEADER ── */}
        <div style={{
          padding: "14px 20px", display: "flex", alignItems: "center",
          justifyContent: "space-between", borderBottom: `1px solid ${C.border}`,
          background: C.white
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setGlobalSelectedTxId(null)} style={iconBtnStyle}>
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {(tx.merchant || "Transaction").toUpperCase()}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setSplitMode(true); setEditMode(false); }}
              title="Split transaction"
              style={iconBtnStyle}
            >
              <Split size={16} />
            </button>
            <button onClick={editMode ? cancelEdit : openEdit} style={{
              ...iconBtnStyle,
              background: editMode ? C.text : "transparent",
              color: editMode ? C.bg : C.muted,
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
              border: editMode ? "none" : `1px solid ${C.border}`
            }}>
              {editMode ? <><X size={14} /> Cancel</> : <><Pencil size={14} /> Edit</>}
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 32px" }}>

          {/* review status pill */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <button onClick={toggleReviewStatus} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 12px", borderRadius: 100,
              fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em",
              border: "none", cursor: "pointer", transition: "opacity 0.15s",
              background: draft.reviewStatus === "needs_review" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)",
              color: draft.reviewStatus === "needs_review" ? "#3B82F6" : "#10B981"
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
              {draft.reviewStatus === "needs_review" ? "Needs Review" : "Reviewed"}
            </button>
          </div>

          {/* amount */}
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 40, fontWeight: 600, color: C.text, letterSpacing: "-0.02em", fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere", lineHeight: 1.05 }}>
              {fmt(tx.amount)}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              {new Date(tx.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>

          {/* category pill � read only */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "7px 14px 7px 8px", borderRadius: 100,
              background: "var(--bg-card)", border: `1px solid ${C.border}`,
            }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={14} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                {getSpendingCategoryLabel(tx.category)}
              </span>
            </div>
          </div>

          {/* ── VIEW-MODE field card ── */}
          <div style={{ background: "var(--bg-card)", borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
            <FieldRow label="Date" value={new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
            <FieldRow label="Tag" value={tx.tag ? (
              <span style={{ background: "var(--bg-subtle)", padding: "2px 10px", borderRadius: 100, fontSize: 12 }}>{tx.tag}</span>
            ) : null} />
            <FieldRow label="Note" value={tx.notes} />
            <FieldRow label="Recurring" value={tx.isRecurring ? "Yes" : "No"} />
            <FieldRow label="Hidden" value={tx.isHidden ? "Yes" : "No"} last />
          </div>

          {/* account info */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: "var(--bg-card)", border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg-subtle)", color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>
              {accountInitial}
            </div>
            <span style={{ fontSize: 13, color: C.muted }}>{accountLabel}</span>
          </div>

          {/* delete */}
          <button onClick={handleDelete} disabled={saving} style={{
            width: "100%", padding: "14px", borderRadius: 14, border: "none",
            background: C.redBg, color: C.red, fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: saving ? 0.6 : 1
          }}>
            <Trash2 size={16} />
            {confirmDelete ? "Tap again to confirm delete" : "Delete transaction"}
          </button>

        </div>

        {/* ── EDIT SHEET (slides up from bottom) ── */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          background: C.bg,
          borderTop: `1.5px solid ${C.border}`,
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.08)",
          padding: "0 20px 32px",
          maxHeight: "80vh",
          overflowY: "auto",
          zIndex: 10,
          transform: editMode ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          pointerEvents: editMode ? "auto" : "none"
        }}>
          {/* sheet handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 20px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
          </div>

          {/* sheet header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Edit transaction</span>
            <button onClick={saveAll} disabled={saving} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 10,
              background: C.text, color: C.bg,
              border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              opacity: saving ? 0.6 : 1
            }}>
              <Check size={14} strokeWidth={3} />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

          {/* Merchant */}
          <FormField label="Merchant">
            <input
              style={inputStyle}
              value={draft.merchant}
              onChange={e => setDraft(d => ({ ...d, merchant: e.target.value }))}
              placeholder="Merchant name"
              onFocus={e => e.target.style.borderColor = C.text}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </FormField>

          {/* Amount */}
          <FormField label="Amount">
            <input
              style={inputStyle}
              type="number"
              value={draft.amount}
              onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))}
              placeholder="0.00"
              onFocus={e => e.target.style.borderColor = C.text}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </FormField>

          {/* Date */}
          <FormField label="Date">
            <CalendarPicker C={C} value={draft.date} onChange={(v) => setDraft(d => ({ ...d, date: v }))} minDate={null} />
          </FormField>

          {/* Category */}
          <FormField label="Category">
            <div style={{ position: "relative" }} ref={catRef}>
              <button
                onClick={() => { setShowCategoryPicker(p => !p); setCategorySearch(""); }}
                style={{
                  ...inputStyle, display: "flex", alignItems: "center", gap: 10,
                  cursor: "pointer", textAlign: "left", border: `1px solid ${showCategoryPicker ? C.text : C.border}`
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={12} />
                </div>
                <span style={{ flex: 1, fontSize: 14, color: C.text }}>{getSpendingCategoryLabel(draft.category)}</span>
                <ChevronDown size={16} color={C.muted} />
              </button>
              {showCategoryPicker && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0,
                  background: C.white, border: `1px solid ${C.border}`, borderRadius: 14,
                  boxShadow: "0 -8px 24px rgba(0,0,0,0.1)", zIndex: 30,
                  maxHeight: 240, overflow: "hidden", display: "flex", flexDirection: "column"
                }}>
                  <div style={{ padding: "10px 10px 6px" }}>
                    <input
                      autoFocus
                      placeholder="Search..."
                      value={categorySearch}
                      onChange={e => setCategorySearch(e.target.value)}
                      style={{ ...inputStyle, padding: "8px 12px", fontSize: 13 }}
                    />
                  </div>
                  <div style={{ overflowY: "auto", flex: 1, padding: "4px 8px 8px" }}>
                    {filteredCategories.map(cat => {
                      const cMeta = getSpendingCategoryMeta(cat.name);
                      const CIcon = cMeta?.icon || BadgeDollarSign;
                      const cColor = cMeta?.color || "#8b80ff";
                      const selected = draft.category === cat.name;
                      return (
                        <div
                          key={cat.name}
                          onClick={() => { setDraft(d => ({ ...d, category: cat.name })); setShowCategoryPicker(false); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 10px", borderRadius: 10,
                            cursor: "pointer", marginBottom: 2,
                            background: selected ? "var(--bg-subtle)" : "transparent",
                            color: selected ? C.text : C.muted,
                            fontSize: 13, fontWeight: selected ? 600 : 400,
                            transition: "background 0.1s"
                          }}
                        >
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${cColor}18`, color: cColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <CIcon size={12} />
                          </div>
                          {getSpendingCategoryLabel(cat.name)}
                          {selected && <Check size={14} style={{ marginLeft: "auto" }} color={C.text} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </FormField>

          {/* Tag */}
          <FormField label="Tag">
            <input
              style={inputStyle}
              value={draft.tag}
              onChange={e => setDraft(d => ({ ...d, tag: e.target.value }))}
              placeholder="e.g. business, travel..."
              onFocus={e => e.target.style.borderColor = C.text}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </FormField>

          {/* Notes */}
          <FormField label="Note">
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
              value={draft.notes}
              onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
              placeholder="Add a note..."
              onFocus={e => e.target.style.borderColor = C.text}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </FormField>

          {/* Toggles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
            {[
              { key: "isHidden", label: "Hide transaction", icon: draft.isHidden ? EyeOff : Eye },
              { key: "isRecurring", label: "Recurring", icon: RotateCcw }
            ].map(({ key, label, icon: TIcon }) => (
              <button
                key={key}
                onClick={() => setDraft(d => ({ ...d, [key]: !d[key] }))}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: 12,
                  border: `1px solid ${draft[key] ? C.text : C.border}`,
                  background: draft[key] ? C.text : "var(--bg-card)",
                  color: draft[key] ? C.bg : C.muted,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                <TIcon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── SPLIT SHEET (slides up from bottom) ── */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          background: C.bg,
          borderTop: `1.5px solid ${C.border}`,
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.08)",
          padding: "0 20px 36px",
          zIndex: 11,
          transform: splitMode ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          pointerEvents: splitMode ? "auto" : "none"
        }}>
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 20px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Split transaction</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Total: {fmt(tx.amount)}</div>
            </div>
            <button onClick={() => setSplitMode(false)} style={iconBtnStyle}><X size={18} /></button>
          </div>
          <FormField label="First part amount">
            <input
              autoFocus={splitMode}
              style={inputStyle}
              type="number"
              placeholder="0.00"
              value={splitAmount}
              onChange={e => setSplitAmount(e.target.value)}
              onFocus={e => e.target.style.borderColor = C.text}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </FormField>
          {splitAmount && !isNaN(Number(splitAmount)) && Number(splitAmount) > 0 && Number(splitAmount) < Math.abs(tx.amount) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[["Part 1", Number(splitAmount)], ["Part 2", Math.abs(tx.amount) - Number(splitAmount)]].map(([label, val]) => (
                <div key={label} style={{ padding: "10px 14px", borderRadius: 12, background: "var(--bg-card)", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.text, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>{fmt(val)}</div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={handleSplit}
            disabled={saving}
            style={{
              width: "100%", padding: "14px", borderRadius: 14,
              background: C.text, color: C.bg, border: "none",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: saving ? 0.6 : 1
            }}
          >
            <Split size={16} />
            {saving ? "Splitting..." : "Confirm split"}
          </button>
        </div>

      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

const iconBtnStyle = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: C.muted,
  padding: 6,
  display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: 8,
  transition: "background 0.15s"
};

