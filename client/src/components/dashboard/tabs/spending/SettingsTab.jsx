import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bell,
  ChevronLeft,
  EyeOff,
  Eye,
  FileBarChart2,
  FolderCog,
  Plus,
  Repeat2,
  Save,
  SlidersHorizontal,
  Wallet,
  PenLine,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import api from "../../../../services/api";
import { dashboardService } from "../../../../services/dashboardService";
import { transactionCategoryService } from "../../../../services/transactionCategoryService";
import { useAuthContext } from "../../../../hooks/useAuthContext";
import { formatCurrencyAmount } from "../../../../utils/currency";
import { dedupToast, getSpendingCategoryLabel, getSpendingCategoryMeta } from "../../dashboardShared.jsx";

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const REPORTS_STORAGE_KEY = "finpilot:spending:reports:v1";
const INCOME_CATEGORY_SET = new Set(["Salary", "Freelance", "Investment", "Other Income"]);

const DEFAULT_SETTINGS = {
  budgetSettings: {
    defaultMonthlyBudget: 0,
    budgetWarning50: true,
    budgetWarning80: true,
    budgetWarning100: true,
    carryForwardBudget: true,
    resetPeriod: "monthly",
  },
  categorySettings: { hiddenCategoryIds: [] },
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

const normalizeSettings = (value = {}) => ({
  budgetSettings: {
    ...DEFAULT_SETTINGS.budgetSettings,
    ...(value?.budgetSettings || {}),
  },
  categorySettings: {
    ...DEFAULT_SETTINGS.categorySettings,
    ...(value?.categorySettings || {}),
    hiddenCategoryIds: Array.isArray(value?.categorySettings?.hiddenCategoryIds)
      ? [...new Set(value.categorySettings.hiddenCategoryIds.filter(Boolean))]
      : [],
  },
  alertSettings: { ...DEFAULT_SETTINGS.alertSettings, ...(value?.alertSettings || {}) },
  recurringSettings: { ...DEFAULT_SETTINGS.recurringSettings, ...(value?.recurringSettings || {}) },
  transactionPreferences: { ...DEFAULT_SETTINGS.transactionPreferences, ...(value?.transactionPreferences || {}) },
  reportPreferences: { ...DEFAULT_SETTINGS.reportPreferences, ...(value?.reportPreferences || {}) },
});

/* ─── Design tokens (inline, respect existing CSS vars) ─────────────────────── */

const radius = { sm: 10, md: 14, lg: 18, xl: 22 };

/* ─── Sub-components ─────────────────────────────────────────────────────────── */

function Toggle({ checked, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-checked={checked}
      role="switch"
      style={{
        width: 46,
        height: 26,
        borderRadius: 999,
        border: "none",
        background: checked ? "var(--color-accent, #111827)" : "var(--surface-strong)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background 0.2s ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 23 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 6px rgba(0,0,0,0.20)",
          transition: "left 0.2s cubic-bezier(.4,0,.2,1)",
        }}
      />
    </button>
  );
}

function ToggleRow({ label, description, checked, onClick, disabled }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "13px 15px",
        borderRadius: radius.md,
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle, var(--border))",
        transition: "border-color 0.15s",
      }}
    >
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text-primary, var(--text))", lineHeight: 1.4 }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: "var(--text-muted, var(--muted))", marginTop: 2 }}>{description}</div>}
      </div>
      <Toggle checked={checked} onClick={onClick} disabled={disabled} />
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      color: "var(--text-muted, var(--muted))",
      textTransform: "uppercase",
      letterSpacing: "0.07em",
      marginBottom: 7,
    }}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description, C }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          background: "var(--surface-muted)",
          color: C.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={16} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>{title}</div>
      </div>
      {description && (
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.65, paddingLeft: 46 }}>
          {description}
        </div>
      )}
    </div>
  );
}

