import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePortfolio } from "../context/PortfolioContext";
import { useAuthContext } from "../hooks/useAuthContext";
import { cryptoService } from "../services/cryptoService";
import { toast } from "sonner";
import { CalendarPicker, formatDateInputValue } from "../components/dashboard/tabs/SpendingTab";
import { formatCurrencyAmount, getUserCurrency } from "../utils/currency";
import { createPortal } from "react-dom";
import { FloatingInput, FloatingSelect, inputStyle as sharedInputStyle, labelSx as sharedLabelSx, Notice, SURFACE_STRONG, TEXT_ON_STRONG } from "../components/profile/shared";
import {
  Plus, X, Pencil, Trash2, ChevronRight, Upload,
  Car, Home, Building2, Gem, DollarSign, Layers, Shield, Trophy, Landmark, TrendingDown, TrendingUp,
} from "lucide-react";

/* ── Design tokens ─────────────────────────────────────────────────── */
const C = {
  bg: "var(--bg-primary)",
  white: "var(--bg-card)",
  mutedSurface: "var(--bg-secondary)",
  contrast: "var(--border-default)",
  border: "var(--border-default)",
  border2: "var(--border-subtle)",
  text: "var(--text-primary)",
  sub: "var(--text-secondary)",
  muted: "var(--text-muted)",
  strong: "var(--text-primary)",
  onStrong: "var(--text-on-strong)",
  textInverse: "var(--text-inverse)",
  green: "#1A8B5C",
  greenMid: "#0D7377",
  greenBg: "rgba(13, 115, 119, 0.10)",
  teal: "#0D7377",
  blue: "#5A8BB8",
  red: "#EF4444",
  redBg: "rgba(239,68,68,0.08)",
  gold: "#D4A853",
  goldBg: "rgba(212,168,83,0.10)",
  indigo: "#7B8BA0",
  sidebar: "var(--bg-card)",

  /* Typography — tightened scale */
  fSizeXs: "11px",
  fSizeSm: "13px",
  fSizeBase: "14px",
  fSizeLg: "18px",
  fSizeXl: "22px",

  fWeightReg: "400",
  fWeightMed: "500",
  fWeightSemi: "500",  /* was 600 — eased down for polish */

  lhTight: "1.25",
  lhBase: "1.5",
};

/* ── Asset types ─────────────────────────────────────────── */
const ASSET_TYPES = [
  { value: "crypto",    label: "Crypto",      icon: Gem,         color: "#f59e0b" },
  { value: "equity",   label: "Equity",      icon: TrendingUp,  color: "#14b8a6" },
  { value: "cash",     label: "Cash",        icon: DollarSign,  color: "#16a34a" },
  { value: "vehicle",  label: "Vehicle",     icon: Car,         color: "#6366f1" },
  { value: "property", label: "Property",    icon: Home,        color: "#0d9488" },
  { value: "insurance",label: "Insurance",   icon: Shield,      color: "#ec4899" },
  { value: "valuables",label: "Valuables",   icon: Trophy,      color: "#d97706" },
  { value: "pension",  label: "Pension",     icon: Landmark,    color: "#8b5cf6" },
  { value: "debt",     label: "Unpaid Debt", icon: TrendingDown,color: "#ef4444" },
  { value: "other",    label: "Other",       icon: Layers,      color: "#9ca3af" },
];

const CREATABLE_ASSET_TYPES = ASSET_TYPES.filter((t) => t.value !== "equity");

const ACCOUNT_TYPE_OPTIONS = ["Checking", "Savings", "Cash account", "Brokerage cash"];
const OTHER_TYPE_OPTIONS = ["Asset", "Liability"];
const buttonReset = { appearance: "none", background: "transparent", border: "none", padding: 0, margin: 0, font: "inherit" };

/* ── Helpers ─────────────────────────────────────────────── */
const getTC = (type) => ASSET_TYPES.find((t) => t.value === type) ?? ASSET_TYPES[ASSET_TYPES.length - 1];
const isCryptoAsset  = (a) => a?.assetType === "crypto";
const isEquityAsset  = (a) => a?.assetType === "equity";
const getAssetName   = (a) => isCryptoAsset(a) ? (a.coin?.charAt(0).toUpperCase() + a.coin?.slice(1)) : a.name;
const getAssetCost   = (a) => {
  if (isCryptoAsset(a) || isEquityAsset(a)) return a.totalCost ?? ((a.buyPrice || 0) * (a.quantity || 0));
  return a.buyingPrice || 0;
};
const getAssetValue  = (a) => a.currentValue || 0;
const getAssetGain   = (a) => {
  if (a.gainLoss !== undefined && a.gainLoss !== null) return a.gainLoss;
  return getAssetValue(a) - getAssetCost(a);
};
const getAssetGainPct = (a) => {
  const cost = getAssetCost(a);
  const gain = getAssetGain(a);
  return cost > 0 ? (gain / cost) * 100 : null;
};
const getUnitLabel = (a) => isEquityAsset(a) ? "share" : "coin";

