import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bell,
  ChevronRight,
  EyeOff,
  FileBarChart2,
  FolderCog,
  Plus,
  Repeat2,
  Save,
  SlidersHorizontal,
  Wallet,
  PenLine,
  Sparkles,
} from "lucide-react";
import api from "../../../../services/api";
import { dashboardService } from "../../../../services/dashboardService";
import { transactionCategoryService } from "../../../../services/transactionCategoryService";
import { useAuthContext } from "../../../../hooks/useAuthContext";
import { dedupToast, getSpendingCategoryLabel, getSpendingCategoryMeta } from "../../dashboardShared.jsx";

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
  alertSettings: {
    ...DEFAULT_SETTINGS.alertSettings,
    ...(value?.alertSettings || {}),
  },
  recurringSettings: {
    ...DEFAULT_SETTINGS.recurringSettings,
    ...(value?.recurringSettings || {}),
  },
  transactionPreferences: {
    ...DEFAULT_SETTINGS.transactionPreferences,
    ...(value?.transactionPreferences || {}),
  },
  reportPreferences: {
    ...DEFAULT_SETTINGS.reportPreferences,
    ...(value?.reportPreferences || {}),
  },
});

const panelStyle = (C, extra = {}) => ({
  background: "var(--bg-secondary)",
  border: `1px solid ${C.border}`,
  borderRadius: 18,
  overflow: "hidden",
  ...extra,
});

const sectionTitle = (label, Icon, C) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ width: 34, height: 34, borderRadius: 12, background: "var(--surface-muted)", color: C.text, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={16} />
    </div>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{label}</div>
    </div>
  </div>
);

function Toggle({ checked, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: 44,
        height: 26,
        borderRadius: 999,
        border: "none",
        background: checked ? "#111827" : "var(--surface-strong)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "background 0.18s ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          transition: "left 0.18s ease",
        }}
      />
    </button>
  );
}

