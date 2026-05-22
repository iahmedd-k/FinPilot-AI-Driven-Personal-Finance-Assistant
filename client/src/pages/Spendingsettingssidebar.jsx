import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDashboard } from "../components/dashboard/DashboardContext";
import { dashboardService } from "../services/dashboardService";
import { transactionCategoryService } from "../services/transactionCategoryService";
import {
  getSpendingCategoryMeta,
  SPENDING_CATEGORY_META,
  catToIcon,
} from "../components/dashboard/dashboardShared";
import {
  Car, GraduationCap, Utensils, Gem, ShoppingCart, TrendingUp, HeartPulse,
  HousePlus, Sparkles, Plane, ReceiptText, BadgeDollarSign, Building2,
  ChevronRight, ChevronLeft, ChevronDown, X, Plus, Search as SearchIcon,
  Pencil, RotateCcw, PieChart, Bell, MoreHorizontal, Trash2, Tag,
  AlertTriangle, CheckCircle2, Settings, Layers, ListFilter,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const merge = (...args) => Object.assign({}, ...args);

const inputStyle = {
  width: "100%",
  border: "1px solid var(--border-subtle)",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "13px",
  outline: "none",
  backgroundColor: "var(--bg-secondary)",
  color: "var(--text-primary)",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const selectStyle = {
  width: "100%",
  fontSize: "13px",
  color: "var(--text-primary)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "8px",
  padding: "10px 12px",
  backgroundColor: "var(--bg-secondary)",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  cursor: "pointer",
  boxSizing: "border-box",
};

// ── Category helpers ──────────────────────────────────────────────────────────
const getCategoryMeta = (cat) => {
  if (!cat) return { color: "#9CA3AF", icon: ReceiptText };
  const catLower = cat.toLowerCase();
  if (["income", "salary", "other income"].includes(catLower))
    return { color: "#10B981", icon: BadgeDollarSign };
  if (["interest", "freelance", "investment"].includes(catLower))
    return { color: "#059669", icon: TrendingUp };
  if (catLower === "paycheck") return { color: "#10B981", icon: Building2 };
  if (catLower === "reimbursement") return { color: "#0D9488", icon: ReceiptText };
  const matched = (SPENDING_CATEGORY_META || []).find(
    (i) => i.label.toLowerCase() === catLower || i.id.toLowerCase() === catLower
  );
  if (matched) return { color: matched.color, icon: matched.icon };
  if (catToIcon[cat]) {
    const meta = getSpendingCategoryMeta(cat);
    return { color: meta?.color || "#9CA3AF", icon: catToIcon[cat] };
  }
  const meta = getSpendingCategoryMeta(cat);
  return { color: meta?.color || "#9CA3AF", icon: meta?.icon || ReceiptText };
};

const EXPENSE_CATS = [
  "Auto & transport", "Childcare & education", "Drinks & dining",
  "Entertainment", "Financial", "Groceries", "Healthcare", "Household",
  "Other", "Personal care", "Shopping", "Taxes", "Travel & vacation",
];
const INCOME_CATS = ["Income", "Interest", "Paycheck", "Reimbursement"];

const TAG_COLORS = [
  "#f5a623","#9b59b6","#b5882a","#5b9bd5","#a0522d","#0f6b5e",
  "#1a4a6b","#e07050","#6b7a1a","#d4a0d4","#1a5c1a","#8b3a3a",
  "#add8e6","#4a7c20","#4a4a10","#2e8b57","#c41e3a",
];

// ── Primitives ────────────────────────────────────────────────────────────────

const Input = ({ style, ...props }) => {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <input
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={merge(
        inputStyle,
        hovered && !focused ? { borderColor: "var(--border-strong)" } : {},
        focused ? { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-transparent)" } : {},
        style
      )}
      {...props}
    />
  );
};

const Select = ({ style, children, ...props }) => {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <select
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={merge(
        selectStyle,
        hovered && !focused ? { borderColor: "var(--border-strong)" } : {},
        focused ? { borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-transparent)" } : {},
        style
      )}
      {...props}
    >
      {children}
    </select>
  );
};

const Toggle = ({ on, onChange }) => (
  <button
    onClick={() => onChange(!on)}
    style={{
      width: "44px", height: "24px", borderRadius: "9999px",
      display: "flex", alignItems: "center",
      transition: "background 0.2s", padding: "2px", border: "none", cursor: "pointer",
      flexShrink: 0,
      backgroundColor: on ? "var(--accent)" : "var(--border-strong)",
      justifyContent: on ? "flex-end" : "flex-start",
    }}
  >
    <span style={{
      width: "20px", height: "20px", borderRadius: "9999px",
      backgroundColor: "var(--text-on-strong)", display: "block",
      boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
      transition: "transform 0.2s",
    }} />
  </button>
);

const Section = ({ children, style }) => (
  <div style={merge({
    backgroundColor: "color-mix(in srgb, var(--bg-card) 60%, transparent)",
    borderRadius: "16px",
    border: "1px solid var(--border-subtle)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    overflow: "hidden",
  }, style)}>
    {children}
  </div>
);

