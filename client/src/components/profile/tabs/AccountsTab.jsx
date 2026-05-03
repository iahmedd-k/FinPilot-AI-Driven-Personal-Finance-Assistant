import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Building2, Car, DollarSign, Eye, EyeOff, Gem, Heart, Home, Landmark, Layers, MoreVertical, PiggyBank, Plus, Search, Shield, Trophy, TrendingUp, X, Upload } from "lucide-react";
import { useAuthContext } from "../../../hooks/useAuthContext";
import { cryptoService } from "../../../services/cryptoService";
import { dashboardService } from "../../../services/dashboardService";
import { CalendarPicker } from "../../dashboard/tabs/SpendingTab";
import { BG, BORDER, MUTED, Notice, RED, SUB, SURFACE_MUTED, SURFACE_STRONG, TEXT, TEXT_ON_STRONG, WHITE, fi, fo, inputStyle } from "../shared";
import { formatCurrencyAmount, getUserCurrency } from "../../../utils/currency";

const ASSET_TYPES = [
  { value: "crypto", label: "Crypto", icon: Gem, color: "#f59e0b" },
  { value: "equity", label: "Equity", icon: TrendingUp, color: "#14b8a6" },
  { value: "cash", label: "Cash", icon: DollarSign, color: "#16a34a" },
  { value: "vehicle", label: "Vehicle", icon: Car, color: "#6366f1" },
  { value: "property", label: "Property", icon: Home, color: "#0d9488" },
  { value: "private_equity", label: "Private Equity", icon: Building2, color: "#3b82f6" },
  { value: "insurance", label: "Insurance", icon: Shield, color: "#ec4899" },
  { value: "valuables", label: "Valuables", icon: Trophy, color: "#d97706" },
  { value: "pension", label: "Pensions", icon: Landmark, color: "#8b5cf6" },
  { value: "debt", label: "Unpaid Debt", icon: ArrowUp, color: "#ef4444" },
  { value: "other", label: "Other", icon: Layers, color: "#9ca3af" },
];

const ACCOUNT_TYPE_DISPLAY = {
  cash: { label: "Bank Accounts" },
  crypto: { label: "Crypto" },
  equity: { label: "Equity" },
  vehicle: { label: "Vehicle" },
  property: { label: "Property" },
  private_equity: { label: "Private Equity" },
  insurance: { label: "Insurance policies" },
  valuables: { label: "Valuables" },
  pension: { label: "Pensions and annuities" },
  debt: { label: "Unpaid Debt" },
  other: { label: "Other" },
};

const ADD_ASSET_CARDS = [
  { key: "insurance", label: "Insurance", icon: Heart },
  { key: "valuables", label: "Valuables", icon: Trophy },
  { key: "private_equity", label: "Private Equity", icon: PiggyBank },
  { key: "equity", label: "Equity", icon: TrendingUp },
  { key: "vehicle", label: "Vehicles", icon: Car },
  { key: "pension", label: "Pensions and annuities", icon: PiggyBank },
  { key: "cash", label: "Cash", icon: DollarSign },
  { key: "debt", label: "Unpaid Debt", icon: ArrowUp },
  { key: "other", label: "Other", icon: ArrowUp },
];

const CALENDAR_COLORS = {
  border: BORDER,
  text: TEXT,
  muted: MUTED,
  strong: SURFACE_STRONG,
  onStrong: TEXT_ON_STRONG,
};

function CashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M9 9h4.5a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3H15" />
    </svg>
  );
}

function VehicleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3v-5l2-5h14l2 5v5h-2" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
      <path d="M5 17h9" />
    </svg>
  );
}

function InsuranceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-6.5-4.35-6.5-9.25A3.75 3.75 0 0 1 12 8a3.75 3.75 0 0 1 6.5 2.75C18.5 15.65 12 20 12 20Z" />
    </svg>
  );
}

function ValuablesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 5h8l3 4-3 4H8L5 9l3-4Z" />
      <path d="M9.5 9h5" />
      <path d="M12 5v8" />
    </svg>
  );
}

function CryptoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 9h4a2 2 0 0 1 0 4H9v-4zm0 4h5a2 2 0 0 1 0 4H9v-4z" />
      <line x1="9" y1="6" x2="9" y2="18" />
      <line x1="13" y1="6" x2="13" y2="18" />
    </svg>
  );
}

function PropertyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9" />
      <path d="M9 21V12h6v9" />
      <path d="M3 21h18" />
    </svg>
  );
}

function PrivateEquityIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  );
}

function PensionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h16" />
      <path d="M6 10V7l6-3 6 3v3" />
      <path d="M7 20v-6" />
      <path d="M12 20v-6" />
      <path d="M17 20v-6" />
      <path d="M4 20h16" />
    </svg>
  );
}

function DebtIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  );
}

function OtherIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

const ASSET_ICON_MAP = {
  cash: CashIcon,
  vehicle: VehicleIcon,
  insurance: InsuranceIcon,
  valuables: ValuablesIcon,
  crypto: CryptoIcon,
  equity: PrivateEquityIcon,
  property: PropertyIcon,
  private_equity: PrivateEquityIcon,
  pension: PensionIcon,
  debt: DebtIcon,
  other: OtherIcon,
};

function AssetTypeIcon({ assetType }) {
  const IconComponent = ASSET_ICON_MAP[assetType] || OtherIcon;
  return <IconComponent />;
}

function AssetCardMenu({ onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, display: "flex", padding: 6, borderRadius: 6 }}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: 32, right: 0, width: 130, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", zIndex: 50, overflow: "hidden" }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDelete?.();
            }}
            style={{ display: "flex", width: "100%", padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: RED, fontFamily: "inherit", textAlign: "left" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = SURFACE_MUTED; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function AccountsTab({ pushNotif }) {
  const { user } = useAuthContext();
  const currencyCode = getUserCurrency(user);
  const queryClient = useQueryClient();
  const { data: assets = [], isLoading: assetsLoading, refetch: refetchAssets } = useQuery({
    queryKey: ["profile-assets", user?._id],
    queryFn: () => cryptoService.list().then((r) => r.data?.assets || []),
    enabled: !!user?._id,
    staleTime: 0,
    refetchOnMount: true,
  });
  const { refetch: refetchDashboard } = useQuery({
    queryKey: ["dashboard", user?._id],
    queryFn: () => dashboardService.getDashboard().then((r) => r.data),
    enabled: !!user?._id,
    staleTime: 0,
    refetchOnMount: true,
  });

  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetModalTab, setAssetModalTab] = useState("manual"); // "manual" or "import"
  const [assetSaving, setAssetSaving] = useState(false);
  const [assetMsg, setAssetMsg] = useState(null);
  const [assetSearch, setAssetSearch] = useState("");
  const [hiddenAssetIds, setHiddenAssetIds] = useState({});
  const [assetForm, setAssetForm] = useState({
    assetType: "cash",
    coin: "",
    symbol: "",
    quantity: "",
    buyPrice: "",
    ticker: "",
    buyDate: "",
    name: "",
    buyingPrice: "",
    currentValue: "",
    notes: "",
  });

  const openModal = (typeOverride = "cash") => {
    setAssetMsg(null);
    setAssetModalTab("manual");
    setAssetForm({ assetType: typeOverride, coin: "", symbol: "", quantity: "", buyPrice: "", ticker: "", buyDate: "", name: "", buyingPrice: "", currentValue: "", notes: "" });
    setAssetModalOpen(true);
  };

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
      ? {
          assetType: "crypto",
          coin: assetForm.coin.trim().toLowerCase(),
          symbol: assetForm.symbol.trim().toUpperCase(),
          quantity: Number(assetForm.quantity),
          buyPrice: Number(assetForm.buyPrice),
          buyDate: assetForm.buyDate || undefined,
          notes: assetForm.notes || undefined,
        }
      : isEquity
        ? {
            assetType: "equity",
            name: assetForm.name.trim(),
            ticker: assetForm.ticker.trim().toUpperCase(),
            quantity: Number(assetForm.quantity),
            buyPrice: Number(assetForm.buyPrice),
            buyDate: assetForm.buyDate || undefined,
            currentValue: assetForm.currentValue ? Number(assetForm.currentValue) : undefined,
            notes: assetForm.notes || undefined,
          }
      : {
          assetType: assetForm.assetType,
          name: assetForm.name.trim(),
          buyingPrice: Number(assetForm.buyingPrice),
          currentValue: assetForm.currentValue ? Number(assetForm.currentValue) : Number(assetForm.buyingPrice),
          notes: assetForm.notes || undefined,
        };

    setAssetSaving(true);
    setAssetMsg(null);
    try {
      await cryptoService.add(payload);
      await refetchAssets();
      await refetchDashboard();
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?._id] });
      pushNotif?.("success", "Asset added successfully.");
      setAssetModalOpen(false);
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to add asset.";
      setAssetMsg({ type: "error", text: errMsg });
      pushNotif?.("error", errMsg);
    } finally {
      setAssetSaving(false);
    }
  };

  const fileInputRef = useRef(null);

  const handleCsvImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        pushNotif?.("error", "Invalid CSV file format. Need headers.");
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const findIdx = (...keys) => keys.map((key) => headers.indexOf(key)).find((idx) => idx >= 0);
      const typeIdx = findIdx('assettype', 'asset_type', 'type');
      const nameIdx = findIdx('name', 'asset', 'coin');
      const priceIdx = findIdx('buyingprice', 'buying_price', 'buyprice', 'buy_price', 'price');
      const valueIdx = findIdx('currentvalue', 'current_value', 'value');
      const symbolIdx = findIdx('symbol', 'ticker');
      const qtyIdx = findIdx('quantity', 'qty', 'shares');
      
      if (typeIdx === -1 || nameIdx === -1 || priceIdx === -1) {
        pushNotif?.("error", "CSV must contain assetType, name, and buyingPrice columns.");
        return;
      }
      
      setAssetSaving(true);
      let successCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim());
        const type = String(vals[typeIdx] || "").trim().toLowerCase();
        const name = vals[nameIdx];
        const price = Number(vals[priceIdx]);
        const currentValue = valueIdx != null && vals[valueIdx] ? Number(vals[valueIdx]) : price;
        if (!type || !name || isNaN(price)) continue;
        try {
          if (type === "crypto") {
            await cryptoService.add({ assetType: type, coin: name.toLowerCase(), symbol: (vals[symbolIdx] || name).toUpperCase(), quantity: Number(vals[qtyIdx] || 1), buyPrice: price, currentValue });
          } else if (type === "equity") {
            await cryptoService.add({ assetType: type, name, ticker: (vals[symbolIdx] || "").toUpperCase(), quantity: Number(vals[qtyIdx] || 1), buyPrice: price, currentValue });
          } else {
            await cryptoService.add({ assetType: type, name, buyingPrice: price, currentValue });
          }
          successCount++;
        } catch (err) {
          console.error("Failed to add asset from CSV", err);
        }
      }
      
      if (successCount > 0) {
        pushNotif?.("success", `Successfully imported ${successCount} assets`);
        await refetchAssets();
        await refetchDashboard();
        queryClient.invalidateQueries({ queryKey: ["dashboard", user?._id] });
      } else {
        pushNotif?.("error", "No valid assets found to import.");
      }
      setAssetSaving(false);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const deleteAsset = async (assetId) => {
    try {
      await cryptoService.delete?.(assetId);
      await refetchAssets();
      await refetchDashboard();
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?._id] });
      pushNotif?.("success", "Asset removed.");
    } catch {
      pushNotif?.("error", "Failed to remove asset.");
    }
  };

  const toggleAssetVisibility = (assetId) => {
    setHiddenAssetIds((prev) => ({ ...prev, [assetId]: !prev[assetId] }));
  };

  const hasAssets = assets && assets.length > 0;
  const sortedAssets = [...(assets || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const filteredAssetCards = ADD_ASSET_CARDS.filter((card) => card.label.toLowerCase().includes(assetSearch.trim().toLowerCase()));

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start", width: "100%" }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
          {/* Connected Assets */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", height: 300, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.13em" }}>Connected Assets</span>
              <button
                type="button"
                onClick={() => refetchAssets()}
                style={{ border: `1px solid ${BORDER}`, background: "transparent", borderRadius: 8, padding: "6px 18px", fontSize: 13, fontWeight: 500, color: TEXT, cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = BG; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Refresh
              </button>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 32px" }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: TEXT, textAlign: "center", marginBottom: 12 }}>No assets connected</div>
              <div style={{ fontSize: 13, color: MUTED, textAlign: "center", marginBottom: 24, maxWidth: 400 }}>Connect assets to start tracking your Net Worth</div>
              <button
                type="button"
                onClick={() => openModal("cash")}
                style={{ background: SURFACE_STRONG, color: TEXT_ON_STRONG, border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.2px", transition: "opacity 0.15s", width: "100%", maxWidth: 300 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                Add Assets
              </button>
            </div>
          </div>

          {/* Manual Assets */}
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", background: WHITE, width: "100%" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.13em" }}>Manual Assets</span>
            </div>

            {assetsLoading ? (
              <div style={{ padding: 32, textAlign: "center", color: MUTED, fontSize: 13 }}>Loading...</div>
            ) : !hasAssets ? (
              <div style={{ padding: "32px 20px", textAlign: "center", minHeight: 200 }}>
                <div style={{ fontSize: 14, color: MUTED }}>No manual assets yet.</div>
                <button
                  type="button"
                  onClick={() => openModal("cash")}
                  style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 500, color: TEXT, cursor: "pointer", fontFamily: "inherit" }}
                >
                  <Plus size={16} /> Add asset
                </button>
              </div>
            ) : (
              <>
                {sortedAssets.map((asset, index) => {
                  const val = asset.currentValue || asset.buyingPrice || (asset.buyPrice && asset.quantity ? asset.buyPrice * asset.quantity : 0);
                  const fmtVal = formatCurrencyAmount(Number(val || 0), currencyCode, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  const display = ACCOUNT_TYPE_DISPLAY[asset.assetType] || ACCOUNT_TYPE_DISPLAY.other;
                  const days = asset.createdAt ? Math.floor((Date.now() - new Date(asset.createdAt).getTime()) / 86400000) : null;
                  const addedLabel = days == null ? "Added manually" : `Added ${days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`} • Manually`;
                  const isHidden = !!hiddenAssetIds[asset._id];
                  const primaryName = asset.assetType === "crypto" ? asset.coin || asset.symbol || "Crypto Asset" : asset.name || display.label;

                  return (
                    <div key={asset._id} style={{ 
                      padding: "16px 20px", 
                      borderBottom: index < sortedAssets.length - 1 ? `1px solid ${BORDER}` : "none", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 16,
                      transition: "background 0.15s ease",
                      cursor: "default"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = SURFACE_MUTED; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                    >
                      {/* Icon */}
                      <div style={{ 
                        width: 42, height: 42, borderRadius: 12, 
                        background: WHITE, color: MUTED, 
                        display: "flex", alignItems: "center", justifyContent: "center", 
                        flexShrink: 0, border: `1px solid ${BORDER}`,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                      }}>
                        <AssetTypeIcon assetType={asset.assetType} />
                      </div>

                      {/* Label + subtitle — grows */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{primaryName}</span>
                          <span style={{ 
                            fontSize: 9, fontWeight: 800, color: "#059669", 
                            background: "#ecfdf5", border: "1px solid #10b981", 
                            borderRadius: 6, padding: "2px 6px", letterSpacing: "0.05em", flexShrink: 0 
                          }}>ACTIVE</span>
                        </div>
                        <div style={{ fontSize: 12, color: MUTED, display: "flex", alignItems: "center", gap: 4 }}>
                          <span>{display.label}</span>
                          <span style={{ opacity: 0.5 }}>•</span>
                          <span>{addedLabel}</span>
                        </div>
                      </div>

                      {/* Value */}
                      <div style={{ textAlign: "right", flexShrink: 0, paddingRight: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
                          {isHidden ? "••••••" : fmtVal}
                        </div>
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Current Value</div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <button type="button" onClick={() => toggleAssetVisibility(asset._id)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, display: "flex", padding: 8, borderRadius: 8, transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = WHITE} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                          {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <AssetCardMenu onDelete={() => deleteAsset(asset._id)} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ padding: "16px 20px", borderTop: `1px solid ${BORDER}` }}>
                  <button
                    type="button"
                    onClick={() => { setAssetModalTab("manual"); openModal("cash"); }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", gap: 8, background: "transparent", border: `2px dashed ${BORDER}`, borderRadius: 12, cursor: "pointer", padding: "14px", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: MUTED, transition: "all 0.2s", appearance: "none", outline: "none", WebkitTapHighlightColor: "transparent" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = SUB; e.currentTarget.style.color = TEXT; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED; }}
                  >
                    <Plus size={16} /> Add another asset
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — Add Assets panel */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.13em" }}>Add Assets</span>
              <button type="button" onClick={() => { setAssetModalTab("import"); setAssetModalOpen(true); }} style={{ border: `1px solid ${BORDER}`, background: "transparent", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: TEXT, cursor: "pointer", appearance: "none", outline: "none", WebkitTapHighlightColor: "transparent", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-muted)"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                Import CSV
              </button>
            </div>

            <div style={{ padding: "12px 14px 8px" }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: MUTED, pointerEvents: "none" }} />
                <input
                  type="text"
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Search asset categories"
                  style={{ width: "100%", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px 10px 34px", fontSize: 13.5, color: TEXT, background: BG, outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s" }}
                  onFocus={fi}
                  onBlur={fo}
                />
              </div>
            </div>

            <div style={{ padding: "16px 20px", flex: 1, overflowY: "auto" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>Categories</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {filteredAssetCards.map((category) => {
                  const CardIcon = category.icon;
                  return (
                    <button
                      key={category.key}
                      type="button"
                      style={{
                        textAlign: "left",
                        border: `1px solid ${BORDER}`,
                        background: WHITE,
                        borderRadius: 18,
                        padding: "14px 14px",
                        minHeight: 104,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.12)";
                        e.currentTarget.style.borderColor = MUTED;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.03)";
                        e.currentTarget.style.borderColor = BORDER;
                      }}
                      onClick={() => openModal(category.key)}
                    >
                      {/* Icon bubble uses SURFACE_MUTED + MUTED color so it works in dark */}
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: SURFACE_MUTED, color: MUTED, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CardIcon size={17} strokeWidth={1.8} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: TEXT, lineHeight: 1.25 }}>{category.label}</div>
                    </button>
                  );
                })}
              </div>
              {!filteredAssetCards.length && <div style={{ paddingTop: 18, fontSize: 13, color: MUTED, textAlign: "center" }}>No asset categories found.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ADD ASSET MODAL */}
      {assetModalOpen &&
        createPortal(
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", padding: 16 }}
            onClick={() => !assetSaving && setAssetModalOpen(false)}
          >
            <div
              style={{ background: WHITE, borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.28)", maxWidth: 520, width: "100%", padding: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>Add Asset</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Choose category and enter asset details</div>
                </div>
                <button type="button" onClick={() => setAssetModalOpen(false)} style={{ border: "none", background: "none", color: MUTED, cursor: "pointer" }}>
                  <X size={18} />
                </button>
              </div>

              {/* Modal tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: `1px solid ${BORDER}` }}>
                <button type="button" onClick={() => setAssetModalTab("manual")} style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: assetModalTab === "manual" ? TEXT : MUTED, background: "none", border: "none", cursor: "pointer", borderBottom: assetModalTab === "manual" ? `2px solid ${TEXT}` : "none", transition: "all 0.2s" }}>
                  Manual Entry
                </button>
                <button type="button" onClick={() => setAssetModalTab("import")} style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: assetModalTab === "import" ? TEXT : MUTED, background: "none", border: "none", cursor: "pointer", borderBottom: assetModalTab === "import" ? `2px solid ${TEXT}` : "none", transition: "all 0.2s" }}>
                  Import CSV
                </button>
              </div>

              {assetModalTab === "manual" ? (
              <>
              {/* Asset type selector */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Asset Type</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {ASSET_TYPES.map((type) => {
                    const IconComponent = type.icon;
                    const active = assetForm.assetType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setAssetForm((prev) => ({ ...prev, assetType: type.value }))}
                        style={{
                          border: `1.5px solid ${active ? type.color : BORDER}`,
                          background: active ? SURFACE_MUTED : "transparent",
                          borderRadius: 10,
                          padding: "10px 8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          color: active ? TEXT : SUB,
                          fontSize: 12,
                          fontWeight: active ? 600 : 500,
                          transition: "all 0.2s",
                          outline: active ? `2px solid ${type.color}44` : "none",
                          outlineOffset: -1,
                        }}
                      >
                        <IconComponent size={14} style={{ color: active ? type.color : MUTED }} /> {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {assetForm.assetType === "crypto" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Coin ID</div><input style={inputStyle} value={assetForm.coin} onChange={handleAssetChange("coin")} placeholder="e.g. bitcoin" /></div>
                  <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Symbol</div><input style={inputStyle} value={assetForm.symbol} onChange={handleAssetChange("symbol")} placeholder="BTC" /></div>
                  <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Quantity</div><input style={inputStyle} type="number" value={assetForm.quantity} onChange={handleAssetChange("quantity")} placeholder="0.00" /></div>
                  <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Buy Price ({currencyCode})</div><input style={inputStyle} type="number" value={assetForm.buyPrice} onChange={handleAssetChange("buyPrice")} placeholder="0.00" /></div>
                  <div>
                    <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Buy Date</div>
                    <CalendarPicker C={CALENDAR_COLORS} value={assetForm.buyDate} onChange={(value) => setAssetForm((prev) => ({ ...prev, buyDate: value }))} />
                  </div>
                </div>
              ) : assetForm.assetType === "equity" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Company / Fund Name</div><input style={inputStyle} value={assetForm.name} onChange={handleAssetChange("name")} placeholder="e.g. Apple Inc." /></div>
                  <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Ticker</div><input style={inputStyle} value={assetForm.ticker} onChange={(e) => setAssetForm((prev) => ({ ...prev, ticker: e.target.value.toUpperCase() }))} placeholder="AAPL" /></div>
                  <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Quantity</div><input style={inputStyle} type="number" value={assetForm.quantity} onChange={handleAssetChange("quantity")} placeholder="0" /></div>
                  <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Average Buy Price ({currencyCode})</div><input style={inputStyle} type="number" value={assetForm.buyPrice} onChange={handleAssetChange("buyPrice")} placeholder="0.00" /></div>
                  <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Current Value ({currencyCode})</div><input style={inputStyle} type="number" value={assetForm.currentValue} onChange={handleAssetChange("currentValue")} placeholder="Optional" /></div>
                  <div>
                    <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Buy Date</div>
                    <CalendarPicker C={CALENDAR_COLORS} value={assetForm.buyDate} onChange={(value) => setAssetForm((prev) => ({ ...prev, buyDate: value }))} />
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Asset Name</div><input style={inputStyle} value={assetForm.name} onChange={handleAssetChange("name")} placeholder="e.g. Toyota Camry" /></div>
                  <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Purchase Price ({currencyCode})</div><input style={inputStyle} type="number" value={assetForm.buyingPrice} onChange={handleAssetChange("buyingPrice")} placeholder="0.00" /></div>
                  <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Current Value ({currencyCode})</div><input style={inputStyle} type="number" value={assetForm.currentValue} onChange={handleAssetChange("currentValue")} placeholder="Optional" /></div>
                </div>
              )}

              <div style={{ marginTop: 12 }}><div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Notes</div><input style={inputStyle} value={assetForm.notes} onChange={handleAssetChange("notes")} placeholder="Optional" /></div>
              <Notice msg={assetMsg} />
              </> ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "10px 0" }}>
                <div style={{ textAlign: "center", padding: "0 20px" }}>
                  <div style={{ fontSize: 14, color: TEXT, marginBottom: 8, fontWeight: 600 }}>Upload CSV file</div>
                  <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
                    Import multiple assets at once. Your CSV should match the following format for best results:
                  </div>
                </div>

                {/* Sample format preview */}
                <div style={{ 
                  background: SURFACE_MUTED, border: `1px solid ${BORDER}`, 
                  borderRadius: 12, padding: "12px", overflowX: "auto" 
                }}>
                  <table style={{ width: "100%", fontSize: 11, color: MUTED, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <th style={{ textAlign: "left", padding: "4px 8px" }}>assetType</th>
                        <th style={{ textAlign: "left", padding: "4px 8px" }}>name</th>
                        <th style={{ textAlign: "right", padding: "4px 8px" }}>buyingPrice</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: "4px 8px" }}>property</td>
                        <td style={{ padding: "4px 8px" }}>Luxury Villa</td>
                        <td style={{ textAlign: "right", padding: "4px 8px" }}>450000</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 8px" }}>vehicle</td>
                        <td style={{ padding: "4px 8px" }}>Tesla Model S</td>
                        <td style={{ textAlign: "right", padding: "4px 8px" }}>85000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleCsvImport} />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={assetSaving} 
                  style={{ 
                    width: "100%", border: `2px dashed ${BORDER}`, background: WHITE, 
                    borderRadius: 16, padding: "32px 20px", cursor: assetSaving ? "not-allowed" : "pointer", 
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                    transition: "all 0.2s", opacity: assetSaving ? 0.5 : 1 
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = MUTED; e.currentTarget.style.background = SURFACE_MUTED; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = WHITE; }}
                >
                  <Upload size={24} style={{ color: MUTED }} />
                  <div style={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>
                    {assetSaving ? "Processing..." : "Click to select CSV file"}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED }}>Supports .csv files up to 2MB</div>
                </button>
              </div>
              )}
              <Notice msg={assetMsg} />
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                <button type="button" onClick={() => setAssetModalOpen(false)} style={{ flex: 1, borderRadius: 10, border: `1px solid ${BORDER}`, background: SURFACE_MUTED, color: SUB, padding: "11px 0", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                {assetModalTab === "manual" && (
                  <button type="button" onClick={saveAsset} disabled={assetSaving} style={{ flex: 1, borderRadius: 10, border: "none", background: SURFACE_STRONG, color: TEXT_ON_STRONG, padding: "11px 0", cursor: assetSaving ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 600 }}>{assetSaving ? "Saving..." : "Add Asset"}</button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