function FieldLabel({ children, subtle = false }) {
  return (
    <div style={{ fontSize: subtle ? 12 : 10.5, fontWeight: subtle ? 500 : 700, color: subtle ? "var(--text-secondary)" : "var(--text-muted)", textTransform: subtle ? "none" : "uppercase", letterSpacing: subtle ? "0" : "0.08em", marginBottom: 6 }}>
      {children}
    </div>
  );
}

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

  useEffect(() => {
    setDraft(normalizeSettings(spendingSettings));
  }, [spendingSettings]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REPORTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const count = Array.isArray(parsed)
        ? parsed.filter((item) => String(item?.userId || "") === String(user?._id || "")).length
        : 0;
      setSavedReportCount(count);
    } catch {
      setSavedReportCount(0);
    }
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

  const expenseCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    return allCategoryRecords
      .filter((item) => item.type === "expense")
      .filter((item) => !q || getSpendingCategoryLabel(item.name).toLowerCase().includes(q) || item.name.toLowerCase().includes(q))
      .sort((a, b) => getSpendingCategoryLabel(a.name).localeCompare(getSpendingCategoryLabel(b.name)));
  }, [allCategoryRecords, categorySearch]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthSpend = useMemo(
    () => apiTransactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0),
    [apiTransactions]
  );
  const lastMonthSummary = [...(monthlyChart || [])].slice(-1)[0] || null;

  const saveSettingsMutation = useMutation({
    mutationFn: (payload) => dashboardService.saveSpendingSettings(payload).then((r) => r.data),
    onSuccess: async (data) => {
      const nextSettings = normalizeSettings(data?.spendingSettings);
      setDraft(nextSettings);
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions-page"] });
      refreshUser?.();
      pushNotif?.("success", "Spending settings saved");
      dedupToast.success("Spending settings saved");
    },
    onError: (error) => {
      const message = error?.response?.data?.message || error?.message || "Failed to save spending settings";
      pushNotif?.("error", message);
      dedupToast.error(message);
    },
  });

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

  const setNested = (section, key, value) => {
    setDraft((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const toggleHiddenCategory = (categoryId) => {
    setDraft((prev) => {
      const current = new Set(prev.categorySettings.hiddenCategoryIds || []);
      if (current.has(categoryId)) current.delete(categoryId);
      else current.add(categoryId);
      return {
        ...prev,
        categorySettings: {
          ...prev.categorySettings,
          hiddenCategoryIds: Array.from(current),
        },
      };
    });
  };

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
    } catch {
      dedupToast.error("Could not clear saved reports");
    }
  };

  const inputStyle = {
    width: "100%",
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    background: "var(--bg-card)",
    color: C.text,
    padding: "11px 12px",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };

  const selectStyle = {
    ...inputStyle,
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    cursor: "pointer",
  };

  const budgetThresholdEnabled = draft.budgetSettings.budgetWarning50 || draft.budgetSettings.budgetWarning80 || draft.budgetSettings.budgetWarning100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp 0.3s ease", paddingBottom: 40 }}>
      <div style={panelStyle(C)}>
        <div style={{ padding: isMobile ? "18px 16px" : "20px 20px" }}>
          <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 16, flexDirection: isMobile ? "column" : "row" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Spending Settings</div>
              <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: C.text, letterSpacing: "-0.03em", marginBottom: 6 }}>Control how spending works across your dashboard</div>
              <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.6, maxWidth: 700 }}>
                Manage budget defaults, categories, alerts, recurring behavior, transaction preferences, and report defaults with the same dashboard styling in both light and dark mode.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, width: isMobile ? "100%" : "auto", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setSpendTab?.("reports")}
                style={{ height: 42, padding: "0 16px", borderRadius: 12, border: `1px solid ${C.border}`, background: "var(--bg-card)", color: C.text, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}
              >
                <FileBarChart2 size={15} />
                Open Reports
              </button>
              <button
                type="button"
                onClick={saveDraft}
                disabled={saveSettingsMutation.isPending}
                style={{ height: 42, padding: "0 18px", borderRadius: 12, border: "none", background: C.strong, color: C.onStrong, fontSize: 12.5, fontWeight: 700, cursor: saveSettingsMutation.isPending ? "not-allowed" : "pointer", opacity: saveSettingsMutation.isPending ? 0.7 : 1, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}
              >
                <Save size={15} />
                {saveSettingsMutation.isPending ? "Saving..." : "Save settings"}
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 18 }}>
            {[
              { label: "Current month spend", value: `${preferredCurrency} ${Math.round(monthSpend).toLocaleString()}` },
              { label: "Budget alerts active", value: budgetThresholdEnabled ? "Enabled" : "Disabled" },
              { label: "Hidden categories", value: String(draft.categorySettings.hiddenCategoryIds.length) },
            ].map((item) => (
              <div key={item.label} style={{ border: `1px solid ${C.border}`, borderRadius: 14, background: "var(--bg-card)", padding: "14px 15px" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{item.label}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 16 }}>
        <div style={panelStyle(C)}>
          <div style={{ padding: isMobile ? "18px 16px" : "20px 20px" }}>
            {sectionTitle("Budget & Limits", Wallet, C)}
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginTop: 12, marginBottom: 16 }}>
              Set the baseline monthly budget and decide when budget warnings should appear in spending views.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.15fr 1fr", gap: 12 }}>
              <div>
                <FieldLabel>Default monthly budget</FieldLabel>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.budgetSettings.defaultMonthlyBudget}
                  onChange={(e) => setNested("budgetSettings", "defaultMonthlyBudget", Number(e.target.value || 0))}
                  style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Budget reset period</FieldLabel>
                <select value={draft.budgetSettings.resetPeriod} disabled style={{ ...selectStyle, opacity: 0.8 }}>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
              {[
                ["budgetWarning50", "Warn at 50%"],
                ["budgetWarning80", "Warn at 80%"],
                ["budgetWarning100", "Warn at 100%"],
                ["carryForwardBudget", "Carry forward this budget as your default"],
              ].map(([key, label]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: `1px solid ${C.border}`, borderRadius: 14, background: "var(--bg-card)", padding: "12px 14px" }}>
                  <div style={{ fontSize: 13.5, color: C.text }}>{label}</div>
                  <Toggle checked={!!draft.budgetSettings[key]} onClick={() => setNested("budgetSettings", key, !draft.budgetSettings[key])} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => saveBudgetMutation.mutate(Number(draft.budgetSettings.defaultMonthlyBudget || 0))}
                disabled={saveBudgetMutation.isPending || Number(draft.budgetSettings.defaultMonthlyBudget || 0) <= 0}
                style={{ flex: 1, height: 40, borderRadius: 12, border: `1px solid ${C.border}`, background: "var(--bg-card)", color: C.text, fontSize: 12.5, fontWeight: 600, cursor: saveBudgetMutation.isPending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saveBudgetMutation.isPending ? 0.7 : 1 }}
              >
                Apply to {currentMonthKey}
              </button>
              <div style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 12, background: "var(--bg-card)", padding: "10px 12px", fontSize: 12.5, color: C.sub }}>
                Current budget: <strong style={{ color: C.text }}>{budget?.amount ? `${preferredCurrency} ${Math.round(budget.amount).toLocaleString()}` : "Not set"}</strong>
              </div>
            </div>
          </div>
        </div>

        <div style={panelStyle(C)}>
          <div style={{ padding: isMobile ? "18px 16px" : "20px 20px" }}>
            {sectionTitle("Alerts & Notifications", Bell, C)}
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginTop: 12, marginBottom: 16 }}>
              Control budget alerts, spike detection, large transaction warnings, and recurring reminders.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["notificationsEnabled", "Enable in-app spending alerts"],
                ["categorySpikeAlerts", "Alert when a category spikes"],
                ["largeTransactionAlerts", "Alert on large transactions"],
                ["recurringReminderAlerts", "Alert before recurring bills"],
              ].map(([key, label]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: `1px solid ${C.border}`, borderRadius: 14, background: "var(--bg-card)", padding: "12px 14px" }}>
                  <div style={{ fontSize: 13.5, color: C.text }}>{label}</div>
                  <Toggle checked={!!draft.alertSettings[key]} onClick={() => setNested("alertSettings", key, !draft.alertSettings[key])} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginTop: 16 }}>
              <div>
                <FieldLabel>Category spike threshold (%)</FieldLabel>
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
                <FieldLabel>Large transaction amount</FieldLabel>
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
            <div style={{ marginTop: 14, border: `1px solid ${C.border}`, borderRadius: 14, background: "var(--bg-card)", padding: "12px 14px", fontSize: 12.5, color: C.sub, lineHeight: 1.6 }}>
              Last charted month:
              <strong style={{ color: C.text }}> {lastMonthSummary?.month || "No monthly history yet"}</strong>
            </div>
          </div>
        </div>

        <div style={panelStyle(C, { gridColumn: isMobile ? "auto" : "1 / -1" })}>
          <div style={{ padding: isMobile ? "18px 16px" : "20px 20px" }}>
            {sectionTitle("Categories", FolderCog, C)}
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginTop: 12, marginBottom: 16 }}>
              Manage custom categories and decide which expense groups are hidden from spending analytics and breakdown views.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 16 }}>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, background: "var(--bg-card)", overflow: "hidden" }}>
                <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Search categories"
                    style={{ ...inputStyle, padding: "9px 11px" }}
                  />
                </div>
                <div style={{ maxHeight: isMobile ? 320 : 420, overflowY: "auto" }}>
                  {expenseCategories.map((category, index) => {
                    const meta = getSpendingCategoryMeta(category.name);
                    const Icon = meta.icon || Sparkles;
                    const categoryId = meta.id;
                    const hidden = draft.categorySettings.hiddenCategoryIds.includes(categoryId);
                    const isEditing = editingCategoryId === category.id;
                    return (
                      <div key={`${category.id}-${index}`} style={{ borderTop: index ? `1px solid ${C.border}` : "none", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 10, background: `${meta.color}22`, color: meta.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon size={14} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            {isEditing ? (
                              <input
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                style={{ ...inputStyle, padding: "8px 10px" }}
                              />
                            ) : (
                              <>
                                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {getSpendingCategoryLabel(category.name)}
                                </div>
                                <div style={{ fontSize: 11.5, color: C.muted }}>
                                  {category.isCustom ? "Custom" : "Default"} category
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          {category.isCustom ? (
                            isEditing ? (
                              <button
                                type="button"
                                onClick={() => renameCategoryMutation.mutate({ id: category.id, name: editingCategoryName.trim() })}
                                disabled={renameCategoryMutation.isPending || !editingCategoryName.trim()}
                                style={{ height: 32, padding: "0 12px", borderRadius: 10, border: "none", background: "#050814", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                              >
                                Save
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setEditingCategoryId(category.id); setEditingCategoryName(category.name); }}
                                style={{ width: 32, height: 32, borderRadius: 10, border: `1px solid ${C.border}`, background: "var(--bg-card)", color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                              >
                                <PenLine size={14} />
                              </button>
                            )
                          ) : null}
                          <button
                            type="button"
                            onClick={() => toggleHiddenCategory(categoryId)}
                            style={{ minWidth: 112, height: 34, borderRadius: 10, border: `1px solid ${hidden ? "rgba(239,68,68,0.24)" : C.border}`, background: hidden ? "rgba(239,68,68,0.08)" : "var(--bg-card)", color: hidden ? "#dc2626" : C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                          >
                            <EyeOff size={13} />
                            {hidden ? "Hidden" : "Visible"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {!expenseCategories.length && <div style={{ padding: "22px 14px", textAlign: "center", fontSize: 12.5, color: C.muted }}>No categories found.</div>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, background: "var(--bg-card)", padding: "16px 14px" }}>
                  <FieldLabel subtle>Create custom category</FieldLabel>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New expense category"
                      style={{ ...inputStyle, padding: "10px 11px" }}
                    />
                    <button
                      type="button"
                      onClick={() => createCategoryMutation.mutate({ name: newCategoryName.trim(), type: "expense" })}
                      disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
                      style={{ minWidth: 92, borderRadius: 12, border: "none", background: "#050814", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Plus size={14} />
                        Add
                      </span>
                    </button>
                  </div>
                </div>
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, background: "var(--bg-card)", padding: "16px 14px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>Analytics impact</div>
                  <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.6 }}>
                    Hidden categories are excluded from overview, breakdown, and reports when <strong style={{ color: C.text }}>Include hidden in analytics</strong> is turned off below.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={panelStyle(C)}>
          <div style={{ padding: isMobile ? "18px 16px" : "20px 20px" }}>
            {sectionTitle("Recurring Payments", Repeat2, C)}
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginTop: 12, marginBottom: 16 }}>
              Tune how recurring items are detected and what defaults are used when you add them.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["autoDetectRecurring", "Automatically suggest repeated merchants"],
                ["showInferredRecurring", "Show inferred recurring items in the recurring tab"],
              ].map(([key, label]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: `1px solid ${C.border}`, borderRadius: 14, background: "var(--bg-card)", padding: "12px 14px" }}>
                  <div style={{ fontSize: 13.5, color: C.text }}>{label}</div>
                  <Toggle checked={!!draft.recurringSettings[key]} onClick={() => setNested("recurringSettings", key, !draft.recurringSettings[key])} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginTop: 16 }}>
              <div>
                <FieldLabel>Reminder days before due date</FieldLabel>
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
        </div>

        <div style={panelStyle(C)}>
          <div style={{ padding: isMobile ? "18px 16px" : "20px 20px" }}>
            {sectionTitle("Transaction Preferences", SlidersHorizontal, C)}
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginTop: 12, marginBottom: 16 }}>
              Decide how new transactions start, whether hidden items participate in analytics, and the default sort direction for the transactions page.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
              {[
                ["includeHiddenInAnalytics", "Include hidden transactions in spending analytics"],
                ["includeRecurringInBudget", "Include recurring transactions in budget calculations"],
              ].map(([key, label]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: `1px solid ${C.border}`, borderRadius: 14, background: "var(--bg-card)", padding: "12px 14px" }}>
                  <div style={{ fontSize: 13.5, color: C.text }}>{label}</div>
                  <Toggle checked={!!draft.transactionPreferences[key]} onClick={() => setNested("transactionPreferences", key, !draft.transactionPreferences[key])} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={panelStyle(C)}>
          <div style={{ padding: isMobile ? "18px 16px" : "20px 20px" }}>
            {sectionTitle("Report Preferences", FileBarChart2, C)}
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginTop: 12, marginBottom: 16 }}>
              Choose how reports should open by default and manage the saved report presets stored for this account in the browser.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              <div>
                <FieldLabel>Default report tab</FieldLabel>
                <select
                  value={draft.reportPreferences.defaultTab}
                  onChange={(e) => setNested("reportPreferences", "defaultTab", e.target.value)}
                  style={selectStyle}
                >
                  <option value="cashflow">Cash flow</option>
                  <option value="expenses">Expenses</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <FieldLabel>Default view by</FieldLabel>
                <select
                  value={draft.reportPreferences.defaultViewBy}
                  onChange={(e) => setNested("reportPreferences", "defaultViewBy", e.target.value)}
                  style={selectStyle}
                >
                  <option value="Category">Category</option>
                  <option value="Merchant">Merchant</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <FieldLabel>Default date range</FieldLabel>
              <select
                value={draft.reportPreferences.defaultRange}
                onChange={(e) => setNested("reportPreferences", "defaultRange", e.target.value)}
                style={selectStyle}
              >
                <option value="last_30_days">Last 30 days</option>
                <option value="last_90_days">Last 90 days</option>
                <option value="last_6_months">Last 6 months</option>
                <option value="year_to_date">Year to date</option>
                <option value="all_time">All time</option>
              </select>
            </div>
            <div style={{ marginTop: 16, border: `1px solid ${C.border}`, borderRadius: 14, background: "var(--bg-card)", padding: "14px 14px", display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 12, flexDirection: isMobile ? "column" : "row" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>Saved report presets</div>
                <div style={{ fontSize: 12.5, color: C.sub, marginTop: 4 }}>{savedReportCount} saved report{savedReportCount === 1 ? "" : "s"} stored for this account on this browser.</div>
              </div>
              <button
                type="button"
                onClick={clearSavedReports}
                disabled={savedReportCount === 0}
                style={{ height: 38, padding: "0 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: "var(--bg-card)", color: C.text, fontSize: 12.5, fontWeight: 600, cursor: savedReportCount === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: savedReportCount === 0 ? 0.5 : 1 }}
              >
                Clear saved reports
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: 12, flexDirection: isMobile ? "column" : "row" }}>
        <button
          type="button"
          onClick={() => setSpendTab?.("overview")}
          style={{ height: 40, padding: "0 16px", borderRadius: 12, border: `1px solid ${C.border}`, background: "var(--bg-card)", color: C.text, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          Back to overview
          <ChevronRight size={15} />
        </button>
        <button
          type="button"
          onClick={saveDraft}
          disabled={saveSettingsMutation.isPending}
          style={{ height: 42, padding: "0 18px", borderRadius: 12, border: "none", background: C.strong, color: C.onStrong, fontSize: 12.5, fontWeight: 700, cursor: saveSettingsMutation.isPending ? "not-allowed" : "pointer", opacity: saveSettingsMutation.isPending ? 0.7 : 1, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <Save size={15} />
          {saveSettingsMutation.isPending ? "Saving..." : "Save all changes"}
        </button>
      </div>
    </div>
  );
}