function Card({ children, C, style = {} }) {
  return (
    <div style={{
      background: "var(--bg-secondary)",
      border: `1px solid ${C.border}`,
      borderRadius: radius.lg,
      overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

function StatBadge({ label, value, C }) {
  return (
    <div style={{
      border: `1px solid ${C.border}`,
      borderRadius: radius.md,
      background: "var(--bg-card)",
      padding: "13px 16px",
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere", lineHeight: 1.15 }}>{value}</div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */

export default function SpendingSettingsTab({
  C,
  isMobile,
  preferredCurrency,
  spendingSettings,
  budget,
  apiTransactions = [],
  monthlyChart = [],
  transactionService,
  queryClient,
  refreshUser,
  pushNotif,
  onBudgetSaved,
  setSpendTab,
}) {
  const { user } = useAuthContext();
  const [draft, setDraft] = useState(() => normalizeSettings(spendingSettings));
  const [categorySearch, setCategorySearch] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [savedReportCount, setSavedReportCount] = useState(0);

  useEffect(() => { setDraft(normalizeSettings(spendingSettings)); }, [spendingSettings]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REPORTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setSavedReportCount(
        Array.isArray(parsed)
          ? parsed.filter((item) => String(item?.userId || "") === String(user?._id || "")).length
          : 0
      );
    } catch { setSavedReportCount(0); }
  }, [user?._id]);

  const { data: categoryData } = useQuery({
    queryKey: ["transaction-categories", user?._id],
    queryFn: () => transactionCategoryService.list().then((r) => r.data),
    enabled: !!user?._id,
    staleTime: 0,
    refetchOnMount: true,
  });

  const allCategoryRecords = useMemo(() => {
    const customCategoryRecords = categoryData?.categories || [];
    const defaults = transactionService.CATEGORIES.map((name) => ({
      id: `default-${name}`,
      name,
      type: INCOME_CATEGORY_SET.has(name) ? "income" : "expense",
      isCustom: false,
    }));
    const customs = customCategoryRecords.map((item) => ({
      id: item._id,
      name: item.name,
      type: item.type,
      isCustom: true,
    }));
    const seen = new Set();
    return [...defaults, ...customs].filter((item) => {
      const key = `${item.type}:${String(item.name || "").toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [categoryData?.categories, transactionService.CATEGORIES]);

  const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const expenseCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    return allCategoryRecords
      .filter((item) => item.type === "expense")
      .filter((item) => !q || getSpendingCategoryLabel(item.name).toLowerCase().includes(q) || item.name.toLowerCase().includes(q))
      .sort((a, b) => getSpendingCategoryLabel(a.name).localeCompare(getSpendingCategoryLabel(b.name)));
  }, [allCategoryRecords, categorySearch]);

  const monthSpend = useMemo(
    () => apiTransactions.filter((tx) => tx.type === "expense").reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0),
    [apiTransactions]
  );

  const budgetThresholdEnabled = draft.budgetSettings.budgetWarning50 || draft.budgetSettings.budgetWarning80 || draft.budgetSettings.budgetWarning100;

  /* ── Mutations ── */

  const saveSettingsMutation = useMutation({
    mutationFn: (payload) => dashboardService.saveSpendingSettings(payload).then((r) => r.data),
    onSuccess: async (data) => {
      const nextSettings = normalizeSettings(data?.spendingSettings);
      setDraft(nextSettings);
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions-page"] });
      refreshUser?.();
      pushNotif?.("success", "Settings saved");
      dedupToast.success("Spending settings saved");
    },
    onError: (error) => {
      const message = error?.response?.data?.message || error?.message || "Failed to save settings";
      pushNotif?.("error", message);
      dedupToast.error(message);
    },
  });

  // FIX: Budget save now also updates the draft's defaultMonthlyBudget so both values stay in sync
  const saveBudgetMutation = useMutation({
    mutationFn: (amount) => api.post("/dashboard/budget", { month: currentMonthKey, amount }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onBudgetSaved?.();
      dedupToast.success("Monthly budget updated");
    },
    onError: (error) => {
      dedupToast.error(error?.response?.data?.message || "Failed to update budget");
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: ({ name, type }) => transactionCategoryService.create({ name, type }),
    onSuccess: async () => {
      setNewCategoryName("");
      await queryClient.invalidateQueries({ queryKey: ["transaction-categories", user?._id] });
      dedupToast.success("Category created");
    },
    onError: (error) => {
      dedupToast.error(error?.response?.data?.message || "Failed to create category");
    },
  });

  const renameCategoryMutation = useMutation({
    mutationFn: ({ id, name }) => transactionCategoryService.update(id, { name }),
    onSuccess: async () => {
      setEditingCategoryId(null);
      setEditingCategoryName("");
      await queryClient.invalidateQueries({ queryKey: ["transaction-categories", user?._id] });
      await queryClient.invalidateQueries({ queryKey: ["transactions", user?._id] });
      await queryClient.invalidateQueries({ queryKey: ["transactions-page", user?._id] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", user?._id] });
      dedupToast.success("Category updated");
    },
    onError: (error) => {
      dedupToast.error(error?.response?.data?.message || "Failed to update category");
    },
  });

  /* ── Helpers ── */

  const setNested = (section, key, value) =>
    setDraft((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));

  const toggleHiddenCategory = (categoryId) =>
    setDraft((prev) => {
      const current = new Set(prev.categorySettings.hiddenCategoryIds || []);
      if (current.has(categoryId)) current.delete(categoryId);
      else current.add(categoryId);
      return { ...prev, categorySettings: { ...prev.categorySettings, hiddenCategoryIds: Array.from(current) } };
    });

  const saveDraft = () => saveSettingsMutation.mutate(draft);

  const clearSavedReports = () => {
    try {
      const raw = window.localStorage.getItem(REPORTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const filtered = Array.isArray(parsed)
        ? parsed.filter((item) => String(item?.userId || "") !== String(user?._id || ""))
        : [];
      window.localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(filtered));
      setSavedReportCount(0);
      dedupToast.success("Saved reports cleared");
    } catch { dedupToast.error("Could not clear saved reports"); }
  };

  /* ── Shared input styles ── */

  const inputStyle = {
    width: "100%",
    border: `1px solid ${C.border}`,
    borderRadius: radius.sm,
    background: "var(--bg-card)",
    color: C.text,
    padding: "10px 12px",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const selectStyle = {
    ...inputStyle,
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    cursor: "pointer",
  };

  const isSaving = saveSettingsMutation.isPending;

  /* ─── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 48 }}>

      {/* ── Header panel ── */}
      <Card C={C}>
        <div style={{ padding: isMobile ? "20px 16px" : "24px 24px 20px" }}>

          {/* Top row */}
          <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 16, flexDirection: isMobile ? "column" : "row", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                Spending Settings
              </div>
              <div style={{ fontSize: isMobile ? 21 : 24, fontWeight: C.fWeightSemi, color: C.text, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 6 }}>
                Manage how spending works
              </div>
              <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.65, maxWidth: 580 }}>
                Budget rules, category visibility, alerts, recurring detection, and report defaults — all in one place.
              </div>
            </div>

            {/* FIX: Single primary Save button in header; "Open Reports" is secondary */}
            <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setSpendTab?.("reports")}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: radius.sm,
                  border: `1px solid ${C.border}`,
                  background: "var(--bg-card)",
                  color: C.text,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <FileBarChart2 size={14} />
                Reports
              </button>
              <button
                type="button"
                onClick={saveDraft}
                disabled={isSaving}
                style={{
                  height: 40,
                  padding: "0 20px",
                  borderRadius: radius.sm,
                  border: "none",
                  background: C.strong,
                  color: C.onStrong,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: isSaving ? "not-allowed" : "pointer",
                  opacity: isSaving ? 0.7 : 1,
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  transition: "opacity 0.15s",
                }}
              >
                <Save size={14} />
                {isSaving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10 }}>
            <StatBadge label="Month spend" value={formatCurrencyAmount(Math.round(monthSpend), preferredCurrency, { maximumFractionDigits: 0 })} C={C} />
            <StatBadge label="Budget alerts" value={budgetThresholdEnabled ? "Active" : "Off"} C={C} />
            <StatBadge label="Hidden categories" value={String(draft.categorySettings.hiddenCategoryIds.length)} C={C} style={isMobile ? { gridColumn: "1 / -1" } : {}} />
          </div>
        </div>
      </Card>

      {/* ── Two-column grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 20 }}>

        {/* Budget & Limits */}
        <Card C={C}>
          <div style={{ padding: isMobile ? "18px 16px" : "22px 22px" }}>
            <SectionHeader
              icon={Wallet}
              title="Budget & Limits"
              description="Set your baseline monthly budget and choose when warnings appear as you approach your limit."
              C={C}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
              <div>
                <FieldLabel>Default monthly budget ({preferredCurrency})</FieldLabel>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.budgetSettings.defaultMonthlyBudget}
                  onChange={(e) => setNested("budgetSettings", "defaultMonthlyBudget", Number(e.target.value || 0))}
                  style={inputStyle}
                />
                {/* FIX: Single Apply button, shows current budget inline below input */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, color: C.sub }}>
                    Current: <strong style={{ color: C.text }}>
                      {budget?.amount ? formatCurrencyAmount(Math.round(budget.amount), preferredCurrency, { maximumFractionDigits: 0 }) : "Not set"}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => saveBudgetMutation.mutate(Number(draft.budgetSettings.defaultMonthlyBudget || 0))}
                    disabled={saveBudgetMutation.isPending || Number(draft.budgetSettings.defaultMonthlyBudget || 0) <= 0}
                    style={{
                      height: 34,
                      padding: "0 14px",
                      borderRadius: radius.sm,
                      border: `1px solid ${C.border}`,
                      background: "var(--bg-card)",
                      color: C.text,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: saveBudgetMutation.isPending ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      opacity: saveBudgetMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    Apply to {currentMonthKey}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
                <ToggleRow label="Warn at 50% of budget" checked={!!draft.budgetSettings.budgetWarning50} onClick={() => setNested("budgetSettings", "budgetWarning50", !draft.budgetSettings.budgetWarning50)} />
                <ToggleRow label="Warn at 80% of budget" checked={!!draft.budgetSettings.budgetWarning80} onClick={() => setNested("budgetSettings", "budgetWarning80", !draft.budgetSettings.budgetWarning80)} />
                <ToggleRow label="Warn at 100% of budget" checked={!!draft.budgetSettings.budgetWarning100} onClick={() => setNested("budgetSettings", "budgetWarning100", !draft.budgetSettings.budgetWarning100)} />
                <ToggleRow
                  label="Carry forward as default"
                  description="Use this amount as next month's starting budget"
                  checked={!!draft.budgetSettings.carryForwardBudget}
                  onClick={() => setNested("budgetSettings", "carryForwardBudget", !draft.budgetSettings.carryForwardBudget)}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Alerts & Notifications */}
        <Card C={C}>
          <div style={{ padding: isMobile ? "18px 16px" : "22px 22px" }}>
            <SectionHeader
              icon={Bell}
              title="Alerts & Notifications"
              description="Control budget alerts, category spike detection, and large transaction warnings."
              C={C}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ToggleRow label="Enable in-app spending alerts" checked={!!draft.alertSettings.notificationsEnabled} onClick={() => setNested("alertSettings", "notificationsEnabled", !draft.alertSettings.notificationsEnabled)} />
              <ToggleRow label="Alert when a category spikes" checked={!!draft.alertSettings.categorySpikeAlerts} onClick={() => setNested("alertSettings", "categorySpikeAlerts", !draft.alertSettings.categorySpikeAlerts)} />
              <ToggleRow label="Alert on large transactions" checked={!!draft.alertSettings.largeTransactionAlerts} onClick={() => setNested("alertSettings", "largeTransactionAlerts", !draft.alertSettings.largeTransactionAlerts)} />
              <ToggleRow label="Alert before recurring bills" checked={!!draft.alertSettings.recurringReminderAlerts} onClick={() => setNested("alertSettings", "recurringReminderAlerts", !draft.alertSettings.recurringReminderAlerts)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              <div>
                <FieldLabel>Spike threshold (%)</FieldLabel>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={draft.alertSettings.categorySpikePercent}
                  onChange={(e) => setNested("alertSettings", "categorySpikePercent", Number(e.target.value || 0))}
                  style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Large transaction ({preferredCurrency})</FieldLabel>
                <input
                  type="number"
                  min="0"
                  step="25"
                  value={draft.alertSettings.largeTransactionAmount}
                  onChange={(e) => setNested("alertSettings", "largeTransactionAmount", Number(e.target.value || 0))}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Categories — full width */}
        <Card C={C} style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
          <div style={{ padding: isMobile ? "18px 16px" : "22px 22px" }}>
            <SectionHeader
              icon={FolderCog}
              title="Categories"
              description="Create custom expense categories and control which groups appear in your spending analytics."
              C={C}
            />

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: 16 }}>
              {/* Category list */}
              <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, background: "var(--bg-card)", overflow: "hidden" }}>
                <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
                  <input
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Search categories…"
                    style={{ ...inputStyle, padding: "9px 11px" }}
                  />
                </div>
                <div style={{ maxHeight: isMobile ? 300 : 400, overflowY: "auto" }}>
                  {expenseCategories.map((category, index) => {
                    const meta = getSpendingCategoryMeta(category.name);
                    const Icon = meta.icon || Sparkles;
                    const categoryId = meta.id;
                    const hidden = draft.categorySettings.hiddenCategoryIds.includes(categoryId);
                    const isEditing = editingCategoryId === category.id;

                    return (
                      <div
                        key={`${category.id}-${index}`}
                        style={{
                          borderTop: index ? `1px solid ${C.border}` : "none",
                          padding: "11px 13px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          opacity: hidden ? 0.55 : 1,
                          transition: "opacity 0.15s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 9, background: `${meta.color}20`, color: meta.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon size={14} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            {isEditing ? (
                              <input
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                style={{ ...inputStyle, padding: "7px 9px" }}
                                autoFocus
                              />
                            ) : (
                              <>
                                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {getSpendingCategoryLabel(category.name)}
                                </div>
                                <div style={{ fontSize: 11, color: C.muted }}>{category.isCustom ? "Custom" : "Default"}</div>
                              </>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          {category.isCustom && (
                            isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => renameCategoryMutation.mutate({ id: category.id, name: editingCategoryName.trim() })}
                                  disabled={renameCategoryMutation.isPending || !editingCategoryName.trim()}
                                  style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "#111827", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                  title="Save"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setEditingCategoryId(null); setEditingCategoryName(""); }}
                                  style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                  title="Cancel"
                                >
                                  <X size={13} />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setEditingCategoryId(category.id); setEditingCategoryName(category.name); }}
                                style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                title="Rename"
                              >
                                <PenLine size={13} />
                              </button>
                            )
                          )}
                          {/* Visibility toggle — icon only, clear state */}
                          <button
                            type="button"
                            onClick={() => toggleHiddenCategory(categoryId)}
                            title={hidden ? "Click to show" : "Click to hide"}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              border: `1px solid ${hidden ? "rgba(239,68,68,0.3)" : C.border}`,
                              background: hidden ? "rgba(239,68,68,0.07)" : "transparent",
                              color: hidden ? "#dc2626" : C.muted,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s",
                            }}
                          >
                            {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {!expenseCategories.length && (
                    <div style={{ padding: "28px 16px", textAlign: "center", fontSize: 12.5, color: C.muted }}>No categories found.</div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, background: "var(--bg-card)", padding: "16px 15px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 10 }}>Add custom category</div>
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Pet care"
                    style={{ ...inputStyle, marginBottom: 8 }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newCategoryName.trim()) {
                        createCategoryMutation.mutate({ name: newCategoryName.trim(), type: "expense" });
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => createCategoryMutation.mutate({ name: newCategoryName.trim(), type: "expense" })}
                    disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
                    style={{
                      width: "100%",
                      height: 38,
                      borderRadius: radius.sm,
                      border: "none",
                      background: "#111827",
                      color: "#fff",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: createCategoryMutation.isPending || !newCategoryName.trim() ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      opacity: !newCategoryName.trim() ? 0.5 : 1,
                    }}
                  >
                    <Plus size={14} />
                    Add category
                  </button>
                </div>

                <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, background: "var(--bg-card)", padding: "15px 15px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 7 }}>Visibility & analytics</div>
                  <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.65 }}>
                    Hidden categories are excluded from overview charts and breakdown views unless <strong style={{ color: C.text }}>Include hidden in analytics</strong> is enabled in Transaction Preferences below.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Recurring Payments */}
        <Card C={C}>
          <div style={{ padding: isMobile ? "18px 16px" : "22px 22px" }}>
            <SectionHeader
              icon={Repeat2}
              title="Recurring Payments"
              description="Configure how recurring items are detected and what defaults are used when adding them."
              C={C}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <ToggleRow
                label="Auto-detect recurring merchants"
                description="Suggest repeated merchants as recurring items"
                checked={!!draft.recurringSettings.autoDetectRecurring}
                onClick={() => setNested("recurringSettings", "autoDetectRecurring", !draft.recurringSettings.autoDetectRecurring)}
              />
              <ToggleRow
                label="Show inferred recurring items"
                description="Display auto-detected items in the recurring tab"
                checked={!!draft.recurringSettings.showInferredRecurring}
                onClick={() => setNested("recurringSettings", "showInferredRecurring", !draft.recurringSettings.showInferredRecurring)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              <div>
                <FieldLabel>Reminder days before due</FieldLabel>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.recurringSettings.reminderDaysBefore}
                  onChange={(e) => setNested("recurringSettings", "reminderDaysBefore", Number(e.target.value || 0))}
                  style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Default expense category</FieldLabel>
                <select
                  value={draft.recurringSettings.defaultExpenseCategory}
                  onChange={(e) => setNested("recurringSettings", "defaultExpenseCategory", e.target.value)}
                  style={selectStyle}
                >
                  {allCategoryRecords.filter((item) => item.type === "expense").map((item) => (
                    <option key={`expense-${item.id}`} value={item.name}>{getSpendingCategoryLabel(item.name)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <FieldLabel>Default income category</FieldLabel>
              <select
                value={draft.recurringSettings.defaultIncomeCategory}
                onChange={(e) => setNested("recurringSettings", "defaultIncomeCategory", e.target.value)}
                style={selectStyle}
              >
                {allCategoryRecords.filter((item) => item.type === "income").map((item) => (
                  <option key={`income-${item.id}`} value={item.name}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Transaction Preferences */}
        <Card C={C}>
          <div style={{ padding: isMobile ? "18px 16px" : "22px 22px" }}>
            <SectionHeader
              icon={SlidersHorizontal}
              title="Transaction Preferences"
              description="Control how new transactions start and whether hidden items appear in your analytics."
              C={C}
            />

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <FieldLabel>Default review status</FieldLabel>
                <select
                  value={draft.transactionPreferences.defaultReviewStatus}
                  onChange={(e) => setNested("transactionPreferences", "defaultReviewStatus", e.target.value)}
                  style={selectStyle}
                >
                  <option value="needs_review">Needs review</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </div>
              <div>
                <FieldLabel>Default sort direction</FieldLabel>
                <select
                  value={draft.transactionPreferences.defaultSortDirection}
                  onChange={(e) => setNested("transactionPreferences", "defaultSortDirection", e.target.value)}
                  style={selectStyle}
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ToggleRow
                label="Include hidden in analytics"
                description="Count hidden transactions in spending totals and charts"
                checked={!!draft.transactionPreferences.includeHiddenInAnalytics}
                onClick={() => setNested("transactionPreferences", "includeHiddenInAnalytics", !draft.transactionPreferences.includeHiddenInAnalytics)}
              />
              <ToggleRow
                label="Include recurring in budget"
                description="Add recurring transactions to your monthly budget calculations"
                checked={!!draft.transactionPreferences.includeRecurringInBudget}
                onClick={() => setNested("transactionPreferences", "includeRecurringInBudget", !draft.transactionPreferences.includeRecurringInBudget)}
              />
            </div>
          </div>
        </Card>

        {/* Report Preferences — full width */}
        <Card C={C} style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
          <div style={{ padding: isMobile ? "18px 16px" : "22px 22px" }}>
            <SectionHeader
              icon={FileBarChart2}
              title="Report Preferences"
              description="Set how reports open by default and manage saved presets stored in this browser."
              C={C}
            />

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              <div>
                <FieldLabel>Default report tab</FieldLabel>
                <select value={draft.reportPreferences.defaultTab} onChange={(e) => setNested("reportPreferences", "defaultTab", e.target.value)} style={selectStyle}>
                  <option value="cashflow">Cash flow</option>
                  <option value="expenses">Expenses</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <FieldLabel>Default view by</FieldLabel>
                <select value={draft.reportPreferences.defaultViewBy} onChange={(e) => setNested("reportPreferences", "defaultViewBy", e.target.value)} style={selectStyle}>
                  <option value="Category">Category</option>
                  <option value="Merchant">Merchant</option>
                </select>
              </div>
              <div>
                <FieldLabel>Default date range</FieldLabel>
                <select value={draft.reportPreferences.defaultRange} onChange={(e) => setNested("reportPreferences", "defaultRange", e.target.value)} style={selectStyle}>
                  <option value="last_30_days">Last 30 days</option>
                  <option value="last_90_days">Last 90 days</option>
                  <option value="last_6_months">Last 6 months</option>
                  <option value="year_to_date">Year to date</option>
                  <option value="all_time">All time</option>
                </select>
              </div>
            </div>

            {/* Saved report presets */}
            <div style={{
              border: `1px solid ${C.border}`,
              borderRadius: radius.md,
              background: "var(--bg-card)",
              padding: "14px 16px",
              display: "flex",
              alignItems: isMobile ? "flex-start" : "center",
              justifyContent: "space-between",
              gap: 12,
              flexDirection: isMobile ? "column" : "row",
            }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>Saved report presets</div>
                <div style={{ fontSize: 12.5, color: C.sub, marginTop: 3 }}>
                  {savedReportCount} saved report{savedReportCount === 1 ? "" : "s"} stored on this browser for your account.
                </div>
              </div>
              <button
                type="button"
                onClick={clearSavedReports}
                disabled={savedReportCount === 0}
                style={{
                  height: 36,
                  padding: "0 14px",
                  borderRadius: radius.sm,
                  border: `1px solid ${savedReportCount === 0 ? C.border : "rgba(239,68,68,0.3)"}`,
                  background: savedReportCount === 0 ? "transparent" : "rgba(239,68,68,0.06)",
                  color: savedReportCount === 0 ? C.muted : "#dc2626",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: savedReportCount === 0 ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: savedReportCount === 0 ? 0.5 : 1,
                  transition: "all 0.15s",
                }}
              >
                Clear saved reports
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* FIX: Footer — only navigation back, no second Save button */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingTop: 4,
        flexDirection: isMobile ? "column-reverse" : "row",
      }}>
        <button
          type="button"
          onClick={() => setSpendTab?.("overview")}
          style={{
            height: 38,
            padding: "0 16px",
            borderRadius: radius.sm,
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.sub,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6,
            width: isMobile ? "100%" : "auto",
            justifyContent: "center",
          }}
        >
          <ChevronLeft size={14} />
          Back to overview
        </button>

        <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>
          {isSaving ? "Saving changes…" : "All changes are saved when you click Save settings"}
        </div>
      </div>
    </div>
  );
}
