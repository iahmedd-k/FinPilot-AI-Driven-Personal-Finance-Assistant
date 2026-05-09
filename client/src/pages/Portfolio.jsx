import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePortfolio } from "../context/PortfolioContext";
import { useAuthContext } from "../hooks/useAuthContext";
import { cryptoService } from "../services/cryptoService";
import { toast } from "sonner";
import { CalendarPicker, formatDateInputValue } from "../components/dashboard/tabs/SpendingTab";
import { formatCurrencyAmount, getUserCurrency } from "../utils/currency";
import {
  Plus, X, Pencil, Trash2, ChevronRight, Upload,
  Car, Home, Building2, Gem, DollarSign, Layers, Shield, Trophy, Landmark, TrendingDown, TrendingUp,
} from "lucide-react";

/* ── Design tokens (Origin theme via CSS variables) ─────────────────── */
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
  greenBg: "rgba(13, 115, 119, 0.12)",
  teal: "#0D7377",
  blue: "#5A8BB8",
  red: "#EF4444",
  redBg: "rgba(239,68,68,0.10)",
  gold: "#D4A853",
  goldBg: "rgba(212,168,83,0.10)",
  indigo: "#7B8BA0",
  sidebar: "var(--bg-card)",

  /* Typography */
  fSizeXs: "var(--font-size-xs)",
  fSizeSm: "var(--font-size-sm)",
  fSizeBase: "var(--font-size-base)",
  fSizeLg: "var(--font-size-lg)",
  fSizeXl: "var(--font-size-xl)",
  
  fWeightReg: "var(--font-weight-regular)",
  fWeightMed: "var(--font-weight-medium)",
  fWeightSemi: "var(--font-weight-semibold)",

  lhTight: "var(--leading-tight)",
  lhBase: "var(--leading-normal)",
};
let activeCurrencyCode = "USD";

const fmt = (n, d = 2) =>
  formatCurrencyAmount(Number(n ?? 0), activeCurrencyCode, { minimumFractionDigits: d, maximumFractionDigits: d });

const fmtC = (n) => {
  const abs = Math.abs(n ?? 0);
  if (abs >= 1_000_000) return `${formatCurrencyAmount(abs / 1_000_000, activeCurrencyCode, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  if (abs >= 1_000) return `${formatCurrencyAmount(abs / 1_000, activeCurrencyCode, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  return fmt(abs);
};

/* ── Asset types ─────────────────────────────────────────── */
const ASSET_TYPES = [
  { value: "crypto", label: "Crypto", icon: Gem, color: "#f59e0b" },
  { value: "equity", label: "Equity", icon: TrendingUp, color: "#14b8a6" },
  { value: "cash", label: "Cash", icon: DollarSign, color: "#16a34a" },
  { value: "vehicle", label: "Vehicle", icon: Car, color: "#6366f1" },
  { value: "property", label: "Property", icon: Home, color: "#0d9488" },
  { value: "insurance", label: "Insurance", icon: Shield, color: "#ec4899" },
  { value: "valuables", label: "Valuables", icon: Trophy, color: "#d97706" },
  { value: "pension", label: "Pension", icon: Landmark, color: "#8b5cf6" },
  { value: "debt", label: "Unpaid Debt", icon: TrendingDown, color: "#ef4444" },
  { value: "other", label: "Other", icon: Layers, color: "#9ca3af" },
];
const CREATABLE_ASSET_TYPES = ASSET_TYPES.filter((type) => type.value !== "equity");
const getTC = (type) => ASSET_TYPES.find(t => t.value === type) || ASSET_TYPES[ASSET_TYPES.length - 1];
const isCryptoAsset = (asset) => asset?.assetType === "crypto";
const isEquityAsset = (asset) => asset?.assetType === "equity";
const getAssetName = (asset) => isCryptoAsset(asset) ? (asset.coin?.charAt(0).toUpperCase() + asset.coin?.slice(1)) : asset.name;
const getAssetCost = (asset) => {
  if (isCryptoAsset(asset) || isEquityAsset(asset)) return asset.totalCost ?? ((asset.buyPrice || 0) * (asset.quantity || 0));
  return asset.buyingPrice || 0;
};
const getAssetValue = (asset) => asset.currentValue || 0;
const getAssetGain = (asset) => {
  if (asset.gainLoss !== undefined && asset.gainLoss !== null) return asset.gainLoss;
  return getAssetValue(asset) - getAssetCost(asset);
};
const getAssetGainPct = (asset) => {
  const cost = getAssetCost(asset);
  const gain = getAssetGain(asset);
  return cost > 0 ? (gain / cost) * 100 : null;
};
const getUnitLabel = (asset) => isEquityAsset(asset) ? "share" : "coin";

function AssetIcon({ type, size = 32 }) {
  const cfg = getTC(type); const Icon = cfg.icon;
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28),
      background: `${cfg.color}14`, border: `1px solid ${cfg.color}22`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
    }}>
      <Icon size={size * 0.42} style={{ color: cfg.color }} strokeWidth={1.8} />
    </div>
  );
}

