import { useState, useEffect, useMemo, useRef } from "react";
import { 
  X, Trash2, CalendarDays, Tag, ReceiptText, 
  ChevronRight, ChevronDown, ChevronLeft, BadgeDollarSign, 
  EyeOff, Eye, AlertTriangle, Wand2, Split,
  Trash, Save, Pencil, Check, MoreVertical, Plus,
  RotateCcw, ArrowLeft, MoreHorizontal, Circle
} from "lucide-react";
import { useDashboard } from "./DashboardContext";
import { 
  C, CAT_COLORS, catToIcon, dedupToast, 
  getSpendingCategoryLabel, getSpendingCategoryMeta 
} from "./dashboardShared.jsx";
import { transactionCategoryService } from "../../services/transactionCategoryService";
import { formatCurrencyAmount, getUserCurrency } from "../../utils/currency";
import { useQuery } from "@tanstack/react-query";

export default function TransactionDetailSidebar() {
  const { 
    globalSelectedTxId, setGlobalSelectedTxId, 
    apiTransactions, transactionService, queryClient, pushNotif,
    isMobile, user
  } = useDashboard();

  const [detailDraft, setDetailDraft] = useState(null);
  const [editingField, setEditingField] = useState(null); // 'merchant', 'amount', 'date', 'tag', 'notes'
  const [isGlobalEditing, setIsGlobalEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [splitAmount, setSplitAmount] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);

  const editRef = useRef(null);
  const catRef = useRef(null);

  const preferredCurrency = getUserCurrency(user);
  const formatAmount = (value, options = {}) => formatCurrencyAmount(Math.abs(value || 0), preferredCurrency, options);

  const { data: categoryData } = useQuery({
    queryKey: ["transaction-categories", user?._id],
    queryFn: () => transactionCategoryService.list().then((r) => r.data),
    enabled: !!user?._id,
  });
  const customCategoryRecords = categoryData?.categories || [];

  const selectedTransaction = useMemo(() => 
    apiTransactions.find(t => t._id === globalSelectedTxId), 
    [apiTransactions, globalSelectedTxId]
  );

  useEffect(() => {
    if (selectedTransaction) {
      setDetailDraft({ 
        merchant: selectedTransaction.merchant || "", 
        category: selectedTransaction.category || "Other Expense", 
        date: selectedTransaction.date ? new Date(selectedTransaction.date).toISOString().slice(0, 10) : "", 
        notes: selectedTransaction.notes || "", 
        tag: selectedTransaction.tag || "", 
        amount: selectedTransaction.amount || 0,
        isRecurring: !!selectedTransaction.isRecurring, 
        isHidden: !!selectedTransaction.isHidden, 
        reviewStatus: selectedTransaction.reviewStatus || "needs_review" 
      });
      setEditingField(null);
      setIsGlobalEditing(false);
      setSplitAmount("");
    } else {
      setDetailDraft(null);
    }
  }, [selectedTransaction]);

  // Click outside to save/close editing
  useEffect(() => {
    function handleClickOutside(event) {
      if (editRef.current && !editRef.current.contains(event.target)) {
        if (editingField && !isGlobalEditing) {
          saveField(editingField);
        }
      }
      if (catRef.current && !catRef.current.contains(event.target)) {
        if (showCategoryPicker) setShowCategoryPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingField, detailDraft, isGlobalEditing, showCategoryPicker]);

  const allCategoryRecords = useMemo(() => {
    if (!selectedTransaction) return [];
    const defaults = transactionService.CATEGORIES.map(name => ({ name, type: name === "Salary" ? "income" : "expense" }));
    const customs = customCategoryRecords.map(item => ({ name: item.name, type: item.type }));
    return [...defaults, ...customs];
  }, [customCategoryRecords, transactionService.CATEGORIES, selectedTransaction]);

  const filteredCategories = useMemo(() => {
    if (!selectedTransaction) return [];
    return allCategoryRecords.filter(c => 
      c.type === selectedTransaction.type && 
      (getSpendingCategoryLabel(c.name).toLowerCase().includes(categorySearch.toLowerCase()) || c.name.toLowerCase().includes(categorySearch.toLowerCase()))
    );
  }, [allCategoryRecords, selectedTransaction, categorySearch]);

  const meta = useMemo(() => 
    selectedTransaction?.type === "expense" ? getSpendingCategoryMeta(detailDraft?.category || selectedTransaction.category) : null,
    [selectedTransaction, detailDraft?.category]
  );

  const color = useMemo(() => 
    meta?.color || "#8b80ff",
    [meta]
  );

  const Icon = useMemo(() => 
    meta?.icon || catToIcon[detailDraft?.category || selectedTransaction?.category || ""] || BadgeDollarSign,
    [meta, selectedTransaction, detailDraft?.category]
  );

  if (!globalSelectedTxId || !selectedTransaction || !detailDraft) return null;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["transactions-page"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const patchTx = async (patch, success) => {
    try {
      setSaving(true);
      const userEdited = ["category", "date", "notes", "tag", "merchant", "amount", "isHidden", "isRecurring"].some(k => k in patch);
      const finalPatch = (userEdited && !("reviewStatus" in patch))
        ? { ...patch, reviewStatus: "reviewed" }
        : patch;

      await transactionService.update(selectedTransaction._id, finalPatch);
      refresh();
      if (success) pushNotif?.("success", success);
    } catch (e) {
      dedupToast.error(e?.response?.data?.message || "Failed to update");
    } finally { setSaving(false); }
  };

  const saveField = async (field) => {
    const patch = 
      field === "date" ? { date: detailDraft.date } : 
      field === "tag" ? { tag: detailDraft.tag } : 
      field === "notes" ? { notes: detailDraft.notes } : 
      field === "amount" ? { amount: Number(detailDraft.amount) } :
      field === "merchant" ? { merchant: detailDraft.merchant } :
      null;
    
    if (patch) {
      await patchTx(patch, `${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
    }
    setEditingField(null);
  };

  const saveAll = async () => {
    const patch = {
      merchant: detailDraft.merchant,
      amount: Number(detailDraft.amount),
      date: detailDraft.date,
      tag: detailDraft.tag,
      notes: detailDraft.notes,
      category: detailDraft.category
    };
    await patchTx(patch, "Transaction updated");
    setIsGlobalEditing(false);
  };

  const handleDelete = async () => {
    if (confirmingId !== selectedTransaction._id) {
      setConfirmingId(selectedTransaction._id);
      setTimeout(() => setConfirmingId(null), 3000);
      return;
    }
    try {
      setSaving(true);
      await transactionService.delete(selectedTransaction._id);
      refresh();
      pushNotif?.("success", "Deleted");
      setGlobalSelectedTxId(null);
    } catch (e) {
      dedupToast.error("Failed to delete");
    } finally { setSaving(false); }
  };

  const toggleHide = () => {
    patchTx({ isHidden: !detailDraft.isHidden }, detailDraft.isHidden ? "Transaction visible" : "Transaction hidden");
    setDetailDraft(d => ({ ...d, isHidden: !d.isHidden }));
  };

  const toggleRecurring = () => {
    patchTx({ isRecurring: !detailDraft.isRecurring }, detailDraft.isRecurring ? "Marked as non-recurring" : "Marked as recurring");
    setDetailDraft(d => ({ ...d, isRecurring: !d.isRecurring }));
  };

  const toggleReviewStatus = () => {
    const newStatus = detailDraft.reviewStatus === "reviewed" ? "needs_review" : "reviewed";
    patchTx({ reviewStatus: newStatus }, `Marked as ${newStatus === 'reviewed' ? 'reviewed' : 'needs review'}`);
    setDetailDraft(d => ({ ...d, reviewStatus: newStatus }));
  };

  const getAccountInfo = () => {
    return {
      name: selectedTransaction.isFromCSV ? "CSV Import" : "Manual Entry",
      icon: selectedTransaction.isFromCSV ? "C" : "M"
    };
  };

  const account = getAccountInfo();

  return (
    <>
      <div 
        onClick={() => {
          if (editingField) setEditingField(null);
          setGlobalSelectedTxId(null);
        }} 
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.1)", zIndex: 1000, backdropFilter: "blur(4px)" }} 
      />
      <div style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: isMobile ? "100%" : 420,
        height: "100vh",
        background: C.bg,
        boxShadow: "-10px 0 40px rgba(0,0,0,0.1)",
        zIndex: 1001,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
      }}>
        {/* Header */}
        <div style={{ 
          padding: "16px 20px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          borderBottom: `1px solid ${C.border}`,
          background: C.white
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button 
              onClick={() => setGlobalSelectedTxId(null)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: C.muted, padding: 4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, transition: "background 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-muted)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>
            {editingField === 'merchant' || isGlobalEditing ? (
              <input 
                ref={editingField === 'merchant' ? editRef : null}
                autoFocus={editingField === 'merchant'}
                value={detailDraft.merchant}
                onChange={e => setDetailDraft(d => ({ ...d, merchant: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && !isGlobalEditing && saveField('merchant')}
                style={{ 
                  fontSize: 14, 
                  fontWeight: 700, 
                  color: C.text, 
                  textTransform: "uppercase", 
                  border: "none", 
                  outline: "none",
                  background: "var(--surface-muted)",
                  padding: "6px 10px",
                  borderRadius: 6
                }}
              />
            ) : (
              <span 
                onClick={() => setEditingField('merchant')}
                style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", padding: "4px 0" }}
              >
                {(detailDraft.merchant || "TRANSACTION").toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              onClick={() => isGlobalEditing ? saveAll() : setIsGlobalEditing(true)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: isGlobalEditing ? C.greenMid : C.muted, display: "flex", alignItems: "center", justifyContent: "center", padding: 6, borderRadius: 8, transition: "background 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-muted)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              {isGlobalEditing ? <Check size={20} strokeWidth={3} /> : <Pencil size={18} />}
            </button>
          </div>
        </div>

        {/* Content Scroll Area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            
            {/* Status Indicator */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 6, 
              marginBottom: 16,
              color: detailDraft.reviewStatus === 'needs_review' ? C.brand : C.greenMid,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              background: detailDraft.reviewStatus === 'needs_review' ? "rgba(59, 130, 246, 0.1)" : "rgba(16, 185, 129, 0.1)",
              padding: "4px 12px",
              borderRadius: 100
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
              {detailDraft.reviewStatus === 'needs_review' ? "Needs Review" : "Reviewed"}
            </div>

            {/* Large Amount Display */}
            <div 
              onClick={() => setEditingField('amount')}
              style={{ marginBottom: 20, cursor: "pointer", width: "100%", display: "flex", justifyContent: "center" }}
            >
              {editingField === 'amount' || isGlobalEditing ? (
                <input 
                  ref={editingField === 'amount' ? editRef : null}
                  autoFocus={editingField === 'amount'}
                  type="number"
                  value={detailDraft.amount}
                  onChange={e => setDetailDraft(d => ({ ...d, amount: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && !isGlobalEditing && saveField('amount')}
                  style={{ 
                    fontSize: 38, 
                    fontWeight: 700, 
                    color: C.text, 
                    textAlign: "center",
                    border: "none", 
                    outline: "none",
                    width: "100%",
                    background: "transparent",
                    fontFamily: "var(--font-sans)"
                  }}
                />
              ) : (
                <div style={{ fontSize: 38, fontWeight: 600, color: C.text, letterSpacing: "-0.02em", fontFamily: "var(--font-sans)" }}>
                  {formatAmount(detailDraft.amount)}
                </div>
              )}
            </div>

            {/* Category Selector Pill */}
            <div style={{ position: "relative", marginBottom: 24 }}>
              <button 
                onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 10, 
                  padding: "8px 16px 8px 10px", 
                  borderRadius: 100, 
                  background: "var(--bg-card)",
                  border: `1px solid ${C.border}`,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)"}
              >
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: "50%", 
                  background: color, 
                  color: "white", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center" 
                }}>
                  <Icon size={16} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                  {getSpendingCategoryLabel(detailDraft.category)}
                </span>
                <ChevronDown size={16} color={C.muted} />
              </button>

              {showCategoryPicker && (
                <div ref={catRef} style={{ 
                  position: "absolute", 
                  top: "100%", 
                  left: "50%", 
                  transform: "translateX(-50%)",
                  marginTop: 8, 
                  width: 220,
                  background: "var(--bg-card)", 
                  border: `1px solid ${C.border}`, 
                  borderRadius: 16, 
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)", 
                  zIndex: 20, 
                  maxHeight: 300, 
                  overflowY: "auto",
                  padding: 8
                }}>
                  <div style={{ padding: "4px 8px 12px 8px" }}>
                    <input 
                      autoFocus
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={e => setCategorySearch(e.target.value)}
                      style={{ 
                        width: "100%", 
                        padding: "8px 12px", 
                        borderRadius: 10, 
                        border: `1px solid ${C.border}`, 
                        fontSize: 13,
                        color: C.text,
                        outline: "none",
                        background: "var(--surface-muted)"
                      }}
                    />
                  </div>
                  {filteredCategories.map(cat => {
                    const cMeta = getSpendingCategoryMeta(cat.name);
                    const CIcon = cMeta?.icon || BadgeDollarSign;
                    const cColor = cMeta?.color || "#8b80ff";
                    return (
                      <div 
                        key={cat.name} 
                        onClick={() => { 
                          if (!isGlobalEditing) patchTx({ category: cat.name }, "Category updated"); 
                          setDetailDraft(d => ({ ...d, category: cat.name }));
                          setShowCategoryPicker(false); 
                        }}
                        style={{ 
                          padding: "8px 12px", 
                          fontSize: 14, 
                          cursor: "pointer", 
                          borderRadius: 10,
                          color: detailDraft.category === cat.name ? C.text : C.muted,
                          background: detailDraft.category === cat.name ? "var(--surface-muted)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 2
                        }}
                      >
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${cColor}15`, color: cColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <CIcon size={12} />
                        </div>
                        {getSpendingCategoryLabel(cat.name)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Field List Container */}
            <div style={{ 
              width: "100%", 
              background: "var(--bg-card)", 
              borderRadius: 16, 
              border: `1px solid ${C.border}`,
              boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
              overflow: "hidden",
              marginBottom: 20
            }}>
              {/* Date */}
              <div 
                onClick={() => setEditingField('date')}
                style={{ 
                  padding: "12px 16px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border-subtle)",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: 13, color: C.muted }}>Date</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {editingField === 'date' || isGlobalEditing ? (
                    <input 
                      ref={editingField === 'date' ? editRef : null}
                      type="date"
                      value={detailDraft.date}
                      onChange={e => setDetailDraft(d => ({ ...d, date: e.target.value }))}
                      onBlur={() => !isGlobalEditing && saveField('date')}
                      style={{ border: `1px solid ${C.border}`, outline: "none", fontSize: 13, color: C.text, background: "var(--surface-muted)", textAlign: "right", padding: "4px 8px", borderRadius: 6, fontFamily: "inherit" }}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
                      {new Date(detailDraft.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  <ChevronRight size={16} color={C.muted} />
                </div>
              </div>

              {/* Tag */}
              <div 
                onClick={() => setEditingField('tag')}
                style={{ 
                  padding: "12px 16px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border-subtle)",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: 13, color: C.muted }}>Tag</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {editingField === 'tag' || isGlobalEditing ? (
                    <input 
                      ref={editingField === 'tag' ? editRef : null}
                      autoFocus={editingField === 'tag'}
                      value={detailDraft.tag}
                      onChange={e => setDetailDraft(d => ({ ...d, tag: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && !isGlobalEditing && saveField('tag')}
                      onBlur={() => !isGlobalEditing && saveField('tag')}
                      placeholder="Add tag..."
                      style={{ border: `1px solid ${C.border}`, outline: "none", fontSize: 13, color: C.text, background: "var(--surface-muted)", textAlign: "right", padding: "4px 8px", borderRadius: 6, width: 120, fontFamily: "inherit" }}
                    />
                  ) : (
                    detailDraft.tag ? (
                      <div style={{ 
                        background: "var(--bg-subtle)", 
                        color: C.text, 
                        padding: "2px 10px", 
                        borderRadius: 100, 
                        fontSize: 12, 
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.greenMid }} />
                        {detailDraft.tag}
                      </div>
                    ) : (
                      <span style={{ fontSize: 13, color: C.muted }}>Add tag</span>
                    )
                  )}
                  <ChevronRight size={16} color={C.muted} />
                </div>
              </div>

              {/* Hide Transaction */}
              <div style={{ 
                padding: "12px 16px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                borderBottom: "1px solid var(--border-subtle)"
              }}>
                <span style={{ fontSize: 13, color: C.muted }}>Hide transaction</span>
                <label className="fp-toggle">
                  <input 
                    type="checkbox" 
                    checked={detailDraft.isHidden} 
                    onChange={toggleHide}
                  />
                  <span className="fp-toggle-slider" />
                </label>
              </div>

              {/* Split Transaction */}
              <div 
                onClick={() => setEditingField('split')}
                style={{ 
                  padding: "12px 16px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border-subtle)",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: 13, color: C.muted }}>Split transaction</span>
                <ChevronRight size={16} color={C.muted} />
              </div>

              {/* Add Note */}
              <div 
                onClick={() => setEditingField('notes')}
                style={{ 
                  padding: "12px 16px", 
                  display: "flex", 
                  alignItems: "flex-start", 
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border-subtle)",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: 13, color: C.muted, paddingTop: 4 }}>{detailDraft.notes ? "Note" : "Add note"}</span>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, maxWidth: "60%", width: "100%", justifyContent: "flex-end" }}>
                  {editingField === 'notes' || isGlobalEditing ? (
                    <textarea 
                      ref={editingField === 'notes' ? editRef : null}
                      autoFocus={editingField === 'notes'}
                      value={detailDraft.notes}
                      onChange={e => setDetailDraft(d => ({ ...d, notes: e.target.value }))}
                      onBlur={() => !isGlobalEditing && saveField('notes')}
                      placeholder="Write a note..."
                      style={{ 
                        border: `1px solid ${C.border}`, 
                        outline: "none", 
                        fontSize: 13, 
                        color: C.text, 
                        background: "var(--surface-muted)",
                        width: "100%",
                        minHeight: 60,
                        padding: "6px 8px",
                        borderRadius: 6,
                        fontFamily: "inherit",
                        resize: "vertical",
                        textAlign: "right"
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: C.text, paddingTop: 4, textAlign: "right" }}>
                      {detailDraft.notes}
                    </span>
                  )}
                  <ChevronRight size={16} color={C.muted} style={{ marginTop: 4 }} />
                </div>
              </div>

              {/* Recurring */}
              <div 
                onClick={toggleRecurring}
                style={{ 
                  padding: "12px 16px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: 13, color: C.muted }}>Recurring</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: detailDraft.isRecurring ? C.text : C.muted }}>
                    {detailDraft.isRecurring ? "Enabled" : "Off"}
                  </span>
                  <ChevronRight size={16} color={C.muted} />
                </div>
              </div>
            </div>

            {/* Split Input Expansion (if editing split) */}
            {editingField === 'split' && (
              <div ref={editRef} style={{ width: "100%", padding: "16px", background: "var(--bg-subtle)", borderRadius: 16, marginBottom: 20, animation: "fadeIn 0.2s" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 12 }}>Enter amount for first part</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <input 
                    autoFocus
                    type="number"
                    placeholder="0.00"
                    value={splitAmount}
                    onChange={e => setSplitAmount(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') setEditingField(null);
                      if (e.key === 'Enter') document.getElementById('split-btn').click();
                    }}
                    style={{ 
                      flex: 1, 
                      padding: "10px 14px", 
                      borderRadius: 10, 
                      border: `1px solid ${C.border}`, 
                      fontSize: 15,
                      color: C.text,
                      background: "var(--bg-card)",
                      outline: "none"
                    }}
                  />
                  <button 
                    id="split-btn"
                    onClick={async () => {
                      const total = Math.abs(selectedTransaction.amount || 0);
                      const first = Number(Number(splitAmount).toFixed(2));
                      if (isNaN(first) || first <= 0 || first >= total) {
                        dedupToast.error("Invalid amount");
                        return;
                      }
                      const second = Number((total - first).toFixed(2));
                      try {
                        setSaving(true);
                        await transactionService.create({ 
                          merchant: `${selectedTransaction.merchant} (Part 1)`, 
                          category: selectedTransaction.category, amount: first, 
                          type: selectedTransaction.type, date: selectedTransaction.date, 
                          notes: selectedTransaction.notes, tag: selectedTransaction.tag, 
                          reviewStatus: "reviewed" 
                        });
                        await transactionService.create({ 
                          merchant: `${selectedTransaction.merchant} (Part 2)`, 
                          category: selectedTransaction.category, amount: second, 
                          type: selectedTransaction.type, date: selectedTransaction.date, 
                          notes: selectedTransaction.notes, tag: selectedTransaction.tag, 
                          reviewStatus: "reviewed" 
                        });
                        await transactionService.delete(selectedTransaction._id);
                        refresh();
                        pushNotif?.("success", "Split successful");
                        setGlobalSelectedTxId(null);
                      } catch (e) {
                        dedupToast.error("Failed to split");
                      } finally { setSaving(false); }
                    }}
                    style={{ 
                      padding: "0 20px", 
                      background: C.text, 
                      color: C.bg, 
                      border: "none", 
                      borderRadius: 10, 
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Split
                  </button>
                </div>
              </div>
            )}

            {/* Review Status Card */}
            <div style={{ 
              width: "100%", 
              background: C.white, 
              borderRadius: 16, 
              border: `1px solid ${C.border}`,
              padding: "12px 16px",
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              marginBottom: 20,
              boxShadow: "0 4px 15px rgba(0,0,0,0.02)"
            }}>
              <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>Review status</span>
              <button 
                onClick={toggleReviewStatus}
                style={{ 
                  padding: "6px 12px", 
                  background: detailDraft.reviewStatus === 'reviewed' ? "var(--surface-muted)" : C.text, 
                  color: detailDraft.reviewStatus === 'reviewed' ? C.muted : C.white, 
                  border: `1px solid ${detailDraft.reviewStatus === 'reviewed' ? C.border : "transparent"}`, 
                  borderRadius: 8, 
                  fontSize: 12, 
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {detailDraft.reviewStatus === 'reviewed' ? "Mark needs review" : "Mark as reviewed"}
              </button>
            </div>

            {/* Save Button for Global Edit Mode */}
            {isGlobalEditing && (
              <button 
                onClick={saveAll}
                style={{ 
                  width: "100%", 
                  padding: "16px", 
                  borderRadius: 16, 
                  background: C.text, 
                  color: C.bg, 
                  fontSize: 15, 
                  fontWeight: 600, 
                  cursor: "pointer",
                  marginBottom: 24,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}
              >
                Save Changes
              </button>
            )}

            {/* Footer Account Info */}
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              gap: 8,
              paddingBottom: 40
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: "50%", 
                  background: "var(--surface-muted)", 
                  color: C.muted, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 600
                }}>
                  {account.icon}
                </div>
                <span style={{ fontSize: 14, color: C.muted }}>- {account.name}</span>
              </div>
              <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>
                {detailDraft.merchant}
              </div>
            </div>

            {/* Danger Zone */}
            <button 
              onClick={handleDelete}
              style={{ 
                width: "100%", 
                padding: "16px", 
                borderRadius: 16, 
                border: "none", 
                background: C.redBg, 
                color: C.red, 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 20
              }}
            >
              <Trash2 size={18} />
              {confirmingId ? "Click again to confirm delete" : "Delete Transaction"}
            </button>

          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .fp-toggle {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .fp-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .fp-toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--surface-muted);
          transition: .4s;
          border-radius: 24px;
        }
        .fp-toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        input:checked + .fp-toggle-slider {
          background-color: var(--text-primary);
        }
        input:checked + .fp-toggle-slider:before {
          transform: translateX(20px);
        }
      `}</style>
    </>
  );
}
