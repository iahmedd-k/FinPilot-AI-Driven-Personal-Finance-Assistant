import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
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
import { formatCurrencyAmount, getUserCurrency } from "../utils/currency";

// ---------------------------------------------------------------------------
// Constants & style helpers
// ---------------------------------------------------------------------------

const buttonReset = {
  appearance: "none",
  border: "none",
  background: "none",
  fontFamily: "inherit",
};

const sectionLabelStyle = {
  fontSize: 10,
  fontWeight: 700,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.28em",
};

const inputStyle = {
  width: "100%",
  minHeight: 40,
  borderRadius: 10,
  border: "1px solid var(--border-default)",
  background: "var(--bg-card)",
  color: "var(--text-primary)",
  padding: "0 12px",
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const secondaryButtonStyle = {
  ...buttonReset,
  borderRadius: 10,
  border: "1px solid var(--border-default)",
  background: "var(--bg-card)",
  color: "var(--text-primary)",
  padding: "9px 16px",
  cursor: "pointer",
  fontSize: 13,
};

const primaryButtonStyle = {
  ...buttonReset,
  borderRadius: 10,
  border: "1px solid #09090f",
  background: "#09090f",
  color: "#ffffff",
  padding: "9px 16px",
  cursor: "pointer",
  fontSize: 13,
};

// ---------------------------------------------------------------------------
// Equity grant types
// ---------------------------------------------------------------------------
const grantTypeOptions = [
  {
    value: "STOCK_OPTION",
    label: "Stock Option",
    badgeColor: "#00a6ff",
    badgeBg: "rgba(0,166,255,0.10)",
    description:
      "Employee stock options granting the right to purchase shares at a fixed strike price. Taxed at exercise under SAT Circular 35 using the 12-month spread preferential IIT method.",
  },
  {
    value: "RSU",
    label: "RSU",
    badgeColor: "#d870ff",
    badgeBg: "rgba(216,112,255,0.12)",
    description:
      "Restricted Stock Units that vest over time. Taxed as employment income at each vest event. Common in VIE-structured and overseas-listed Chinese companies.",
  },
  {
    value: "RESTRICTED_SHARE",
    label: "Restricted Share",
    badgeColor: "#b0a600",
    badgeBg: "rgba(176,166,0,0.12)",
    description:
      "Actual shares transferred to the employee at grant but subject to a vesting / lock-up schedule. Regulated by CSRC Measures for Equity Incentives of Listed Companies. Lock-up period applies after IPO.",
  },
  {
    value: "ESOP",
    label: "ESOP",
    badgeColor: "#c78a14",
    badgeBg: "rgba(199,138,20,0.12)",
    description:
      "Employee Share Ownership Plan. Governed by CSRC Guiding Opinions on ESOP (2014). Shares are held collectively through an asset management plan or trust, and employees hold beneficiary interests.",
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

// CSRC mandatory lock-up periods post-IPO
const lockupPeriodOptions = [
  { value: "none", label: "None / already unlocked" },
  { value: "12", label: "12 months" },
  { value: "24", label: "24 months" },
  { value: "36", label: "36 months" },
  { value: "custom", label: "Custom" },
];

// SAFE filing status
const safeStatusOptions = [
  { value: "not_required", label: "Not required" },
  { value: "pending", label: "Pending filing" },
  { value: "filed", label: "Filed" },
  { value: "expired", label: "Expired - renewal needed" },
];

// IIT brackets used in the SAT Circular 35 preferential calculation
// Taxable monthly income = spread / 12; then tax = bracket rate × 12
const IIT_BRACKETS = [
  { limit: 3000,   rate: 0.03, deduction: 0 },
  { limit: 12000,  rate: 0.10, deduction: 210 },
  { limit: 25000,  rate: 0.20, deduction: 1410 },
  { limit: 35000,  rate: 0.25, deduction: 2660 },
  { limit: 55000,  rate: 0.30, deduction: 4410 },
  { limit: 80000,  rate: 0.35, deduction: 7160 },
  { limit: Infinity, rate: 0.45, deduction: 15160 },
];

/**
 * SAT Circular 35 preferential IIT calculation for equity income.
 * spread = (FMV at exercise - strike price) × quantity
 * Monthly taxable = spread / 12
 * Annual IIT = (monthly taxable × rate - deduction) × 12
 */
function calcSATTax(spread) {
  if (!spread || spread <= 0) return 0;
  const monthly = spread / 12;
  const bracket = IIT_BRACKETS.find((b) => monthly <= b.limit) || IIT_BRACKETS[IIT_BRACKETS.length - 1];
  return (monthly * bracket.rate - bracket.deduction) * 12;
}

// ---------------------------------------------------------------------------
// Blank grant state — extended for Chinese standards
// ---------------------------------------------------------------------------
const blankGrant = {
  _id: null,
  // Company info
  name: "",
  ticker: "",
  companyStructure: "private",          // replaces simple public/private
  fairMarketValue: "",                   // 409A / latest valuation
  currentPrice: "",
  fxRateAtGrant: "",                     // exchange rate at grant date
  fxRateAtVest: "",                      // for IIT calculation on RSUs
  fxRateAtExercise: "",                  // for IIT calculation on options
  // Grant core
  grantType: "STOCK_OPTION",
  grantId: "",
  quantity: "",
  vestedQuantity: "",
  buyPrice: "",                          // strike price
  fmvAtExercise: "",                     // FMV at time of exercise (for IIT)
  buyDate: new Date().toISOString().slice(0, 10),
  expirationDate: "",
  postTerminationWindow: "90",           // days to exercise after leaving
  exercised: "",
  // Vesting
  hasVestingSchedule: true,
  vestingSchedule: "monthly_48_12",
  vestingStartDate: "",
  cliffMonths: "12",                     // user-defined, not hardcoded
  // China-specific
  safeFilingStatus: "not_required",      // SAFE Circular 7 registration
  safeFilingDeadline: "",
  lockupPeriod: "none",                  // CSRC post-IPO lock-up
  lockupExpiry: "",
  iitPreferentialMethod: true,           // SAT Circular 35 spread-12 method
  // Sale & net worth
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
  return `${String(asset?.ticker || "").trim().toUpperCase()}::${String(asset?.name || "").trim().toLowerCase()}`;
}

function getGrantTypeMeta(type) {
  return grantTypeOptions.find((g) => g.value === type) || grantTypeOptions[0];
}

function getScheduleLabel(value) {
  return vestingScheduleOptions.find((o) => o.value === value)?.label || "Immediate";
}

function getStructureLabel(value) {
  return companyStructureOptions.find((o) => o.value === value)?.label || value;
}

function getSafeLabel(value) {
  return safeStatusOptions.find((o) => o.value === value)?.label || value;
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
        background: "rgba(32, 28, 20, 0.45)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: `min(${width}px, calc(100vw - 24px))`,
          maxHeight: "min(92vh, 860px)",
          overflow: "auto",
          borderRadius: 20,
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          boxShadow: "0 28px 80px rgba(0,0,0,0.22)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, sublabel, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
        {label}
        {sublabel && <span style={{ marginLeft: 6, fontWeight: 400, color: "var(--text-muted)", fontSize: 11 }}>{sublabel}</span>}
      </span>
      {children}
    </label>
  );
}

function ModalFooter({ children, onClose, onBack, showBack = false }) {
  return (
    <div
      style={{
        marginTop: 20,
        padding: "12px 16px",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)", fontSize: 11.5, lineHeight: 1.45 }}>
        <Lock size={16} />
        <span>Your financial information is encrypted and secure.</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {showBack && <button type="button" onClick={onBack} style={secondaryButtonStyle}>Back</button>}
        {children}
      </div>
    </div>
  );
}

function InfoBadge({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(0,166,255,0.07)", border: "1px solid rgba(0,166,255,0.18)", marginTop: 10 }}>
      <AlertCircle size={14} style={{ color: "#00a6ff", marginTop: 1, flexShrink: 0 }} />
      <span style={{ fontSize: 12, lineHeight: 1.55, color: "var(--text-secondary)" }}>{text}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grant type selection modal
// ---------------------------------------------------------------------------
function GrantTypeModal({ selectedType, onSelect, onClose, onNext }) {
  return (
    <ModalShell onClose={onClose} width={660}>
      <div style={{ padding: "18px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={sectionLabelStyle}>Select Grant Type</div>
        <button type="button" onClick={onClose} style={{ ...buttonReset, color: "var(--text-secondary)", cursor: "pointer" }}><X size={18} /></button>
      </div>
      <div style={{ padding: "14px 16px 0", borderTop: "1px solid var(--border-subtle)", marginTop: 10 }}>
        <InfoBadge text="Grant types follow the applicable equity compensation rules for this page. SAT Circular 35 is referenced where relevant." />
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
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
                  border: `1px solid ${active ? "var(--text-secondary)" : "var(--border-subtle)"}`,
                  borderRadius: 12,
                  padding: "16px",
                  cursor: "pointer",
                  textAlign: "left",
                  background: active ? "rgba(0,0,0,0.02)" : "var(--bg-card)",
                  display: "grid",
                  gridTemplateColumns: "28px 1fr",
                  gap: 14,
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${active ? "#111" : "var(--text-secondary)"}`, marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {active && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#111" }} />}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 17, fontWeight: 500, color: "var(--text-primary)" }}>{option.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{option.labelEn}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: option.badgeColor, background: option.badgeBg, borderRadius: 999, padding: "4px 8px" }}>{option.badge}</div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>{option.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <ModalFooter onClose={onClose}>
        <button type="button" onClick={onNext} style={{ ...primaryButtonStyle, minWidth: 92 }}>Next</button>
      </ModalFooter>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Company structure modal  (replaces simple public/private)
// ---------------------------------------------------------------------------
function CompanyStructureModal({ companyStructure, onSelect, onClose, onNext }) {
  return (
    <ModalShell onClose={onClose} width={640}>
      <div style={{ padding: "18px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={sectionLabelStyle}>Company Structure</div>
        <button type="button" onClick={onClose} style={{ ...buttonReset, color: "var(--text-secondary)", cursor: "pointer" }}><X size={18} /></button>
      </div>
      <div style={{ padding: "20px 18px 0", borderTop: "1px solid var(--border-subtle)", marginTop: 12 }}>
        <div style={{ fontSize: 14, color: "var(--text-primary)" }}>What is the company's listing structure?</div>
        <InfoBadge text="VIE / Red-chip structures may require SAFE filing for employees holding equity in offshore entities." />
        <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
          {companyStructureOptions.map((choice) => (
            <button
              key={choice.value}
              type="button"
              onClick={() => onSelect(choice.value)}
              style={{ ...buttonReset, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", color: "var(--text-primary)", fontSize: 15 }}
            >
              <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--text-secondary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {companyStructure === choice.value && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#111" }} />}
              </span>
              {choice.label}
            </button>
          ))}
        </div>
      </div>
      <ModalFooter onClose={onClose}>
        <button type="button" onClick={onNext} style={{ ...primaryButtonStyle, minWidth: 92 }}>Next</button>
      </ModalFooter>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Company info modal — adds FX rate fields
// ---------------------------------------------------------------------------
function CompanyInfoModal({ form, setForm, onClose, onBack, onNext, saving, currency }) {
  const needsFx = ["us_listed", "hk_listed", "vie"].includes(form.companyStructure);
  return (
    <ModalShell onClose={onClose} width={640}>
      <div style={{ padding: "18px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={sectionLabelStyle}>Company Info</div>
        <button type="button" onClick={onClose} style={{ ...buttonReset, color: "var(--text-secondary)", cursor: "pointer" }}><X size={18} /></button>
      </div>
      <div style={{ padding: "14px 16px 0", borderTop: "1px solid var(--border-subtle)", marginTop: 10 }}>
        <div style={{ display: "grid", gap: 14, marginTop: 10 }}>
          <Field label="Company name">
            <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. ByteDance" style={inputStyle} />
          </Field>
          <Field label="Stock ticker">
            <input value={form.ticker} onChange={(e) => setForm((c) => ({ ...c, ticker: e.target.value.toUpperCase() }))} placeholder="e.g. 0700.HK or BABA" style={inputStyle} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label={`Latest valuation / FMV per share (${currency})`}>
              <input type="number" min="0" step="0.01" value={form.fairMarketValue} onChange={(e) => setForm((c) => ({ ...c, fairMarketValue: e.target.value }))} placeholder={formatCurrencyAmount(0, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} style={inputStyle} />
            </Field>
            <Field label="Current market price per share">
              <input type="number" min="0" step="0.01" value={form.currentPrice} onChange={(e) => setForm((c) => ({ ...c, currentPrice: e.target.value }))} placeholder={formatCurrencyAmount(0, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} style={inputStyle} />
            </Field>
          </div>
          {needsFx && (
            <>
              <InfoBadge text="For overseas-listed or VIE companies, IIT is calculated in the dashboard currency. Record the exchange rate at key dates for accurate tax reporting under SAT Circular 35." />
              <Field label="Exchange rate at grant date">
                <input type="number" min="0" step="0.0001" value={form.fxRateAtGrant} onChange={(e) => setForm((c) => ({ ...c, fxRateAtGrant: e.target.value }))} placeholder="e.g. 7.24" style={inputStyle} />
              </Field>
            </>
          )}
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            All monetary values should be entered in the dashboard currency unless your company's equity plan specifies a foreign currency.
          </div>
        </div>
      </div>
      <ModalFooter onClose={onClose} onBack={onBack} showBack>
        <button type="button" disabled={saving} onClick={onNext} style={{ ...primaryButtonStyle, minWidth: 92, opacity: saving ? 0.7 : 1 }}>Next</button>
      </ModalFooter>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Grant details modal — full Chinese-standard fields
// ---------------------------------------------------------------------------
function GrantDetailsModal({ title, form, setForm, onClose, onBack, onSubmit, saving, isEdit = false, currency }) {
  const meta = getGrantTypeMeta(form.grantType);
  const isOption = form.grantType === "STOCK_OPTION";
  const isRSU = form.grantType === "RSU";
  const isRestrictedShare = form.grantType === "RESTRICTED_SHARE";
  const isESOP = form.grantType === "ESOP";
  const needsFx = ["us_listed", "hk_listed", "vie"].includes(form.companyStructure);
  const hasVesting = isOption || isRSU || isRestrictedShare;

  // SAT Circular 35 IIT estimate
  const spread = (asNumber(form.fmvAtExercise) - asNumber(form.buyPrice)) * asNumber(form.exercised || form.quantity);
  const estimatedIIT = form.iitPreferentialMethod ? calcSATTax(spread) : 0;

  return (
    <ModalShell onClose={onClose} width={580}>
      <div style={{ padding: "18px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={sectionLabelStyle}>{title}</div>
        <button type="button" onClick={onClose} style={{ ...buttonReset, color: "var(--text-secondary)", cursor: "pointer" }}><X size={18} /></button>
      </div>
      <div style={{ padding: "14px 16px 0", borderTop: "1px solid var(--border-subtle)", marginTop: 10 }}>

        {/* Grant type badge */}
        <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
           <div style={{ fontSize: 17, color: "var(--text-primary)", fontWeight: 500 }}>{getGrantTypeMeta(form.grantType).label}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{meta.labelEn}</div>
          <span style={{ fontSize: 11, color: meta.badgeColor, background: meta.badgeBg, borderRadius: 999, padding: "4px 8px" }}>{meta.badge}</span>
        </div>

        {/* ── Section: Grant Details ─────────────────────── */}
        <div style={{ marginTop: 18, fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>Grant Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 14 }}>
          <Field label="Grant ID">
            <input value={form.grantId} onChange={(e) => setForm((c) => ({ ...c, grantId: e.target.value }))} placeholder="e.g. EQ-2024-001" style={inputStyle} />
          </Field>
          <Field label={isOption ? "Number of options" : "Number of shares"}>
            <input type="number" min="0" step="1" value={form.quantity} onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))} placeholder="Quantity" style={inputStyle} />
          </Field>
          <Field label="Vested quantity">
            <input type="number" min="0" step="1" value={form.vestedQuantity} onChange={(e) => {
              const v = asNumber(e.target.value);
              if (v > asNumber(form.quantity)) return toast.error("Vested quantity cannot exceed total quantity.");
              setForm((c) => ({ ...c, vestedQuantity: e.target.value }));
            }} placeholder="0" style={inputStyle} />
          </Field>
          {(isOption || isRestrictedShare) && (
            <Field label="Exercised shares">
              <input type="number" min="0" step="1" value={form.exercised} onChange={(e) => {
                const v = asNumber(e.target.value);
                if (v > asNumber(form.vestedQuantity || form.quantity)) return toast.error("Exercised cannot exceed vested quantity.");
                setForm((c) => ({ ...c, exercised: e.target.value }));
              }} placeholder="0" style={inputStyle} />
            </Field>
          )}
        </div>

        {/* ── Section: Price & Dates ────────────────────── */}
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={sectionLabelStyle}>{isOption ? "Option Terms" : "Share Terms"}</div>
          <div style={{ height: 1, flex: 1, background: "var(--border-subtle)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 12 }}>
          <Field label={isOption ? `Strike price (${currency})` : isRSU ? `Grant date FMV (${currency})` : `Purchase price (${currency})`}>
            <input type="number" min="0" step="0.01" value={form.buyPrice} onChange={(e) => setForm((c) => ({ ...c, buyPrice: e.target.value }))} placeholder={formatCurrencyAmount(0, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} style={inputStyle} />
          </Field>
          <Field label={isOption ? "Grant date" : "Grant / purchase date"}>
            <input type="date" value={form.buyDate} onChange={(e) => setForm((c) => ({ ...c, buyDate: e.target.value }))} style={inputStyle} />
          </Field>
          {isOption && (
            <>
              <Field label="Expiration date">
                <input type="date" value={form.expirationDate || ""} onChange={(e) => setForm((c) => ({ ...c, expirationDate: e.target.value }))} style={inputStyle} />
              </Field>
              <Field label="Post-termination exercise window (days)">
                <input type="number" min="0" step="1" value={form.postTerminationWindow} onChange={(e) => setForm((c) => ({ ...c, postTerminationWindow: e.target.value }))} placeholder="e.g. 90" style={inputStyle} />
              </Field>
            </>
          )}
        </div>

        {/* ── Section: IIT / Tax (SAT Circular 35) ─────── */}
        {isOption && (
          <>
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={sectionLabelStyle}>IIT Calculation (SAT Circular 35)</div>
              <div style={{ height: 1, flex: 1, background: "var(--border-subtle)" }} />
            </div>
            <InfoBadge text="Under SAT Circular 35, IIT on stock option income = (FMV at exercise - strike price) x shares, then taxed using the 12-month spread preferential method." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 14 }}>
              <Field label={`FMV per share at exercise (${currency})`}>
                <input type="number" min="0" step="0.01" value={form.fmvAtExercise} onChange={(e) => setForm((c) => ({ ...c, fmvAtExercise: e.target.value }))} placeholder={formatCurrencyAmount(0, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} style={inputStyle} />
              </Field>
              {needsFx && (
                <Field label="Exchange rate at exercise date">
                  <input type="number" min="0" step="0.0001" value={form.fxRateAtExercise} onChange={(e) => setForm((c) => ({ ...c, fxRateAtExercise: e.target.value }))} placeholder="e.g. 7.24" style={inputStyle} />
                </Field>
              )}
            </div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                onClick={() => setForm((c) => ({ ...c, iitPreferentialMethod: !c.iitPreferentialMethod }))}
                style={{ ...buttonReset, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--text-primary)", fontSize: 13 }}
              >
                <span style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid var(--text-secondary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {form.iitPreferentialMethod && <span style={{ width: 10, height: 10, borderRadius: 2, background: "#111" }} />}
                </span>
                Use SAT Circular 35 preferential 12-month spread method
              </button>
            </div>
            {spread > 0 && (
              <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(0,166,255,0.06)", border: "1px solid rgba(0,166,255,0.15)" }}>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Estimated IIT on exercise (pre-deductions)</div>
                <div style={{ marginTop: 4, fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>
                  {formatEquityAmount(estimatedIIT)}
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>Spread: {formatEquityAmount(spread)} · Consult a tax advisor for final figures.</div>
              </div>
            )}
          </>
        )}

        {isRSU && needsFx && (
          <>
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={sectionLabelStyle}>RSU Tax - Vest Date FX (SAT Circular 35)</div>
              <div style={{ height: 1, flex: 1, background: "var(--border-subtle)" }} />
            </div>
            <InfoBadge text="RSU income is taxed at vest. For overseas-listed companies, the dashboard-currency equivalent of the FMV at vest is used for IIT. Record the exchange rate at each vest event." />
            <div style={{ marginTop: 12 }}>
              <Field label="Exchange rate at vest date">
                <input type="number" min="0" step="0.0001" value={form.fxRateAtVest} onChange={(e) => setForm((c) => ({ ...c, fxRateAtVest: e.target.value }))} placeholder="e.g. 7.24" style={inputStyle} />
              </Field>
            </div>
          </>
        )}

        {/* ── Section: Vesting Schedule ─────────────────── */}
        {hasVesting && (
          <>
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={sectionLabelStyle}>Vesting Schedule</div>
              <div style={{ height: 1, flex: 1, background: "var(--border-subtle)" }} />
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 14, flexWrap: "wrap" }}>
              {[{ value: true, label: "Has vesting schedule" }, { value: false, label: "No schedule" }].map((choice) => (
                <button
                  key={String(choice.value)}
                  type="button"
                  onClick={() => setForm((c) => ({ ...c, hasVestingSchedule: choice.value }))}
                  style={{ ...buttonReset, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--text-primary)", fontSize: 14 }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--text-secondary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    {form.hasVestingSchedule === choice.value && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#111" }} />}
                  </span>
                  {choice.label}
                </button>
              ))}
            </div>
            {form.hasVestingSchedule && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 16 }}>
                <Field label="Vesting schedule">
                  <div style={{ position: "relative" }}>
                    <select value={form.vestingSchedule} onChange={(e) => setForm((c) => ({ ...c, vestingSchedule: e.target.value }))} style={{ ...inputStyle, appearance: "none", paddingRight: 42 }}>
                      {vestingScheduleOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <ChevronDown size={18} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  </div>
                </Field>
                <Field label="Vesting start date">
                  <input type="date" value={form.vestingStartDate} onChange={(e) => setForm((c) => ({ ...c, vestingStartDate: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Cliff period (months)">
                  <input type="number" min="0" step="1" value={form.cliffMonths} onChange={(e) => setForm((c) => ({ ...c, cliffMonths: e.target.value }))} placeholder="e.g. 12" style={inputStyle} />
                </Field>
              </div>
            )}
          </>
        )}

        {/* ── Section: CSRC Lock-up ────────────── */}
        {(isRestrictedShare || isRSU) && (
          <>
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={sectionLabelStyle}>CSRC Post-IPO Lock-up</div>
              <div style={{ height: 1, flex: 1, background: "var(--border-subtle)" }} />
            </div>
            <InfoBadge text="CSRC requires a mandatory lock-up after IPO. Employees: 12 months. Core management / founders: 36 months. Selling before lock-up expiry is prohibited." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 14 }}>
              <Field label="Lock-up period">
                <div style={{ position: "relative" }}>
                  <select value={form.lockupPeriod} onChange={(e) => setForm((c) => ({ ...c, lockupPeriod: e.target.value }))} style={{ ...inputStyle, appearance: "none", paddingRight: 42 }}>
                    {lockupPeriodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={18} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                </div>
              </Field>
              <Field label="Lock-up expiry date">
                <input type="date" value={form.lockupExpiry || ""} onChange={(e) => setForm((c) => ({ ...c, lockupExpiry: e.target.value }))} style={inputStyle} />
              </Field>
            </div>
          </>
        )}

        {/* ── Section: SAFE Filing ─────────────── */}
        {["us_listed", "hk_listed", "vie"].includes(form.companyStructure) && (
          <>
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={sectionLabelStyle}>SAFE Filing Status</div>
              <div style={{ height: 1, flex: 1, background: "var(--border-subtle)" }} />
            </div>
            <InfoBadge text="Chinese employees holding equity in offshore entities must register with SAFE (State Administration of Foreign Exchange) under Circular 7. Failure to file carries financial penalties." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 14 }}>
              <Field label="SAFE filing status">
                <div style={{ position: "relative" }}>
                  <select value={form.safeFilingStatus} onChange={(e) => setForm((c) => ({ ...c, safeFilingStatus: e.target.value }))} style={{ ...inputStyle, appearance: "none", paddingRight: 42 }}>
                    {safeStatusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={18} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                </div>
              </Field>
              <Field label="SAFE filing / renewal deadline" sublabel="optional">
                <input type="date" value={form.safeFilingDeadline || ""} onChange={(e) => setForm((c) => ({ ...c, safeFilingDeadline: e.target.value }))} style={inputStyle} />
              </Field>
            </div>
          </>
        )}

        {/* ── Section: ESOP specific ───────────────────── */}
        {isESOP && (
          <>
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={sectionLabelStyle}>ESOP Plan Details</div>
              <div style={{ height: 1, flex: 1, background: "var(--border-subtle)" }} />
            </div>
            <InfoBadge text="Under CSRC Guiding Opinions on ESOP (2014), shares are held via an asset management plan or trust. Lock-up applies from the date of transfer into the plan." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 14 }}>
              <Field label={`Plan purchase price per share (${currency})`}>
                <input type="number" min="0" step="0.01" value={form.buyPrice} onChange={(e) => setForm((c) => ({ ...c, buyPrice: e.target.value }))} placeholder={formatCurrencyAmount(0, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} style={inputStyle} />
              </Field>
              <Field label="Lock-up expiry date">
                <input type="date" value={form.lockupExpiry || ""} onChange={(e) => setForm((c) => ({ ...c, lockupExpiry: e.target.value }))} style={inputStyle} />
              </Field>
            </div>
          </>
        )}

        {/* ── Section: Sale & Net Worth ─────────────────── */}
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={sectionLabelStyle}>Realisation & Net Worth</div>
          <div style={{ height: 1, flex: 1, background: "var(--border-subtle)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 12 }}>
          <Field label={`Sale price per share (${currency})`} sublabel="if sold">
            <input type="number" min="0" step="0.01" value={form.salePrice || ""} onChange={(e) => setForm((c) => ({ ...c, salePrice: e.target.value }))} placeholder={formatCurrencyAmount(0, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} style={inputStyle} />
          </Field>
        </div>
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => setForm((c) => ({ ...c, includeInNetWorth: !c.includeInNetWorth }))}
            style={{ ...buttonReset, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--text-primary)", fontSize: 13 }}
          >
            <span style={{ width: 18, height: 18, borderRadius: 4, border: "2px solid var(--text-secondary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              {form.includeInNetWorth && <span style={{ width: 10, height: 10, borderRadius: 2, background: "#111" }} />}
            </span>
            Include in net worth calculation
          </button>
        </div>

        {/* ── Notes ─────────────────────────────────────── */}
        <div style={{ marginTop: 14 }}>
          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} rows={2} placeholder="Any additional details..." style={{ ...inputStyle, padding: "10px 12px", resize: "vertical", minHeight: 64 }} />
          </Field>
        </div>
      </div>

      <ModalFooter onClose={onClose} onBack={onBack} showBack={!isEdit}>
        <button type="button" disabled={saving} onClick={onSubmit} style={{ ...primaryButtonStyle, minWidth: 92, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving..." : isEdit ? "Save changes" : "Add grant"}
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Value estimate sidebar
// ---------------------------------------------------------------------------
function ValueEstimateSidebar({ company, grants, currency, onClose }) {
  const formatEquityAmount = (value, options = {}) => formatCurrencyAmount(value, currency, { maximumFractionDigits: 0, ...options });

  const groups = grantTypeOptions
    .map((type) => ({ ...type, grants: grants.filter((g) => g.grantType === type.value) }))
    .filter((g) => g.grants.length > 0);

  const totalEstimated = grants.reduce((sum, g) => sum + asNumber(g.currentValue), 0);
  const [openGroup, setOpenGroup] = useState(groups[0]?.value || null);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 240, background: "rgba(32,28,20,0.40)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: 12, right: 12, bottom: 12,
          width: "min(440px, calc(100vw - 24px))",
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          borderRadius: 20,
          boxShadow: "0 28px 80px rgba(0,0,0,0.22)",
          overflow: "auto",
        }}
      >
        <div style={{ padding: "18px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={sectionLabelStyle}>Value Estimate</div>
          <button type="button" onClick={onClose} style={{ ...buttonReset, color: "var(--text-secondary)", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 16px 22px", borderTop: "1px solid var(--border-subtle)", marginTop: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)" }}>Net equity value estimate (pre-IIT)</div>
          <InfoBadge text="This estimate does not deduct IIT. Equity income is subject to IIT under SAT Circular 35. Consult a qualified tax advisor for post-tax figures." />

          <div style={{ marginTop: 24, display: "grid", gap: 18 }}>
            {groups.map((group) => (
              <div key={group.value}>
                <div style={sectionLabelStyle}>{group.badge}</div>
                <div style={{ marginTop: 10, border: "1px solid var(--border-subtle)", borderRadius: 18, overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setOpenGroup((c) => (c === group.value ? null : group.value))}
                    style={{ ...buttonReset, width: "100%", padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", color: "var(--text-primary)", fontSize: 14 }}
                  >
                    <span>{company.name} {new Date(group.grants[0].buyDate || Date.now()).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-secondary)" }}>
                      {formatEquityAmount(group.grants.reduce((s, g) => s + asNumber(g.currentValue), 0))}
                      <ChevronDown size={16} style={{ transform: openGroup === group.value ? "rotate(180deg)" : "none" }} />
                    </span>
                  </button>
                  {openGroup === group.value && (
                    <div style={{ padding: "0 18px 18px" }}>
                      {group.grants.map((grant) => (
                        <div key={grant._id} style={{ marginTop: 10, background: "rgba(15,23,42,0.03)", borderRadius: 14, padding: "12px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "0.7fr 16px 0.7fr 16px 0.7fr", gap: 6, alignItems: "center", fontSize: 12 }}>
                            <div>
                              <div style={{ fontSize: 18, fontWeight: 500, color: "var(--text-primary)" }}>{grant.quantity}</div>
                              <div style={{ marginTop: 2, fontSize: 10, color: "var(--text-secondary)" }}>Shares</div>
                            </div>
                            <div style={{ fontSize: 14, color: "var(--text-primary)", textAlign: "center" }}>×</div>
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{formatEquityAmount(grant.currentPrice || company.latestSharePrice || 0)}</div>
                              <div style={{ marginTop: 2, fontSize: 10, color: "var(--text-secondary)" }}>Price</div>
                            </div>
                            <div style={{ fontSize: 14, color: "var(--text-primary)", textAlign: "center" }}>−</div>
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{formatEquityAmount(grant.buyPrice || 0)}</div>
                              <div style={{ marginTop: 2, fontSize: 10, color: "var(--text-secondary)" }}>Strike</div>
                            </div>
                          </div>
                          {/* IIT estimate row */}
                          {grant.grantType === "STOCK_OPTION" && asNumber(grant.fmvAtExercise) > 0 && (
                            <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(255,100,70,0.07)", fontSize: 11, color: "var(--text-secondary)" }}>
                              Est. IIT (SAT Circular 35): {formatEquityAmount(calcSATTax((asNumber(grant.fmvAtExercise) - asNumber(grant.buyPrice)) * asNumber(grant.quantity)))}
                            </div>
                          )}
                          {/* SAFE filing warning */}
                          {grant.safeFilingStatus === "pending" && (
                            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#f59e0b" }}>
                              <AlertCircle size={12} /> SAFE filing pending
                            </div>
                          )}
                          {grant.safeFilingStatus === "expired" && (
                            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#ef4444" }}>
                              <AlertCircle size={12} /> SAFE registration expired — renewal required
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

          <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 16, background: "rgba(128,208,255,0.30)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Total equity (pre-IIT)</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)" }}>
              {formatEquityAmount(totalEstimated)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>IIT deducted separately per grant event under SAT Circular 35.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insight cards
// ---------------------------------------------------------------------------
function InsightCard({ title, value, detail, tint }) {
  return (
    <div style={{ minWidth: 240, maxWidth: 260, border: "1px solid var(--border-subtle)", borderRadius: 18, padding: "18px 16px", background: "var(--bg-card)" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: tint.bg, color: tint.fg, fontSize: 12, fontWeight: 500 }}>{title}</div>
      <div style={{ marginTop: 16, fontSize: 18, fontWeight: 500, color: "var(--text-primary)" }}>{value}</div>
      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: "var(--text-secondary)" }}>{detail}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirm modal
// ---------------------------------------------------------------------------
function DeleteConfirmModal({ onClose, onConfirm, deleting }) {
  return (
    <ModalShell onClose={onClose} width={420}>
      <div style={{ padding: "24px 20px" }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)" }}>Delete this grant?</div>
        <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-secondary)" }}>This action cannot be undone. All data for this grant record will be permanently removed.</div>
        <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
          <button type="button" disabled={deleting} onClick={onConfirm} style={{ ...primaryButtonStyle, background: "#dc2626", borderColor: "#dc2626", opacity: deleting ? 0.7 : 1 }}>
            {deleting ? "Deleting..." : "Delete grant"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Main Equity component
// ---------------------------------------------------------------------------
export default function Equity() {
  const { assets = [], loading, refreshAssets } = usePortfolio();
  const { user } = useAuthContext();
  const currency = getUserCurrency(user);
  const formatEquityAmount = (value, options = {}) => formatCurrencyAmount(value, currency, { maximumFractionDigits: 0, ...options });

  const insightsRef = useRef(null);
  const scrollInsights = (dir) => {
    if (insightsRef.current) insightsRef.current.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
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

  const equityAssets = useMemo(() => assets.filter((a) => a.assetType === "equity"), [assets]);

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
      cur.fairMarketValue = asNumber(asset.fairMarketValue || cur.fairMarketValue);
      cur.latestSharePrice = asNumber(asset.currentPrice || asset.buyPrice || cur.latestSharePrice);
      cur.lots.push(asset);
      grouped.set(id, cur);
    });
    return Array.from(grouped.values());
  }, [equityAssets]);

  useEffect(() => {
    if (!companies.length) { setSelectedCompanyId(""); return; }
    if (!companies.some((c) => c.id === selectedCompanyId)) setSelectedCompanyId(companies[0].id);
  }, [companies, selectedCompanyId]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0] || null;
  const companyGrants = selectedCompany?.lots || [];
  const visibleCompanyGrants = companyGrants.filter((g) => g.includeInNetWorth !== false);

  // ── Overview stats (Chinese context) ──────────────────────────────────────
  const overviewStats = useMemo(() => {
    const totalShares = visibleCompanyGrants.reduce((s, g) => s + asNumber(g.quantity), 0);
    const vestedShares = visibleCompanyGrants.reduce((s, g) => {
      if (g.hasVestingSchedule === false) return s + asNumber(g.quantity);
      return s + Math.min(asNumber(g.quantity), asNumber(g.vestedQuantity) || asNumber(g.quantity));
    }, 0);
    const unvestedShares = Math.max(0, totalShares - vestedShares);
    const estimatedGrantValue = visibleCompanyGrants.reduce((s, g) => s + asNumber(g.currentValue), 0);
    const vestedValue = visibleCompanyGrants.reduce((s, g) => {
      const price = asNumber(g.currentPrice) || asNumber(g.currentValue) / Math.max(1, asNumber(g.quantity));
      const vested = g.hasVestingSchedule === false ? asNumber(g.quantity) : Math.min(asNumber(g.quantity), asNumber(g.vestedQuantity) || asNumber(g.quantity));
      return s + price * vested;
    }, 0);
    const unvestedValue = Math.max(0, estimatedGrantValue - vestedValue);

    // SAT Circular 35 IIT across all exercised grants
    const totalIIT = visibleCompanyGrants.reduce((s, g) => {
      if (g.grantType !== "STOCK_OPTION" || !g.fmvAtExercise) return s;
      const spread = (asNumber(g.fmvAtExercise) - asNumber(g.buyPrice)) * asNumber(g.exercised || 0);
      return s + calcSATTax(spread);
    }, 0);

    const exerciseCost = visibleCompanyGrants.reduce((s, g) => s + asNumber(g.exercised) * asNumber(g.buyPrice), 0);
    const exerciseGain = visibleCompanyGrants.reduce((s, g) => {
      const price = asNumber(g.currentPrice) || asNumber(g.currentValue) / Math.max(1, asNumber(g.quantity));
      return s + Math.max(0, price - asNumber(g.buyPrice)) * asNumber(g.exercised);
    }, 0);

    // SAFE / compliance flags
    const safeIssues = visibleCompanyGrants.filter((g) => ["pending", "expired"].includes(g.safeFilingStatus)).length;
    const lockedGrants = visibleCompanyGrants.filter((g) => g.lockupExpiry && new Date(g.lockupExpiry) > new Date()).length;

    return { totalShares, estimatedGrantValue, vestedShares, unvestedShares, vestedValue, unvestedValue, exerciseCost, exerciseGain, totalIIT, safeIssues, lockedGrants };
  }, [visibleCompanyGrants]);

  const chartData = useMemo(() => {
    if (!visibleCompanyGrants.length) return [];
    
    const grants = visibleCompanyGrants.slice().sort((a, b) => new Date(a.buyDate) - new Date(b.buyDate));
    
    // Find earliest buy date and today
    const earliestDate = new Date(grants[0].buyDate || Date.now());
    const today = new Date();
    
    // Create timeline from first grant to today
    const timelineMap = new Map();
    
    // Generate monthly timeline
    const currentDate = new Date(earliestDate);
    while (currentDate <= today) {
      const key = currentDate.toISOString().split('T')[0];
      const label = currentDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      timelineMap.set(key, { label, date: new Date(currentDate), vested: 0, total: 0 });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Add today if not already present
    const todayKey = today.toISOString().split('T')[0];
    if (!timelineMap.has(todayKey)) {
      const label = today.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      timelineMap.set(todayKey, { label, date: new Date(today), vested: 0, total: 0 });
    }
    
    // Calculate vested/total for each grant at each timeline point
    grants.forEach((g) => {
      const quantity = asNumber(g.quantity);
      const buyDate = new Date(g.buyDate || Date.now());
      const vestStartDate = g.vestingStartDate ? new Date(g.vestingStartDate) : buyDate;
      const hasVesting = g.hasVestingSchedule !== false;
      
      // Parse vesting schedule
      const vestingSchedule = g.vestingSchedule || "monthly_48_12";
      const scheduleMatch = vestingSchedule.match(/(\w+)_(\d+)_(\d+)/);
      let monthlyRate = 1/48;
      let cliffMonths = 12;
      
      if (scheduleMatch) {
        const [, frequency, totalMonths, cliff] = scheduleMatch;
        if (totalMonths) monthlyRate = 1 / parseInt(totalMonths);
        if (cliff) cliffMonths = parseInt(cliff);
      }
      
      // For each date in timeline, calculate vesting
      timelineMap.forEach((entry) => {
        const entryDate = entry.date;
        entry.total += quantity;
        
        if (!hasVesting) {
          // No vesting - all shares immediately after buy date
          if (entryDate >= buyDate) {
            entry.vested += quantity;
          }
        } else {
          // Calculate vested amount at this date
          if (entryDate < vestStartDate) {
            // Before vesting starts - 0 vested
            entry.vested += 0;
          } else {
            // Calculate months since vesting start
            let monthsSinceStart = 0;
            const tempDate = new Date(vestStartDate);
            while (tempDate <= entryDate) {
              if (tempDate.getMonth() !== vestStartDate.getMonth() || tempDate.getFullYear() !== vestStartDate.getFullYear()) {
                monthsSinceStart++;
              }
              tempDate.setMonth(tempDate.getMonth() + 1);
            }
            
            if (monthsSinceStart < cliffMonths) {
              // Before cliff - 0 vested
              entry.vested += 0;
            } else {
              // After cliff - calculate progressive vesting
              const vestedMonths = monthsSinceStart - cliffMonths + 1;
              let vestedAmount = quantity * monthlyRate * vestedMonths;
              vestedAmount = Math.min(vestedAmount, quantity);
              entry.vested += vestedAmount;
            }
          }
        }
      });
    });
    
    // Convert to array, sort by date, remove duplicates by date key
    const result = Array.from(timelineMap.values())
      .sort((a, b) => a.date - b.date)
      .map((entry) => ({ label: entry.label, vested: Math.round(entry.vested * 100) / 100, total: Math.round(entry.total * 100) / 100 }));
    
    return result;
  }, [visibleCompanyGrants]);

  const insightCards = useMemo(() => {
    const currentValue = overviewStats.estimatedGrantValue;
    const postTaxEstimate = Math.max(0, currentValue - overviewStats.totalIIT);
    return [
      {
        title: "Current equity value",
        value: formatEquityAmount(currentValue),
        detail: "Pre-IIT estimated value of all visible equity grants.",
        tint: { bg: "rgba(242,182,255,0.18)", fg: "#d870ff" },
      },
      {
        title: "Estimated IIT (SAT Circular 35)",
        value: formatEquityAmount(overviewStats.totalIIT),
        detail: "Estimated IIT on exercised options using the 12-month spread method. Consult a tax advisor.",
        tint: { bg: "rgba(255,146,110,0.14)", fg: "#ff6c47" },
      },
      {
        title: "Post-IIT estimate",
        value: formatEquityAmount(postTaxEstimate),
        detail: "Rough post-tax value based on SAT Circular 35 calculation. Actual tax may vary.",
        tint: { bg: "rgba(0,200,130,0.12)", fg: "#00a67d" },
      },
      {
        title: "Unvested value",
        value: formatEquityAmount(overviewStats.unvestedValue),
        detail: `Value tied to ${overviewStats.unvestedShares} unvested shares not yet accessible.`,
        tint: { bg: "rgba(255,229,122,0.20)", fg: "#b69200" },
      },
      {
        title: "Compliance alerts",
        value: `${overviewStats.safeIssues} SAFE · ${overviewStats.lockedGrants} locked`,
        detail: "Grants with pending/expired SAFE filing or active CSRC lock-up periods.",
        tint: { bg: "rgba(255,180,180,0.20)", fg: "#ff5c5c" },
      },
    ];
  }, [overviewStats]);

  // ── Flow helpers ───────────────────────────────────────────────────────────
  const resetFlow = () => { setFlow(null); setForm(blankGrant); setEditingAssetId(null); };

  const startAddGrant = () => {
    setForm({
      ...blankGrant,
      name: selectedCompany?.name || "",
      ticker: selectedCompany?.ticker || "",
      companyStructure: selectedCompany?.companyStructure || "private",
      fairMarketValue: selectedCompany?.fairMarketValue ? String(selectedCompany.fairMarketValue) : "",
      currentPrice: selectedCompany?.latestSharePrice ? String(selectedCompany.latestSharePrice) : "",
    });
    setFlow("grant-type");
  };

  const startAddCompany = () => { setForm(blankGrant); setFlow("company-structure"); };

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
      buyDate: grant.buyDate ? new Date(grant.buyDate).toISOString().slice(0, 10) : blankGrant.buyDate,
      expirationDate: grant.expirationDate ? new Date(grant.expirationDate).toISOString().slice(0, 10) : "",
      postTerminationWindow: String(grant.postTerminationWindow ?? "90"),
      exercised: String(grant.exercised ?? ""),
      hasVestingSchedule: grant.hasVestingSchedule ?? true,
      vestingSchedule: grant.vestingSchedule || "monthly_48_12",
      vestingStartDate: grant.vestingStartDate ? new Date(grant.vestingStartDate).toISOString().slice(0, 10) : "",
      cliffMonths: String(grant.cliffMonths ?? "12"),
      safeFilingStatus: grant.safeFilingStatus || "not_required",
      safeFilingDeadline: grant.safeFilingDeadline ? new Date(grant.safeFilingDeadline).toISOString().slice(0, 10) : "",
      lockupPeriod: grant.lockupPeriod || "none",
      lockupExpiry: grant.lockupExpiry ? new Date(grant.lockupExpiry).toISOString().slice(0, 10) : "",
      iitPreferentialMethod: grant.iitPreferentialMethod !== false,
      salePrice: String(grant.salePrice ?? ""),
      includeInNetWorth: grant.includeInNetWorth !== false,
      notes: grant.notes || "",
    });
    setFlow("edit-grant");
  };

  // ── Save grant ─────────────────────────────────────────────────────────────
  const saveGrant = async () => {
    if (!form.name.trim() || !form.grantId.trim() || !String(form.quantity).trim()) {
      toast.error("Company name, grant ID, and quantity are required.");
      return;
    }
    if (["a_share", "hk_listed", "us_listed"].includes(form.companyStructure) && !form.ticker.trim()) {
      toast.error("Stock ticker is required for listed companies.");
      return;
    }
    if (asNumber(form.exercised) > asNumber(form.vestedQuantity || form.quantity)) {
      toast.error("Exercised shares cannot exceed vested quantity.");
      return;
    }

    setSaving(true);
    try {
      const inferredPrice = asNumber(form.currentPrice) || asNumber(form.fairMarketValue);
      const payload = {
        assetType: "equity",
        name: form.name.trim(),
        ticker: form.ticker.trim() ? form.ticker.trim().toUpperCase() : null,
        companyStructure: form.companyStructure,
        fairMarketValue: asNumber(form.fairMarketValue),
        currentPrice: inferredPrice,
        fxRateAtGrant: asNumber(form.fxRateAtGrant) || null,
        fxRateAtVest: asNumber(form.fxRateAtVest) || null,
        fxRateAtExercise: asNumber(form.fxRateAtExercise) || null,
        grantType: form.grantType,
        grantId: form.grantId.trim(),
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
    if (!form.name.trim()) { toast.error("Company name is required."); return; }
    setSaving(true);
    try {
      await Promise.all(
        companyGrants.map((g) =>
          cryptoService.update(g._id, {
            name: form.name.trim(),
            ticker: form.ticker.trim().toUpperCase(),
            companyStructure: form.companyStructure,
            fairMarketValue: asNumber(form.fairMarketValue),
            currentPrice: asNumber(form.currentPrice) || asNumber(form.fairMarketValue),
            fxRateAtGrant: asNumber(form.fxRateAtGrant) || null,
          })
        )
      );
      await refreshAssets();
      toast.success("Company info updated.");
      resetFlow();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to update company.");
    } finally {
      setSaving(false);
    }
  };

  const toggleIncludeInNetWorth = async (grant) => {
    try {
      await cryptoService.update(grant._id, { includeInNetWorth: grant.includeInNetWorth === false });
      await refreshAssets();
      toast.success(grant.includeInNetWorth === false ? "Included in net worth." : "Excluded from net worth.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to update visibility.");
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        .equity-tabs button:hover { background: rgba(0,0,0,0.04); }
        .equity-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: 16px; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .equity-grid { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 16px; }
        .equity-summary-grid { display: grid; grid-template-columns: 1fr 160px 160px; gap: 16px; align-items: end; }
        .equity-table { width: 100%; border-collapse: collapse; }
        .equity-table th { text-align: left; font-size: 11px; color: var(--text-muted); font-weight: 600; padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); letter-spacing: 0.04em; text-transform: uppercase; }
        .equity-table td { padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); vertical-align: top; color: var(--text-primary); }
        .safe-badge-pending { display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#d97706;background:rgba(251,191,36,0.12);border-radius:999px;padding:3px 8px; }
        .safe-badge-expired { display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#dc2626;background:rgba(220,38,38,0.10);border-radius:999px;padding:3px 8px; }
        .safe-badge-filed { display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#16a34a;background:rgba(22,163,74,0.10);border-radius:999px;padding:3px 8px; }
        @media (max-width: 1100px) { .equity-grid { grid-template-columns: 1fr; } }
        @media (max-width: 760px) {
          .equity-summary-grid { grid-template-columns: 1fr; }
          .equity-table-wrap { overflow-x: auto; }
          .equity-table { min-width: 1060px; }
        }
      `}</style>

      {/* Tab bar */}
      <div className="equity-tabs" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {[{ value: "overview", label: "Overview" }, { value: "portfolio", label: "Portfolio" }].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveSubTab(tab.value)}
            style={{ ...buttonReset, padding: "10px 14px", borderRadius: 10, cursor: "pointer", color: "var(--text-primary)", fontSize: 15, background: activeSubTab === tab.value ? "rgba(0,0,0,0.04)" : "transparent" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {!loading && !selectedCompany && (
        <div className="equity-card" style={{ padding: 24 }}>
          <div style={sectionLabelStyle}>Equity</div>
          <div style={{ marginTop: 10, fontSize: 16, fontWeight: 500, color: "var(--text-primary)" }}>No grants added yet.</div>
          <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-secondary)" }}>Supports stock options, RSUs, restricted stock, and employee stock ownership plans.</div>
          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button type="button" onClick={startAddCompany} style={secondaryButtonStyle}>Add company</button>
            <button type="button" onClick={startAddGrant} style={primaryButtonStyle}>Add grant</button>
          </div>
        </div>
      )}

      {/* Overview tab */}
      {activeSubTab === "overview" && selectedCompany && (
        <div className="equity-grid">
          <div style={{ display: "grid", gap: 16 }}>
            {/* Company card */}
            <div className="equity-card">
              <div style={{ padding: 18 }}>
                <div style={{ width: "100%", maxWidth: 350 }}>
                  <div style={sectionLabelStyle}>Company</div>
                  <div style={{ position: "relative" }}>
                    <select value={selectedCompany.id} onChange={(e) => setSelectedCompanyId(e.target.value)} style={{ ...inputStyle, appearance: "none", paddingRight: 36 }}>
                      {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={18} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  </div>
                </div>
                <div style={{ marginTop: 16, fontSize: 18, fontWeight: 500, color: "var(--text-primary)" }}>{selectedCompany.name}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>{getStructureLabel(selectedCompany.companyStructure)}</div>
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 24, color: "var(--text-secondary)", fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Latest price: <span style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 600 }}>{formatEquityAmount(selectedCompany.latestSharePrice || 0, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    FMV / 409A: <span style={{ color: "var(--text-primary)", fontSize: 14 }}>{formatEquityAmount(selectedCompany.fairMarketValue || 0, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
                {/* SAFE / compliance alerts */}
                {overviewStats.safeIssues > 0 && (
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertCircle size={14} style={{ color: "#ef4444", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {overviewStats.safeIssues} grant{overviewStats.safeIssues > 1 ? "s" : ""} with SAFE filing issues
                    </span>
                  </div>
                )}
              </div>
              <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "16px 18px" }}>
                <div className="equity-summary-grid">
                  <div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Estimated net grant value (pre-IIT)</div>
                    <div style={{ marginTop: 6, fontSize: 28, lineHeight: 1, fontWeight: 600, color: "var(--text-primary)" }}>
                      {formatEquityAmount(overviewStats.estimatedGrantValue)}
                    </div>
                    <div style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: 12 }}>{overviewStats.totalShares} shares</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Vested</div>
                    <div style={{ marginTop: 6, fontSize: 22, fontWeight: 600, color: "var(--text-primary)" }}>
                      {formatEquityAmount(overviewStats.vestedValue)}
                    </div>
                    <div style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: 12 }}>{overviewStats.vestedShares} shares</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Unvested</div>
                    <div style={{ marginTop: 6, fontSize: 22, fontWeight: 600, color: "var(--text-primary)" }}>
                      {formatEquityAmount(overviewStats.unvestedValue)}
                    </div>
                    <div style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: 12 }}>{overviewStats.unvestedShares} shares</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vesting chart */}
            <div className="equity-card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 18px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={sectionLabelStyle}>Vesting Schedule</div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8 }}>Number of shares</div>
                <div style={{ height: 340, minHeight: 0, minWidth: 0, width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 20, right: 12, left: 0, bottom: 24 }}>
                      <defs>
                        <linearGradient id="equityVestedFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2892ff" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#2892ff" stopOpacity={0.08} />
                        </linearGradient>
                        <linearGradient id="equityTotalFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#74b9ff" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#74b9ff" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        stroke="var(--border-subtle)" 
                        vertical={true}
                        horizontalPoints={[0, 60, 120, 180, 240]}
                      />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fill: "var(--text-muted)", fontSize: 12 }} 
                        axisLine={false} 
                        tickLine={false}
                        interval={Math.max(0, Math.floor(chartData.length / 6))}
                      />
                      <YAxis 
                        tick={{ fill: "var(--text-muted)", fontSize: 12 }} 
                        axisLine={false} 
                        tickLine={false}
                        allowDecimals={true}
                        type="number"
                        width={45}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 12, 
                          border: "1px solid var(--border-default)", 
                          background: "var(--bg-card)", 
                          color: "var(--text-primary)",
                          padding: "12px 14px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                        }}
                        formatter={(value) => [value.toFixed(1), '']}
                        labelStyle={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 500 }}
                      />
                      <Area 
                        type="natural" 
                        dataKey="vested" 
                        name="Vested" 
                        stroke="#2892ff" 
                        fill="url(#equityVestedFill)" 
                        strokeWidth={3}
                        isAnimationActive={false}
                        dot={false}
                        activeDot={{ r: 6, fill: "#2892ff", stroke: "var(--bg-card)", strokeWidth: 2 }}
                      />
                      <Area 
                        type="natural" 
                        dataKey="total" 
                        name="Total Shares" 
                        stroke="#a8d4ff" 
                        fill="url(#equityTotalFill)" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        isAnimationActive={false}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "grid", gap: 16, alignSelf: "start" }}>
            <div className="equity-card" style={{ padding: 16 }}>
              <div style={sectionLabelStyle}>How It's Calculated</div>
              <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.5, color: "var(--text-primary)" }}>
                View a breakdown of your equity estimate including SAT Circular 35 IIT calculations and SAFE filing status.
              </div>
              <button type="button" onClick={() => setShowValueEstimate(true)} style={{ ...secondaryButtonStyle, width: "100%", marginTop: 14 }}>View value breakdown</button>
            </div>
            <div className="equity-card" style={{ padding: 16 }}>
              <div style={sectionLabelStyle}>Exercise Cost & IIT Estimate</div>
              <div style={{ height: 220, marginTop: 18, minHeight: 0, minWidth: 0, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Cost of exercise", value: overviewStats.exerciseCost || 0.0001 },
                        { name: "IIT estimate", value: overviewStats.totalIIT || 0.0001 },
                      ]}
                      innerRadius={72} outerRadius={92} startAngle={90} endAngle={-270} dataKey="value" stroke="none"
                    >
                      <Cell fill="#8ac5ff" />
                      <Cell fill="#f2b250" />
                    </Pie>
                    <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" fill="var(--text-primary)" style={{ fontSize: 16, fontWeight: 600 }}>
                      {formatEquityAmount(overviewStats.exerciseCost + overviewStats.totalIIT)}
                    </text>
                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" fill="var(--text-primary)" style={{ fontSize: 11 }}>Total exercise cost</text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: 2, display: "grid", gap: 12, fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#8ac5ff", display: "inline-block" }} />
                    Cost of exercise
                  </div>
                  <div>{formatEquityAmount(overviewStats.exerciseCost)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#f2b250", display: "inline-block" }} />
                    IIT estimate · SAT Circular 35
                  </div>
                  <div>{formatEquityAmount(overviewStats.totalIIT)}</div>
                </div>
              </div>
              <div style={{ marginTop: 14, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                IIT estimated using the preferential 12-month spread method. Final liability depends on other income and deductions.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights row */}
      {activeSubTab === "overview" && selectedCompany && (
        <div className="equity-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={sectionLabelStyle}>Insights</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" onClick={() => scrollInsights("left")} style={{ ...buttonReset, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                <ChevronLeft size={16} />
              </button>
              <button type="button" onClick={() => scrollInsights("right")} style={{ ...buttonReset, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div ref={insightsRef} className="hide-scrollbar" style={{ padding: "16px 18px", overflowX: "auto" }}>
            <div style={{ display: "flex", gap: 16, minWidth: "max-content" }}>
              {insightCards.map((card) => (
                <InsightCard key={card.title} title={card.title} value={card.value} detail={card.detail} tint={card.tint} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Portfolio tab */}
      {activeSubTab === "portfolio" && selectedCompany && (
        <div className="equity-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "18px 16px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)" }}>{selectedCompany.name}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>{getStructureLabel(selectedCompany.companyStructure)}</div>
                <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 28, color: "var(--text-secondary)", fontSize: 13 }}>
                  <div>Latest price: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatEquityAmount(selectedCompany.latestSharePrice || 0)}</span></div>
                  <div>FMV (409A): <span style={{ color: "var(--text-primary)" }}>{formatEquityAmount(selectedCompany.fairMarketValue || 0)}</span></div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    setForm((c) => ({
                      ...c,
                      name: selectedCompany.name,
                      ticker: selectedCompany.ticker,
                      companyStructure: selectedCompany.companyStructure,
                      fairMarketValue: String(selectedCompany.fairMarketValue || ""),
                      currentPrice: String(selectedCompany.latestSharePrice || ""),
                    }));
                    setFlow("edit-company");
                  }}
                  style={secondaryButtonStyle}
                >
                  Edit info
                </button>
                <button type="button" onClick={startAddGrant} style={{ ...primaryButtonStyle, display: "flex", alignItems: "center", gap: 8 }}>
                  <Plus size={18} /> Add grant
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 22, borderTop: "1px solid var(--border-subtle)", padding: "22px 16px 0" }}>
            <div className="equity-table-wrap">
              <table className="equity-table">
                <thead>
                  <tr>
                    <th>Grant</th>
                    <th>Quantity</th>
                    <th>Grant date</th>
                    <th>Vesting</th>
                    <th>Strike / price</th>
                    <th>SAFE status</th>
                    <th>Lock-up</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {companyGrants.map((grant) => {
                    const meta = getGrantTypeMeta(grant.grantType);
                    const lockupActive = grant.lockupExpiry && new Date(grant.lockupExpiry) > new Date();
                    return (
                      <tr key={grant._id} style={{ opacity: grant.includeInNetWorth === false ? 0.55 : 1 }}>
                        <td>
                          <div style={{ fontSize: 13 }}>{selectedCompany.name}</div>
                          <span style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: meta.badgeColor, background: meta.badgeBg, borderRadius: 999, padding: "4px 8px" }}>
                            {meta.labelEn} · {meta.label}
                          </span>
                          {grant.grantId && <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>{grant.grantId}</div>}
                        </td>
                        <td>
                          <div style={{ fontSize: 15 }}>{grant.quantity}</div>
                          <div style={{ marginTop: 3, color: "var(--text-secondary)", fontSize: 12 }}>
                            {grant.vestedQuantity ? `${grant.vestedQuantity} vested` : ""}
                            {grant.exercised ? ` · ${grant.exercised} exercised` : ""}
                          </div>
                        </td>
                        <td style={{ fontSize: 14 }}>
                          {grant.buyDate ? new Date(grant.buyDate).toLocaleDateString("en-US") : "—"}
                          {grant.expirationDate && (
                            <div style={{ marginTop: 3, fontSize: 11, color: "var(--text-muted)" }}>
                              Exp: {new Date(grant.expirationDate).toLocaleDateString("en-US")}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: 13 }}>{grant.hasVestingSchedule === false ? "No schedule" : getScheduleLabel(grant.vestingSchedule)}</div>
                          {grant.cliffMonths && grant.hasVestingSchedule && (
                            <div style={{ marginTop: 3, fontSize: 11, color: "var(--text-muted)" }}>{grant.cliffMonths}-month cliff</div>
                          )}
                        </td>
                        <td style={{ fontSize: 14 }}>
                          {formatEquityAmount(grant.buyPrice || 0)}
                          {grant.fmvAtExercise && (
                            <div style={{ marginTop: 3, fontSize: 11, color: "var(--text-muted)" }}>FMV at ex: {formatEquityAmount(grant.fmvAtExercise)}</div>
                          )}
                        </td>
                        <td>
                          {!grant.safeFilingStatus || grant.safeFilingStatus === "not_required"
                            ? <span style={{ fontSize: 11, color: "var(--text-muted)" }}>N/A</span>
                            : grant.safeFilingStatus === "filed"
                              ? <span className="safe-badge-filed">Filed</span>
                              : grant.safeFilingStatus === "pending"
                                ? <span className="safe-badge-pending"><AlertCircle size={10} /> Pending</span>
                                : <span className="safe-badge-expired"><AlertCircle size={10} /> Expired</span>
                          }
                        </td>
                        <td>
                          {lockupActive
                            ? <div style={{ fontSize: 11, color: "#d97706" }}>Locked until {new Date(grant.lockupExpiry).toLocaleDateString("en-US")}</div>
                            : <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No lock-up</div>
                          }
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button type="button" onClick={() => toggleIncludeInNetWorth(grant)} style={{ ...buttonReset, cursor: "pointer", color: "var(--text-primary)" }}>
                              {grant.includeInNetWorth === false ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <button type="button" onClick={() => setDeleteTarget(grant)} style={{ ...buttonReset, cursor: "pointer", color: "var(--text-primary)" }}>
                              <Trash2 size={16} />
                            </button>
                            <button type="button" onClick={() => startEdit(grant)} style={{ ...buttonReset, cursor: "pointer", color: "var(--text-primary)" }}>
                              <Pencil size={16} />
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

          <div style={{ padding: "14px 16px 16px", display: "flex", justifyContent: "flex-end" }}>
            <button type="button" onClick={startAddCompany} style={{ ...secondaryButtonStyle, display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={18} /> Add company
            </button>
          </div>
        </div>
      )}

      {/* ── Modals / flows ─────────────────────────────────────────────────── */}
      {flow === "grant-type" && (
        <GrantTypeModal
          selectedType={form.grantType}
          onSelect={(v) => setForm((c) => ({ ...c, grantType: v }))}
          onClose={resetFlow}
          onNext={() => setFlow("grant-details")}
        />
      )}

      {flow === "grant-details" && (
        <GrantDetailsModal
          title="Add Grant Details"
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
            if (!form.name.trim()) { toast.error("Company name is required."); return; }
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
          isEdit
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