const Button = ({ children, style, onClick, disabled, variant = "primary", ...props }) => {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  const base =
    variant === "primary"
      ? { flex: 1, border: "none", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", fontWeight: 500, color: "var(--text-on-strong)", backgroundColor: "var(--accent)", cursor: "pointer" }
      : variant === "danger"
      ? { flex: 1, border: "1px solid var(--error)", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", fontWeight: 500, color: "var(--error)", backgroundColor: "transparent", cursor: "pointer" }
      : { flex: 1, border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", backgroundColor: "var(--bg-secondary)", cursor: "pointer" };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={merge(base, {
        transform: active ? "scale(0.97)" : hovered ? "scale(1.01)" : "scale(1)",
        boxShadow: hovered && variant === "primary" ? "0 4px 12px rgba(124,108,242,0.25)" : "none",
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? "none" : "auto",
        transition: "all 0.15s ease",
      }, style)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      {...props}
    >
      {children}
    </button>
  );
};

// Animated nav row
const Row = ({ label, desc, onClick, left, badge }) => {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: "14px 16px", background: "none", border: "none",
        borderBottom: "1px solid var(--border-subtle)", cursor: "pointer", textAlign: "left",
        backgroundColor: active ? "var(--bg-subtle)" : hovered ? "rgba(124,108,242,0.04)" : "transparent",
        transform: active ? "scale(0.99)" : "scale(1)",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        transform: hovered ? "translateX(3px)" : "translateX(0)", transition: "transform 0.2s ease",
      }}>
        {left}
        <div>
          <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, display: "block" }}>{label}</span>
          {desc && <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px", display: "block" }}>{desc}</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {badge != null && (
          <span style={{
            fontSize: "11px", fontWeight: 600, padding: "2px 7px", borderRadius: "9999px",
            backgroundColor: "var(--accent-transparent)", color: "var(--accent)",
          }}>{badge}</span>
        )}
        <span style={{ color: "var(--text-muted)", display: "flex", transform: hovered ? "translateX(2px)" : "translateX(0)", transition: "transform 0.2s" }}>
          <ChevronRight size={16} />
        </span>
      </div>
    </button>
  );
};

const FieldRow = ({ label, children }) => (
  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
    <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
    {children}
  </div>
);

const ToggleRow = ({ label, desc, extra, checked, onToggle }) => (
  <div style={{ padding: "16px", borderBottom: "1px solid var(--border-subtle)" }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>{label}</p>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "3px", lineHeight: "1.5", margin: "3px 0 0" }}>{desc}</p>
        {extra}
      </div>
      <Toggle on={checked} onChange={onToggle} />
    </div>
  </div>
);

