import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Info,
  Lock,
  Pencil,
  Plus,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePortfolio } from "../context/PortfolioContext";
import { useAuthContext } from "../hooks/useAuthContext";
import { cryptoService } from "../services/cryptoService";
import { CalendarPicker } from "../components/dashboard/tabs/SpendingTab";
import { formatCurrencyAmount, getUserCurrency } from "../utils/currency";
import { C } from "../components/dashboard/dashboardShared.jsx";

// ---------------------------------------------------------------------------
// Constants & style helpers
// ---------------------------------------------------------------------------

const buttonReset = {
  border: "none",
  background: "transparent",
  padding: 0,
  margin: 0,
  font: "inherit",
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--border-default)",
  background: "var(--bg-input, var(--bg-secondary))",
  color: "var(--text-primary)",
  fontSize: 13,
  lineHeight: 1.4,
  outline: "none",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  background: "var(--text-primary)",
  color: "var(--bg-card)",
  border: "1px solid transparent",
  padding: "8px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 500,
  fontSize: 13,
  lineHeight: 1.4,
  whiteSpace: "nowrap",
};

const secondaryButtonStyle = {
  background: "transparent",
  color: "var(--text-primary)",
  border: "1px solid var(--border-default)",
  padding: "8px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  lineHeight: 1.4,
  whiteSpace: "nowrap",
};