const inputSx = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: C.text, background: C.bg,
  outline: "none", fontFamily: "var(--font-sans)", boxSizing: "border-box"
};
const labelSx = {
  fontSize: 10.5, fontWeight: 600, color: C.sub, marginBottom: 4,
  display: "block", textTransform: "uppercase", letterSpacing: "0.05em"
};
const calendarColors = {
  border: C.border,
  text: C.text,
  muted: C.muted,
  strong: C.strong,
  onStrong: C.onStrong,
};

/* ── CSV Import Modal ────────────────────────────────────── */
function PortfolioCsvModal({ onClose, onImport, loading, C }) {
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleImport = () => {
    if (!file) return;
    onImport(file);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", padding: 16 }}
      onClick={() => !loading && onClose()}>
      <div style={{ background: C.white, borderRadius: 24, border: `1px solid ${C.border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.25)", maxWidth: 460, width: "100%", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}>
        
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Portfolio Tools</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Import Assets via CSV</div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--surface-muted)", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Sample Box */}
          <div style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Required CSV Columns</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["assetType", "name", "buyingPrice", "symbol", "quantity"].map(col => (
                <span key={col} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 11, fontFamily: "monospace", color: C.teal, fontWeight: 600 }}>{col}</span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
              Ensure your file is a valid .csv with these headers. <span style={{ color: C.teal, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }} 
              onClick={() => {
                const sample = "assetType,name,buyingPrice,currentValue,symbol,quantity\ncrypto,bitcoin,45000,62000,BTC,0.5\nequity,Apple Inc.,150,185,AAPL,10\nproperty,Apartment,250000,280000,,1\n";
                const blob = new Blob([sample], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = "portfolio_sample.csv";
                document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
              }}>Download Sample</span>
            </div>
          </div>

          {/* File Selector */}
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} style={{ display: "none" }} />
          <div onClick={() => fileInputRef.current?.click()}
            style={{ border: `1px dashed ${file ? C.teal : C.border}`, borderRadius: 16, padding: "32px 20px", textAlign: "center", cursor: "pointer", background: "transparent", transition: "all 0.15s" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: file ? C.teal : C.muted }}>
              <Upload size={24} />
            </div>
            {file ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{file.name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Tap to change file</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Click to select CSV file</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Max size 2MB · .csv only</div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button type="button" onClick={handleImport} disabled={!file || loading}
              style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: file && !loading ? C.strong : C.border, color: file && !loading ? C.onStrong : C.muted, fontSize: 13, fontWeight: 700, cursor: file && !loading ? "pointer" : "not-allowed", transition: "all 0.2s", boxShadow: file && !loading ? "0 4px 12px rgba(0,0,0,0.15)" : "none" }}>
              {loading ? "Importing..." : "Start Import"}
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
    <div style={{
      position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center",
      justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16
    }} onClick={onCancel}>
      <div style={{
        background: C.white, borderRadius: 16, border: `1px solid ${C.border}`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.16)", maxWidth: 360, width: "100%", padding: 24
      }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Remove asset?</div>
        <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 20, lineHeight: 1.6 }}>
          This will permanently remove the asset. This cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onConfirm} disabled={loading}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 9, border: "none", background: C.red,
              color: C.textInverse, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1, fontFamily: "inherit"
            }}>
            {loading ? "Removing…" : "Remove"}
          </button>
          <button type="button" onClick={onCancel}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 9, border: `1px solid ${C.border}`,
              background: C.bg, color: C.sub, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
            }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Add/Edit modal ──────────────────────────────────────── */
function AssetModal({ initial, onSave, onClose, loading, isEdit, currencyCode }) {
  const [step, setStep] = useState(isEdit ? "form" : "type");
  const def = {
    assetType: "cash", coin: "", symbol: "", quantity: "", ticker: "",
    buyPrice: "", buyDate: formatDateInputValue(new Date()), name: "", buyingPrice: "", currentValue: "", currentPrice: "", notes: ""
  };
  const [form, setForm] = useState(initial || def);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isCrypto = form.assetType === "crypto";
  const isEquity = form.assetType === "equity";

  const handleSelectType = (type) => {
    set("assetType", type);
    setStep("form");
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center",
      justifyContent: "center", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", padding: 16
    }} onClick={onClose}>
      <div style={{
        background: C.white, borderRadius: 24, border: `1px solid ${C.border}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.25)", maxWidth: 480, width: "100%", 
        overflow: "hidden", display: "flex", flexDirection: "column"
      }} onClick={e => e.stopPropagation()}>

        {/* Header (Snippet Style) */}
        <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ 
              fontSize: 10, fontWeight: 700, color: "var(--text-muted)", 
              textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 
            }}>
              {isEdit ? "Asset management" : "New portfolio asset"}
            </span>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              {isEdit ? (form.name || form.coin || "Asset") : (step === "type" ? "Select asset type" : "Complete details")}
            </div>
          </div>
          <button type="button" onClick={onClose}
            style={{ 
              width: 32, height: 32, borderRadius: 8, border: "none", 
              background: "var(--surface-muted)", color: "var(--text-muted)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" 
            }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ height: 1, background: "var(--border-subtle)", width: "100%" }} />

        <div style={{ padding: 24, maxHeight: "70vh", overflowY: "auto" }}>
          {step === "type" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 4 }}>Common assets</p>
              {CREATABLE_ASSET_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.value} type="button" onClick={() => handleSelectType(t.value)}
                    style={{
                      padding: "12px 16px", borderRadius: 16, border: `1px solid ${C.border}`,
                      background: C.bg, cursor: "pointer", display: "flex", alignItems: "center", 
                      gap: 14, transition: "all 0.15s", fontFamily: "inherit", textAlign: "left",
                      position: "relative"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.background = `${t.color}08`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; }}
                  >
                    <div style={{ 
                      width: 40, height: 40, borderRadius: 12, background: `${t.color}14`, 
                      display: "flex", alignItems: "center", justifyContent: "center", color: t.color 
                    }}>
                      <Icon size={20} strokeWidth={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{t.label}</div>
                    </div>
                    <ChevronRight size={18} color={C.muted} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {isCrypto ? (
                <>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={labelSx}>Coin ID *</label>
                    <input value={form.coin} onChange={e => set("coin", e.target.value)}
                      placeholder="e.g. bitcoin" style={inputSx} />
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>CoinGecko ID — lowercase</div>
                  </div>
                  <div>
                    <label style={labelSx}>Symbol *</label>
                    <input value={form.symbol} onChange={e => set("symbol", e.target.value)}
                      placeholder="BTC" style={inputSx} />
                  </div>
                  <div>
                    <label style={labelSx}>Quantity *</label>
                    <input type="number" min="0" step="any" value={form.quantity}
                      onChange={e => set("quantity", e.target.value)} placeholder="0.00" style={inputSx} />
                  </div>
                  <div>
                    <label style={labelSx}>Buy Price ({currencyCode}) *</label>
                    <input type="number" min="0" step="any" value={form.buyPrice}
                      onChange={e => set("buyPrice", e.target.value)} placeholder="0.00" style={inputSx} />
                  </div>
                  <div>
                    <label style={labelSx}>Buy Date</label>
                    <CalendarPicker
                      C={calendarColors}
                      value={form.buyDate}
                      onChange={(value) => set("buyDate", value)}
                    />
                  </div>
                </>
              ) : isEquity ? (
                <>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={labelSx}>Company / Fund Name *</label>
                    <input value={form.name} onChange={e => set("name", e.target.value)}
                      placeholder="e.g. Apple Inc." style={inputSx} />
                  </div>
                  <div>
                    <label style={labelSx}>Ticker *</label>
                    <input value={form.ticker} onChange={e => set("ticker", e.target.value.toUpperCase())}
                      placeholder="AAPL" style={inputSx} />
                  </div>
                  <div>
                    <label style={labelSx}>Quantity *</label>
                    <input type="number" min="0" step="any" value={form.quantity}
                      onChange={e => set("quantity", e.target.value)} placeholder="0.00" style={inputSx} />
                  </div>
                  <div>
                    <label style={labelSx}>Average Buy Price ({currencyCode}) *</label>
                    <input type="number" min="0" step="any" value={form.buyPrice}
                      onChange={e => set("buyPrice", e.target.value)} placeholder="0.00" style={inputSx} />
                  </div>
                  <div>
                    <label style={labelSx}>Current Price ({currencyCode})</label>
                    <input type="number" min="0" step="any" value={form.currentPrice || ""}
                      onChange={e => set("currentPrice", e.target.value)} placeholder="Optional live/manual price" style={inputSx} />
                  </div>
                  <div>
                    <label style={labelSx}>Current Value ({currencyCode})</label>
                    <input type="number" min="0" step="any" value={form.currentValue || ""}
                      onChange={e => set("currentValue", e.target.value)} placeholder="Optional total market value" style={inputSx} />
                  </div>
                  <div>
                    <label style={labelSx}>Buy Date</label>
                    <CalendarPicker
                      C={calendarColors}
                      value={form.buyDate}
                      onChange={(value) => set("buyDate", value)}
                    />
                  </div>
                  <div style={{
                    gridColumn: "1/-1", fontSize: 10.5, color: C.muted, marginTop: -4,
                    lineHeight: 1.5
                  }}>
                    Add either a current price or a total current value. If both are filled, current value will be used.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={labelSx}>Asset Name *</label>
                    <input value={form.name} onChange={e => set("name", e.target.value)}
                      placeholder={
                        form.assetType === "vehicle" ? "e.g. Toyota Camry 2022" :
                          form.assetType === "property" ? "e.g. Downtown Apartment" :
                            form.assetType === "cash" ? "e.g. Savings Account" :
                                "Asset name"
                      } style={inputSx} />
                  </div>
                  <div>
                    <label style={labelSx}>Purchase Price ({currencyCode}) *</label>
                    <input type="number" min="0" step="any" value={form.buyingPrice}
                      onChange={e => set("buyingPrice", e.target.value)} placeholder="0.00" style={inputSx} />
                  </div>
                  <div>
                    <label style={labelSx}>Current Value ({currencyCode})</label>
                    <input type="number" min="0" step="any" value={form.currentValue || ""}
                      onChange={e => set("currentValue", e.target.value)} placeholder="Same as purchase" style={inputSx} />
                  </div>
                  <div>
                    <label style={labelSx}>Purchase Date</label>
                    <CalendarPicker
                      C={calendarColors}
                      value={form.buyDate}
                      onChange={(value) => set("buyDate", value)}
                    />
                  </div>
                </>
              )}
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelSx}>Notes</label>
                <input value={form.notes} onChange={e => set("notes", e.target.value)}
                  placeholder="Optional note…" style={inputSx} />
              </div>
            </div>
          )}
        </div>

        {step === "form" && (
          <div style={{ padding: "0 24px 24px", display: "flex", gap: 12 }}>
            {!isEdit && (
              <button type="button" onClick={() => setStep("type")}
                style={{
                  padding: "12px 16px", borderRadius: 14, border: `1px solid ${C.border}`,
                  background: "transparent", color: C.text, fontSize: 13, fontWeight: 600, 
                  cursor: "pointer", fontFamily: "inherit"
                }}>
                Back
              </button>
            )}
            <button type="button" onClick={() => onSave(form)} disabled={loading}
              style={{
                flex: 1, padding: "12px 0", borderRadius: 14, border: "none", background: C.strong,
                color: C.onStrong, fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1, fontFamily: "inherit", boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
              }}>
              {loading ? "Saving…" : isEdit ? "Save changes" : "Add Asset"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Asset card (mobile) ─────────────────────────────────── */
function AssetCard({ a, idx, onEdit, onDelete }) {
  const isCrypto = isCryptoAsset(a);
  const isEquity = isEquityAsset(a);
  const cost = getAssetCost(a);
  const value = getAssetValue(a);
  const gain = isCrypto || isEquity ? getAssetGain(a) : null;
  const gainPct = gain != null ? getAssetGainPct(a) : null;
  const up = gain != null && gain >= 0;
  const cfg = getTC(a.assetType);

  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10
    }}>
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AssetIcon type={a.assetType} size={36} />
          <div>
            <div style={{ fontSize: C.fSizeSm, fontWeight: C.fWeightSemi, color: C.text }}>
              {getAssetName(a)}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", marginTop: 3,
              padding: "1px 8px", borderRadius: 100, background: `${cfg.color}12`,
              fontSize: C.fSizeXs, fontWeight: C.fWeightSemi, color: cfg.color
            }}>
              {cfg.label}
              {isCrypto && a.symbol ? ` · ${a.symbol.toUpperCase()}` : ""}
              {isEquity && a.ticker ? ` · ${a.ticker.toUpperCase()}` : ""}
            </div>
          </div>
        </div>
        {/* Actions */}
        {!isEquity && (
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => onEdit(a)}
              style={{
                width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`,
                background: C.bg, color: C.muted, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center"
              }}>
              <Pencil size={11} strokeWidth={1.8} />
            </button>
            <button type="button" onClick={() => onDelete(a._id)}
              style={{
                width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`,
                background: C.bg, color: C.muted, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center"
              }}>
              <Trash2 size={11} strokeWidth={1.8} />
            </button>
          </div>
        )}
      </div>

      {/* Value row */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        padding: "10px 12px", background: C.bg, borderRadius: 9
      }}>
        <div>
          <div style={{
            fontSize: 9.5, color: C.muted, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3
          }}>
            {isCrypto || isEquity ? "Market Value" : "Asset Value"}
          </div>
          <div className="origin-value-sm" style={{ fontSize: C.fSizeBase }}>{fmtC(value)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontSize: 9.5, color: C.muted, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3
          }}>
            {isCrypto || isEquity ? "Invested" : "Paid"}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.sub }}>{fmtC(cost)}</div>
        </div>
        {(isCrypto || isEquity) && gain != null && (
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: 9.5, color: C.muted, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3
            }}>P/L</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: up ? C.greenMid : C.red }}>
              {up ? "+" : "-"}{fmtC(Math.abs(gain))}
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
        <div style={{ fontSize: 10.5, color: C.muted }}>
          {isCrypto ? "Live price" : "Current price"}: <strong style={{ color: C.text }}>{fmt(a.currentPrice)}</strong> per {isCrypto ? a.symbol?.toUpperCase() : getUnitLabel(a)}
          {a.quantity && <span> · {a.quantity} held</span>}
        </div>
      )}
    </div>
  );
}