// Inline confirmation for destructive actions
const ConfirmDanger = ({ message, confirmLabel = "Delete", onConfirm, onCancel }) => (
  <div style={{
    backgroundColor: "var(--error-transparent)", border: "1px solid var(--error)",
    borderRadius: "10px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px",
  }}>
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
      <AlertTriangle size={16} style={{ color: "var(--error)", flexShrink: 0, marginTop: "1px" }} />
      <p style={{ fontSize: "13px", color: "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>{message}</p>
    </div>
    <div style={{ display: "flex", gap: "8px" }}>
      <Button variant="outline" onClick={onCancel} style={{ flex: "none", padding: "7px 14px", fontSize: "12px" }}>Cancel</Button>
      <Button variant="danger" onClick={onConfirm} style={{ flex: "none", padding: "7px 14px", fontSize: "12px" }}>{confirmLabel}</Button>
    </div>
  </div>
);

// Icon circle
const CatIcon = ({ cat, size = 32, iconSize = 16 }) => {
  const info = getCategoryMeta(cat);
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%",
      backgroundColor: `${info.color}18`, color: info.color,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <info.icon size={iconSize} />
    </span>
  );
};

// Empty state
const EmptyState = ({ icon: Icon, message, action }) => (
  <div style={{ padding: "32px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
    <span style={{ color: "var(--text-muted)", opacity: 0.5 }}><Icon size={28} /></span>
    <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0, fontStyle: "italic" }}>{message}</p>
    {action}
  </div>
);

// Section header label
const SectionLabel = ({ label, action }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 6px" }}>
    <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
      {label}
    </span>
    {action}
  </div>
);

// ── Screens ───────────────────────────────────────────────────────────────────

// 1. Main
const MainScreen = ({ nav }) => {
  const { spendingSettings, queryClient, pushNotif } = useDashboard();
  const rules = spendingSettings?.rules || [];
  const tags = spendingSettings?.tags || [];

  const [confirmDeleteRuleId, setConfirmDeleteRuleId] = useState(null);

  const getRuleDescription = (rule) => {
    const condDesc =
      rule.conditions
        ?.map((c) => {
          const fieldMap = { merchant: "Merchant", category: "Category", notes: "Notes", amount: "Amount", type: "Type", tag: "Tag" };
          const opMap = { equals: "is exactly", contains: "contains", starts_with: "starts with", ends_with: "ends with", greater_than: "greater than", less_than: "less than" };
          return `${fieldMap[c.field] || c.field} ${opMap[c.operator] || c.operator} "${c.value}"`;
        })
        .join(" & ") || "No conditions";

    const actionDesc =
      rule.actions
        ?.map((a) => {
          if (a.field === "category") return `→ set category "${a.value}"`;
          if (a.field === "tag") return `→ add tag "${a.value}"`;
          if (a.field === "merchant") return `→ rename to "${a.value}"`;
          if (a.field === "isHidden") return a.value === "true" ? "→ hide" : "→ show";
          if (a.field === "reviewStatus") return a.value === "reviewed" ? "→ mark reviewed" : "→ flag for review";
          return `→ ${a.field}: ${a.value}`;
        })
        .join(", ") || "No actions";

    return `${condDesc} ${actionDesc}`;
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      const updatedRules = rules.filter((r) => r._id !== ruleId);
      await dashboardService.saveSpendingSettings({ ...spendingSettings, rules: updatedRules });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      pushNotif("success", "Rule deleted");
      setConfirmDeleteRuleId(null);
    } catch {
      pushNotif("error", "Failed to delete rule");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Quick nav */}
      <Section>
        <Row
          label="Manage categories"
          desc="Create, archive, and organise categories"
          left={<span style={{ color: "var(--accent)" }}><Layers size={18} /></span>}
          onClick={() => nav("categories")}
        />
        <Row
          label="Manage budget"
          desc="Upcoming spend, reset and preferences"
          left={<span style={{ color: "var(--accent)" }}><PieChart size={18} /></span>}
          onClick={() => nav("budget")}
        />
        <Row
          label="Review transactions"
          desc="Alerts, thresholds and review flow"
          left={<span style={{ color: "var(--accent)" }}><ListFilter size={18} /></span>}
          onClick={() => nav("transactions")}
          style={{ borderBottom: "none" }}
        />
      </Section>

      {/* Rules */}
      <Section>
        <SectionLabel
          label={`Rules${rules.length ? ` (${rules.length})` : ""}`}
          action={
            <button
              onClick={() => nav("createRule")}
              style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              <Plus size={13} /> Add
            </button>
          }
        />

        {rules.length === 0 ? (
          <EmptyState
            icon={Settings}
            message="No rules yet — rules auto-categorise and tag transactions as they sync."
            action={
              <Button variant="outline" onClick={() => nav("createRule")} style={{ flex: "none", fontSize: "12px", padding: "7px 14px", gap: "6px", display: "flex", alignItems: "center" }}>
                <Plus size={14} /> Create first rule
              </Button>
            }
          />
        ) : (
          <>
            {rules.map((rule) => (
              <div key={rule._id}>
                <div style={{
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                  padding: "13px 16px", borderBottom: "1px solid var(--border-subtle)", gap: "12px",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 3px" }}>
                      {rule.name || "Untitled Rule"}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {getRuleDescription(rule)}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmDeleteRuleId(rule._id)}
                    title="Delete rule"
                    style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px", flexShrink: 0, transition: "all 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--error)"; e.currentTarget.style.backgroundColor = "var(--error-transparent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {confirmDeleteRuleId === rule._id && (
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <ConfirmDanger
                      message={`Delete rule "${rule.name || "Untitled"}"? This cannot be undone.`}
                      confirmLabel="Delete rule"
                      onConfirm={() => handleDeleteRule(rule._id)}
                      onCancel={() => setConfirmDeleteRuleId(null)}
                    />
                  </div>
                )}
              </div>
            ))}
            <div style={{ padding: "12px 16px" }}>
              <Button variant="outline" onClick={() => nav("createRule")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", flex: "none" }}>
                <Plus size={15} /> Add rule
              </Button>
            </div>
          </>
        )}
      </Section>

      {/* Tags */}
      <Section>
        <SectionLabel
          label={`Tags${tags.length ? ` (${tags.length})` : ""}`}
          action={
            <button
              onClick={() => nav("createTag")}
              style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              <Plus size={13} /> Add
            </button>
          }
        />

        {tags.length === 0 ? (
          <EmptyState
            icon={Tag}
            message="No tags yet — tags help group transactions across categories."
            action={
              <Button variant="outline" onClick={() => nav("createTag")} style={{ flex: "none", fontSize: "12px", padding: "7px 14px", gap: "6px", display: "flex", alignItems: "center" }}>
                <Plus size={14} /> Create first tag
              </Button>
            }
          />
        ) : (
          <>
            {tags.map((tag, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "9999px", backgroundColor: tag.color || "#818cf8", display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>{tag.name}</span>
                </div>
                <button
                  onClick={() => nav("editTag", tag)}
                  style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px", display: "flex" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  <Pencil size={13} />
                </button>
              </div>
            ))}
            <div style={{ padding: "12px 16px" }}>
              <Button variant="outline" onClick={() => nav("createTag")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", flex: "none" }}>
                <Plus size={15} /> Add tag
              </Button>
            </div>
          </>
        )}
      </Section>
    </div>
  );
};

// 2. Manage Categories
const CategoriesScreen = ({ nav }) => {
  const [search, setSearch] = useState("");
  const { spendingSettings, user } = useDashboard();
  const hiddenCategoryIds = spendingSettings?.categorySettings?.hiddenCategoryIds || [];

  const { data: categoryData, isLoading: catLoading } = useQuery({
    queryKey: ["transaction-categories", user?._id],
    queryFn: () => transactionCategoryService.list().then((r) => r.data),
    enabled: !!user?._id,
    staleTime: 0,
    refetchOnMount: true,
  });
  const customCategories = categoryData?.categories || [];

  const customExpenses = customCategories.filter((c) => c.type === "expense").map((c) => c.name);
  const customIncomes = customCategories.filter((c) => c.type === "income").map((c) => c.name);
  const allExpenseCats = [...new Set([...EXPENSE_CATS, ...customExpenses])];
  const allIncomeCats = [...new Set([...INCOME_CATS, ...customIncomes])];
  const filter = (list) => list.filter((c) => c.toLowerCase().includes(search.toLowerCase()));

  const CatRow = ({ cat }) => {
    const isHidden = hiddenCategoryIds.includes(cat);
    const [hovered, setHovered] = useState(false);
    return (
      <button
        onClick={() => nav("editCategory", cat)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "11px 16px",
          width: "100%", background: "none", border: "none", borderBottom: "1px solid var(--border-subtle)",
          cursor: "pointer", textAlign: "left", opacity: isHidden ? 0.5 : 1,
          backgroundColor: hovered ? "rgba(124,108,242,0.04)" : "transparent",
          transition: "background 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <CatIcon cat={cat} />
          <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
            {cat}
            {isHidden && (
              <span style={{ marginLeft: "8px", fontSize: "10px", color: "var(--text-muted)", backgroundColor: "var(--border-subtle)", padding: "2px 6px", borderRadius: "4px", fontWeight: 400 }}>
                Archived
              </span>
            )}
          </span>
        </div>
        <span style={{ color: "var(--text-muted)", display: "flex", transform: hovered ? "translateX(2px)" : "translateX(0)", transition: "transform 0.15s" }}>
          <ChevronRight size={15} />
        </span>
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" }}>
          <SearchIcon size={15} />
        </span>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories…"
          style={{ paddingLeft: "36px" }}
        />
      </div>

      {catLoading ? (
        <div style={{ textAlign: "center", padding: "32px", fontSize: "13px", color: "var(--text-muted)" }}>Loading…</div>
      ) : (
        ["Expense", "Income"].map((type) => {
          const isExpense = type === "Expense";
          const cats = filter(isExpense ? allExpenseCats : allIncomeCats);
          return (
            <div key={type}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{type}</span>
                <button
                  onClick={() => nav("newCategory", isExpense ? "expense" : "income")}
                  style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "5px 11px", backgroundColor: "var(--bg-secondary)", cursor: "pointer", fontWeight: 500 }}
                >
                  <Plus size={13} /> Create
                </button>
              </div>
              <Section>
                {cats.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic" }}>
                    {search ? "No matches" : "No categories"}
                  </div>
                ) : (
                  cats.map((cat) => <CatRow key={cat} cat={cat} />)
                )}
              </Section>
            </div>
          );
        })
      )}
    </div>
  );
};

// 3. New Category
const NewCategoryScreen = ({ type, back }) => {
  const [catName, setCatName] = useState("");
  const { queryClient, pushNotif } = useDashboard();
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!catName.trim()) { pushNotif("warning", "Category name is required"); return; }
    setLoading(true);
    try {
      await transactionCategoryService.create({ name: catName.trim(), type });
      queryClient.invalidateQueries({ queryKey: ["transaction-categories"] });
      pushNotif("success", "Category created");
      back();
    } catch (err) {
      pushNotif("error", err.response?.data?.message || "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ padding: "14px 16px", backgroundColor: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
        <p style={{ margin: "0 0 2px", fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Creating</p>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, textTransform: "capitalize" }}>{type} Category</p>
      </div>
      <Input
        value={catName}
        onChange={(e) => setCatName(e.target.value)}
        placeholder="Category name"
        disabled={loading}
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
      />
      <div style={{ display: "flex", gap: "10px" }}>
        <Button variant="outline" onClick={back} disabled={loading}>Cancel</Button>
        <Button variant="primary" onClick={handleCreate} disabled={loading || !catName.trim()}>
          {loading ? "Creating…" : "Create category"}
        </Button>
      </div>
    </div>
  );
};

// 4. Edit Category
const EditCategoryScreen = ({ category, back }) => {
  const { spendingSettings, queryClient, pushNotif, user } = useDashboard();
  const info = getCategoryMeta(category);
  const categoryData = queryClient.getQueryData(["transaction-categories", user?._id]);
  const customCategories = categoryData?.categories || [];
  const customCat = customCategories.find((c) => c.name === category);
  const isCustom = !!customCat;

  const [catName, setCatName] = useState(category || "");
  const [archiveOn, setArchiveOn] = useState(
    () => spendingSettings?.categorySettings?.hiddenCategoryIds?.includes(category) || false
  );
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (isCustom && !catName.trim()) { pushNotif("warning", "Category name required"); return; }
    setSaving(true);
    try {
      if (isCustom && catName.trim() !== category)
        await transactionCategoryService.update(customCat._id, { name: catName.trim() });

      let hiddenIds = [...(spendingSettings?.categorySettings?.hiddenCategoryIds || [])];
      const target = isCustom ? catName.trim() : category;
      if (archiveOn) {
        if (!hiddenIds.includes(target)) hiddenIds.push(target);
        if (isCustom && catName.trim() !== category) hiddenIds = hiddenIds.filter((id) => id !== category);
      } else {
        hiddenIds = hiddenIds.filter((id) => id !== target && id !== category);
      }

      await dashboardService.saveSpendingSettings({
        ...spendingSettings,
        categorySettings: { ...(spendingSettings.categorySettings || {}), hiddenCategoryIds: hiddenIds },
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-page"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-categories"] });
      pushNotif("success", "Category updated");
      back();
    } catch (err) {
      pushNotif("error", err.response?.data?.message || "Failed to update category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await transactionCategoryService.delete(customCat._id);
      const currentHidden = spendingSettings?.categorySettings?.hiddenCategoryIds || [];
      const nextHidden = currentHidden.filter((id) => id !== category);
      if (spendingSettings && nextHidden.length !== currentHidden.length) {
        await dashboardService.saveSpendingSettings({
          ...spendingSettings,
          categorySettings: { ...(spendingSettings.categorySettings || {}), hiddenCategoryIds: nextHidden },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["transaction-categories"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-page"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      pushNotif("success", "Category deleted");
      back();
    } catch (err) {
      pushNotif("error", err.response?.data?.message || "Failed to delete category");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header card */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px" }}>
        <CatIcon cat={category} size={44} iconSize={20} />
        <div>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, margin: "0 0 2px" }}>
            {isCustom ? "Custom category" : "Built-in category"}
          </p>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{category}</p>
        </div>
      </div>

      {/* Name field */}
      <Section>
        <FieldRow label="Category name">
          <Input
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            disabled={!isCustom || saving}
            placeholder="Category name"
          />
          {!isCustom && (
            <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic", marginTop: "6px", margin: "6px 0 0" }}>
              Built-in categories cannot be renamed.
            </p>
          )}
        </FieldRow>
      </Section>

      {/* Archive toggle */}
      <Section>
        <ToggleRow
          label="Archive this category"
          desc="Archived categories are hidden from main views and transaction dropdowns."
          checked={archiveOn}
          onToggle={setArchiveOn}
        />
      </Section>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px" }}>
        <Button variant="outline" onClick={back} disabled={saving || deleting}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={saving || deleting}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {/* Delete for custom categories */}
      {isCustom && (
        <>
          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
            {confirmDelete ? (
              <ConfirmDanger
                message={`Permanently delete "${category}"? Transactions using it will be set to "Other".`}
                confirmLabel={deleting ? "Deleting…" : "Delete category"}
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete(false)}
              />
            ) : (
              <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={deleting} style={{ flex: "none", width: "100%" }}>
                Delete category
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// 5. Manage Budget
const BudgetScreen = ({ nav }) => {
  const { spendingSettings, queryClient, pushNotif } = useDashboard();
  const includeRecurring = spendingSettings?.transactionPreferences?.includeRecurringInBudget ?? true;

  const handleToggle = async (val) => {
    try {
      await dashboardService.saveSpendingSettings({
        ...spendingSettings,
        transactionPreferences: { ...(spendingSettings?.transactionPreferences || {}), includeRecurringInBudget: val },
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      pushNotif("success", "Setting updated");
    } catch {
      pushNotif("error", "Failed to update setting");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Section>
        <ToggleRow
          label="Include upcoming spend"
          desc="Add future bills and recurring payments into your budget totals."
          checked={includeRecurring}
          onToggle={handleToggle}
        />
      </Section>
      <Section>
        <Row
          label="Reset budget"
          desc="Set this month's budget and default to $0"
          left={<span style={{ color: "var(--error)" }}><RotateCcw size={16} /></span>}
          onClick={() => nav("resetBudget")}
          style={{ borderBottom: "none" }}
        />
      </Section>
    </div>
  );
};

// 6. Reset Budget
const ResetBudgetScreen = ({ back }) => {
  const { spendingSettings, queryClient, pushNotif } = useDashboard();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleReset = async () => {
    setDeleting(true);
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      await dashboardService.setBudget({ month, amount: 0 });
      await dashboardService.saveSpendingSettings({
        ...spendingSettings,
        budgetSettings: { ...(spendingSettings?.budgetSettings || {}), defaultMonthlyBudget: 0 },
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      pushNotif("success", "Budget reset to $0");
      back();
    } catch {
      pushNotif("error", "Failed to reset budget");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", margin: 0 }}>
        This sets your current month's budget and default budget to <strong>$0</strong>. Your transactions won't be affected.
      </p>

      {confirm ? (
        <ConfirmDanger
          message="Reset your budget to $0? You'll need to set a new budget afterwards."
          confirmLabel={deleting ? "Resetting…" : "Confirm reset"}
          onConfirm={handleReset}
          onCancel={() => setConfirm(false)}
        />
      ) : (
        <Button variant="danger" onClick={() => setConfirm(true)} style={{ flex: "none", width: "100%" }}>
          Reset budget to $0
        </Button>
      )}
    </div>
  );
};

// 7. Create Rule
const CondValueInput = ({ condField, condValue, setCondValue, saving, allTags }) => {
  if (condField === "type")
    return (
      <Select value={condValue} onChange={(e) => setCondValue(e.target.value)} disabled={saving}>
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </Select>
    );
  if (condField === "category")
    return (
      <Select value={condValue} onChange={(e) => setCondValue(e.target.value)} disabled={saving}>
        {mergedCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
      </Select>
    );
  if (condField === "tag")
    return (
      <>
        <Input list="cond-tags" value={condValue} onChange={(e) => setCondValue(e.target.value)} placeholder="Tag to match" disabled={saving} />
        <datalist id="cond-tags">{allTags.map((t) => <option key={t} value={t} />)}</datalist>
      </>
    );
  return (
    <Input
      type={condField === "amount" ? "number" : "text"}
      value={condValue}
      onChange={(e) => setCondValue(e.target.value)}
      placeholder={condField === "amount" ? "Amount e.g. 100" : "Value to match"}
      disabled={saving}
    />
  );
};

const ActionValueInput = ({ actionField, actionValue, setActionValue, saving, mergedCategories, allTags }) => {
  if (actionField === "category")
    return (
      <Select value={actionValue} onChange={(e) => setActionValue(e.target.value)} disabled={saving}>
        {mergedCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
      </Select>
    );
  if (actionField === "isHidden")
    return (
      <Select value={actionValue} onChange={(e) => setActionValue(e.target.value)} disabled={saving}>
        <option value="true">Hide transaction</option>
        <option value="false">Show transaction</option>
      </Select>
    );
  if (actionField === "reviewStatus")
    return (
      <Select value={actionValue} onChange={(e) => setActionValue(e.target.value)} disabled={saving}>
        <option value="needs_review">Flag for review</option>
        <option value="reviewed">Mark as reviewed</option>
      </Select>
    );
  if (actionField === "tag")
    return (
      <>
        <Input list="action-tags" value={actionValue} onChange={(e) => setActionValue(e.target.value)} placeholder="Tag name" disabled={saving} />
        <datalist id="action-tags">{allTags.map((t) => <option key={t} value={t} />)}</datalist>
      </>
    );
  return <Input value={actionValue} onChange={(e) => setActionValue(e.target.value)} placeholder="New merchant name" disabled={saving} />;
};

const CreateRuleScreen = ({ back }) => {
  const { spendingSettings, queryClient, pushNotif, apiTransactions = [], user } = useDashboard();
  const [ruleName, setRuleName] = useState("");
  const [condField, setCondField] = useState("merchant");
  const [condOperator, setCondOperator] = useState("contains");
  const [condValue, setCondValue] = useState("");
  const [actionField, setActionField] = useState("category");
  const [actionValue, setActionValue] = useState("");
  const [saving, setSaving] = useState(false);

  const allTags = useMemo(
    () => Array.from(new Set(apiTransactions.map((tx) => tx.tag).filter(Boolean))),
    [apiTransactions]
  );

  const { data: categoryData } = useQuery({
    queryKey: ["transaction-categories", user?._id],
    queryFn: () => transactionCategoryService.list().then((r) => r.data),
    enabled: !!user?._id,
    staleTime: 0,
    refetchOnMount: true,
  });
  const customCategories = categoryData?.categories || [];

  const mergedCategories = useMemo(
    () => [...EXPENSE_CATS, ...INCOME_CATS, ...customCategories.map((c) => c.name)],
    [customCategories]
  );

  useEffect(() => {
    if (condField === "amount") { setCondOperator("greater_than"); setCondValue(""); }
    else if (condField === "type") { setCondOperator("equals"); setCondValue("expense"); }
    else if (condField === "category") { setCondOperator("equals"); setCondValue(mergedCategories[0] || "Other"); }
    else { setCondOperator("contains"); setCondValue(""); }
  }, [condField]);

  useEffect(() => {
    if (actionField === "category") setActionValue(mergedCategories[0] || "Other");
    else if (actionField === "isHidden") setActionValue("true");
    else if (actionField === "reviewStatus") setActionValue("needs_review");
    else setActionValue("");
  }, [actionField]);

  const operators =
    condField === "amount"
      ? [{ value: "greater_than", label: "is greater than" }, { value: "less_than", label: "is less than" }, { value: "equals", label: "is exactly" }]
      : condField === "type" || condField === "category"
      ? [{ value: "equals", label: "is exactly" }]
      : [
          { value: "contains", label: "contains" },
          { value: "equals", label: "is exactly" },
          { value: "starts_with", label: "starts with" },
          { value: "ends_with", label: "ends with" },
        ];

  const handleSave = async () => {
    if (!ruleName.trim()) { pushNotif("warning", "Rule name is required"); return; }
    if (!condValue.toString().trim()) { pushNotif("warning", "Condition value is required"); return; }
    if (!actionValue.toString().trim()) { pushNotif("warning", "Action value is required"); return; }

    setSaving(true);
    try {
      const newRule = {
        name: ruleName.trim(),
        conditions: [{ field: condField, operator: condOperator, value: condValue.toString().trim() }],
        actions: [{ field: actionField, value: actionValue.toString().trim() }],
      };
      const currentRules = spendingSettings?.rules || [];
      const res = await dashboardService.saveSpendingSettings({ ...spendingSettings, rules: [...currentRules, newRule] });
      const appliedCount = res.data?.appliedCount ?? 0;
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      pushNotif("success", appliedCount > 0 ? `Rule saved — applied to ${appliedCount} transactions` : "Rule saved");
      back();
    } catch (err) {
      pushNotif("error", err.response?.data?.message || "Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  const isValid = ruleName.trim() && condValue.toString().trim() && actionValue.toString().trim();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Rule name */}
      <div>
        <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "6px" }}>
          Rule name
        </label>
        <Input
          value={ruleName}
          onChange={(e) => setRuleName(e.target.value)}
          placeholder="e.g. Starbucks → Drinks & dining"
          disabled={saving}
          autoFocus
        />
      </div>

      {/* Condition */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "var(--accent)", color: "var(--text-on-strong)", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>IF</span>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Transaction matches</p>
        </div>
        <Section>
          <FieldRow label="Field">
            <Select value={condField} onChange={(e) => setCondField(e.target.value)} disabled={saving}>
              <option value="merchant">Merchant</option>
              <option value="category">Category</option>
              <option value="amount">Amount</option>
              <option value="type">Type</option>
              <option value="notes">Notes</option>
              <option value="tag">Tag</option>
            </Select>
          </FieldRow>
          <FieldRow label="Operator">
            <Select value={condOperator} onChange={(e) => setCondOperator(e.target.value)} disabled={saving}>
              {operators.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
            </Select>
          </FieldRow>
          <FieldRow label="Value">
            <CondValueInput condField={condField} condValue={condValue} setCondValue={setCondValue} saving={saving} allTags={allTags} />
          </FieldRow>
        </Section>
      </div>

      {/* Action */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#10B981", color: "#fff", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>DO</span>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Then apply update</p>
        </div>
        <Section>
          <FieldRow label="Action">
            <Select value={actionField} onChange={(e) => setActionField(e.target.value)} disabled={saving}>
              <option value="category">Update category</option>
              <option value="tag">Add tag</option>
              <option value="merchant">Rename merchant</option>
              <option value="isHidden">Hide / show transaction</option>
              <option value="reviewStatus">Set review status</option>
            </Select>
          </FieldRow>
          <FieldRow label="Value">
            <ActionValueInput actionField={actionField} actionValue={actionValue} setActionValue={setActionValue} saving={saving} mergedCategories={mergedCategories} allTags={allTags} />
          </FieldRow>
        </Section>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <Button variant="outline" onClick={back} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={saving || !isValid}>
          {saving ? "Saving…" : "Save rule"}
        </Button>
      </div>
    </div>
  );
};

// 8. Create / Edit Tag
const TagScreen = ({ existingTag, nav, back }) => {
  const { spendingSettings, queryClient, pushNotif } = useDashboard();
  const [tagName, setTagName] = useState(existingTag?.name || "");
  const [selected, setSelected] = useState(existingTag?.color || TAG_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEdit = !!existingTag;

  const handleSave = async () => {
    if (!tagName.trim()) { pushNotif("warning", "Tag name is required"); return; }
    setSaving(true);
    try {
      const currentTags = spendingSettings?.tags || [];
      let updatedTags;
      if (isEdit) {
        updatedTags = currentTags.map((t) =>
          t.name === existingTag.name ? { ...t, name: tagName.trim(), color: selected } : t
        );
      } else {
        if (currentTags.find((t) => t.name.toLowerCase() === tagName.trim().toLowerCase())) {
          pushNotif("warning", "A tag with that name already exists");
          setSaving(false);
          return;
        }
        updatedTags = [...currentTags, { name: tagName.trim(), color: selected }];
      }
      await dashboardService.saveSpendingSettings({ ...spendingSettings, tags: updatedTags });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      pushNotif("success", isEdit ? "Tag updated" : "Tag created");
      nav("main");
    } catch {
      pushNotif("error", "Failed to save tag");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const updatedTags = (spendingSettings?.tags || []).filter((t) => t.name !== existingTag.name);
      await dashboardService.saveSpendingSettings({ ...spendingSettings, tags: updatedTags });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      pushNotif("success", "Tag deleted");
      nav("main");
    } catch {
      pushNotif("error", "Failed to delete tag");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Preview */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", backgroundColor: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
        <span style={{ width: "12px", height: "12px", borderRadius: "9999px", backgroundColor: selected, display: "inline-block", flexShrink: 0 }} />
        <span style={{ fontSize: "14px", fontWeight: 500, color: tagName ? "var(--text-primary)" : "var(--text-muted)" }}>
          {tagName || "Tag preview"}
        </span>
      </div>

      <Input
        value={tagName}
        onChange={(e) => setTagName(e.target.value)}
        placeholder="Tag name"
        disabled={saving}
        autoFocus={!isEdit}
      />

      <Section>
        <div style={{ padding: "12px 16px 6px", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border-subtle)" }}>
          Pick a color
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "14px 16px" }}>
          {TAG_COLORS.map((c, i) => (
            <button
              key={i}
              onClick={() => setSelected(c)}
              style={{
                width: "28px", height: "28px", borderRadius: "50%", backgroundColor: c,
                border: selected === c ? `3px solid var(--accent)` : "2px solid transparent",
                cursor: "pointer", outline: "none",
                transform: selected === c ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.1s",
              }}
            />
          ))}
        </div>
      </Section>

      <div style={{ display: "flex", gap: "10px" }}>
        <Button variant="outline" onClick={() => nav("main")} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={saving || !tagName.trim()}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create tag"}
        </Button>
      </div>

      {isEdit && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
          {confirmDelete ? (
            <ConfirmDanger
              message={`Delete tag "${existingTag.name}"? Transactions won't lose this label but future rules won't apply it.`}
              confirmLabel="Delete tag"
              onConfirm={handleDelete}
              onCancel={() => setConfirmDelete(false)}
            />
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={saving} style={{ flex: "none", width: "100%" }}>
              Delete tag
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// 9. Review Transactions
const TransactionsScreen = () => {
  const { spendingSettings, queryClient, pushNotif } = useDashboard();
  const alertSettings = spendingSettings?.alertSettings || {};
  const txPrefs = spendingSettings?.transactionPreferences || {};
  const [largeAmtEditing, setLargeAmtEditing] = useState(false);
  const [largeAmtInput, setLargeAmtInput] = useState(String(alertSettings.largeTransactionAmount ?? 500));

  const saveSettings = async (newSettings) => {
    try {
      await dashboardService.saveSpendingSettings(newSettings);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-page"] });
      pushNotif("success", "Review preference updated");
    } catch {
      pushNotif("error", "Failed to save");
    }
  };

  const handleToggle = (section, key, val) => {
    saveSettings({ ...spendingSettings, [section]: { ...(spendingSettings[section] || {}), [key]: val } });
  };

  const handleSaveLargeAmt = () => {
    const amt = Number(largeAmtInput);
    if (isNaN(amt) || amt < 0) { pushNotif("warning", "Enter a valid positive number"); return; }
    saveSettings({
      ...spendingSettings,
      alertSettings: { ...(spendingSettings.alertSettings || {}), largeTransactionAmount: amt },
    });
    setLargeAmtEditing(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Master toggle */}
      <Section>
        <div style={{ padding: "16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 3px" }}>Enable transaction review</p>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              New transactions are flagged for manual review before being counted.
            </p>
          </div>
          <Toggle
            on={txPrefs.defaultReviewStatus === "needs_review"}
            onChange={(val) => handleToggle("transactionPreferences", "defaultReviewStatus", val ? "needs_review" : "reviewed")}
          />
        </div>
      </Section>

      {/* Alert toggles */}
      <Section>
        <SectionLabel label="Flag for review when" />
        <ToggleRow
          checked={alertSettings.notificationsEnabled ?? true}
          onToggle={(val) => handleToggle("alertSettings", "notificationsEnabled", val)}
          label="Any new transaction"
          desc="All newly synced expenses will be flagged."
        />
        <ToggleRow
          checked={alertSettings.categorySpikeAlerts ?? true}
          onToggle={(val) => handleToggle("alertSettings", "categorySpikeAlerts", val)}
          label="Uncategorised transactions"
          desc='Expenses auto-categorised as "Other" will be flagged.'
        />
        <ToggleRow
          checked={alertSettings.recurringReminderAlerts ?? true}
          onToggle={(val) => handleToggle("alertSettings", "recurringReminderAlerts", val)}
          label="Recurring transactions"
          desc="Any detected recurring expense will be flagged."
        />
        <ToggleRow
          checked={alertSettings.largeTransactionAlerts ?? true}
          onToggle={(val) => handleToggle("alertSettings", "largeTransactionAlerts", val)}
          label="Large transactions"
          desc="Transactions above the threshold will be flagged."
          extra={
            largeAmtEditing ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                <Input
                  type="number"
                  value={largeAmtInput}
                  onChange={(e) => setLargeAmtInput(e.target.value)}
                  style={{ width: "110px", padding: "6px 10px" }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveLargeAmt(); if (e.key === "Escape") setLargeAmtEditing(false); }}
                  autoFocus
                />
                <Button variant="primary" onClick={handleSaveLargeAmt} style={{ flex: "none", padding: "6px 12px", fontSize: "12px" }}>Save</Button>
                <Button variant="outline" onClick={() => setLargeAmtEditing(false)} style={{ flex: "none", padding: "6px 12px", fontSize: "12px" }}>Cancel</Button>
              </div>
            ) : (
              <button
                onClick={() => setLargeAmtEditing(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "6px", fontSize: "12px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 500 }}
              >
                Threshold: ${alertSettings.largeTransactionAmount ?? 500} <Pencil size={11} />
              </button>
            )
          }
        />
      </Section>
    </div>
  );
};

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function SpendingSettingsSidebar({ open, onClose }) {
  const [stack, setStack] = useState([{ screen: "main" }]);
  const current = stack[stack.length - 1];
  const nav = (screen, payload) => setStack((s) => [...s, { screen, payload }]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  // Reset stack when sidebar closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setStack([{ screen: "main" }]), 400);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "Escape") {
        if (stack.length > 1) back();
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, stack]);

  const TITLES = {
    main: "Spending settings",
    categories: "Manage categories",
    newCategory: "New category",
    editCategory: "Edit category",
    budget: "Manage budget",
    resetBudget: "Reset budget",
    createRule: "Create rule",
    createTag: "New tag",
    editTag: "Edit tag",
    transactions: "Review transactions",
  };

  const renderScreen = () => {
    switch (current.screen) {
      case "main":         return <MainScreen nav={nav} />;
      case "categories":   return <CategoriesScreen nav={nav} />;
      case "newCategory":  return <NewCategoryScreen type={current.payload} back={back} />;
      case "editCategory": return <EditCategoryScreen category={current.payload} back={back} />;
      case "budget":       return <BudgetScreen nav={nav} />;
      case "resetBudget":  return <ResetBudgetScreen back={back} />;
      case "createRule":   return <CreateRuleScreen back={back} />;
      case "createTag":    return <TagScreen nav={nav} back={back} />;
      case "editTag":      return <TagScreen existingTag={current.payload} nav={nav} back={back} />;
      case "transactions": return <TransactionsScreen />;
      default:             return <MainScreen nav={nav} />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.4)", zIndex: 1000,
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Sidebar panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={TITLES[current.screen] || "Settings"}
        style={{
          position: "fixed", top: 0, right: 0, height: "100%", width: "min(520px, 100vw)",
          backgroundColor: "color-mix(in srgb, var(--bg-secondary) 90%, transparent)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          zIndex: 1001, boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.38s cubic-bezier(0.16,1,0.3,1)",
          borderLeft: "1px solid var(--border-subtle)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
          backgroundColor: "color-mix(in srgb, var(--bg-card) 80%, transparent)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {stack.length > 1 && (
              <button
                onClick={back}
                title="Go back"
                style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px", borderRadius: "6px", transition: "background 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-secondary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <ChevronLeft size={16} />
              </button>
            )}
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {stack.length > 1 && (
                <>
                  <button
                    onClick={() => setStack([{ screen: "main" }])}
                    style={{ fontSize: "11px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    Settings
                  </button>
                  <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
                </>
              )}
              <h2 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                {TITLES[current.screen] || "Settings"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close"
            style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "6px", borderRadius: "8px", transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.backgroundColor = "var(--bg-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {renderScreen()}
        </div>
      </div>
    </>
  );
}