/* ── Currency formatter — baseline-aligned symbol ──────────── */
const makeFmt = (code) => {
  const renderParts = (value, opts = {}) => {
    const amount = Number(value ?? 0);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    try {
      const nf = new Intl.NumberFormat("en-US", {
        style: "currency", currency: code,
        currencyDisplay: "narrowSymbol", ...opts,
      });
      const parts = nf.formatToParts(safeAmount);
      return (
        <span style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "baseline", gap: "1px" }}>
          {parts.map((p, i) => {
            if (p.type === "currency") {
              return (
                <span
                  key={i}
                  className="currency-symbol"
                  style={{
                    fontSize: "0.78em",
                    lineHeight: 1,
                    color: "var(--text-secondary)",
                    display: "inline",
                    verticalAlign: "baseline",
                    marginRight: "1px",
                  }}
                >
                  {p.value}
                </span>
              );
            }
            if (p.type === "literal") return <span key={i}>{p.value}</span>;
            return (
              <span
                key={i}
                className="currency-number"
                style={{ fontVariantNumeric: "tabular-nums", lineHeight: 1 }}
              >
                {p.value}
              </span>
            );
          })}
        </span>
      );
    } catch {
      return formatCurrencyAmount(safeAmount, code, opts);
    }
  };

  const fmt = (n, d = 2) =>
    renderParts(Number(n ?? 0), { minimumFractionDigits: d, maximumFractionDigits: d });

  const fmtC = (n) => {
    const abs = Math.abs(n ?? 0);
    if (abs >= 1_000_000)
      return <>{renderParts(abs / 1_000_000, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M</>;
    if (abs >= 1_000)
      return <>{renderParts(abs / 1_000, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k</>;
    return fmt(abs);
  };
  return { fmt, fmtC };
};

/* ── Shared styles ───────────────────────────────────────── */
const inputSx = {
  width: "100%", border: `1px solid var(--border-default)`, borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: "var(--text-primary)", background: "var(--bg-primary)",
  outline: "none", fontFamily: "var(--font-sans)", boxSizing: "border-box",
};
const labelSx = {
  fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4,
  display: "block", textTransform: "uppercase", letterSpacing: "0.06em",
};
const calendarColors = {
  border:  "var(--border-default)",
  text:    "var(--text-primary)",
  muted:   "var(--text-muted)",
  strong:  "var(--text-primary)",
  onStrong:"var(--text-on-strong)",
};

/* ── AssetIcon ───────────────────────────────────────────── */
function AssetIcon({ type, size = 32 }) {
  const cfg  = getTC(type);
  const Icon = cfg.icon;
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28),
      background: `${cfg.color}12`, border: `0.5px solid ${cfg.color}22`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <Icon size={size * 0.42} style={{ color: cfg.color }} strokeWidth={1.7} />
    </div>
  );
}

/* ── CSV Import Modal ────────────────────────────────────── */
function PortfolioCsvModal({ onClose, onImport, loading }) {
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)", padding: 16 }}
      onClick={() => !loading && onClose()}
    >
      <div
        style={{ background: C.white, borderRadius: 20, border: `0.5px solid ${C.border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.18)", maxWidth: 460, width: "100%", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Portfolio Tools</div>
            <div style={{ fontSize: 17, fontWeight: 500, color: C.text, letterSpacing: "-0.02em" }}>Import Assets via CSV</div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: C.bg, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Required columns */}
          <div style={{ background: "transparent", border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Required CSV Columns</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["assetType", "name", "buyingPrice", "symbol", "quantity"].map((col) => (
                <span key={col} style={{ background: C.white, border: `0.5px solid ${C.border}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontFamily: "monospace", color: C.teal, fontWeight: 600 }}>{col}</span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>
              Ensure your file is a valid .csv with these headers.{" "}
              <span
                style={{ color: C.teal, fontWeight: 500, cursor: "pointer", textDecoration: "underline" }}
                onClick={() => {
                  const sample = "assetType,name,buyingPrice,currentValue,symbol,quantity\ncrypto,bitcoin,45000,62000,BTC,0.5\nequity,Apple Inc.,150,185,AAPL,10\nproperty,Apartment,250000,280000,,1\n";
                  const blob = new Blob([sample], { type: "text/csv" });
                  const url  = URL.createObjectURL(blob);
                  const a    = document.createElement("a");
                  a.href = url; a.download = "portfolio_sample.csv";
                  document.body.appendChild(a); a.click(); a.remove();
                  URL.revokeObjectURL(url);
                }}
              >
                Download sample
              </span>
            </div>
          </div>

          {/* File picker */}
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} style={{ display: "none" }} />
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ border: `1px dashed ${file ? C.teal : C.border}`, borderRadius: 14, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: "transparent", transition: "all 0.15s" }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 11, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", color: file ? C.teal : C.muted }}>
              <Upload size={22} />
            </div>
            {file ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{file.name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Tap to change file</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>Click to select CSV file</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Max size 2MB · .csv only</div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `0.5px solid ${C.border}`, background: "transparent", color: C.text, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button
              type="button"
              onClick={() => file && onImport(file)}
              disabled={!file || loading}
              style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: file && !loading ? C.strong : C.border, color: file && !loading ? C.onStrong : C.muted, fontSize: 13, fontWeight: 500, cursor: file && !loading ? "pointer" : "not-allowed", transition: "all 0.2s" }}
            >
              {loading ? "Importing…" : "Start Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Confirm modal ───────────────────────────────────────── */
function ConfirmModal({ onConfirm, onCancel, loading }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ background: C.white, borderRadius: 16, border: `0.5px solid ${C.border}`, boxShadow: "0 20px 50px rgba(0,0,0,0.14)", maxWidth: 340, width: "100%", padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 6 }}>Remove asset?</div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 20, lineHeight: 1.6 }}>
          This will permanently remove the asset. This cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", background: C.red, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: loading ? 0.7 : 1, fontFamily: "inherit" }}
          >
            {loading ? "Removing…" : "Remove"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: `0.5px solid ${C.border}`, background: C.bg, color: C.sub, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Add / Edit modal ────────────────────────────────────── */
function AssetModal({ initial, onSave, onClose, loading, isEdit, currencyCode }) {
  const [assetModalTab, setAssetModalTab] = useState("manual");
  const [step, setStep] = useState(isEdit ? "manual" : (initial && initial.assetType ? "manual" : "type"));
  const [assetSaving, setAssetSaving] = useState(false);
  const [assetMsg, setAssetMsg] = useState(null);
  const [assetForm, setAssetForm] = useState(initial ?? {
    assetType: "cash",
    accountSubtype: "Checking",
    otherSubtype: "Asset",
    coin: "",
    symbol: "",
    quantity: "",
    buyPrice: "",
    buyDate: formatDateInputValue(new Date()),
    name: "",
    buyingPrice: "",
    currentValue: "",
    currentPrice: "",
    notes: "",
    includeInNetWorth: true,
  });

  const fileInputRef = useRef(null);
  const handleAssetChange = (key) => (e) => setAssetForm((prev) => ({ ...prev, [key]: e.target.value }));

  const saveAsset = async () => {
    const isCrypto = assetForm.assetType === "crypto";
    const isEquity = assetForm.assetType === "equity";
    if (isCrypto && (!assetForm.coin || !assetForm.symbol || !assetForm.quantity || !assetForm.buyPrice)) {
      setAssetMsg({ type: "error", text: "Coin, symbol, quantity and buy price are required." });
      return;
    }
    if (isEquity && (!assetForm.name || !assetForm.ticker || !assetForm.quantity || !assetForm.buyPrice)) {
      setAssetMsg({ type: "error", text: "Name, ticker, quantity and buy price are required." });
      return;
    }
    if (!isCrypto && !isEquity && (!assetForm.name || !assetForm.buyingPrice)) {
      setAssetMsg({ type: "error", text: "Asset name and purchase price are required." });
      return;
    }

    const payload = isCrypto
      ? { assetType: "crypto", coin: assetForm.coin.trim().toLowerCase(), symbol: assetForm.symbol.trim().toUpperCase(), quantity: Number(assetForm.quantity), buyPrice: Number(assetForm.buyPrice), buyDate: assetForm.buyDate || undefined, notes: assetForm.notes || undefined }
      : isEquity
        ? { assetType: "equity", name: assetForm.name.trim(), ticker: assetForm.ticker.trim().toUpperCase(), quantity: Number(assetForm.quantity), buyPrice: Number(assetForm.buyPrice), buyDate: assetForm.buyDate || undefined, currentValue: assetForm.currentValue ? Number(assetForm.currentValue) : undefined, includeInNetWorth: assetForm.includeInNetWorth, notes: assetForm.notes || undefined }
        : { assetType: assetForm.assetType, name: assetForm.name.trim(), buyingPrice: Number(assetForm.buyingPrice), currentValue: assetForm.currentValue ? Number(assetForm.currentValue) : Number(assetForm.buyingPrice), includeInNetWorth: assetForm.includeInNetWorth, notes: assetForm.notes || undefined };

    if (isCrypto) payload.includeInNetWorth = assetForm.includeInNetWorth;

    setAssetSaving(true);
    setAssetMsg(null);
    try {
      if (typeof onSave === "function") {
        await onSave(payload);
      } else {
        await cryptoService.add(payload);
        toast.success("Asset added");
        onClose();
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || "Failed to add asset.";
      setAssetMsg({ type: "error", text: errMsg });
      toast.error(errMsg);
    } finally {
      setAssetSaving(false);
    }
  };

  const handleCsvImportLocal = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = String(ev.target.result ?? "").split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { toast.error("CSV must include a header row and at least one asset."); return; }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const getIdx = (...names) => names.map((n) => headers.indexOf(n)).find((i) => i >= 0);
      const typeIdx = getIdx("assettype", "asset_type", "type");
      const nameIdx = getIdx("name", "asset", "coin");
      const priceIdx = getIdx("buyingprice", "buying_price", "buyprice", "buy_price", "price");
      const valueIdx = getIdx("currentvalue", "current_value", "value");
      const symIdx = getIdx("symbol", "ticker");
      const qtyIdx = getIdx("quantity", "qty", "shares");

      if (typeIdx == null || nameIdx == null || priceIdx == null) { toast.error("CSV needs assetType, name, and buyingPrice columns."); return; }

      setAssetSaving(true);
      let imported = 0;
      try {
        for (const line of lines.slice(1)) {
          const cols = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
          const assetType = (cols[typeIdx] || "cash").toLowerCase();
          const buyingPrice = Number(cols[priceIdx]);
          const currentValue = valueIdx != null && cols[valueIdx] ? Number(cols[valueIdx]) : buyingPrice;
          if (!assetType || !cols[nameIdx] || !Number.isFinite(buyingPrice)) continue;
          const payload = assetType === "crypto"
            ? { assetType, coin: cols[nameIdx].toLowerCase(), symbol: (cols[symIdx] || cols[nameIdx]).toUpperCase(), quantity: Number(cols[qtyIdx] || 1), buyPrice: buyingPrice, currentValue }
            : assetType === "equity"
              ? { assetType, name: cols[nameIdx], ticker: (cols[symIdx] || "").toUpperCase(), quantity: Number(cols[qtyIdx] || 1), buyPrice: buyingPrice, currentValue }
              : { assetType, name: cols[nameIdx], buyingPrice, currentValue };
          await cryptoService.add(payload);
          imported += 1;
        }
        if (imported) { toast.success(`${imported} assets imported`); onClose(); }
        else toast.error("No valid assets found in CSV.");
      } catch {
        toast.error("Failed to import assets");
      } finally {
        setAssetSaving(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    createPortal(
      <div
        style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.4)", padding: 16 }}
        onClick={() => !assetSaving && onClose()}
      >
        <div
          style={{ background: C.white, borderRadius: 20, border: `0.5px solid ${C.border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.20)", maxWidth: 560, width: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: "20px 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `0.5px solid ${C.border2}` }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {assetForm.assetType === "" ? "New asset" : assetForm.assetType.toUpperCase()}
              </div>
              <div style={{ fontSize: 17, fontWeight: 500, color: C.text, letterSpacing: "-0.01em" }}>
                {isEdit ? (assetForm.name || assetForm.coin || "Asset") : step === "type" ? "Select asset type" : "Complete details"}
              </div>
            </div>
            <button type="button" onClick={() => !assetSaving && onClose()} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: C.bg, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={15} />
            </button>
          </div>

          <div style={{ padding: "18px 20px 20px", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {step === "type" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: C.sub, marginBottom: 6 }}>Choose an asset type</p>
                {CREATABLE_ASSET_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => { setAssetForm((prev) => ({ ...prev, assetType: t.value })); setStep("manual"); }}
                      style={{ padding: "11px 14px", borderRadius: 12, border: `0.5px solid ${C.border}`, background: C.bg, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s", fontFamily: "inherit", textAlign: "left" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.background = `${t.color}08`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; }}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${t.color}12`, display: "flex", alignItems: "center", justifyContent: "center", color: t.color }}>
                        <Icon size={18} strokeWidth={1.6} />
                      </div>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.text }}>{t.label}</div>
                      <ChevronRight size={16} color={C.muted} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: C.sub, fontWeight: 400, marginBottom: 16 }}>Fill in the details below</div>
                <div style={{ display: "grid", gap: 14, minWidth: 0, flex: 1, overflowY: "auto", paddingRight: 2 }}>
                  {assetForm.assetType === "cash" ? (
                    <FloatingSelect label="Account type" value={assetForm.accountSubtype} onChange={(e) => setAssetForm((prev) => ({ ...prev, accountSubtype: e.target.value }))} options={ACCOUNT_TYPE_OPTIONS} />
                  ) : assetForm.assetType === "other" ? (
                    <FloatingSelect label="Asset type" value={assetForm.otherSubtype} onChange={(e) => setAssetForm((prev) => ({ ...prev, otherSubtype: e.target.value }))} options={OTHER_TYPE_OPTIONS} />
                  ) : null}

                  {(() => {
                    const useBalanceAsBuying = !["crypto", "equity"].includes(assetForm.assetType);
                    const totalAmount = Number(assetForm.currentValue || assetForm.buyingPrice || assetForm.buyPrice || 0) || 0;
                    return (
                      <>
                        <FloatingInput label="Name" value={assetForm.name} onChange={handleAssetChange("name")} />

                        {assetForm.assetType === "crypto" ? (
                          <>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <FloatingInput label="Coin ID" value={assetForm.coin} onChange={handleAssetChange("coin")} />
                              <FloatingInput label="Symbol" value={assetForm.symbol} onChange={handleAssetChange("symbol")} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <FloatingInput label="Quantity" type="number" value={assetForm.quantity} onChange={handleAssetChange("quantity")} />
                              <FloatingInput label={`Buy price (${currencyCode})`} type="number" value={assetForm.buyPrice} onChange={handleAssetChange("buyPrice")} />
                            </div>
                          </>
                        ) : assetForm.assetType === "equity" ? (
                          <>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <FloatingInput label="Ticker" value={assetForm.ticker} onChange={(e) => setAssetForm((prev) => ({ ...prev, ticker: e.target.value.toUpperCase() }))} inputStyle={{ textTransform: "uppercase" }} />
                              <FloatingInput label="Quantity" type="number" value={assetForm.quantity} onChange={handleAssetChange("quantity")} />
                            </div>
                            <FloatingInput label={`Current value (${currencyCode})`} type="number" value={assetForm.currentValue} onChange={handleAssetChange("currentValue")} />
                          </>
                        ) : (
                          <FloatingInput label="Current balance" type="number" value={useBalanceAsBuying ? (assetForm.currentValue || assetForm.buyingPrice) : assetForm.currentValue} onChange={(e) => {
                            const next = e.target.value;
                            setAssetForm((prev) => ({ ...prev, currentValue: next, buyingPrice: useBalanceAsBuying ? next : prev.buyingPrice }));
                          }} />
                        )}

                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Date</div>
                          <CalendarPicker C={calendarColors} value={assetForm.buyDate} onChange={(value) => setAssetForm((prev) => ({ ...prev, buyDate: value }))} />
                        </div>

                        <div style={{ background: C.bg, borderRadius: 12, padding: "14px 16px", border: `0.5px solid ${C.border}` }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 400, color: C.sub }}>Total amount</div>
                            <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>{formatCurrencyAmount(totalAmount, currencyCode, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </div>
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>Show in Net Worth</div>
                              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Assets sum up to your net worth</div>
                            </div>
                            <button type="button" onClick={() => setAssetForm((prev) => ({ ...prev, includeInNetWorth: !prev.includeInNetWorth }))} style={{ ...buttonReset, width: 38, height: 21, borderRadius: 999, background: assetForm.includeInNetWorth ? "#2f2f2f" : "#d4d4d8", position: "relative", cursor: "pointer", flexShrink: 0 }}>
                              <span style={{ position: "absolute", top: 2, left: assetForm.includeInNetWorth ? 19 : 2, width: 17, height: 17, borderRadius: "50%", background: "#fff", transition: "left 0.15s ease" }} />
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  <Notice msg={assetMsg} />
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: `0.5px solid ${C.border}`, display: "flex", justifyContent: "flex-end" }}>
                    <button type="button" onClick={saveAsset} disabled={assetSaving} style={{ minWidth: 96, borderRadius: 10, border: "none", background: SURFACE_STRONG, color: TEXT_ON_STRONG, padding: "11px 18px", cursor: assetSaving ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 500, fontSize: 13 }}>
                      {assetSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>,
      document.body
    )
  );
}

/* ── Asset card (mobile) ─────────────────────────────────── */
function AssetCard({ a, onEdit, onDelete, fmt, fmtC, navigate, user }) {
  const isCrypto = isCryptoAsset(a);
  const isEquity = isEquityAsset(a);
  const cost    = getAssetCost(a);
  const value   = getAssetValue(a);
  const gain    = isCrypto || isEquity ? getAssetGain(a) : null;
  const gainPct = gain != null ? getAssetGainPct(a) : null;
  const up      = gain != null && gain >= 0;
  const cfg     = getTC(a.assetType);

  return (
    <div
      onClick={() => { if (isEquity) { if (!user?.isPro) { navigate(ROUTES.SUBSCRIPTION); return; } navigate("/dashboard?nav=equity"); } }}
      style={{ background: C.white, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, cursor: isEquity ? "pointer" : "default" }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AssetIcon type={a.assetType} size={36} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{getAssetName(a)}</div>
            <div style={{ display: "inline-flex", alignItems: "center", marginTop: 3, padding: "2px 8px", borderRadius: 100, background: `${cfg.color}10`, fontSize: 11, fontWeight: 500, color: cfg.color }}>
              {cfg.label}
              {isCrypto && a.symbol ? ` · ${a.symbol.toUpperCase()}` : ""}
              {isEquity && a.ticker ? ` · ${a.ticker.toUpperCase()}` : ""}
            </div>
          </div>
        </div>
        {!isEquity && (
          <div style={{ display: "flex", gap: 5 }}>
            <button type="button" onClick={() => onEdit(a)} style={{ width: 26, height: 26, borderRadius: 7, border: `0.5px solid ${C.border}`, background: C.bg, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Pencil size={11} strokeWidth={1.7} />
            </button>
            <button type="button" onClick={() => onDelete(a._id)} style={{ width: 26, height: 26, borderRadius: 7, border: `0.5px solid ${C.border}`, background: C.bg, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={11} strokeWidth={1.7} />
            </button>
          </div>
        )}
      </div>

      {/* Value row */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: C.bg, borderRadius: 9 }}>
        <div>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
            {isCrypto || isEquity ? "Market Value" : "Asset Value"}
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>{fmtC(value)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
            {isCrypto || isEquity ? "Invested" : "Paid"}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.sub }}>{fmtC(cost)}</div>
        </div>
        {(isCrypto || isEquity) && gain != null && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>P/L</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: up ? C.greenMid : C.red }}>
              {up ? "+" : "−"}{fmtC(Math.abs(gain))}
            </div>
            {gainPct != null && (
              <div style={{ fontSize: 10, color: up ? C.greenMid : C.red }}>
                {up ? "▲" : "▼"}{Math.abs(gainPct).toFixed(1)}%
              </div>
            )}
          </div>
        )}
      </div>

      {(isCrypto || isEquity) && a.currentPrice != null && (
        <div style={{ fontSize: 11, color: C.muted }}>
          {isCrypto ? "Live price" : "Current price"}: <strong style={{ color: C.text, fontWeight: 500 }}>{fmt(a.currentPrice)}</strong> per {isCrypto ? a.symbol?.toUpperCase() : getUnitLabel(a)}
          {a.quantity && <span> · {a.quantity} held</span>}
        </div>
      )}
    </div>
  );
}

/* ── Main Portfolio ──────────────────────────────────────── */
export default function Portfolio({ isMobile: isMobileProp }) {
  const isMobile = isMobileProp ?? (typeof window !== "undefined" && window.innerWidth <= 768);
  const { user }    = useAuthContext();
  const navigate    = useNavigate();
  const currencyCode = getUserCurrency(user);
  const { fmt, fmtC } = makeFmt(currencyCode);

  const { assets, loading, refreshAssets } = usePortfolio();

  const [modal,        setModal]        = useState(null);
  const [editTarget,   setEditTarget]   = useState(null);
  const [modalInitial, setModalInitial] = useState(null);
  const [confirmId,    setConfirmId]    = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [removing,     setRemoving]     = useState(false);
  const [typeFilter,   setTypeFilter]   = useState("All");
  const [plFilter,     setPlFilter]     = useState("All");
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  /* ── Aggregates ── */
  const agg = useMemo(() => {
    const cryptoAssets = assets.filter((a) => a.assetType === "crypto");
    const equityAssets = assets.filter((a) => a.assetType === "equity");
    const otherAssets  = assets.filter((a) => !["crypto", "equity"].includes(a.assetType));

    const totalPortfolioValue = assets.reduce((s, a) => s + getAssetValue(a), 0);
    const cryptoValue    = cryptoAssets.reduce((s, a) => s + getAssetValue(a), 0);
    const cryptoInvested = cryptoAssets.reduce((s, a) => s + getAssetCost(a),  0);
    const cryptoPL       = cryptoAssets.reduce((s, a) => s + getAssetGain(a),  0);
    const cryptoPLPct    = cryptoInvested > 0 ? (cryptoPL / cryptoInvested) * 100 : 0;
    const equityValue    = equityAssets.reduce((s, a) => s + getAssetValue(a), 0);
    const equityInvested = equityAssets.reduce((s, a) => s + getAssetCost(a),  0);
    const equityPL       = equityAssets.reduce((s, a) => s + getAssetGain(a),  0);
    const equityPLPct    = equityInvested > 0 ? (equityPL / equityInvested) * 100 : 0;
    const otherValue = otherAssets.reduce((s, a) => s + getAssetValue(a), 0);

    return {
      totalPortfolioValue,
      cryptoValue, cryptoInvested, cryptoPL, cryptoPLPct,
      equityValue, equityInvested, equityPL, equityPLPct,
      otherValue,
      cryptoCount: cryptoAssets.length,
      equityCount: equityAssets.length,
      otherCount:  otherAssets.length,
    };
  }, [assets]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (typeFilter !== "All" && a.assetType !== typeFilter) return false;
      if (plFilter === "Profit") return getAssetGain(a) > 0;
      if (plFilter === "Loss")   return getAssetGain(a) < 0;
      return true;
    });
  }, [assets, typeFilter, plFilter]);

  /* ── Handlers ── */
  const handleAdd = async (form) => {
    if (form.assetType === "equity") return toast.error("Add and edit equity from the Equity tab.");
    if (form.assetType === "crypto") {
      if (!form.coin || !form.symbol || !form.quantity || !form.buyPrice)
        return toast.error("Fill in all required fields");
    } else {
      if (!form.name || !form.buyingPrice) return toast.error("Name and value are required");
    }
    setSaving(true);
    try {
      await cryptoService.add({ ...form, assetType: form.assetType, currentValue: form.currentValue ? Number(form.currentValue) : undefined });
      toast.success("Asset added");
      setModal(null);
      await refreshAssets();
    } catch { toast.error("Failed to add asset"); }
    setSaving(false);
  };

  const handleCsvImport = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = String(ev.target.result ?? "").split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { toast.error("CSV must include a header row and at least one asset."); return; }
      const headers  = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const getIdx   = (...names) => names.map((n) => headers.indexOf(n)).find((i) => i >= 0);
      const typeIdx  = getIdx("assettype", "asset_type", "type");
      const nameIdx  = getIdx("name", "asset", "coin");
      const priceIdx = getIdx("buyingprice", "buying_price", "buyprice", "buy_price", "price");
      const valueIdx = getIdx("currentvalue", "current_value", "value");
      const symIdx   = getIdx("symbol", "ticker");
      const qtyIdx   = getIdx("quantity", "qty", "shares");
      if (typeIdx == null || nameIdx == null || priceIdx == null) { toast.error("CSV needs assetType, name, and buyingPrice columns."); return; }
      setSaving(true);
      let imported = 0;
      try {
        for (const line of lines.slice(1)) {
          const cols = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
          const assetType = (cols[typeIdx] || "cash").toLowerCase();
          const buyingPrice = Number(cols[priceIdx]);
          const currentValue = valueIdx != null && cols[valueIdx] ? Number(cols[valueIdx]) : buyingPrice;
          if (!assetType || !cols[nameIdx] || !Number.isFinite(buyingPrice)) continue;
          const payload = assetType === "crypto"
            ? { assetType, coin: cols[nameIdx].toLowerCase(), symbol: (cols[symIdx] || cols[nameIdx]).toUpperCase(), quantity: Number(cols[qtyIdx] || 1), buyPrice: buyingPrice, currentValue }
            : assetType === "equity"
              ? { assetType, name: cols[nameIdx], ticker: (cols[symIdx] || "").toUpperCase(), quantity: Number(cols[qtyIdx] || 1), buyPrice: buyingPrice, currentValue }
              : { assetType, name: cols[nameIdx], buyingPrice, currentValue };
          await cryptoService.add(payload);
          imported += 1;
        }
        if (imported) { toast.success(`${imported} assets imported`); await refreshAssets(); setCsvModalOpen(false); }
        else toast.error("No valid assets found in CSV.");
      } catch { toast.error("Failed to import assets"); }
      finally { setSaving(false); }
    };
    reader.readAsText(file);
  };

  const handleEdit = async (form) => {
    if (editTarget?.assetType === "equity") return toast.error("Edit equity from the Equity tab.");
    setSaving(true);
    try {
      if (typeof cryptoService.update === "function") await cryptoService.update(editTarget._id, form);
      else if (typeof cryptoService.patch === "function") await cryptoService.patch(editTarget._id, form);
      else { await cryptoService.delete(editTarget._id); await cryptoService.add(form); }
      toast.success("Asset updated");
      setModal(null);
      setEditTarget(null);
      await refreshAssets();
    } catch { toast.error("Failed to update asset"); }
    setSaving(false);
  };

  const handleDelete = async () => {
    setRemoving(true);
    try {
      await cryptoService.delete(confirmId);
      toast.success("Asset removed");
      setConfirmId(null);
      await refreshAssets();
    } catch { toast.error("Failed to remove asset"); }
    setRemoving(false);
  };

  const openEdit = (a) => {
    if (a?.assetType === "equity") { toast.error("Equity details are managed from the Equity tab."); return; }
    setEditTarget(a);
    setModal("edit");
  };

  const openModal = (typeOverride = null) => {
    setModalInitial({ assetType: typeOverride ?? "", accountSubtype: "Checking", otherSubtype: "Asset", coin: "", symbol: "", quantity: "", buyPrice: "", ticker: "", buyDate: formatDateInputValue(new Date()), name: "", buyingPrice: "", currentValue: "", currentPrice: "", notes: "" });
    setModal("add");
  };

  const cryptoUp = agg.cryptoPL >= 0;
  const equityUp = agg.equityPL >= 0;

  /* ── Render ── */
  return (
    <div style={{ fontFamily: "var(--font-sans)", color: C.text, display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .pf-root{animation:fadeUp 0.25s ease}
        .pf-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .pf-toolbar{display:flex;justify-content:space-between;align-items:center;
          padding:11px 16px;border-bottom:0.5px solid ${C.border2};gap:10px;flex-wrap:wrap}
        .pf-type-tabs{display:flex;gap:2px;background:${C.bg};border-radius:100px;
          padding:3px;overflow-x:auto;-webkit-overflow-scrolling:touch;
          scrollbar-width:none;max-width:100%}
        .pf-type-tabs::-webkit-scrollbar{display:none}
        .pf-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:10px}
        .pf-tr:hover td{background:${C.bg}}
        @media(max-width:768px){
          .pf-stats{grid-template-columns:repeat(2,1fr)!important}
          .pf-toolbar{flex-direction:column;align-items:flex-start}
          .pf-header{flex-direction:column;align-items:flex-start}
          .pf-table-outer{overflow-x:auto;-webkit-overflow-scrolling:touch}
        }
        @media(max-width:400px){.pf-stats{grid-template-columns:1fr 1fr!important}}
      `}</style>

      {/* Modals */}
      {modal === "add" && <AssetModal initial={modalInitial} onSave={handleAdd} onClose={() => setModal(null)} loading={saving} isEdit={false} currencyCode={currencyCode} />}
      {csvModalOpen && <PortfolioCsvModal onClose={() => setCsvModalOpen(false)} onImport={handleCsvImport} loading={saving} />}
      {modal === "edit" && editTarget && (
        <AssetModal
          initial={
            editTarget.assetType === "crypto"
              ? { assetType: "crypto", coin: editTarget.coin, symbol: editTarget.symbol, quantity: editTarget.quantity, buyPrice: editTarget.buyPrice, buyDate: editTarget.buyDate || "", notes: editTarget.notes || "" }
              : editTarget.assetType === "equity"
                ? { assetType: "equity", name: editTarget.name, ticker: editTarget.ticker || "", quantity: editTarget.quantity || "", buyPrice: editTarget.buyPrice || "", currentPrice: editTarget.currentPrice || "", currentValue: editTarget.currentValue || "", buyDate: editTarget.buyDate || "", notes: editTarget.notes || "" }
                : { assetType: editTarget.assetType, name: editTarget.name, buyingPrice: editTarget.buyingPrice, currentValue: editTarget.currentValue || "", notes: editTarget.notes || "" }
          }
          onSave={handleEdit}
          onClose={() => { setModal(null); setEditTarget(null); }}
          loading={saving}
          isEdit={true}
          currencyCode={currencyCode}
        />
      )}
      {confirmId && <ConfirmModal onConfirm={handleDelete} onCancel={() => setConfirmId(null)} loading={removing} />}

      {/* ── Page header ── */}
      <div className="pf-header pf-root">
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
            {new Date().toLocaleString("default", { month: "long", year: "numeric" })} · Portfolio
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, color: C.text, letterSpacing: "-0.4px", lineHeight: 1.25 }}>Asset Portfolio</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>All holdings and net worth</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setCsvModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: C.white, color: C.text, border: `0.5px solid ${C.border}`, borderRadius: 100, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Import CSV
          </button>
          <button type="button" onClick={() => openModal()}
            style={{ display: "flex", alignItems: "center", gap: 6, background: C.strong, color: C.onStrong, border: "none", borderRadius: 100, padding: "8px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "opacity 0.15s", fontFamily: "inherit", whiteSpace: "nowrap" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Plus size={14} strokeWidth={2.5} /> Add Asset
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="pf-stats">
        {/* Total Portfolio Value */}
        <div style={{ background: C.white, border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Total Portfolio Value</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: C.text, marginBottom: 4, lineHeight: 1 }}>{fmtC(agg.totalPortfolioValue)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>
            {agg.cryptoCount} crypto · {agg.equityCount} equity · {agg.otherCount} other
          </div>
        </div>

        {/* Crypto Holdings */}
        <div style={{ background: C.white, border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Crypto Holdings</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: C.text, marginBottom: 4, lineHeight: 1 }}>{fmtC(agg.cryptoValue)}</div>
          {agg.cryptoCount > 0 ? (
            <div style={{ fontSize: 12, fontWeight: 500, color: cryptoUp ? C.greenMid : C.red }}>
              {cryptoUp ? "▲" : "▼"} {Math.abs(agg.cryptoPLPct).toFixed(1)}% on crypto
            </div>
          ) : (
            <div style={{ fontSize: 12, color: C.muted }}>No crypto assets</div>
          )}
        </div>

        {/* Equity Holdings */}
        <div
          onClick={() => { if (!user?.isPro) { navigate(ROUTES.SUBSCRIPTION); return; } navigate("/dashboard?nav=equity"); }}
          style={{ background: C.white, border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", cursor: "pointer", transition: "all 0.18s" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Equity Holdings</div>
          {agg.equityCount > 0 ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 500, color: C.text, marginBottom: 4, lineHeight: 1 }}>{fmtC(agg.equityValue)}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: equityUp ? C.greenMid : C.red }}>
                {equityUp ? "▲" : "▼"} {Math.abs(agg.equityPLPct).toFixed(1)}% on equity
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 500, color: C.muted, letterSpacing: "-0.4px", marginBottom: 4, lineHeight: 1 }}>—</div>
              <div style={{ fontSize: 12, color: C.muted }}>No equity tracked</div>
            </>
          )}
        </div>

        {/* Other Assets */}
        <div style={{ background: C.white, border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Other Assets</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: C.text, marginBottom: 4, lineHeight: 1 }}>{fmtC(agg.otherValue)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>Cash, property, vehicles</div>
        </div>
      </div>

      {/* ── Assets panel ── */}
      <div style={{ background: C.white, border: `0.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        {/* Toolbar */}
        <div className="pf-toolbar">
          <div className="pf-type-tabs">
            {["All", ...ASSET_TYPES.map((t) => t.value)].map((t) => {
              const cfg    = t === "All" ? null : getTC(t);
              const active = typeFilter === t;
              return (
                <button key={t} type="button" onClick={() => setTypeFilter(t)}
                  style={{ padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: active ? 500 : 400, border: "none", cursor: "pointer", transition: "all 0.12s", whiteSpace: "nowrap", background: active ? C.white : "transparent", color: active ? C.text : C.muted, boxShadow: active ? "0 1px 3px rgba(0,0,0,0.07)" : "none", fontFamily: "inherit" }}>
                  {t === "All" ? "All" : cfg.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 2, background: C.bg, borderRadius: 100, padding: "3px", flexShrink: 0 }}>
            {["All", "Profit", "Loss"].map((f) => (
              <button key={f} type="button" onClick={() => setPlFilter(f)}
                style={{ padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: plFilter === f ? 500 : 400, border: "none", cursor: "pointer", background: plFilter === f ? C.white : "transparent", color: plFilter === f ? C.text : C.muted, boxShadow: plFilter === f ? "0 1px 3px rgba(0,0,0,0.07)" : "none", fontFamily: "inherit", transition: "all 0.12s" }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile cards */}
        {isMobile ? (
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>Loading assets…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>No assets found</div>
            ) : (
              filtered.map((a) => (
                <AssetCard key={a._id} a={a} onEdit={openEdit} onDelete={setConfirmId} fmt={fmt} fmtC={fmtC} navigate={navigate} user={user} />
              ))
            )}
          </div>
        ) : (
          /* Desktop table */
          <div className="pf-table-outer">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {["Asset", "Type", "Current Value", "Invested / Paid", "Profit / Loss", ""].map((h, i) => (
                    <th key={i} style={{ padding: "9px 16px", textAlign: i === 5 ? "right" : "left", borderBottom: `0.5px solid ${C.border2}`, whiteSpace: "nowrap", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 60, color: C.muted, fontSize: 13 }}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 60, color: C.muted, fontSize: 13 }}>
                      {assets.length === 0 ? (
                        <span>
                          No assets yet.{" "}
                          <button type="button" onClick={() => openModal()}
                            style={{ color: C.teal, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>
                            Add your first asset →
                          </button>
                        </span>
                      ) : "No assets match this filter."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => {
                    const isCrypto = isCryptoAsset(a);
                    const isEquity = isEquityAsset(a);
                    const cost     = getAssetCost(a);
                    const value    = getAssetValue(a);
                    const gain     = isCrypto || isEquity ? getAssetGain(a) : null;
                    const gainPct  = gain != null ? getAssetGainPct(a) : null;
                    const up       = gain != null && gain >= 0;
                    const cfg      = getTC(a.assetType);
                    return (
                      <tr key={a._id} className="pf-tr"
                        style={{ borderBottom: `0.5px solid ${C.border2}`, transition: "background 0.1s", cursor: isEquity ? "pointer" : "default" }}
                        onClick={() => { if (isEquity) { if (!user?.isPro) { navigate(ROUTES.SUBSCRIPTION); return; } navigate("/dashboard?nav=equity"); } }}
                      >
                        {/* Asset name */}
                        <td style={{ padding: "13px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <AssetIcon type={a.assetType} size={32} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{getAssetName(a)}</div>
                              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                                {isCrypto ? a.symbol?.toUpperCase() : isEquity ? a.ticker?.toUpperCase() : cfg.label}
                              </div>
                            </div>
                          </div>
                        </td>
                        {/* Type badge */}
                        <td style={{ padding: "13px 16px" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 100, background: `${cfg.color}10`, fontSize: 11, fontWeight: 500, color: cfg.color }}>
                            {cfg.label}
                            {(isCrypto || isEquity) && a.quantity != null && (
                              <span style={{ color: `${cfg.color}80`, fontWeight: 400 }}> · {a.quantity}</span>
                            )}
                          </div>
                        </td>
                        {/* Current value */}
                        <td style={{ padding: "13px 16px" }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
                            {value ? fmtC(value) : <span style={{ color: C.muted }}>—</span>}
                          </div>
                          {(isCrypto || isEquity) && a.currentPrice != null && (
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                              {fmt(a.currentPrice)} / {getUnitLabel(a)}
                            </div>
                          )}
                        </td>
                        {/* Cost */}
                        <td style={{ padding: "13px 16px" }}>
                          <div style={{ fontSize: 13, color: C.sub, fontWeight: 500 }}>{fmtC(cost)}</div>
                          {!isCrypto && !isEquity && (
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Purchase price</div>
                          )}
                          {isEquity && (
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                              Avg buy {fmt(a.buyPrice || 0)} / share
                            </div>
                          )}
                        </td>
                        {/* P/L */}
                        <td style={{ padding: "13px 16px" }}>
                          {gain != null ? (
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: up ? C.greenMid : C.red }}>
                                {up ? "+" : "−"}{fmtC(Math.abs(gain))}
                              </div>
                              {gainPct != null && (
                                <div style={{ fontSize: 11, color: up ? C.greenMid : C.red, marginTop: 2 }}>
                                  {up ? "▲" : "▼"} {Math.abs(gainPct).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: 13, color: C.muted }}>—</span>
                          )}
                        </td>
                        {/* Actions */}
                        <td style={{ padding: "13px 16px", textAlign: "right" }}>
                          {isEquity ? (
                            <div style={{ fontSize: 11, color: C.teal, fontWeight: 500, cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}
                              onClick={(e) => { e.stopPropagation(); navigate("/dashboard?nav=equity"); }}>
                              Manage →
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                              <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(a); }}
                                style={{ width: 26, height: 26, borderRadius: 7, border: `0.5px solid ${C.border}`, background: C.white, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.text; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = C.white; e.currentTarget.style.color = C.muted; }}>
                                <Pencil size={11} strokeWidth={1.7} />
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmId(a._id); }}
                                style={{ width: 26, height: 26, borderRadius: 7, border: `0.5px solid ${C.border}`, background: C.white, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = C.redBg; e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = `${C.red}28`; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = C.white; e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}>
                                <Trash2 size={11} strokeWidth={1.7} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer summary */}
        {!loading && assets.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: `0.5px solid ${C.border2}`, background: C.bg, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 12, color: C.muted }}>
              {filtered.length} asset{filtered.length !== 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", gap: 14, fontSize: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: C.sub }}>
                Portfolio <strong style={{ color: C.text, fontWeight: 500 }}>{fmtC(agg.totalPortfolioValue)}</strong>
              </span>
              {agg.cryptoCount > 0 && (
                <span style={{ fontWeight: 500, color: cryptoUp ? C.greenMid : C.red }}>
                  Crypto {cryptoUp ? "+" : "−"}{fmtC(Math.abs(agg.cryptoPL))} ({cryptoUp ? "+" : "−"}{Math.abs(agg.cryptoPLPct).toFixed(1)}%)
                </span>
              )}
              {agg.equityCount > 0 && (
                <span style={{ fontWeight: 500, color: equityUp ? C.greenMid : C.red }}>
                  Equity {equityUp ? "+" : "−"}{fmtC(Math.abs(agg.equityPL))} ({equityUp ? "+" : "−"}{Math.abs(agg.equityPLPct).toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}