const sectionLabelStyle = {
  fontSize: 11,
  color: "var(--text-muted)",
  marginBottom: 0,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

// ---------------------------------------------------------------------------
// Equity grant types
// ---------------------------------------------------------------------------
const grantTypeOptions = [
  {
    value: "STOCK_OPTION",
    label: "Stock Option",
    labelEn: "Employee option",
    badge: "SAT 35",
    badgeColor: "#2196f3",
    badgeBg: "rgba(33,150,243,0.10)",
    description:
      "Employee stock options granting the right to purchase shares at a fixed strike price. Taxed at exercise under SAT Circular 35 using the 12-month spread preferential IIT method.",
  },
  {
    value: "RSU",
    label: "RSU",
    labelEn: "Restricted stock unit",
    badge: "Vest tax",
    badgeColor: "#9c27b0",
    badgeBg: "rgba(156,39,176,0.10)",
    description:
      "Restricted Stock Units that vest over time. Taxed as employment income at each vest event. Common in VIE-structured and overseas-listed Chinese companies.",
  },
  {
    value: "RESTRICTED_SHARE",
    label: "Restricted Share",
    labelEn: "Restricted stock",
    badge: "CSRC",
    badgeColor: "#f59e0b",
    badgeBg: "rgba(245,158,11,0.10)",
    description:
      "Actual shares transferred to the employee at grant but subject to a vesting / lock-up schedule. Regulated by CSRC Measures for Equity Incentives of Listed Companies.",
  },
  {
    value: "ESOP",
    label: "ESOP",
    labelEn: "Employee share plan",
    badge: "Trust / plan",
    badgeColor: "#f97316",
    badgeBg: "rgba(249,115,22,0.10)",
    description:
      "Employee Share Ownership Plan. Governed by CSRC Guiding Opinions on ESOP (2014). Shares are held collectively through an asset management plan or trust.",
  },
];

// ---------------------------------------------------------------------------
// Company structure options
// ---------------------------------------------------------------------------
const companyStructureOptions = [
  { value: "a_share", label: "A-share listed" },
  { value: "hk_listed", label: "Hong Kong listed" },
  { value: "us_listed", label: "US / overseas listed" },
  { value: "vie", label: "VIE / Red-chip structure" },
  { value: "private", label: "Private / pre-IPO" },
];

// ---------------------------------------------------------------------------
// Vesting schedule options
// ---------------------------------------------------------------------------
const vestingScheduleOptions = [
  { value: "immediate", label: "Immediate" },
  { value: "monthly_24_12", label: "1/24 monthly, 12-month cliff" },
  { value: "monthly_36_12", label: "1/36 monthly, 12-month cliff" },
  { value: "monthly_36_24", label: "1/36 monthly, 24-month cliff" },
  { value: "monthly_48_12", label: "1/48 monthly, 12-month cliff" },
  { value: "monthly_48_24", label: "1/48 monthly, 24-month cliff" },
  { value: "annual_3yr", label: "Annual over 3 years" },
  { value: "annual_4yr", label: "Annual over 4 years" },
];

const lockupPeriodOptions = [
  { value: "none", label: "None / already unlocked" },
  { value: "12", label: "12 months" },
  { value: "24", label: "24 months" },
  { value: "36", label: "36 months" },
  { value: "custom", label: "Custom" },
];

const safeStatusOptions = [
  { value: "not_required", label: "Not required" },
  { value: "pending", label: "Pending filing" },
  { value: "filed", label: "Filed" },
  { value: "expired", label: "Expired - renewal needed" },
];

// IIT brackets
const IIT_BRACKETS = [
  { limit: 3000, rate: 0.03, deduction: 0 },
  { limit: 12000, rate: 0.1, deduction: 210 },
  { limit: 25000, rate: 0.2, deduction: 1410 },
  { limit: 35000, rate: 0.25, deduction: 2660 },
  { limit: 55000, rate: 0.3, deduction: 4410 },
  { limit: 80000, rate: 0.35, deduction: 7160 },
  { limit: Infinity, rate: 0.45, deduction: 15160 },
];

function calcSATTax(spread) {
  if (!spread || spread <= 0) return 0;
  const monthly = spread / 12;
  const bracket =
    IIT_BRACKETS.find((b) => monthly <= b.limit) ||
    IIT_BRACKETS[IIT_BRACKETS.length - 1];
  return (monthly * bracket.rate - bracket.deduction) * 12;
}

// ---------------------------------------------------------------------------
// Blank grant state
// ---------------------------------------------------------------------------
const blankGrant = {
  _id: null,
  name: "",
  ticker: "",
  companyStructure: "private",
  fairMarketValue: "",
  currentPrice: "",
  fxRateAtGrant: "",
  fxRateAtVest: "",
  fxRateAtExercise: "",
  grantType: "STOCK_OPTION",
  grantId: "",
  quantity: "",
  vestedQuantity: "",
  buyPrice: "",
  fmvAtExercise: "",
  buyDate: new Date().toISOString().slice(0, 10),
  expirationDate: "",
  postTerminationWindow: "90",
  exercised: "",
  hasVestingSchedule: true,
  vestingSchedule: "monthly_48_12",
  vestingStartDate: "",
  cliffMonths: "12",
  safeFilingStatus: "not_required",
  safeFilingDeadline: "",
  lockupPeriod: "none",
  lockupExpiry: "",
  iitPreferentialMethod: true,
  salePrice: "",
  includeInNetWorth: true,
  notes: "",
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildCompanyKey(asset) {
  return `${String(asset?.ticker || "").trim().toUpperCase()}::${String(
    asset?.name || ""
  )
    .trim()
    .toLowerCase()}`;
}

function getGrantTypeMeta(type) {
  return grantTypeOptions.find((g) => g.value === type) || grantTypeOptions[0];
}

function getScheduleLabel(value) {
  return (
    vestingScheduleOptions.find((o) => o.value === value)?.label || "Immediate"
  );
}

function getStructureLabel(value) {
  return companyStructureOptions.find((o) => o.value === value)?.label || value;
}

function formatShareCount(value, maximumFractionDigits = 0) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function safeDate(value, fallback = new Date()) {
  if (!value)
    return fallback instanceof Date ? fallback : new Date(fallback);
  const d = new Date(value);
  return isNaN(d.getTime())
    ? fallback instanceof Date
      ? fallback
      : new Date(fallback)
    : d;
}

function startOfMonth(dateLike) {
  const date = safeDate(dateLike);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(dateLike, months) {
  const date = safeDate(dateLike);
  return new Date(
    date.getFullYear(),
    date.getMonth() + months,
    date.getDate()
  );
}

function getMonthsDiff(fromDate, toDate) {
  const start = safeDate(fromDate);
  const end = safeDate(toDate);
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

function getGrantSharePrice(grant) {
  const quantity = asNumber(grant.quantity);
  const perShareFromValue =
    quantity > 0 ? asNumber(grant.currentValue) / quantity : 0;
  return (
    asNumber(grant.currentPrice) ||
    asNumber(grant.fairMarketValue) ||
    perShareFromValue ||
    asNumber(grant.buyPrice)
  );
}

function getGrantValuePerShare(grant, price) {
  const p = price !== undefined ? price : getGrantSharePrice(grant);
  if (grant.grantType === "STOCK_OPTION") {
    return Math.max(0, p - asNumber(grant.buyPrice));
  }
  return p;
}

function parseVestingSchedule(grant) {
  const schedule = String(grant.vestingSchedule || "immediate");
  if (!grant.hasVestingSchedule || schedule === "immediate") {
    return { kind: "immediate", totalMonths: 0, cliffMonths: 0 };
  }
  const monthlyMatch = schedule.match(/^monthly_(\d+)_(\d+)$/);
  if (monthlyMatch) {
    return {
      kind: "monthly",
      totalMonths: Number(monthlyMatch[1]) || 48,
      cliffMonths: Number(monthlyMatch[2]) || 12,
    };
  }
  const annualMatch = schedule.match(/^annual_(\d+)yr$/);
  if (annualMatch) {
    const years = Number(annualMatch[1]) || 4;
    return { kind: "annual", totalMonths: years * 12, cliffMonths: 12 };
  }
  return { kind: "immediate", totalMonths: 0, cliffMonths: 0 };
}

function getGrantFullyVestedDate(grant) {
  const startDate = grant.vestingStartDate
    ? safeDate(grant.vestingStartDate)
    : safeDate(grant.buyDate || Date.now());
  const schedule = parseVestingSchedule(grant);
  if (schedule.kind === "immediate") return startDate;
  return addMonths(startDate, schedule.totalMonths);
}

function getGrantVestedSharesAtDate(grant, dateLike) {
  const quantity = asNumber(grant.quantity);
  if (quantity <= 0) return 0;
  const date = safeDate(dateLike);
  const grantDate = safeDate(grant.buyDate || Date.now());
  if (date < grantDate) return 0;
  const explicitVested = asNumber(grant.vestedQuantity);
  const schedule = parseVestingSchedule(grant);
  if (schedule.kind === "immediate") {
    return explicitVested > 0 ? Math.min(quantity, explicitVested) : quantity;
  }
  const vestStartDate = grant.vestingStartDate
    ? safeDate(grant.vestingStartDate)
    : grantDate;
  if (date < vestStartDate) return 0;
  const monthsElapsed = getMonthsDiff(vestStartDate, date) + 1;
  if (schedule.kind === "monthly") {
    if (monthsElapsed < schedule.cliffMonths) return 0;
    const vestedMonths = Math.min(schedule.totalMonths, monthsElapsed);
    return Math.min(quantity, (quantity * vestedMonths) / schedule.totalMonths);
  }
  if (schedule.kind === "annual") {
    const vestedYears = Math.min(
      schedule.totalMonths / 12,
      Math.floor(monthsElapsed / 12)
    );
    return Math.min(
      quantity,
      (quantity * vestedYears * 12) / schedule.totalMonths
    );
  }
  return explicitVested > 0 ? Math.min(quantity, explicitVested) : quantity;
}

function buildDurationLabel(targetDate) {
  if (!targetDate) return "All vested";
  const today = new Date();
  const end = new Date(targetDate);
  if (end <= today) return "All vested";
  const totalMonths = getMonthsDiff(today, end);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  return parts.length ? parts.join(" ") : "< 1 month";
}

// ---------------------------------------------------------------------------
// Shared UI shells
// ---------------------------------------------------------------------------
function ModalShell({ children, onClose, width = 700 }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 220,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        className="modal-scroll"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: `min(${width}px, calc(100vw - 24px))`,
          maxHeight: "min(92vh, 860px)",
          display: "flex",
          flexDirection: "column",
          borderRadius: 16,
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, sublabel, children }) {
  return (
    <label style={{ display: "grid", gap: 5 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {label}
        {sublabel && (
          <span
            style={{
              fontWeight: 400,
              color: "var(--text-muted)",
              fontSize: 11,
            }}
          >
            {sublabel}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}
    >
      <span style={sectionLabelStyle}>{title}</span>
      <button
        type="button"
        onClick={onClose}
        style={{
          ...buttonReset,
          color: "var(--text-muted)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 6,
          transition: "background 0.15s",
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

function ModalFooter({ children, onClose, onBack, showBack = false }) {
  return (
    <div
      style={{
        padding: "12px 18px",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        flexShrink: 0,
        background: "var(--bg-card)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-muted)",
          fontSize: 11.5,
          lineHeight: 1.4,
        }}
      >
        <Lock size={13} style={{ flexShrink: 0 }} />
        <span>Encrypted and secure.</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {showBack && (
          <button type="button" onClick={onBack} style={secondaryButtonStyle}>
            Back
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

function InfoBadge({ text, variant = "info" }) {
  const colors = {
    info: {
      bg: "var(--info-bg, rgba(33,150,243,0.06))",
      border: "var(--info-border, rgba(33,150,243,0.18))",
      icon: "var(--info-icon, #2196f3)",
    },
    warning: {
      bg: "rgba(245,158,11,0.06)",
      border: "rgba(245,158,11,0.20)",
      icon: "#f59e0b",
    },
    danger: {
      bg: "rgba(239,68,68,0.06)",
      border: "rgba(239,68,68,0.20)",
      icon: "#ef4444",
    },
  };
  const c = colors[variant] || colors.info;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "9px 12px",
        borderRadius: 8,
        background: c.bg,
        border: `1px solid ${c.border}`,
        marginTop: 10,
      }}
    >
      <AlertCircle
        size={13}
        style={{ color: c.icon, marginTop: 1, flexShrink: 0 }}
      />
      <span
        style={{ fontSize: 12, lineHeight: 1.55, color: "var(--text-secondary)" }}
      >
        {text}
      </span>
    </div>
  );
}

// Radio-style option row
function RadioOption({ selected, onClick, label, description }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...buttonReset,
        width: "100%",
        border: `1px solid ${
          selected ? "var(--border-active, var(--text-primary))" : "var(--border-subtle)"
        }`,
        borderRadius: 10,
        padding: "13px 16px",
        cursor: "pointer",
        textAlign: "left",
        background: selected
          ? "var(--bg-selected, rgba(0,0,0,0.03))"
          : "transparent",
        display: "grid",
        gridTemplateColumns: "20px 1fr",
        gap: 12,
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `2px solid ${
            selected ? "var(--text-primary)" : "var(--border-default)"
          }`,
          marginTop: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "border-color 0.15s",
        }}
      >
        {selected && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--text-primary)",
            }}
          />
        )}
      </div>
      <div>{label}</div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Grant type selection modal
// ---------------------------------------------------------------------------
function GrantTypeModal({ selectedType, onSelect, onClose, onNext }) {
  return (
    <ModalShell onClose={onClose} width={620}>
      <ModalHeader title="Select Grant Type" onClose={onClose} />
      <div
        className="modal-scroll"
        style={{ padding: "16px 18px", flex: 1, minHeight: 0, overflowY: "auto" }}
      >
        <InfoBadge text="Select the grant type that matches your equity compensation. Tax treatment varies by type under Chinese and international regulations." />
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          {grantTypeOptions.map((option) => {
            const active = selectedType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
                style={{
                  ...buttonReset,
                  width: "100%",
                  border: `1px solid ${
                    active ? "var(--text-primary)" : "var(--border-subtle)"
                  }`,
                  borderRadius: 10,
                  padding: "13px 16px",
                  cursor: "pointer",
                  textAlign: "left",
                  background: active
                    ? "var(--bg-selected, rgba(0,0,0,0.03))"
                    : "transparent",
                  display: "grid",
                  gridTemplateColumns: "20px 1fr",
                  gap: 12,
                  transition: "border-color 0.15s",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: `2px solid ${
                      active ? "var(--text-primary)" : "var(--border-default)"
                    }`,
                    marginTop: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {active && (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--text-primary)",
                      }}
                    />
                  )}
                </div>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                      }}
                    >
                      {option.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                      }}
                    >
                      {option.labelEn}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: option.badgeColor,
                        background: option.badgeBg,
                        borderRadius: 999,
                        padding: "2px 7px",
                      }}
                    >
                      {option.badge}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      lineHeight: 1.55,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {option.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <ModalFooter onClose={onClose}>
        <button
          type="button"
          onClick={onNext}
          style={{ ...primaryButtonStyle, minWidth: 80 }}
        >
          Next
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Company structure modal
// ---------------------------------------------------------------------------
function CompanyStructureModal({ companyStructure, onSelect, onClose, onNext }) {
  return (
    <ModalShell onClose={onClose} width={560}>
      <ModalHeader title="Company Structure" onClose={onClose} />
      <div
        className="modal-scroll"
        style={{ padding: "16px 18px", flex: 1, minHeight: 0, overflowY: "auto" }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--text-primary)",
            lineHeight: 1.5,
          }}
        >
          What is the company&apos;s listing structure?
        </p>
        <InfoBadge text="VIE / Red-chip structures may require SAFE filing for employees holding equity in offshore entities." />
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
          {companyStructureOptions.map((choice) => (
            <button
              key={choice.value}
              type="button"
              onClick={() => onSelect(choice.value)}
              style={{
                ...buttonReset,
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                color: "var(--text-primary)",
                fontSize: 13,
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${
                  companyStructure === choice.value
                    ? "var(--text-primary)"
                    : "var(--border-subtle)"
                }`,
                background:
                  companyStructure === choice.value
                    ? "var(--bg-selected, rgba(0,0,0,0.03))"
                    : "transparent",
                transition: "border-color 0.15s",
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: `2px solid ${
                    companyStructure === choice.value
                      ? "var(--text-primary)"
                      : "var(--border-default)"
                  }`,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {companyStructure === choice.value && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--text-primary)",
                    }}
                  />
                )}
              </span>
              {choice.label}
            </button>
          ))}
        </div>
      </div>
      <ModalFooter onClose={onClose}>
        <button
          type="button"
          onClick={onNext}
          style={{ ...primaryButtonStyle, minWidth: 80 }}
        >
          Next
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Company info modal
// ---------------------------------------------------------------------------
function CompanyInfoModal({
  form,
  setForm,
  onClose,
  onBack,
  onNext,
  saving,
  currency,
}) {
  return (
    <ModalShell onClose={onClose} width={580}>
      <ModalHeader title="Company Info" onClose={onClose} />
      <div
        className="modal-scroll"
        style={{ padding: "16px 18px", flex: 1, minHeight: 0, overflowY: "auto" }}
      >
        <div style={{ display: "grid", gap: 14 }}>
          <Field label="Company name">
            <input
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              placeholder="e.g. ByteDance"
              style={inputStyle}
            />
          </Field>
          <Field label="Stock ticker">
            <input
              value={form.ticker}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  ticker: e.target.value.toUpperCase(),
                }))
              }
              placeholder="e.g. 0700.HK or BABA"
              style={inputStyle}
            />
          </Field>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            <Field label={`Latest valuation / FMV per share (${currency})`}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.fairMarketValue}
                onChange={(e) =>
                  setForm((c) => ({ ...c, fairMarketValue: e.target.value }))
                }
                placeholder="0.00"
                style={inputStyle}
              />
            </Field>
            <Field label="Current market price per share">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.currentPrice}
                onChange={(e) =>
                  setForm((c) => ({ ...c, currentPrice: e.target.value }))
                }
                placeholder="0.00"
                style={inputStyle}
              />
            </Field>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 11.5,
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            All monetary values should be entered in the dashboard currency
            unless your company&apos;s equity plan specifies a foreign currency.
          </p>
        </div>
      </div>
      <ModalFooter onClose={onClose} onBack={onBack} showBack>
        <button
          type="button"
          disabled={saving}
          onClick={onNext}
          style={{ ...primaryButtonStyle, minWidth: 80, opacity: saving ? 0.7 : 1 }}
        >
          Next
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

function DateField({ label, value, onChange, minDate, hint }) {
  return (
    <Field label={label}>
      <div style={{ display: "grid", gap: 4 }}>
        <CalendarPicker C={C} value={value} onChange={onChange} minDate={minDate} />
        {hint && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{hint}</div>
        )}
      </div>
    </Field>
  );
}

// Reusable select wrapper
function SelectField({ value, onChange, options, placeholder }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={onChange}
        style={{
          ...inputStyle,
          appearance: "none",
          paddingRight: 36,
          cursor: "pointer",
        }}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-muted)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add grant modal (simplified for new grants)
// ---------------------------------------------------------------------------
function AddGrantDetailsModal({
  title,
  form,
  setForm,
  onClose,
  onBack,
  onSubmit,
  saving,
  currency,
}) {
  const gt = form.grantType;

  const GRANT_BADGE = {
    STOCK_OPTION: { label: "ISO", badgeText: "Incentive Stock Option", color: "#0ea5e9" },
    RSU: { label: "RSU", badgeText: "Restricted Stock Unit", color: "#d946ef" },
    NSO: { label: "NSO", badgeText: "Non-Qualified Stock Option", color: "#a3a820" },
    RESTRICTED_SHARE: { label: "SHARE", badgeText: "Generic Share", color: "#f59e0b" },
    ESOP: { label: "SHARE", badgeText: "Generic Share", color: "#f59e0b" },
  };

  const badge = GRANT_BADGE[gt] || { label: gt || "", badgeText: "", color: "var(--text-muted)" };

  const isOption = gt === "STOCK_OPTION" || gt === "NSO";
  const isRSU = gt === "RSU";
  const isRestricted = gt === "RESTRICTED_SHARE" || gt === "ESOP";

  const SectionDivider = ({ label }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 14px" }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.07em", color: "var(--text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ height: 1, flex: 1, background: "var(--border-subtle)" }} />
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 220, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, calc(100vw - 32px))", maxHeight: "82vh", display: "flex", flexDirection: "column", borderRadius: 12, background: "var(--bg-card)", border: "1px solid var(--border-default)", boxShadow: "0 14px 40px rgba(0,0,0,0.12)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>ADD SHARE DETAILS</div>
          </div>
          <button type="button" onClick={onClose} style={{ ...buttonReset, color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 6 }}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-scroll" style={{ padding: "16px", overflowY: "auto", flex: 1 }}>
          <div style={{ marginBottom: 12, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
            Adding your equity grant unlocks personalized data visualization, tax estimation, and equity strategizing
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{badge.label}</div>
            <div style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: badge.color, color: "#fff", fontWeight: 600 }}>{badge.badgeText}</div>
          </div>

          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Grant Details</div>

          {/* Grant ID + Quantity */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <Field label="Grant ID">
              <input type="text" value={form.grantId || ""} onChange={(e) => setForm((c) => ({ ...c, grantId: e.target.value }))} placeholder="EQ-2024-001" style={inputStyle} />
            </Field>
            <Field label="Quantity of shares">
              <input type="number" min="0" step="1" value={form.quantity || ""} onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))} placeholder="e.g. 10000" style={inputStyle} />
            </Field>
          </div>

          {isOption && (
            <>
              <SectionDivider label="EXERCISE" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <Field label={`Exercise (strike) price (${currency})`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>$</span>
                    <input type="number" min="0" step="0.01" value={form.buyPrice || ""} onChange={(e) => setForm((c) => ({ ...c, buyPrice: e.target.value }))} placeholder="0.00" style={inputStyle} />
                  </div>
                </Field>
                <Field label="Number of options exercised">
                  <input type="number" min="0" step="1" value={form.exercised || ""} onChange={(e) => setForm((c) => ({ ...c, exercised: e.target.value }))} placeholder="0" style={inputStyle} />
                </Field>
              </div>

              <SectionDivider label="VESTING SCHEDULE" />
              <div style={{ marginBottom: 10 }}>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-secondary)" }}>
                  Is it early exercisable? <Info size={14} title="Whether this grant is early exercisable (can be exercised prior to vesting)" style={{ verticalAlign: "middle", marginLeft: 6 }} />
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                  {[{ value: true, label: "Yes" }, { value: false, label: "No" }].map((ch) => (
                    <button key={String(ch.value)} type="button" onClick={() => setForm((c) => ({ ...c, earlyExercisable: ch.value }))} style={{ ...buttonReset, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: form.earlyExercisable === ch.value ? "var(--text-primary)" : "var(--text-primary)", fontSize: 13 }}>
                      <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${form.earlyExercisable === ch.value ? "var(--text-primary)" : "var(--border-default)" }`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{form.earlyExercisable === ch.value && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-primary)" }} />}</span>
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <Field label="Vesting start date">
                  <CalendarPicker C={C} value={form.vestingStartDate} onChange={(v) => setForm((c) => ({ ...c, vestingStartDate: v }))} />
                </Field>
                <Field label="Vesting schedule">
                  <SelectField value={form.vestingSchedule} onChange={(e) => setForm((c) => ({ ...c, vestingSchedule: e.target.value }))} options={vestingScheduleOptions} placeholder="Select schedule" />
                </Field>
              </div>
            </>
          )}

          {isRSU && (
            <>
              <SectionDivider label="VESTING SCHEDULE" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <Field label="Vesting start date">
                  <CalendarPicker C={C} value={form.vestingStartDate} onChange={(v) => setForm((c) => ({ ...c, vestingStartDate: v }))} />
                </Field>
                <Field label="Vesting schedule">
                  <SelectField value={form.vestingSchedule} onChange={(e) => setForm((c) => ({ ...c, vestingSchedule: e.target.value }))} options={vestingScheduleOptions} placeholder="Select schedule" />
                </Field>
              </div>
            </>
          )}

          {isRestricted && (
            <>
              <SectionDivider label="PURCHASE" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <Field label="Purchase date">
                  <CalendarPicker C={C} value={form.buyDate} onChange={(v) => setForm((c) => ({ ...c, buyDate: v }))} />
                </Field>
                <Field label={`Price (${currency})`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>$</span>
                    <input type="number" min="0" step="0.01" value={form.buyPrice || ""} onChange={(e) => setForm((c) => ({ ...c, buyPrice: e.target.value }))} placeholder="0.00" style={inputStyle} />
                  </div>
                </Field>
              </div>

              <SectionDivider label="VESTING SCHEDULE" />
              <div style={{ marginBottom: 10 }}>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-secondary)" }}>
                  Does it have a vesting schedule? <Info size={14} title="Whether this grant follows a vesting schedule" style={{ verticalAlign: "middle", marginLeft: 6 }} />
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                  {[{ value: true, label: "Yes" }, { value: false, label: "No" }].map((ch) => (
                    <button key={String(ch.value)} type="button" onClick={() => setForm((c) => ({ ...c, hasVestingSchedule: ch.value }))} style={{ ...buttonReset, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: form.hasVestingSchedule === ch.value ? "var(--text-primary)" : "var(--text-primary)", fontSize: 13 }}>
                      <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${form.hasVestingSchedule === ch.value ? "var(--text-primary)" : "var(--border-default)" }`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{form.hasVestingSchedule === ch.value && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-primary)" }} />}</span>
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.hasVestingSchedule && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <Field label="Vesting start date">
                    <CalendarPicker C={C} value={form.vestingStartDate} onChange={(v) => setForm((c) => ({ ...c, vestingStartDate: v }))} />
                  </Field>
                  <Field label="Vesting schedule">
                    <SelectField value={form.vestingSchedule} onChange={(e) => setForm((c) => ({ ...c, vestingSchedule: e.target.value }))} options={vestingScheduleOptions} placeholder="Select schedule" />
                  </Field>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 12 }}>
            <Lock size={14} />
            <span>Your financial information is encrypted and secure. We'll never share or sell any of your personal data. See privacy policy.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={onBack} style={{ ...secondaryButtonStyle, minWidth: 70 }}>Back</button>
            <button type="button" disabled={saving} onClick={onSubmit} style={{ ...primaryButtonStyle, minWidth: 96, opacity: saving ? 0.7 : 1 }}>{saving ? "Adding..." : "Add"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grant details modal (full edit)
// ---------------------------------------------------------------------------
function GrantDetailsModal({
  title,
  form,
  setForm,
  onClose,
  onBack,
  onSubmit,
  saving,
  currency,
}) {
  const meta = getGrantTypeMeta(form.grantType);
  const isOption = form.grantType === "STOCK_OPTION";
  const isRSU = form.grantType === "RSU";
  const isRestrictedShare = form.grantType === "RESTRICTED_SHARE";
  const isESOP = form.grantType === "ESOP";
  const hasVesting = isOption || isRSU || isRestrictedShare;
  const needsFx = ["us_listed", "hk_listed", "vie"].includes(
    form.companyStructure
  );

  const formatEquityAmount = (value, opts = {}) =>
    formatCurrencyAmount(value, currency, { maximumFractionDigits: 0, ...opts });

  const spread =
    (asNumber(form.fmvAtExercise) - asNumber(form.buyPrice)) *
    asNumber(form.exercised || 0);
  const estimatedIIT =
    form.iitPreferentialMethod ? calcSATTax(spread) : 0;

  const SectionDivider = ({ label }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "20px 0 14px",
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.07em",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div
        style={{ height: 1, flex: 1, background: "var(--border-subtle)" }}
      />
    </div>
  );

  return (
    <ModalShell onClose={onClose} width={760}>
      <ModalHeader title={title} onClose={onClose} />
      <div
        className="modal-scroll"
        style={{ padding: "16px 18px 20px", overflowY: "auto", flex: 1 }}
      >
        {/* Grant type badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
            padding: "9px 12px",
            borderRadius: 8,
            background: "var(--bg-secondary, rgba(0,0,0,0.03))",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            {meta.label}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            {meta.labelEn}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: meta.badgeColor,
              background: meta.badgeBg,
              borderRadius: 999,
              padding: "2px 7px",
            }}
          >
            {meta.badge}
          </span>
        </div>

        <SectionDivider label="Grant Details" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          <Field label="Grant ID">
            <input
              value={form.grantId}
              onChange={(e) =>
                setForm((c) => ({ ...c, grantId: e.target.value }))
              }
              placeholder="e.g. EQ-2024-001"
              style={inputStyle}
            />
          </Field>
          <Field
            label={isOption ? "Number of options" : "Number of shares"}
          >
            <input
              type="number"
              min="0"
              step="1"
              value={form.quantity}
              onChange={(e) =>
                setForm((c) => ({ ...c, quantity: e.target.value }))
              }
              placeholder="Quantity"
              style={inputStyle}
            />
          </Field>
          <Field label="Vested quantity">
            <input
              type="number"
              min="0"
              step="1"
              value={form.vestedQuantity}
              onChange={(e) => {
                const v = asNumber(e.target.value);
                if (v > asNumber(form.quantity))
                  return toast.error(
                    "Vested quantity cannot exceed total quantity."
                  );
                setForm((c) => ({ ...c, vestedQuantity: e.target.value }));
              }}
              placeholder="0"
              style={inputStyle}
            />
          </Field>
          {(isOption || isRestrictedShare) && (
            <Field label="Exercised shares">
              <input
                type="number"
                min="0"
                step="1"
                value={form.exercised}
                onChange={(e) => {
                  const v = asNumber(e.target.value);
                  if (v > asNumber(form.vestedQuantity || form.quantity))
                    return toast.error(
                      "Exercised cannot exceed vested quantity."
                    );
                  setForm((c) => ({ ...c, exercised: e.target.value }));
                }}
                placeholder="0"
                style={inputStyle}
              />
            </Field>
          )}
        </div>

        <SectionDivider
          label={isOption ? "Option Terms" : "Share Terms"}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          <Field
            label={
              isOption
                ? `Strike price (${currency})`
                : isRSU
                ? `Grant date FMV (${currency})`
                : `Purchase price (${currency})`
            }
          >
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.buyPrice}
              onChange={(e) =>
                setForm((c) => ({ ...c, buyPrice: e.target.value }))
              }
              placeholder="0.00"
              style={inputStyle}
            />
          </Field>
          <DateField
            label={isOption ? "Grant date" : "Grant / purchase date"}
            value={form.buyDate}
            onChange={(value) =>
              setForm((c) => ({ ...c, buyDate: value }))
            }
          />
          {isOption && (
            <>
              <DateField
                label="Expiration date"
                value={form.expirationDate || ""}
                onChange={(value) =>
                  setForm((c) => ({ ...c, expirationDate: value }))
                }
                minDate={form.buyDate}
              />
              <Field label="Post-termination window (days)">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.postTerminationWindow}
                  onChange={(e) =>
                    setForm((c) => ({
                      ...c,
                      postTerminationWindow: e.target.value,
                    }))
                  }
                  placeholder="90"
                  style={inputStyle}
                />
              </Field>
            </>
          )}
        </div>

        {needsFx && (
          <>
            <SectionDivider label="Exchange Rate" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
              }}
            >
              <Field label="Exchange rate at grant date">
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={form.fxRateAtGrant}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, fxRateAtGrant: e.target.value }))
                  }
                  placeholder="e.g. 7.24"
                  style={inputStyle}
                />
              </Field>
            </div>
          </>
        )}

        {isOption && (
          <>
            <SectionDivider label="IIT Calculation (SAT Circular 35)" />
            <InfoBadge text="Under SAT Circular 35, IIT on stock option income = (FMV at exercise − strike price) × shares exercised, taxed using the 12-month spread preferential method." />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
                marginTop: 14,
              }}
            >
              <Field label={`FMV per share at exercise (${currency})`}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.fmvAtExercise}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, fmvAtExercise: e.target.value }))
                  }
                  placeholder="0.00"
                  style={inputStyle}
                />
              </Field>
              {needsFx && (
                <Field label="Exchange rate at exercise date">
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={form.fxRateAtExercise}
                    onChange={(e) =>
                      setForm((c) => ({
                        ...c,
                        fxRateAtExercise: e.target.value,
                      }))
                    }
                    placeholder="e.g. 7.24"
                    style={inputStyle}
                  />
                </Field>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() =>
                  setForm((c) => ({
                    ...c,
                    iitPreferentialMethod: !c.iitPreferentialMethod,
                  }))
                }
                style={{
                  ...buttonReset,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  color: "var(--text-primary)",
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: `2px solid ${
                      form.iitPreferentialMethod
                        ? "var(--text-primary)"
                        : "var(--border-default)"
                    }`,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {form.iitPreferentialMethod && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: "var(--text-primary)",
                      }}
                    />
                  )}
                </span>
                Use SAT Circular 35 preferential 12-month spread method
              </button>
            </div>
            {spread > 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "rgba(33,150,243,0.05)",
                  border: "1px solid rgba(33,150,243,0.15)",
                }}
              >
                <div
                  style={{ fontSize: 11, color: "var(--text-muted)" }}
                >
                  Estimated IIT on exercise (pre-deductions)
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {formatEquityAmount(estimatedIIT)}
                </div>
                <div
                  style={{ marginTop: 3, fontSize: 11, color: "var(--text-muted)" }}
                >
                  Spread: {formatEquityAmount(spread)} · Consult a tax advisor
                  for final figures.
                </div>
              </div>
            )}
          </>
        )}

        {isRSU && needsFx && (
          <>
            <SectionDivider label="RSU Tax — Vest Date FX" />
            <InfoBadge text="RSU income is taxed at vest. For overseas-listed companies, record the exchange rate at each vest event for IIT calculation." />
            <div style={{ marginTop: 14 }}>
              <Field label="Exchange rate at vest date">
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={form.fxRateAtVest}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, fxRateAtVest: e.target.value }))
                  }
                  placeholder="e.g. 7.24"
                  style={inputStyle}
                />
              </Field>
            </div>
          </>
        )}

        {hasVesting && (
          <>
            <SectionDivider label="Vesting Schedule" />
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { value: true, label: "Has vesting schedule" },
                { value: false, label: "No schedule" },
              ].map((choice) => (
                <button
                  key={String(choice.value)}
                  type="button"
                  onClick={() =>
                    setForm((c) => ({
                      ...c,
                      hasVestingSchedule: choice.value,
                    }))
                  }
                  style={{
                    ...buttonReset,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    color: "var(--text-primary)",
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: `2px solid ${
                        form.hasVestingSchedule === choice.value
                          ? "var(--text-primary)"
                          : "var(--border-default)"
                      }`,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {form.hasVestingSchedule === choice.value && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--text-primary)",
                        }}
                      />
                    )}
                  </span>
                  {choice.label}
                </button>
              ))}
            </div>
            {form.hasVestingSchedule && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 14,
                  marginTop: 14,
                }}
              >
                <Field label="Vesting schedule">
                  <SelectField
                    value={form.vestingSchedule}
                    onChange={(e) =>
                      setForm((c) => ({
                        ...c,
                        vestingSchedule: e.target.value,
                      }))
                    }
                    options={vestingScheduleOptions}
                  />
                </Field>
                <DateField
                  label="Vesting start date"
                  value={form.vestingStartDate}
                  onChange={(value) =>
                    setForm((c) => ({ ...c, vestingStartDate: value }))
                  }
                  minDate={form.buyDate}
                />
                <Field label="Cliff period (months)">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.cliffMonths}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, cliffMonths: e.target.value }))
                    }
                    placeholder="e.g. 12"
                    style={inputStyle}
                  />
                </Field>
              </div>
            )}
          </>
        )}

        {(isRestrictedShare || isRSU || isESOP) && (
          <>
            <SectionDivider
              label={
                isESOP ? "ESOP Lock-up & Trust Details" : "CSRC Post-IPO Lock-up"
              }
            />
            <InfoBadge
              text={
                isESOP
                  ? "Under CSRC Guiding Opinions on ESOP (2014), shares are held via an asset management plan or trust."
                  : "CSRC requires a mandatory post-IPO lock-up. Employees: 12 months. Core management/founders: 36 months."
              }
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
                marginTop: 14,
              }}
            >
              <Field label="Lock-up period">
                <SelectField
                  value={form.lockupPeriod}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, lockupPeriod: e.target.value }))
                  }
                  options={lockupPeriodOptions}
                />
              </Field>
              <DateField
                label="Lock-up expiry date"
                value={form.lockupExpiry || ""}
                onChange={(value) =>
                  setForm((c) => ({ ...c, lockupExpiry: value }))
                }
              />
            </div>
          </>
        )}

        {["us_listed", "hk_listed", "vie"].includes(form.companyStructure) && (
          <>
            <SectionDivider label="SAFE Filing Status" />
            <InfoBadge text="Chinese employees holding equity in offshore entities must register with SAFE (State Administration of Foreign Exchange) under Circular 7." />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
                marginTop: 14,
              }}
            >
              <Field label="SAFE filing status">
                <SelectField
                  value={form.safeFilingStatus}
                  onChange={(e) =>
                    setForm((c) => ({
                      ...c,
                      safeFilingStatus: e.target.value,
                    }))
                  }
                  options={safeStatusOptions}
                />
              </Field>
              <DateField
                label="SAFE filing / renewal deadline"
                value={form.safeFilingDeadline || ""}
                onChange={(value) =>
                  setForm((c) => ({ ...c, safeFilingDeadline: value }))
                }
                hint="optional"
              />
            </div>
          </>
        )}

        <SectionDivider label="Realisation & Net Worth" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          <Field label={`Sale price per share (${currency})`} sublabel="if sold">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.salePrice || ""}
              onChange={(e) =>
                setForm((c) => ({ ...c, salePrice: e.target.value }))
              }
              placeholder="0.00"
              style={inputStyle}
            />
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={() =>
              setForm((c) => ({
                ...c,
                includeInNetWorth: !c.includeInNetWorth,
              }))
            }
            style={{
              ...buttonReset,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              color: "var(--text-primary)",
              fontSize: 13,
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: `2px solid ${
                  form.includeInNetWorth
                    ? "var(--text-primary)"
                    : "var(--border-default)"
                }`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {form.includeInNetWorth && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: "var(--text-primary)",
                  }}
                />
              )}
            </span>
            Include in net worth calculation
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((c) => ({ ...c, notes: e.target.value }))
              }
              rows={2}
              placeholder="Any additional details..."
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: 60,
              }}
            />
          </Field>
        </div>
      </div>

      <ModalFooter onClose={onClose} onBack={onBack} showBack>
        <button
          type="button"
          disabled={saving}
          onClick={onSubmit}
          style={{ ...primaryButtonStyle, minWidth: 100, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Value estimate sidebar
// ---------------------------------------------------------------------------
function ValueEstimateSidebar({ company, grants, currency, onClose }) {
  const formatEquityAmount = (value, opts = {}) =>
    formatCurrencyAmount(value, currency, { maximumFractionDigits: 0, ...opts });

  const groups = grantTypeOptions
    .map((type) => ({
      ...type,
      grants: grants.filter((g) => g.grantType === type.value),
    }))
    .filter((g) => g.grants.length > 0);

  const totalEstimated = grants.reduce(
    (sum, g) => sum + getGrantValuePerShare(g) * asNumber(g.quantity),
    0
  );
  const [openGroup, setOpenGroup] = useState(groups[0]?.value || null);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 240,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          bottom: 12,
          width: "min(420px, calc(100vw - 24px))",
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span style={sectionLabelStyle}>Value Estimate</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              ...buttonReset,
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="modal-scroll"
          style={{ flex: 1, overflowY: "auto", padding: "16px 18px 22px" }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            Net equity value estimate (pre-IIT)
          </p>
          <InfoBadge text="This estimate does not deduct IIT. Equity income is subject to IIT under SAT Circular 35. Consult a qualified tax advisor for post-tax figures." />

          <div style={{ marginTop: 20, display: "grid", gap: 14 }}>
            {groups.map((group) => (
              <div key={group.value}>
                <div
                  style={{
                    ...sectionLabelStyle,
                    marginBottom: 8,
                    color: group.badgeColor,
                  }}
                >
                  {group.label}
                </div>
                <div
                  style={{
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroup((c) =>
                        c === group.value ? null : group.value
                      )
                    }
                    style={{
                      ...buttonReset,
                      width: "100%",
                      padding: "13px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      color: "var(--text-primary)",
                      fontSize: 13,
                      background: "transparent",
                    }}
                  >
                    <span>
                      {company.name}{" "}
                      {new Date(
                        group.grants[0].buyDate || Date.now()
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {formatEquityAmount(
                          group.grants.reduce(
                            (s, g) =>
                              s +
                              getGrantValuePerShare(g) * asNumber(g.quantity),
                            0
                          )
                        )}
                      </span>
                      <ChevronDown
                        size={14}
                        style={{
                          transform:
                            openGroup === group.value
                              ? "rotate(180deg)"
                              : "none",
                          transition: "transform 0.2s",
                        }}
                      />
                    </span>
                  </button>
                  {openGroup === group.value && (
                    <div
                      style={{
                        padding: "0 16px 14px",
                        borderTop: "1px solid var(--border-subtle)",
                      }}
                    >
                      {group.grants.map((grant) => (
                        <div
                          key={grant._id}
                          style={{
                            marginTop: 12,
                            background:
                              "var(--bg-secondary, rgba(0,0,0,0.02))",
                            borderRadius: 10,
                            padding: "11px 12px",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "0.7fr 14px 0.7fr 14px 0.7fr",
                              gap: 4,
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 16,
                                  fontWeight: 500,
                                  color: "var(--text-primary)",
                                }}
                              >
                                {grant.quantity}
                              </div>
                              <div
                                style={{
                                  marginTop: 2,
                                  fontSize: 10,
                                  color: "var(--text-muted)",
                                }}
                              >
                                Shares
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: "var(--text-muted)",
                                textAlign: "center",
                              }}
                            >
                              ×
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 500,
                                  color: "var(--text-primary)",
                                }}
                              >
                                {formatEquityAmount(
                                  grant.currentPrice ||
                                    company.latestSharePrice ||
                                    0
                                )}
                              </div>
                              <div
                                style={{
                                  marginTop: 2,
                                  fontSize: 10,
                                  color: "var(--text-muted)",
                                }}
                              >
                                Price
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: "var(--text-muted)",
                                textAlign: "center",
                              }}
                            >
                              −
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 500,
                                  color: "var(--text-primary)",
                                }}
                              >
                                {formatEquityAmount(grant.buyPrice || 0)}
                              </div>
                              <div
                                style={{
                                  marginTop: 2,
                                  fontSize: 10,
                                  color: "var(--text-muted)",
                                }}
                              >
                                Strike
                              </div>
                            </div>
                          </div>
                          {grant.grantType === "STOCK_OPTION" &&
                            asNumber(grant.fmvAtExercise) > 0 && (
                              <div
                                style={{
                                  marginTop: 8,
                                  padding: "5px 9px",
                                  borderRadius: 6,
                                  background: "rgba(239,68,68,0.06)",
                                  fontSize: 11,
                                  color: "var(--text-secondary)",
                                }}
                              >
                                Est. IIT (SAT Circular 35):{" "}
                                {formatEquityAmount(
                                  calcSATTax(
                                    (asNumber(grant.fmvAtExercise) -
                                      asNumber(grant.buyPrice)) *
                                      asNumber(grant.exercised || 0)
                                  )
                                )}
                              </div>
                            )}
                          {grant.safeFilingStatus === "pending" && (
                            <div
                              style={{
                                marginTop: 6,
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: 11,
                                color: "#f59e0b",
                              }}
                            >
                              <AlertCircle size={11} /> SAFE filing pending
                            </div>
                          )}
                          {grant.safeFilingStatus === "expired" && (
                            <div
                              style={{
                                marginTop: 6,
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: 11,
                                color: "#ef4444",
                              }}
                            >
                              <AlertCircle size={11} /> SAFE registration
                              expired
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div
            style={{
              marginTop: 20,
              padding: "14px 16px",
              borderRadius: 12,
              background:
                "var(--bg-accent-subtle, rgba(33,150,243,0.06))",
              border:
                "1px solid var(--border-accent, rgba(33,150,243,0.15))",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                ...sectionLabelStyle,
                color: "var(--text-muted)",
              }}
            >
              Total equity (pre-IIT)
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: "var(--text-primary)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatEquityAmount(totalEstimated)}
            </div>
            <div
              style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}
            >
              IIT deducted separately per grant event under SAT Circular 35.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insight cards
// ---------------------------------------------------------------------------
function InsightCard({ title, value, detail, tint, icon: Icon = Info }) {
  return (
    <div
      style={{
        minWidth: 210,
        maxWidth: 240,
        border: "1px solid var(--border-subtle)",
        borderRadius: 12,
        padding: "14px",
        background: "var(--bg-card)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 8px",
          borderRadius: 999,
          background: tint.bg,
          color: tint.fg,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        <Icon size={11} />
        {title}
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: 16,
          fontWeight: 600,
          color: "var(--text-primary)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          lineHeight: 1.5,
          color: "var(--text-secondary)",
        }}
      >
        {detail}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vesting chart tooltip
// ---------------------------------------------------------------------------
function EquityVestingTooltip({ active, payload, formatEquityAmount }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div
      style={{
        minWidth: 240,
        borderRadius: 12,
        border: "1px solid var(--border-default)",
        background: "var(--bg-card)",
        color: "var(--text-primary)",
        padding: "12px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          marginBottom: 8,
          color: "var(--text-primary)",
        }}
      >
        {row.date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: 8,
            fontSize: 11,
            color: "var(--text-muted)",
            fontWeight: 500,
          }}
        >
          <span>Grant</span>
          <span>New</span>
          <span>Value</span>
        </div>
        {row.rows
          .filter((g) => g.newShares > 0)
          .map((grant) => (
            <div
              key={grant.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 8,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-primary)",
                  lineHeight: 1.4,
                }}
              >
                {grant.name}
                <div
                  style={{
                    marginTop: 1,
                    fontSize: 10,
                    color: "var(--text-muted)",
                  }}
                >
                  {formatShareCount(grant.vestedShares, 0)} total vested
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-primary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                +{formatShareCount(grant.newShares, 0)}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-primary)",
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                }}
              >
                {formatEquityAmount(grant.newValue)}
              </div>
            </div>
          ))}
      </div>
      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--border-subtle)",
          display: "grid",
          gap: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            fontSize: 12,
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>Monthly total</span>
          <span
            style={{
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 500,
            }}
          >
            {formatEquityAmount(row.monthlyValue)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            fontSize: 12,
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>Cumulative vested</span>
          <span
            style={{
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 500,
            }}
          >
            {formatEquityAmount(row.vestedValue)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirm modal
// ---------------------------------------------------------------------------
function DeleteConfirmModal({ onClose, onConfirm, deleting }) {
  return (
    <ModalShell onClose={onClose} width={380}>
      <div
        className="modal-scroll"
        style={{ padding: "20px 20px 16px", overflowY: "auto", flex: 1 }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Delete this grant?
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          This action cannot be undone. All data for this grant record will be
          permanently removed.
        </div>
        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            style={{
              ...primaryButtonStyle,
              background: "#dc2626",
              borderColor: "#dc2626",
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? "Deleting..." : "Delete grant"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Stat box component
// ---------------------------------------------------------------------------
function StatBox({ label, value, sub, highlight = false }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 10,
        background: highlight
          ? "var(--bg-secondary, rgba(0,0,0,0.03))"
          : "transparent",
        border: highlight
          ? "1px solid var(--border-subtle)"
          : "none",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 18,
          fontWeight: 600,
          color: "var(--text-primary)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Equity component
// ---------------------------------------------------------------------------
export default function Equity() {
  const { assets = [], loading, refreshAssets } = usePortfolio();
  const { user } = useAuthContext();
  const currency = getUserCurrency(user);
  const formatEquityAmount = (value, opts = {}) =>
    formatCurrencyAmount(value, currency, { maximumFractionDigits: 0, ...opts });

  const insightsRef = useRef(null);
  const scrollInsights = (dir) => {
    if (insightsRef.current)
      insightsRef.current.scrollBy({
        left: dir === "left" ? -240 : 240,
        behavior: "smooth",
      });
  };

  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [flow, setFlow] = useState(null);
  const [form, setForm] = useState(blankGrant);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showValueEstimate, setShowValueEstimate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const equityAssets = useMemo(
    () => assets.filter((a) => a.assetType === "equity"),
    [assets]
  );

  const companies = useMemo(() => {
    const grouped = new Map();
    equityAssets.forEach((asset) => {
      const id = buildCompanyKey(asset);
      const cur = grouped.get(id) || {
        id,
        name: asset.name || "",
        ticker: asset.ticker || "",
        companyStructure: asset.companyStructure || "private",
        fairMarketValue: asNumber(asset.fairMarketValue),
        latestSharePrice: asNumber(asset.currentPrice || asset.buyPrice),
        lots: [],
      };
      cur.name = asset.name || cur.name;
      cur.ticker = asset.ticker || cur.ticker;
      cur.companyStructure = asset.companyStructure || cur.companyStructure;
      cur.fairMarketValue = asNumber(
        asset.fairMarketValue || cur.fairMarketValue
      );
      cur.latestSharePrice = asNumber(
        asset.currentPrice || asset.buyPrice || cur.latestSharePrice
      );
      cur.lots.push(asset);
      grouped.set(id, cur);
    });
    return Array.from(grouped.values());
  }, [equityAssets]);

  useEffect(() => {
    if (!companies.length) {
      setSelectedCompanyId("");
      return;
    }
    if (!companies.some((c) => c.id === selectedCompanyId))
      setSelectedCompanyId(companies[0].id);
  }, [companies, selectedCompanyId]);

  const selectedCompany =
    companies.find((c) => c.id === selectedCompanyId) || companies[0] || null;
  const companyGrants = selectedCompany?.lots || [];
  const visibleCompanyGrants = companyGrants.filter(
    (g) => g.includeInNetWorth !== false
  );

  // ── Overview stats ────────────────────────────────────────────────────────
  const overviewStats = useMemo(() => {
    const totalShares = visibleCompanyGrants.reduce(
      (s, g) => s + asNumber(g.quantity),
      0
    );
    const vestedShares = visibleCompanyGrants.reduce(
      (s, g) => s + getGrantVestedSharesAtDate(g, new Date()),
      0
    );
    const unvestedShares = Math.max(0, totalShares - vestedShares);
    const estimatedGrantValue = visibleCompanyGrants.reduce(
      (s, g) => s + getGrantValuePerShare(g) * asNumber(g.quantity),
      0
    );
    const vestedValue = visibleCompanyGrants.reduce(
      (s, g) =>
        s + getGrantValuePerShare(g) * getGrantVestedSharesAtDate(g, new Date()),
      0
    );
    const unvestedValue = Math.max(0, estimatedGrantValue - vestedValue);
    const totalIIT = visibleCompanyGrants.reduce((s, g) => {
      if (g.grantType !== "STOCK_OPTION" || !g.fmvAtExercise) return s;
      const spread =
        (asNumber(g.fmvAtExercise) - asNumber(g.buyPrice)) *
        asNumber(g.exercised || 0);
      return s + calcSATTax(spread);
    }, 0);
    const exerciseCost = visibleCompanyGrants.reduce(
      (s, g) => s + asNumber(g.exercised) * asNumber(g.buyPrice),
      0
    );
    const exerciseGain = visibleCompanyGrants.reduce((s, g) => {
      const price =
        asNumber(g.currentPrice) ||
        asNumber(g.currentValue) / Math.max(1, asNumber(g.quantity));
      return (
        s + Math.max(0, price - asNumber(g.buyPrice)) * asNumber(g.exercised)
      );
    }, 0);
    const safeIssues = visibleCompanyGrants.filter((g) =>
      ["pending", "expired"].includes(g.safeFilingStatus)
    ).length;
    const lockedGrants = visibleCompanyGrants.filter(
      (g) => g.lockupExpiry && safeDate(g.lockupExpiry) > new Date()
    ).length;
    return {
      totalShares,
      estimatedGrantValue,
      vestedShares,
      unvestedShares,
      vestedValue,
      unvestedValue,
      exerciseCost,
      exerciseGain,
      totalIIT,
      safeIssues,
      lockedGrants,
    };
  }, [visibleCompanyGrants]);

  const chartData = useMemo(() => {
    if (!visibleCompanyGrants.length) return [];
    const today = startOfMonth(new Date());
    const timelineMap = new Map();
    const addPoint = (value) => {
      const point = startOfMonth(value);
      timelineMap.set(point.toISOString(), point);
    };

    visibleCompanyGrants.forEach((grant) => {
      const grantDate = safeDate(grant.buyDate || Date.now());
      const vestingStart = safeDate(
        grant.vestingStartDate || grant.buyDate || Date.now()
      );
      const fullyVestedDate =
        getGrantFullyVestedDate(grant) || vestingStart;
      const rangeStart = startOfMonth(
        grant.hasVestingSchedule === false ? grantDate : vestingStart
      );
      const rangeEnd = startOfMonth(fullyVestedDate);
      addPoint(grantDate);
      addPoint(vestingStart);
      addPoint(fullyVestedDate);
      let limit = 240;
      for (
        let cursor = new Date(rangeStart);
        cursor <= rangeEnd && limit > 0;
        cursor = addMonths(cursor, 1), limit--
      ) {
        addPoint(cursor);
      }
    });

    addPoint(today);

    const pointsBeforePadding = Array.from(timelineMap.values()).sort(
      (a, b) => a - b
    );
    if (pointsBeforePadding.length < 4) {
      const anchor = pointsBeforePadding[0] || today;
      const paddedStart = startOfMonth(addMonths(anchor, -2));
      for (let offset = 0; offset < 5; offset += 1) {
        addPoint(addMonths(paddedStart, offset));
      }
    }

    const timelineSnapshot = Array.from(timelineMap.values()).sort(
      (a, b) => a - b
    );
    if (timelineSnapshot.length > 0) {
      const paddedStart = startOfMonth(
        addMonths(timelineSnapshot[0], -2)
      );
      const paddedEnd = startOfMonth(
        addMonths(timelineSnapshot[timelineSnapshot.length - 1], 2)
      );
      for (
        let cursor = new Date(paddedStart);
        cursor <= paddedEnd;
        cursor = addMonths(cursor, 1)
      ) {
        addPoint(cursor);
      }
    }

    const timeline = Array.from(timelineMap.values()).sort((a, b) => a - b);
    const totalShares = visibleCompanyGrants.reduce(
      (sum, grant) => sum + asNumber(grant.quantity),
      0
    );
    const previousTotals = new Map();

    return timeline.map((pointDate) => {
      const rows = visibleCompanyGrants.map((grant) => {
        const vestedShares = getGrantVestedSharesAtDate(grant, pointDate);
        const sharePrice = getGrantSharePrice(grant);
        const shareValue = getGrantValuePerShare(grant, sharePrice);
        const previousShares = previousTotals.get(grant._id) || 0;
        const newShares = Math.max(0, vestedShares - previousShares);
        const newValue = newShares * shareValue;
        const vestedValue = vestedShares * shareValue;
        previousTotals.set(grant._id, vestedShares);
        return {
          id: grant._id,
          name: grant.name || grant.ticker || grant.grantId || "Grant",
          vestedShares,
          vestedValue,
          newShares,
          newValue,
          sharePrice,
        };
      });
      const vested = rows.reduce((sum, row) => sum + row.vestedShares, 0);
      const vestedValue = rows.reduce((sum, row) => sum + row.vestedValue, 0);
      const newVested = rows.reduce((sum, row) => sum + row.newShares, 0);
      const monthlyValue = rows.reduce((sum, row) => sum + row.newValue, 0);
      return {
        key: pointDate.toISOString(),
        date: pointDate,
        label: pointDate.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        vested: Math.round(vested * 100) / 100,
        total: Math.round(totalShares * 100) / 100,
        vestedValue,
        newVested,
        monthlyValue,
        rows,
        isToday: pointDate.toDateString() === today.toDateString(),
      };
    });
  }, [visibleCompanyGrants]);

  const chartYAxisTop = useMemo(() => {
    const chartMax = chartData.reduce(
      (max, point) =>
        Math.max(max, asNumber(point?.total), asNumber(point?.vested)),
      0
    );
    const paddedTop = Math.max(chartMax * 1.05, Math.ceil(chartMax / 10) * 10);
    if (paddedTop <= 5) return 5;
    if (paddedTop <= 10) return 10;
    if (paddedTop <= 25) return 25;
    if (paddedTop <= 50) return 50;
    if (paddedTop <= 100) return 100;
    return Math.ceil(paddedTop / 10) * 10;
  }, [chartData]);

  const timelineInsights = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const nextYear = currentYear + 1;
    const completionEntry =
      chartData.find(
        (entry) => entry.total > 0 && entry.vested >= entry.total
      ) || chartData[chartData.length - 1];
    const aggregateRange = (year) =>
      chartData
        .filter((entry) => entry.date.getFullYear() === year)
        .reduce(
          (acc, entry) => ({
            shares: acc.shares + entry.newVested,
            value: acc.value + entry.monthlyValue,
          }),
          { shares: 0, value: 0 }
        );
    const optionGrants = visibleCompanyGrants.filter(
      (grant) => grant.grantType === "STOCK_OPTION"
    );
    const vestedOptionShares = optionGrants.reduce(
      (sum, grant) =>
        sum +
        Math.max(
          0,
          getGrantVestedSharesAtDate(grant, today) -
            asNumber(grant.exercised)
        ),
      0
    );
    const doubledFmvDelta = optionGrants.reduce(
      (sum, grant) =>
        sum +
        getGrantSharePrice(grant) *
          Math.max(
            0,
            getGrantVestedSharesAtDate(grant, today) -
              asNumber(grant.exercised)
          ),
      0
    );
    return {
      completionDate:
        overviewStats.unvestedShares > 0 ? completionEntry?.date : null,
      thisYear: aggregateRange(currentYear),
      nextYear: aggregateRange(nextYear),
      vestedOptionShares,
      doubledFmvDelta,
    };
  }, [chartData, overviewStats.unvestedShares, visibleCompanyGrants]);

  const insightCards = useMemo(() => {
    const completionLabel = timelineInsights.completionDate
      ? timelineInsights.completionDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
      : null;

    const cards = [
      {
        title: "Vesting time",
        value: buildDurationLabel(timelineInsights.completionDate),
        detail:
          overviewStats.unvestedShares > 0
            ? `${formatShareCount(overviewStats.unvestedShares)} unvested shares fully vest by ${completionLabel}.`
            : "All visible shares are already vested.",
        tint: { bg: "rgba(245,158,11,0.08)", fg: "#d97706" },
        icon: Calendar,
      },
      {
        title: "Vesting this year",
        value: formatEquityAmount(timelineInsights.thisYear.value),
        detail: `${formatShareCount(timelineInsights.thisYear.shares)} shares vest in ${new Date().getFullYear()}.`,
        tint: { bg: "rgba(156,39,176,0.08)", fg: "#9c27b0" },
        icon: Calendar,
      },
      {
        title: "Opportunity cost",
        value: formatEquityAmount(overviewStats.unvestedValue),
        detail: `${formatShareCount(overviewStats.unvestedShares)} unvested shares left if you departed today.`,
        tint: { bg: "rgba(239,68,68,0.08)", fg: "#dc2626" },
        icon: AlertCircle,
      },
      {
        title: "Vesting next year",
        value: formatEquityAmount(timelineInsights.nextYear.value),
        detail: `${formatShareCount(timelineInsights.nextYear.shares)} shares projected to vest in ${new Date().getFullYear() + 1}.`,
        tint: { bg: "rgba(34,197,94,0.08)", fg: "#16a34a" },
        icon: Calendar,
      },
      {
        title: "FMV spread risk",
        value: formatEquityAmount(timelineInsights.doubledFmvDelta),
        detail:
          timelineInsights.vestedOptionShares > 0
            ? `If FMV doubles, spread on ${formatShareCount(timelineInsights.vestedOptionShares)} vested shares increases by this amount.`
            : "No vested option shares exposed to FMV spread.",
        tint: { bg: "rgba(239,68,68,0.08)", fg: "#dc2626" },
        icon: Info,
      },
    ];

    const today = new Date();

    if (
      selectedCompany &&
      ["us_listed", "hk_listed", "vie"].includes(
        selectedCompany.companyStructure
      )
    ) {
      const pendingSafe = visibleCompanyGrants.filter((g) =>
        ["pending", "expired"].includes(g.safeFilingStatus)
      );
      if (pendingSafe.length > 0) {
        const hasExpired = pendingSafe.some(
          (g) => g.safeFilingStatus === "expired"
        );
        cards.push({
          title: "SAFE Circular 7",
          value: hasExpired ? "Action needed" : "Pending",
          detail: `${pendingSafe.length} grant(s) need SAFE Circular 7 registration or renewal.`,
          tint: hasExpired
            ? { bg: "rgba(239,68,68,0.08)", fg: "#dc2626" }
            : { bg: "rgba(245,158,11,0.08)", fg: "#d97706" },
          icon: AlertCircle,
        });
      }
    }

    const activeLockups = visibleCompanyGrants.filter(
      (g) => g.lockupExpiry && safeDate(g.lockupExpiry) > today
    );
    if (activeLockups.length > 0) {
      const soonest = activeLockups.reduce((min, curr) =>
        safeDate(curr.lockupExpiry) < safeDate(min.lockupExpiry) ? curr : min
      );
      const expiryStr = safeDate(soonest.lockupExpiry).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", year: "numeric" }
      );
      cards.push({
        title: "CSRC Lock-up",
        value: "Locked",
        detail: `${activeLockups.length} grant(s) under post-IPO lock-up. Soonest expiry: ${expiryStr}.`,
        tint: { bg: "rgba(33,150,243,0.08)", fg: "#1976d2" },
        icon: Lock,
      });
    }

    const totalIITAmount = visibleCompanyGrants.reduce((sum, g) => {
      if (g.grantType !== "STOCK_OPTION" || !g.iitPreferentialMethod)
        return sum;
      const sp =
        (asNumber(g.fmvAtExercise) - asNumber(g.buyPrice)) *
        asNumber(g.exercised || 0);
      return sum + calcSATTax(sp);
    }, 0);
    if (totalIITAmount > 0) {
      cards.push({
        title: "Circular 35 IIT",
        value: formatEquityAmount(totalIITAmount),
        detail:
          "Estimated IIT on options spread under the 12-month preferential method.",
        tint: { bg: "rgba(156,39,176,0.08)", fg: "#9c27b0" },
        icon: Info,
      });
    }

    return cards;
  }, [
    formatEquityAmount,
    overviewStats,
    timelineInsights,
    visibleCompanyGrants,
    selectedCompany,
  ]);

  const resetFlow = () => {
    setFlow(null);
    setForm(blankGrant);
    setEditingAssetId(null);
  };

  const startAddGrant = () => {
    if (!selectedCompany) {
      startAddCompany();
      return;
    }
    setForm({
      ...blankGrant,
      name: selectedCompany?.name || "",
      ticker: selectedCompany?.ticker || "",
      companyStructure: selectedCompany?.companyStructure || "private",
      fairMarketValue: selectedCompany?.fairMarketValue
        ? String(selectedCompany.fairMarketValue)
        : "",
      currentPrice: selectedCompany?.latestSharePrice
        ? String(selectedCompany.latestSharePrice)
        : "",
    });
    setFlow("grant-type");
  };

  const startAddCompany = () => {
    setForm(blankGrant);
    setFlow("company-structure");
  };

  const startEdit = (grant) => {
    setEditingAssetId(grant._id);
    setForm({
      _id: grant._id,
      name: grant.name || "",
      ticker: grant.ticker || "",
      companyStructure: grant.companyStructure || "private",
      fairMarketValue: String(grant.fairMarketValue ?? ""),
      currentPrice: String(grant.currentPrice ?? ""),
      fxRateAtGrant: String(grant.fxRateAtGrant ?? ""),
      fxRateAtVest: String(grant.fxRateAtVest ?? ""),
      fxRateAtExercise: String(grant.fxRateAtExercise ?? ""),
      grantType: grant.grantType || "STOCK_OPTION",
      grantId: grant.grantId || "",
      quantity: String(grant.quantity ?? ""),
      vestedQuantity: String(grant.vestedQuantity ?? ""),
      buyPrice: String(grant.buyPrice ?? ""),
      fmvAtExercise: String(grant.fmvAtExercise ?? ""),
      buyDate: grant.buyDate
        ? new Date(grant.buyDate).toISOString().slice(0, 10)
        : blankGrant.buyDate,
      expirationDate: grant.expirationDate
        ? new Date(grant.expirationDate).toISOString().slice(0, 10)
        : "",
      postTerminationWindow: String(grant.postTerminationWindow ?? "90"),
      exercised: String(grant.exercised ?? ""),
      hasVestingSchedule: grant.hasVestingSchedule ?? true,
      vestingSchedule: grant.vestingSchedule || "monthly_48_12",
      vestingStartDate: grant.vestingStartDate
        ? new Date(grant.vestingStartDate).toISOString().slice(0, 10)
        : "",
      cliffMonths: String(grant.cliffMonths ?? "12"),
      safeFilingStatus: grant.safeFilingStatus || "not_required",
      safeFilingDeadline: grant.safeFilingDeadline
        ? new Date(grant.safeFilingDeadline).toISOString().slice(0, 10)
        : "",
      lockupPeriod: grant.lockupPeriod || "none",
      lockupExpiry: grant.lockupExpiry
        ? new Date(grant.lockupExpiry).toISOString().slice(0, 10)
        : "",
      iitPreferentialMethod: grant.iitPreferentialMethod !== false,
      salePrice: String(grant.salePrice ?? ""),
      includeInNetWorth: grant.includeInNetWorth !== false,
      notes: grant.notes || "",
    });
    setFlow("edit-grant");
  };

  const saveGrant = async () => {
    if (!form.name.trim() || !String(form.quantity).trim()) {
      toast.error("Company name and quantity are required.");
      return;
    }
    if (
      ["a_share", "hk_listed", "us_listed"].includes(form.companyStructure) &&
      !form.ticker.trim()
    ) {
      toast.error("Stock ticker is required for listed companies.");
      return;
    }
    if (asNumber(form.exercised) > asNumber(form.vestedQuantity || form.quantity)) {
      toast.error("Exercised shares cannot exceed vested quantity.");
      return;
    }
    setSaving(true);
    try {
      const inferredPrice =
        asNumber(form.currentPrice) || asNumber(form.fairMarketValue);
      const payload = {
        assetType: "equity",
        name: form.name.trim(),
        ticker: form.ticker.trim()
          ? form.ticker.trim().toUpperCase()
          : null,
        companyStructure: form.companyStructure,
        fairMarketValue: asNumber(form.fairMarketValue),
        currentPrice: inferredPrice,
        fxRateAtGrant: asNumber(form.fxRateAtGrant) || null,
        fxRateAtVest: asNumber(form.fxRateAtVest) || null,
        fxRateAtExercise: asNumber(form.fxRateAtExercise) || null,
        grantType: form.grantType,
        grantId: form.grantId.trim() || `${form.grantType}-${Date.now()}`,
        quantity: asNumber(form.quantity),
        vestedQuantity: asNumber(form.vestedQuantity),
        buyPrice: asNumber(form.buyPrice),
        fmvAtExercise: asNumber(form.fmvAtExercise) || null,
        buyDate: form.buyDate,
        expirationDate: form.expirationDate || null,
        postTerminationWindow: asNumber(form.postTerminationWindow) || 90,
        exercised: asNumber(form.exercised),
        hasVestingSchedule: Boolean(form.hasVestingSchedule),
        vestingSchedule: form.vestingSchedule,
        vestingStartDate: form.vestingStartDate || form.buyDate || null,
        cliffMonths: asNumber(form.cliffMonths),
        safeFilingStatus: form.safeFilingStatus,
        safeFilingDeadline: form.safeFilingDeadline || null,
        lockupPeriod: form.lockupPeriod,
        lockupExpiry: form.lockupExpiry || null,
        iitPreferentialMethod: Boolean(form.iitPreferentialMethod),
        salePrice: asNumber(form.salePrice) || null,
        includeInNetWorth: Boolean(form.includeInNetWorth),
        notes: form.notes || "",
      };
      if (editingAssetId) {
        await cryptoService.update(editingAssetId, payload);
        toast.success("Grant updated.");
      } else {
        await cryptoService.add(payload);
        toast.success("Grant added.");
      }
      await refreshAssets();
      resetFlow();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to save grant.");
    } finally {
      setSaving(false);
    }
  };

  const updateCompany = async () => {
    if (!selectedCompany || !companyGrants.length) return;
    if (!form.name.trim()) {
      toast.error("Company name is required.");
      return;
    }
    try {
      await Promise.all(
        companyGrants.map((g) =>
          cryptoService.update(g._id, {
            name: form.name.trim(),
            companyStructure: form.companyStructure,
            currentPrice:
              asNumber(form.currentPrice) || asNumber(form.fairMarketValue),
          })
        )
      );
      await refreshAssets();
      toast.success("Company info updated.");
      resetFlow();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Unable to update company info."
      );
    }
  };

  const toggleIncludeInNetWorth = async (grant) => {
    try {
      await cryptoService.update(grant._id, {
        includeInNetWorth: grant.includeInNetWorth === false,
      });
      await refreshAssets();
      toast.success(
        grant.includeInNetWorth === false
          ? "Included in net worth."
          : "Excluded from net worth."
      );
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Unable to update visibility."
      );
    }
  };

  const removeGrant = async () => {
    if (!deleteTarget?._id) return;
    setDeleting(true);
    try {
      await cryptoService.delete(deleteTarget._id);
      await refreshAssets();
      setDeleteTarget(null);
      toast.success("Grant deleted.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to delete grant.");
    } finally {
      setDeleting(false);
    }
  };

  // Chart tick selector
  const chartTicks = useMemo(() => {
    const maxTicks = 6;
    const len = chartData.length;
    if (len === 0) return [];
    if (len <= maxTicks) return chartData.map((p) => p.label);
    const step = Math.ceil(len / maxTicks);
    return chartData.filter((_, i) => i % step === 0).map((p) => p.label);
  }, [chartData]);

  // Pie data — guard against all-zero
  const pieData = useMemo(() => {
    const exerciseCost = overviewStats.exerciseCost || 0;
    const iit = overviewStats.totalIIT || 0;
    if (exerciseCost === 0 && iit === 0) {
      return [
        { name: "No data", value: 1, isEmpty: true },
      ];
    }
    return [
      { name: "Cost of exercise", value: exerciseCost || 0.0001 },
      { name: "IIT estimate", value: iit || 0.0001 },
    ];
  }, [overviewStats.exerciseCost, overviewStats.totalIIT]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`
        /* Tab hover */
        .eq-tab:hover { background: var(--bg-hover, rgba(0,0,0,0.04)) !important; }
        /* Card */
        .eq-card {
          background: var(--bg-card);
          border: 1px solid var(--border-default);
          border-radius: 12px;
          overflow: hidden;
          min-width: 0;
        }
        .eq-card > * {
          min-width: 0;
        }
        .eq-card p,
        .eq-card span,
        .eq-card div,
        .eq-card button,
        .eq-card input,
        .eq-card select {
          overflow-wrap: break-word;
          word-break: break-word;
        }
        /* Scrollbar */
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .modal-scroll::-webkit-scrollbar { width: 6px; }
        .modal-scroll::-webkit-scrollbar-track { background: transparent; }
        .modal-scroll::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 4px; }
        .modal-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
        /* Grid */
        .eq-grid { display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: 14px; }
        @media (max-width: 1080px) { .eq-grid { grid-template-columns: 1fr; } }
        /* Table */
        .eq-table { width: 100%; border-collapse: collapse; }
        .eq-table th {
          text-align: left;
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 600;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border-subtle);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .eq-table td {
          padding: 11px 14px;
          border-bottom: 1px solid var(--border-subtle);
          vertical-align: middle;
          color: var(--text-primary);
          font-size: 13px;
        }
        .eq-table tr:last-child td { border-bottom: none; }
        .eq-table tr:hover td { background: var(--bg-hover, rgba(0,0,0,0.02)); }
        /* Badges */
        .safe-pending { display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#d97706;background:rgba(245,158,11,0.10);border-radius:999px;padding:2px 7px;font-weight:500; }
        .safe-expired { display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#dc2626;background:rgba(239,68,68,0.10);border-radius:999px;padding:2px 7px;font-weight:500; }
        .safe-filed  { display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#16a34a;background:rgba(34,197,94,0.10);border-radius:999px;padding:2px 7px;font-weight:500; }
        /* recharts override: make tooltips respect theme */
        .recharts-tooltip-wrapper { outline: none !important; }
        /* Input focus */
        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: var(--border-focus, var(--text-primary)) !important;
        }
        /* Table wrap */
        @media (max-width: 760px) {
          .eq-table-wrap { overflow-x: auto; }
          .eq-table { min-width: 900px; }
        }
      `}</style>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {[
          { value: "overview", label: "Overview" },
          { value: "portfolio", label: "Portfolio" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            className="eq-tab"
            onClick={() => setActiveSubTab(tab.value)}
            style={{
              ...buttonReset,
              padding: "7px 13px",
              borderRadius: 8,
              cursor: "pointer",
              color: "var(--text-primary)",
              fontSize: 13,
              fontWeight: activeSubTab === tab.value ? 500 : 400,
              background:
                activeSubTab === tab.value
                  ? "var(--bg-hover, rgba(0,0,0,0.05))"
                  : "transparent",
              transition: "background 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!loading && !selectedCompany && (
        <div className="eq-card" style={{ padding: 24 }}>
          <div style={sectionLabelStyle}>Equity</div>
          <div
            style={{
              marginTop: 10,
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            No grants added yet.
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            Track stock options, RSUs, restricted stock, and employee stock
            ownership plans.
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={startAddCompany}
              style={secondaryButtonStyle}
            >
              Add company
            </button>
            <button
              type="button"
              onClick={startAddGrant}
              style={primaryButtonStyle}
            >
              Add grant
            </button>
          </div>
        </div>
      )}

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {activeSubTab === "overview" && selectedCompany && (
        <div className="eq-grid">
          {/* Left column */}
          <div style={{ display: "grid", gap: 14 }}>
            {/* Company header card */}
            <div className="eq-card">
              <div style={{ padding: "16px 18px" }}>
                {/* Company selector */}
                <div style={{ maxWidth: 320, marginBottom: 14 }}>
                  <div
                    style={{ ...sectionLabelStyle, marginBottom: 6 }}
                  >
                    Company
                  </div>
                  <div style={{ position: "relative" }}>
                    <select
                      value={selectedCompany.id}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      style={{
                        ...inputStyle,
                        appearance: "none",
                        paddingRight: 32,
                        fontSize: 13,
                      }}
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      style={{
                        position: "absolute",
                        right: 11,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Company name + structure */}
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {selectedCompany.name}
                </div>
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  {getStructureLabel(selectedCompany.companyStructure)}
                  {selectedCompany.ticker && (
                    <span
                      style={{
                        marginLeft: 8,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background:
                          "var(--bg-secondary, rgba(0,0,0,0.04))",
                        border: "1px solid var(--border-subtle)",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {selectedCompany.ticker}
                    </span>
                  )}
                </div>

                {/* Price row */}
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 20,
                    fontSize: 12,
                    color: "var(--text-muted)",
                  }}
                >
                  <span>
                    Latest price:{" "}
                    <span
                      style={{
                        color: "var(--text-primary)",
                        fontSize: 13,
                        fontWeight: 500,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatEquityAmount(
                        selectedCompany.latestSharePrice || 0
                      )}
                    </span>
                  </span>
                  <span>
                    FMV / 409A:{" "}
                    <span
                      style={{
                        color: "var(--text-primary)",
                        fontSize: 13,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatEquityAmount(
                        selectedCompany.fairMarketValue || 0
                      )}
                    </span>
                  </span>
                </div>

                {/* SAFE alert */}
                {overviewStats.safeIssues > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "7px 10px",
                      borderRadius: 8,
                      background: "rgba(239,68,68,0.06)",
                      border: "1px solid rgba(239,68,68,0.18)",
                    }}
                  >
                    <AlertCircle
                      size={13}
                      style={{ color: "#ef4444", flexShrink: 0 }}
                    />
                    <span
                      style={{ fontSize: 12, color: "var(--text-secondary)" }}
                    >
                      {overviewStats.safeIssues} grant
                      {overviewStats.safeIssues > 1 ? "s" : ""} with SAFE
                      filing issues
                    </span>
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div
                style={{
                  borderTop: "1px solid var(--border-subtle)",
                  padding: "14px 18px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    Est. grant value
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 20,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1.1,
                    }}
                  >
                    {formatEquityAmount(overviewStats.estimatedGrantValue)}
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    {formatShareCount(overviewStats.totalShares)} shares
                    · pre-IIT
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background:
                      "var(--bg-secondary, rgba(0,0,0,0.03))",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Vested
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatEquityAmount(overviewStats.vestedValue)}
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    {formatShareCount(overviewStats.vestedShares)} shares
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background:
                      "var(--bg-secondary, rgba(0,0,0,0.03))",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Unvested
                  </div>
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatEquityAmount(overviewStats.unvestedValue)}
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    {formatShareCount(overviewStats.unvestedShares)} shares
                  </div>
                </div>
              </div>
            </div>

            {/* Vesting chart */}
            <div className="eq-card" style={{ overflow: "visible" }}>
              <div
                style={{
                  padding: "14px 18px 12px",
                  borderBottom: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    ...sectionLabelStyle,
                    color: "var(--text-secondary)",
                  }}
                >
                  Vesting Schedule
                </span>
                {/* Legend */}
                <div style={{ display: "flex", gap: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 2,
                        background: "#3b82f6",
                        borderRadius: 1,
                      }}
                    />
                    Vested
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 2,
                        borderTop: "2px dashed var(--text-muted)",
                      }}
                    />
                    Total
                  </div>
                </div>
              </div>
              <div style={{ padding: "12px 8px 8px", overflow: "visible" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", paddingLeft: 12, marginBottom: 4, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Shares
                </div>
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 20, right: 24, left: 10, bottom: 22 }}
                    >
                      <defs>
                        <linearGradient
                          id="vestGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#3b82f6"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="85%"
                            stopColor="#3b82f6"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="var(--border-subtle)"
                        strokeDasharray="0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{
                          fill: "var(--text-muted)",
                          fontSize: 10,
                          fontWeight: 500,
                        }}
                        tickFormatter={(v) => String(v).toUpperCase()}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        ticks={chartTicks}
                      />
                      <YAxis
                        tick={{
                          fill: "var(--text-muted)",
                          fontSize: 10,
                        }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        width={40}
                        domain={[0, chartYAxisTop]}
                        tickCount={5}
                      />
                      <Tooltip
                        content={
                          <EquityVestingTooltip
                            formatEquityAmount={formatEquityAmount}
                          />
                        }
                        cursor={{
                          stroke: "var(--border-default)",
                          strokeWidth: 1,
                          strokeDasharray: "4 2",
                        }}
                      />
                      {chartData.find((p) => p.isToday) && (
                        <ReferenceLine
                          x={chartData.find((p) => p.isToday)?.label}
                          stroke="var(--text-muted)"
                          strokeDasharray="3 3"
                          strokeWidth={1.5}
                          label={{
                            value: "Today",
                            position: "insideTopRight",
                            fill: "var(--text-muted)",
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="vested"
                        name="Vested"
                        stroke="#3b82f6"
                        fill="url(#vestGrad)"
                        strokeWidth={2}
                        isAnimationActive={false}
                        dot={false}
                        activeDot={{
                          r: 4,
                          fill: "#3b82f6",
                          stroke: "var(--bg-card)",
                          strokeWidth: 2,
                        }}
                      />
                      <Area
                        type="stepAfter"
                        dataKey="total"
                        name="Total shares"
                        stroke="var(--text-muted)"
                        fill="none"
                        strokeDasharray="4 3"
                        strokeWidth={1.5}
                        isAnimationActive={false}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Insights row */}
            <div className="eq-card" style={{ overflow: "hidden" }}>
              <div
                style={{
                  padding: "13px 16px",
                  borderBottom: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    ...sectionLabelStyle,
                    color: "var(--text-secondary)",
                  }}
                >
                  Insights
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => scrollInsights("left")}
                    style={{
                      ...buttonReset,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background:
                        "var(--bg-secondary, rgba(0,0,0,0.04))",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollInsights("right")}
                    style={{
                      ...buttonReset,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background:
                        "var(--bg-secondary, rgba(0,0,0,0.04))",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              <div
                ref={insightsRef}
                className="hide-scrollbar"
                style={{
                  padding: "14px 16px",
                  overflowX: "auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    minWidth: "max-content",
                  }}
                >
                  {insightCards.map((card) => (
                    <InsightCard
                      key={card.title}
                      title={card.title}
                      value={card.value}
                      detail={card.detail}
                      tint={card.tint}
                      icon={card.icon}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
            {/* Value breakdown */}
            <div className="eq-card" style={{ padding: 16 }}>
              <div style={sectionLabelStyle}>How It's Calculated</div>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "var(--text-secondary)",
                }}
              >
                View a breakdown of your equity estimate including SAT Circular
                35 IIT calculations and SAFE filing status.
              </p>
              <button
                type="button"
                onClick={() => setShowValueEstimate(true)}
                style={{
                  ...secondaryButtonStyle,
                  width: "100%",
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                View value breakdown
              </button>
            </div>

            {/* Exercise cost & IIT pie */}
            <div className="eq-card" style={{ padding: 16 }}>
              <div style={sectionLabelStyle}>Exercise Cost & IIT</div>
              <div style={{ height: 200, marginTop: 14 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={62}
                      outerRadius={80}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                      paddingAngle={pieData[0]?.isEmpty ? 0 : 2}
                    >
                      {pieData[0]?.isEmpty ? (
                        <Cell
                          fill="var(--border-subtle)"
                        />
                      ) : (
                        <>
                          <Cell fill="#3b82f6" />
                          <Cell fill="#f59e0b" />
                        </>
                      )}
                    </Pie>
                    <text
                      x="50%"
                      y="44%"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="var(--text-primary)"
                      style={{ fontSize: 15, fontWeight: 600 }}
                    >
                      {formatEquityAmount(
                        overviewStats.exerciseCost + overviewStats.totalIIT
                      )}
                    </text>
                    <text
                      x="50%"
                      y="57%"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="var(--text-muted)"
                      style={{ fontSize: 10 }}
                    >
                      Total exercise cost
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#3b82f6",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    Cost of exercise
                  </div>
                  <span
                    style={{
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--text-primary)",
                      fontWeight: 500,
                    }}
                  >
                    {formatEquityAmount(overviewStats.exerciseCost)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#f59e0b",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    IIT · SAT Circular 35
                  </div>
                  <span
                    style={{
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--text-primary)",
                      fontWeight: 500,
                    }}
                  >
                    {formatEquityAmount(overviewStats.totalIIT)}
                  </span>
                </div>
              </div>
              <p
                style={{
                  margin: "12px 0 0",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                IIT estimated using the preferential 12-month spread method.
                Final liability depends on other income and deductions.
              </p>
            </div>

            {/* Quick actions */}
            <div className="eq-card" style={{ padding: 16 }}>
              <div style={sectionLabelStyle}>Actions</div>
              <div
                style={{ marginTop: 10, display: "grid", gap: 8 }}
              >
                <button
                  type="button"
                  onClick={startAddGrant}
                  style={{
                    ...primaryButtonStyle,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Plus size={14} /> Add grant
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm((c) => ({
                      ...c,
                      name: selectedCompany.name,
                      ticker: selectedCompany.ticker,
                      companyStructure: selectedCompany.companyStructure,
                      fairMarketValue: String(
                        selectedCompany.fairMarketValue || ""
                      ),
                      currentPrice: String(
                        selectedCompany.latestSharePrice || ""
                      ),
                    }));
                    setFlow("edit-company");
                  }}
                  style={{
                    ...secondaryButtonStyle,
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  Edit company info
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Portfolio tab ─────────────────────────────────────────────────────── */}
      {activeSubTab === "portfolio" && selectedCompany && (
        <div className="eq-card" style={{ overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "16px 18px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {selectedCompany.name}
                </div>
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  {getStructureLabel(selectedCompany.companyStructure)}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 16,
                    color: "var(--text-muted)",
                    fontSize: 12,
                  }}
                >
                  <span>
                    Latest price:{" "}
                    <span
                      style={{
                        color: "var(--text-primary)",
                        fontWeight: 500,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatEquityAmount(
                        selectedCompany.latestSharePrice || 0
                      )}
                    </span>
                  </span>
                  <span>
                    FMV (409A):{" "}
                    <span
                      style={{
                        color: "var(--text-primary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatEquityAmount(
                        selectedCompany.fairMarketValue || 0
                      )}
                    </span>
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setForm((c) => ({
                      ...c,
                      name: selectedCompany.name,
                      ticker: selectedCompany.ticker,
                      companyStructure: selectedCompany.companyStructure,
                      fairMarketValue: String(
                        selectedCompany.fairMarketValue || ""
                      ),
                      currentPrice: String(
                        selectedCompany.latestSharePrice || ""
                      ),
                    }));
                    setFlow("edit-company");
                  }}
                  style={secondaryButtonStyle}
                >
                  Edit info
                </button>
                <button
                  type="button"
                  onClick={startAddGrant}
                  style={{
                    ...primaryButtonStyle,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Plus size={14} /> Add grant
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div
            style={{
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <div className="eq-table-wrap">
              <table className="eq-table">
                <thead>
                  <tr>
                    <th>Grant</th>
                    <th>Quantity</th>
                    <th>Vesting start</th>
                    <th>Schedule</th>
                    <th>Exercised</th>
                    <th>Price</th>
                    <th style={{ width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {companyGrants.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                          padding: "24px 14px",
                          fontSize: 13,
                        }}
                      >
                        No grants yet. Add your first grant above.
                      </td>
                    </tr>
                  )}
                  {companyGrants.map((grant) => {
                    const meta = getGrantTypeMeta(grant.grantType);
                    const isHidden = grant.includeInNetWorth === false;
                    return (
                      <tr
                        key={grant._id}
                        style={{ opacity: isHidden ? 0.5 : 1 }}
                      >
                        <td>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: "var(--text-primary)",
                            }}
                          >
                            {selectedCompany.name}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: meta.badgeColor,
                                background: meta.badgeBg,
                                padding: "2px 7px",
                                borderRadius: 999,
                              }}
                            >
                              {meta.labelEn}
                            </span>
                            {grant.grantId && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "var(--text-muted)",
                                }}
                              >
                                {grant.grantId}
                              </span>
                            )}
                          </div>
                          {/* SAFE badge */}
                          {grant.safeFilingStatus === "pending" && (
                            <span
                              className="safe-pending"
                              style={{ marginTop: 4, display: "inline-flex" }}
                            >
                              <AlertCircle size={9} /> SAFE pending
                            </span>
                          )}
                          {grant.safeFilingStatus === "expired" && (
                            <span
                              className="safe-expired"
                              style={{ marginTop: 4, display: "inline-flex" }}
                            >
                              <AlertCircle size={9} /> SAFE expired
                            </span>
                          )}
                          {grant.safeFilingStatus === "filed" && (
                            <span
                              className="safe-filed"
                              style={{ marginTop: 4, display: "inline-flex" }}
                            >
                              SAFE filed
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              fontVariantNumeric: "tabular-nums",
                              fontSize: 13,
                            }}
                          >
                            {formatShareCount(grant.quantity)}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {grant.vestingStartDate
                            ? new Date(
                                grant.vestingStartDate
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : grant.buyDate
                            ? new Date(grant.buyDate).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )
                            : "—"}
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {grant.hasVestingSchedule === false
                            ? "No schedule"
                            : getScheduleLabel(grant.vestingSchedule)}
                        </td>
                        <td style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatShareCount(asNumber(grant.exercised) || 0)}
                        </td>
                        <td style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatEquityAmount(grant.buyPrice || 0)}
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <button
                              type="button"
                              title={
                                isHidden
                                  ? "Include in net worth"
                                  : "Exclude from net worth"
                              }
                              onClick={() => toggleIncludeInNetWorth(grant)}
                              style={{
                                ...buttonReset,
                                cursor: "pointer",
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              {isHidden ? (
                                <Eye size={15} />
                              ) : (
                                <EyeOff size={15} />
                              )}
                            </button>
                            <button
                              type="button"
                              title="Edit grant"
                              onClick={() => startEdit(grant)}
                              style={{
                                ...buttonReset,
                                cursor: "pointer",
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              title="Delete grant"
                              onClick={() => setDeleteTarget(grant)}
                              style={{
                                ...buttonReset,
                                cursor: "pointer",
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div
            style={{
              padding: "12px 18px",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={startAddCompany}
              style={{
                ...secondaryButtonStyle,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={14} /> Add company
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {flow === "grant-type" && (
        <GrantTypeModal
          selectedType={form.grantType}
          onSelect={(v) => setForm((c) => ({ ...c, grantType: v }))}
          onClose={resetFlow}
          onNext={() => setFlow("grant-details")}
        />
      )}

      {flow === "grant-details" && (
        <AddGrantDetailsModal
          title={`Add ${getGrantTypeMeta(form.grantType).label} Grant`}
          form={form}
          setForm={setForm}
          onClose={resetFlow}
          onBack={() => setFlow("grant-type")}
          onSubmit={saveGrant}
          saving={saving}
          currency={currency}
        />
      )}

      {flow === "company-structure" && (
        <CompanyStructureModal
          companyStructure={form.companyStructure}
          onSelect={(v) => setForm((c) => ({ ...c, companyStructure: v }))}
          onClose={resetFlow}
          onNext={() => setFlow("company-info")}
        />
      )}

      {flow === "company-info" && (
        <CompanyInfoModal
          form={form}
          setForm={setForm}
          onClose={resetFlow}
          onBack={() => setFlow("company-structure")}
          onNext={() => {
            if (!form.name.trim()) {
              toast.error("Company name is required.");
              return;
            }
            setFlow("grant-type");
          }}
          saving={saving}
          currency={currency}
        />
      )}

      {flow === "edit-company" && (
        <CompanyInfoModal
          form={form}
          setForm={setForm}
          onClose={resetFlow}
          onBack={resetFlow}
          onNext={updateCompany}
          saving={saving}
          currency={currency}
        />
      )}

      {flow === "edit-grant" && (
        <GrantDetailsModal
          title="Edit Grant Details"
          form={form}
          setForm={setForm}
          onClose={resetFlow}
          onBack={resetFlow}
          onSubmit={saveGrant}
          saving={saving}
          currency={currency}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          onClose={() => setDeleteTarget(null)}
          onConfirm={removeGrant}
          deleting={deleting}
        />
      )}

      {showValueEstimate && selectedCompany && (
        <ValueEstimateSidebar
          company={selectedCompany}
          grants={visibleCompanyGrants}
          currency={currency}
          onClose={() => setShowValueEstimate(false)}
        />
      )}
    </div>
  );
}