/* ── Main Portfolio ──────────────────────────────────────── */
export default function Portfolio() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const currencyCode = getUserCurrency(user);
  activeCurrencyCode = currencyCode;
  const { assets, loading, refreshAssets } = usePortfolio();
  const [modal, setModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [typeFilter, setTypeFilter] = useState("All");
  const [plFilter, setPlFilter] = useState("All");
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const csvInputRef = useRef(null);

  /* ── Aggregates ── */
  const agg = useMemo(() => {
    const totalPortfolioValue = assets.reduce((s, a) => s + getAssetValue(a), 0);
    const cryptoAssets = assets.filter(a => a.assetType === "crypto");
    const equityAssets = assets.filter(a => a.assetType === "equity");
    const otherAssets = assets.filter(a => !["crypto", "equity"].includes(a.assetType));
    const cryptoValue = cryptoAssets.reduce((s, a) => s + getAssetValue(a), 0);
    const cryptoInvested = cryptoAssets.reduce((s, a) => s + getAssetCost(a), 0);
    const cryptoPL = cryptoAssets.reduce((s, a) => s + getAssetGain(a), 0);
    const cryptoPLPct = cryptoInvested > 0 ? (cryptoPL / cryptoInvested) * 100 : 0;
    const equityValue = equityAssets.reduce((s, a) => s + getAssetValue(a), 0);
    const equityInvested = equityAssets.reduce((s, a) => s + getAssetCost(a), 0);
    const equityPL = equityAssets.reduce((s, a) => s + getAssetGain(a), 0);
    const equityPLPct = equityInvested > 0 ? (equityPL / equityInvested) * 100 : 0;
    const otherValue = otherAssets.reduce((s, a) => s + getAssetValue(a), 0);
    return {
      totalPortfolioValue, cryptoValue, cryptoInvested, cryptoPL, cryptoPLPct,
      equityValue, equityInvested, equityPL, equityPLPct, otherValue,
      cryptoCount: cryptoAssets.length, equityCount: equityAssets.length, otherCount: otherAssets.length
    };
  }, [assets]);

  /* ── Filter ── */
  const filtered = useMemo(() => {
    return assets.filter(a => {
      if (typeFilter !== "All" && a.assetType !== typeFilter) return false;
      if (plFilter === "Profit") {
        const g = getAssetGain(a); return g > 0;
      }
      if (plFilter === "Loss") {
        const g = getAssetGain(a); return g < 0;
      }
      return true;
    });
  }, [assets, typeFilter, plFilter]);

  /* ── Handlers ── */
  const handleAdd = async (form) => {
    if (form.assetType === "equity") {
      return toast.error("Add and edit equity from the Equity tab.");
    }
    if (form.assetType === "crypto") {
      if (!form.coin || !form.symbol || !form.quantity || !form.buyPrice)
        return toast.error("Fill in all required fields");
    } else if (form.assetType === "equity") {
      if (!form.name || !form.ticker || !form.quantity || !form.buyPrice)
        return toast.error("Name, ticker, quantity, and buy price are required");
    } else {
      if (!form.name || !form.buyingPrice) return toast.error("Name and value are required");
    }
    setSaving(true);
    try {
      await cryptoService.add({ ...form, assetType: form.assetType, currentValue: form.currentValue ? Number(form.currentValue) : undefined });
      toast.success("Asset added"); setModal(null); await refreshAssets();
    } catch { toast.error("Failed to add asset"); }
    setSaving(false);
  };

  const handleCsvImport = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = String(ev.target.result || "").split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2) {
        toast.error("CSV must include a header row and at least one asset.");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const getIndex = (...names) => names.map((name) => headers.indexOf(name)).find((idx) => idx >= 0);
      const typeIdx = getIndex("assettype", "asset_type", "type");
      const nameIdx = getIndex("name", "asset", "coin");
      const priceIdx = getIndex("buyingprice", "buying_price", "buyprice", "buy_price", "price");
      const valueIdx = getIndex("currentvalue", "current_value", "value");
      const symbolIdx = getIndex("symbol", "ticker");
      const qtyIdx = getIndex("quantity", "qty", "shares");
      if (typeIdx == null || nameIdx == null || priceIdx == null) {
        toast.error("CSV needs assetType, name, and buyingPrice columns.");
        return;
      }
      setSaving(true);
      let imported = 0;
      try {
        for (const line of lines.slice(1)) {
          const cols = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
          const assetType = (cols[typeIdx] || "cash").toLowerCase();
          const buyingPrice = Number(cols[priceIdx]);
          const currentValue = valueIdx != null && cols[valueIdx] ? Number(cols[valueIdx]) : buyingPrice;
          if (!assetType || !cols[nameIdx] || !Number.isFinite(buyingPrice)) continue;
          const payload = assetType === "crypto"
            ? { assetType, coin: cols[nameIdx].toLowerCase(), symbol: (cols[symbolIdx] || cols[nameIdx]).toUpperCase(), quantity: Number(cols[qtyIdx] || 1), buyPrice: buyingPrice, currentValue }
            : assetType === "equity"
              ? { assetType, name: cols[nameIdx], ticker: (cols[symbolIdx] || "").toUpperCase(), quantity: Number(cols[qtyIdx] || 1), buyPrice: buyingPrice, currentValue }
              : { assetType, name: cols[nameIdx], buyingPrice, currentValue };
          await cryptoService.add(payload);
          imported += 1;
        }
        if (imported) {
          toast.success(`${imported} assets imported`);
          await refreshAssets();
          setCsvModalOpen(false);
        } else {
          toast.error("No valid assets found in CSV.");
        }
      } catch {
        toast.error("Failed to import assets");
      } finally {
        setSaving(false);
      }
    };
    reader.readAsText(file);
  };

  const handleEdit = async (form) => {
    if (editTarget?.assetType === "equity") {
      setSaving(false);
      return toast.error("Edit equity from the Equity tab.");
    }
    setSaving(true);
    try {
      if (typeof cryptoService.update === "function") await cryptoService.update(editTarget._id, form);
      else if (typeof cryptoService.patch === "function") await cryptoService.patch(editTarget._id, form);
      else { await cryptoService.delete(editTarget._id); await cryptoService.add(form); }
      toast.success("Asset updated"); setModal(null); setEditTarget(null); await refreshAssets();
    } catch { toast.error("Failed to update asset"); }
    setSaving(false);
  };

  const handleDelete = async () => {
    setRemoving(true);
    try {
      await cryptoService.delete(confirmId);
      toast.success("Asset removed"); setConfirmId(null); await refreshAssets();
    } catch { toast.error("Failed to remove asset"); }
    setRemoving(false);
  };

  const openEdit = (a) => {
    if (a?.assetType === "equity") {
      toast.error("Equity details are managed from the Equity tab.");
      return;
    }
    setEditTarget(a); setModal("edit");
  };

  const isUp = agg.cryptoPL >= 0;
  const equityUp = agg.equityPL >= 0;

  return (
    <div style={{
      fontFamily: "var(--font-sans)", color: C.text,
      display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp 0.3s ease"
    }}>

      {/* ── CSS for responsive ── */}
      <style>{`
        .pf-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .pf-toolbar{display:flex;justify-content:space-between;align-items:center;
          padding:13px 18px;border-bottom:1px solid ${C.border2};gap:10px;flex-wrap:wrap}
        .pf-type-tabs{display:flex;gap:2px;background:${C.bg};border-radius:100px;
          padding:3px;overflow-x:auto;-webkit-overflow-scrolling:touch;
          scrollbar-width:none;max-width:100%}
        .pf-type-tabs::-webkit-scrollbar{display:none}
        .pf-header{display:flex;align-items:flex-start;justify-content:space-between;
          flex-wrap:wrap;gap:10px}
        @media(max-width:768px){
          .pf-stats{grid-template-columns:repeat(2,1fr)!important}
          .pf-toolbar{flex-direction:column;align-items:flex-start}
          .pf-header{flex-direction:column;align-items:flex-start}
          .pf-table-outer{overflow-x:auto;-webkit-overflow-scrolling:touch}
        }
        @media(max-width:400px){
          .pf-stats{grid-template-columns:1fr 1fr!important}
        }
      `}</style>

      {/* Modals */}
      {modal === "add" && <AssetModal onSave={handleAdd} onClose={() => setModal(null)} loading={saving} isEdit={false} currencyCode={currencyCode} />}
      {csvModalOpen && <PortfolioCsvModal onClose={() => setCsvModalOpen(false)} onImport={handleCsvImport} loading={saving} C={C} />}
      {modal === "edit" && editTarget && (
        <AssetModal
          initial={editTarget.assetType === "crypto"
            ? {
              assetType: "crypto", coin: editTarget.coin, symbol: editTarget.symbol,
              quantity: editTarget.quantity, buyPrice: editTarget.buyPrice,
              buyDate: editTarget.buyDate || "", notes: editTarget.notes || ""
            }
            : editTarget.assetType === "equity"
              ? {
                assetType: "equity", name: editTarget.name, ticker: editTarget.ticker || "",
                quantity: editTarget.quantity || "", buyPrice: editTarget.buyPrice || "",
                currentPrice: editTarget.currentPrice || "", currentValue: editTarget.currentValue || "",
                buyDate: editTarget.buyDate || "", notes: editTarget.notes || ""
              }
            : {
              assetType: editTarget.assetType, name: editTarget.name,
              buyingPrice: editTarget.buyingPrice, currentValue: editTarget.currentValue || "", notes: editTarget.notes || ""
            }}
          onSave={handleEdit}
          onClose={() => { setModal(null); setEditTarget(null); }}
          loading={saving} isEdit={true} currencyCode={currencyCode} />
      )}
      {confirmId && <ConfirmModal onConfirm={handleDelete} onCancel={() => setConfirmId(null)} loading={removing} />}

      {/* ── Header ── */}
      <div className="pf-header">
        <div>
          <div className="origin-section-label" style={{ marginBottom: 4 }}>
            {new Date().toLocaleString("default", { month: "long", year: "numeric" })} · Portfolio
          </div>
          <div style={{ fontSize: C.fSizeLg, fontWeight: C.fWeightMed, color: C.text, letterSpacing: "-0.4px", lineHeight: C.lhTight }}>Asset Portfolio</div>
          <div style={{ fontSize: C.fSizeSm, color: C.muted, marginTop: 4, fontWeight: C.fWeightReg }}>All holdings and net worth</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setCsvModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: C.white, color: C.text, border: `1px solid ${C.border}`, borderRadius: 100, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Import CSV
          </button>
          <button type="button" onClick={() => setModal("add")}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: C.strong, color: C.onStrong,
              border: "none", borderRadius: 100, padding: "8px 18px", fontSize: 12.5, fontWeight: 600,
              cursor: "pointer", transition: "opacity 0.15s", fontFamily: "inherit", whiteSpace: "nowrap"
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            <Plus size={14} strokeWidth={2.5} /> Add Asset
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="pf-stats">
        {/* Total Portfolio Value */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
          <div className="origin-section-label" style={{ marginBottom: 10, fontSize: C.fSizeXs }}>Total Portfolio Value</div>
          <div className="origin-value-sm" style={{ marginBottom: 4 }}>
            {fmtC(agg.totalPortfolioValue)}
          </div>
          <div style={{ fontSize: C.fSizeXs, color: C.muted, fontWeight: C.fWeightReg }}>
            {agg.cryptoCount} crypto + {agg.equityCount} equity + {agg.otherCount} other
          </div>
        </div>

        {/* Crypto holdings */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
          <div className="origin-section-label" style={{ marginBottom: 10, fontSize: C.fSizeXs }}>Crypto Holdings</div>
          <div className="origin-value-sm" style={{ marginBottom: 4 }}>
            {fmtC(agg.cryptoValue)}
          </div>
          <div style={{ fontSize: C.fSizeXs, color: C.muted, fontWeight: C.fWeightReg }}>
            {agg.cryptoInvested > 0 ? `Invested ${fmtC(agg.cryptoInvested)}` : "No crypto assets"}
          </div>
        </div>

        {/* Crypto P/L */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
          <div className="origin-section-label" style={{ marginBottom: 10, fontSize: C.fSizeXs }}>Equity Holdings</div>
          {agg.equityCount > 0 ? (
            <>
              <div className="origin-value-sm" style={{ marginBottom: 4 }}>
                {fmtC(agg.equityValue)}
              </div>
              <div style={{ fontSize: C.fSizeXs, fontWeight: C.fWeightSemi, color: equityUp ? C.greenMid : C.red, fontVariantNumeric: "tabular-nums" }}>
                {equityUp ? "▲" : "▼"} {Math.abs(agg.equityPLPct).toFixed(1)}% on equity
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.muted, letterSpacing: "-0.4px", marginBottom: 3 }}>—</div>
              <div style={{ fontSize: 10.5, color: C.muted }}>No equity tracked</div>
            </>
          )}
        </div>

        {/* Other assets */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
          <div className="origin-section-label" style={{ marginBottom: 10, fontSize: C.fSizeXs }}>Other Assets</div>
          <div className="origin-value-sm" style={{ marginBottom: 4 }}>
            {fmtC(agg.otherValue)}
          </div>
          <div style={{ fontSize: C.fSizeXs, color: C.muted, fontWeight: C.fWeightReg }}>
            Cash, property, vehicles, and more
          </div>
        </div>
      </div>

      {/* ── Table / Cards ── */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>

        {/* Toolbar */}
        <div className="pf-toolbar">
          <div className="pf-type-tabs">
            {["All", ...ASSET_TYPES.map(t => t.value)].map(t => {
              const cfg = t === "All" ? null : getTC(t);
              const active = typeFilter === t;
              return (
                <button key={t} type="button" onClick={() => setTypeFilter(t)}
                  style={{
                    padding: "4px 12px", borderRadius: 100, fontSize: 11,
                    fontWeight: active ? 600 : 400, border: "none", cursor: "pointer",
                    transition: "all 0.15s", whiteSpace: "nowrap",
                    background: active ? C.white : "transparent",
                    color: active ? C.text : C.muted,
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    fontFamily: "inherit"
                  }}>
                  {t === "All" ? "All" : cfg.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 2, background: C.bg, borderRadius: 100, padding: "3px", flexShrink: 0 }}>
            {["All", "Profit", "Loss"].map(f => (
              <button key={f} type="button" onClick={() => setPlFilter(f)}
                style={{
                  padding: "4px 12px", borderRadius: 100, fontSize: 11,
                  fontWeight: plFilter === f ? 600 : 400, border: "none", cursor: "pointer",
                  background: plFilter === f ? C.white : "transparent",
                  color: plFilter === f ? C.text : C.muted,
                  boxShadow: plFilter === f ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  fontFamily: "inherit", transition: "all 0.15s"
                }}>{f}</button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="pf-table-outer" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {["Asset", "Type", "Current Value", "Invested / Paid", "Profit / Loss", ""].map((h, i) => (
                  <th key={i} style={{
                    padding: "9px 16px", textAlign: i === 5 ? "right" : "left",
                    borderBottom: `1px solid ${C.border2}`, whiteSpace: "nowrap"
                  }}>
                    <span className="origin-section-label" style={{ fontSize: C.fSizeXs }}>{h}</span>
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
                    {assets.length === 0
                      ? <span>No assets yet. <button type="button" onClick={() => setModal("add")}
                        style={{
                          color: C.teal, background: "none", border: "none", cursor: "pointer",
                          fontSize: 13, fontWeight: 600, fontFamily: "inherit"
                        }}>
                        Add your first asset →
                      </button></span>
                      : "No assets match this filter."}
                  </td>
                </tr>
              ) : filtered.map((a, idx) => {
                const isCrypto = isCryptoAsset(a);
                const isEquity = isEquityAsset(a);
                const cost = getAssetCost(a);
                const value = getAssetValue(a);
                const gain = isCrypto || isEquity ? getAssetGain(a) : null;
                const gainPct = gain != null ? getAssetGainPct(a) : null;
                const up = gain != null && gain >= 0;
                const cfg = getTC(a.assetType);
                return (
                  <tr key={a._id}
                    style={{ borderBottom: `1px solid ${C.border2}`, transition: "background 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.mutedSurface}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {/* Asset */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <AssetIcon type={a.assetType} size={32} />
                        <div>
                          <div style={{ fontSize: C.fSizeSm, fontWeight: C.fWeightSemi, color: C.text }}>
                            {getAssetName(a)}
                          </div>
                          <div style={{ fontSize: C.fSizeXs, color: C.muted, marginTop: 1, fontWeight: C.fWeightReg }}>
                            {isCrypto ? a.symbol?.toUpperCase() : isEquity ? a.ticker?.toUpperCase() : cfg.label}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Type */}
                    <td style={{ padding: "12px 16px" }}>
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "2px 9px", borderRadius: 100, background: `${cfg.color}12`,
                          fontSize: C.fSizeXs, fontWeight: C.fWeightSemi, color: cfg.color
                        }}>
                          {cfg.label}
                        {(isCrypto || isEquity) && a.quantity != null && (
                          <span style={{ color: `${cfg.color}99`, fontWeight: 400 }}> · {a.quantity}</span>
                        )}
                      </div>
                    </td>
                    {/* Current value */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                        {value ? fmtC(value) : <span style={{ color: C.muted }}>—</span>}
                      </div>
                      {(isCrypto || isEquity) && a.currentPrice != null && (
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                          {fmt(a.currentPrice)} / {getUnitLabel(a)}
                        </div>
                      )}
                    </td>
                    {/* Cost */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 13, color: C.sub, fontWeight: 500 }}>{fmtC(cost)}</div>
                      {!(isCrypto || isEquity) && (
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>Purchase price</div>
                      )}
                      {isEquity && (
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                          Avg buy {fmt(a.buyPrice || 0)} / share
                        </div>
                      )}
                    </td>
                    {/* P/L */}
                    <td style={{ padding: "12px 16px" }}>
                      {gain != null ? (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: up ? C.greenMid : C.red }}>
                            {up ? "+" : "-"}{fmtC(Math.abs(gain))}
                          </div>
                          {gainPct != null && (
                            <div style={{ fontSize: 10, color: up ? C.greenMid : C.red, marginTop: 1 }}>
                              {up ? "▲" : "▼"} {Math.abs(gainPct).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: C.muted }}>—</span>
                      )}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {isEquity ? (
                        <div 
                          style={{ fontSize: 11, color: C.teal, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                          onClick={() => navigate("/dashboard?tab=equity")}
                        >
                          Manage in Equity tab
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button type="button" onClick={() => openEdit(a)}
                            style={{
                              width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`,
                              background: C.white, color: C.muted, cursor: "pointer", display: "flex",
                              alignItems: "center", justifyContent: "center", transition: "all 0.15s"
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.text; }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.color = C.muted; }}>
                            <Pencil size={11} strokeWidth={1.8} />
                          </button>
                          <button type="button" onClick={() => setConfirmId(a._id)}
                            style={{
                              width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`,
                              background: C.white, color: C.muted, cursor: "pointer", display: "flex",
                              alignItems: "center", justifyContent: "center", transition: "all 0.15s"
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = C.redBg; e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = `${C.red}30`; }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}>
                            <Trash2 size={11} strokeWidth={1.8} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && assets.length > 0 && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "11px 18px", borderTop: `1px solid ${C.border2}`, background: C.bg,
            flexWrap: "wrap", gap: 8
          }}>
            <span style={{ fontSize: 11, color: C.muted }}>
              {filtered.length} asset{filtered.length !== 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", gap: 12, fontSize: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: C.sub }}>
                Portfolio <strong style={{ color: C.text }}>{fmtC(agg.totalPortfolioValue)}</strong>
              </span>
              {agg.cryptoCount > 0 && (
                <span style={{ fontWeight: 700, color: isUp ? C.greenMid : C.red }}>
                  Crypto {isUp ? "+" : "-"}{fmtC(Math.abs(agg.cryptoPL))} ({isUp ? "+" : "-"}{Math.abs(agg.cryptoPLPct).toFixed(1)}%)
                </span>
              )}
              {agg.equityCount > 0 && (
                <span style={{ fontWeight: 700, color: equityUp ? C.greenMid : C.red }}>
                  Equity {equityUp ? "+" : "-"}{fmtC(Math.abs(agg.equityPL))} ({equityUp ? "+" : "-"}{Math.abs(agg.equityPLPct).toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
