import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Building2, Car, ChevronDown, DollarSign, Eye, EyeOff, Gem, Heart, Home, Landmark, Layers, MoreVertical, PiggyBank, Plus, Shield, Trophy, TrendingUp, X, Upload } from "lucide-react";
import { useAuthContext } from "../../../hooks/useAuthContext";
import { cryptoService } from "../../../services/cryptoService";
import { dashboardService } from "../../../services/dashboardService";
import { CalendarPicker, formatDateInputValue } from "../../dashboard/tabs/SpendingTab";
import { BG, BORDER, MUTED, Notice, RED, SUB, SURFACE_MUTED, SURFACE_STRONG, TEXT, TEXT_ON_STRONG, WHITE, fi, fo, inputStyle, FloatingInput, FloatingSelect } from "../shared";
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
  { key: "equity", label: "Equity", icon: TrendingUp },
  { key: "vehicle", label: "Vehicles", icon: Car },
  { key: "pension", label: "Pensions and annuities", icon: PiggyBank },
  { key: "cash", label: "Cash", icon: DollarSign },
  { key: "debt", label: "Unpaid Debt", icon: ArrowUp },
  { key: "other", label: "Other", icon: ArrowUp },
];

const ACCOUNT_TYPE_OPTIONS = ["Checking", "Savings", "Cash account", "Brokerage cash"];
const OTHER_TYPE_OPTIONS = ["Asset", "Liability"];
const buttonReset = {
  appearance: "none",
  background: "transparent",
  border: "none",
  padding: 0,
  margin: 0,
  font: "inherit",
};

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

function getAssetModalTitle(assetType) {
  switch (assetType) {
    case "cash":
      return "Bank Accounts";
    case "private_equity":
      return "Private Equity";
    case "vehicle":
      return "Vehicles";
    case "pension":
      return "Pensions and annuities";
    case "debt":
      return "Unpaid Debt";
    default:
      return (ACCOUNT_TYPE_DISPLAY[assetType]?.label || "Other").toUpperCase() === "OTHER"
        ? "Other"
        : (ACCOUNT_TYPE_DISPLAY[assetType]?.label || "Asset");
  }
}

function getAssetFieldLabels(assetType) {
  switch (assetType) {
    case "cash":
      return { typeLabel: "Account type", nameLabel: "Account name", balanceLabel: "Current balance", dateLabel: "Start date" };
    case "crypto":
      return { typeLabel: "Coin / token", nameLabel: "Asset name", balanceLabel: "Current balance", dateLabel: "Start date" };
    case "equity":
      return { typeLabel: "Equity type", nameLabel: "Account name", balanceLabel: "Current balance", dateLabel: "Start date" };
    case "vehicle":
      return { typeLabel: "Vehicle type", nameLabel: "Vehicle name", balanceLabel: "Current value", dateLabel: "Start date" };
    case "property":
      return { typeLabel: "Property type", nameLabel: "Property name", balanceLabel: "Current value", dateLabel: "Start date" };
    case "insurance":
      return { typeLabel: "Policy type", nameLabel: "Policy name", balanceLabel: "Current value", dateLabel: "Start date" };
    case "pension":
      return { typeLabel: "Pension type", nameLabel: "Account name", balanceLabel: "Current balance", dateLabel: "Start date" };
    case "debt":
      return { typeLabel: "Debt type", nameLabel: "Debt name", balanceLabel: "Current balance", dateLabel: "Start date" };
    default:
      return { typeLabel: "Select the type", nameLabel: "Account name", balanceLabel: "Current balance", dateLabel: "Start date" };
  }
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

export default function AccountsTab({ pushNotif, isMobile }) {
  const { user } = useAuthContext();
  const isPro = String(user?.subscriptionTier || "").toLowerCase() === "pro";
  const navigate = useNavigate();
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
  const [hiddenAssetIds, setHiddenAssetIds] = useState({});
  const [assetForm, setAssetForm] = useState({
    assetType: "cash",
    accountSubtype: "Checking",
    otherSubtype: "Asset",
    coin: "",
    symbol: "",
    quantity: "",
    buyPrice: "",
    ticker: "",
    buyDate: "",
    name: "",
    buyingPrice: "",
    currentValue: "",
    includeInNetWorth: true,
    notes: "",
  });

  const openModal = (typeOverride = "cash") => {
    setAssetMsg(null);
    setAssetModalTab("manual");
    setAssetForm({
      assetType: typeOverride,
      accountSubtype: "Checking",
      otherSubtype: "Asset",
      coin: "",
      symbol: "",
      quantity: "",
      buyPrice: "",
      ticker: "",
      buyDate: formatDateInputValue(new Date()),
      name: "",
      buyingPrice: "",
      currentValue: "",
      includeInNetWorth: true,
      notes: "",
    });
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
          includeInNetWorth: assetForm.includeInNetWorth,
          notes: assetForm.notes || undefined,
        }
        : {
          assetType: assetForm.assetType,
          name: assetForm.name.trim(),
          buyingPrice: Number(assetForm.buyingPrice),
          currentValue: assetForm.currentValue ? Number(assetForm.currentValue) : Number(assetForm.buyingPrice),
          includeInNetWorth: assetForm.includeInNetWorth,
          notes: assetForm.notes || undefined,
        };

    if (isCrypto) {
      payload.includeInNetWorth = assetForm.includeInNetWorth;
    }

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
  const filteredAssetCards = ADD_ASSET_CARDS;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 24, alignItems: "start", width: "100%" }}>
        {/* LEFT COLUMN — Add Assets panel */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", order: 2 }}>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: isMobile ? "14px 16px" : "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.13em" }}>Add Assets</span>
              <button type="button" onClick={() => { setAssetModalTab("import"); setAssetModalOpen(true); }} style={{ border: `1px solid ${BORDER}`, background: "transparent", borderRadius: 10, padding: isMobile ? "6px 12px" : "8px 14px", fontSize: 12, fontWeight: 700, color: TEXT, cursor: "pointer", appearance: "none", outline: "none", WebkitTapHighlightColor: "transparent", transition: "all 0.2s", minHeight: isMobile ? 32 : 38 }} onMouseEnter={e => { if (!isMobile) e.currentTarget.style.background = "var(--surface-muted)"; }} onMouseLeave={e => { if (!isMobile) e.currentTarget.style.background = "transparent"; }}>
                Import CSV
              </button>
            </div>



            <div style={{ padding: isMobile ? "16px 12px" : "16px 20px", flex: 1, overflowY: "auto" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>Categories</div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr", gap: isMobile ? 8 : 12 }}>
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
                        padding: isMobile ? "14px 12px" : "18px 16px",
                        minHeight: isMobile ? 110 : 128,
                        minWidth: 0,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        boxShadow: "0 3px 14px rgba(15, 23, 42, 0.06)",
                      }}
                      onMouseEnter={(e) => {
                        if (isMobile) return;
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.12)";
                        e.currentTarget.style.borderColor = MUTED;
                      }}
                      onMouseLeave={(e) => {
                        if (isMobile) return;
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.03)";
                        e.currentTarget.style.borderColor = BORDER;
                      }}
                      onClick={() => {
                        if (category.key === "equity") {
                          if (!isPro) { navigate("/subscription"); return; }
                          navigate("/dashboard?nav=equity");
                        } else {
                          openModal(category.key);
                        }
                      }}
                    >
                      {/* Icon bubble uses SURFACE_MUTED + MUTED color so it works in dark */}
                      <div style={{ width: isMobile ? 32 : 38, height: isMobile ? 32 : 38, borderRadius: "50%", background: SURFACE_MUTED, color: MUTED, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CardIcon size={isMobile ? 15 : 17} strokeWidth={1.8} />
                      </div>
                      <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 500, color: TEXT, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{category.label}</div>
                    </button>
                  );
                })}
              </div>
              {!filteredAssetCards.length && <div style={{ paddingTop: 18, fontSize: 13, color: MUTED, textAlign: "center" }}>No asset categories found.</div>}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Assets list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", order: 1 }}>
          {/* Connected Assets */}
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", height: isMobile ? "auto" : 300, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "14px 16px" : "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
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
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isMobile ? "40px 20px" : "20px 32px" }}>
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
            <div style={{ padding: isMobile ? "14px 16px" : "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
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
                      padding: isMobile ? "14px 16px" : "16px 20px",
                      borderBottom: index < sortedAssets.length - 1 ? `1px solid ${BORDER}` : "none",
                      display: "grid",
                      gridTemplateColumns: isMobile ? "auto 1fr auto" : "auto 1fr auto auto",
                      alignItems: "center",
                      gap: isMobile ? "8px 12px" : "0 16px",
                      transition: "background 0.15s ease",
                      cursor: "default"
                    }}
                      onMouseEnter={(e) => { if (!isMobile) e.currentTarget.style.background = SURFACE_MUTED; }}
                      onMouseLeave={(e) => { if (!isMobile) e.currentTarget.style.background = "none"; }}
                    >
                      {/* Icon */}
                      <div style={{
                        gridRow: isMobile ? "1" : "auto",
                        width: isMobile ? 36 : 42, height: isMobile ? 36 : 42, borderRadius: 12,
                        background: WHITE, color: MUTED,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, border: `1px solid ${BORDER}`,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                      }}>
                        <AssetTypeIcon assetType={asset.assetType} />
                      </div>

                      {/* Label + subtitle */}
                      <div style={{ gridRow: isMobile ? "1" : "auto", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{primaryName}</span>
                          <span style={{
                            fontSize: 8, fontWeight: 600, color: "#059669",
                            background: "#ecfdf5", border: "1px solid #10b981",
                            borderRadius: 6, padding: "1px 5px", letterSpacing: "0.05em", flexShrink: 0
                          }}>ACTIVE</span>
                        </div>
                        <div style={{ fontSize: isMobile ? 11 : 12, color: MUTED, display: "flex", alignItems: "center", gap: 4 }}>
                          <span>{display.label}</span>
                          <span style={{ opacity: 0.5 }}>•</span>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{addedLabel}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{
                        gridRow: isMobile ? "1" : "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        flexShrink: 0
                      }}>
                        <button type="button" onClick={() => toggleAssetVisibility(asset._id)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, display: "flex", padding: 8, borderRadius: 8, transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = WHITE} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                          {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <AssetCardMenu onDelete={() => deleteAsset(asset._id)} />
                      </div>

                      {/* Value */}
                      <div style={{
                        gridRow: isMobile ? "2" : "auto",
                        gridColumn: isMobile ? "1 / -1" : "auto",
                        textAlign: isMobile ? "left" : "right",
                        flexShrink: 0,
                        paddingRight: isMobile ? 0 : 8,
                        background: isMobile ? SURFACE_MUTED : "transparent",
                        padding: isMobile ? "8px 12px" : 0,
                        borderRadius: isMobile ? 10 : 0,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: isMobile ? 4 : 0
                      }}>
                        {isMobile && <div style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>Current Value</div>}
                        <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: TEXT }}>
                          {isHidden ? "••••••" : fmtVal}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ADD ASSET MODAL */}
      {assetModalOpen &&
        createPortal(
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", padding: 24, overflowY: "auto" }}
            onClick={() => !assetSaving && setAssetModalOpen(false)}
          >
            <div
              style={{ background: WHITE, borderRadius: 20, border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.28)", maxWidth: 560, width: "100%", overflow: "hidden", maxHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column", boxSizing: "border-box" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "20px 18px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.18em" }}>
                  {getAssetModalTitle(assetForm.assetType)}
                </div>
                <button type="button" onClick={() => setAssetModalOpen(false)} style={{ border: "none", background: "none", color: MUTED, cursor: "pointer" }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ marginTop: 16, borderTop: `1px solid ${BORDER}`, padding: "18px 18px 18px", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {assetModalTab === "manual" ? (
                  <>
                    <div style={{ fontSize: 15, color: TEXT, fontWeight: 500, marginBottom: 18 }}>Complete your information</div>
                    <div style={{ display: "grid", gap: 14, minWidth: 0, flex: 1, overflowY: "auto", paddingRight: 4 }}>
                      {assetForm.assetType === "cash" ? (
                        <FloatingSelect
                          label="Account type"
                          value={assetForm.accountSubtype}
                          onChange={(e) => setAssetForm((prev) => ({ ...prev, accountSubtype: e.target.value }))}
                          options={ACCOUNT_TYPE_OPTIONS}
                        />
                      ) : assetForm.assetType === "other" ? (
                        <FloatingSelect
                          label="Asset type"
                          value={assetForm.otherSubtype}
                          onChange={(e) => setAssetForm((prev) => ({ ...prev, otherSubtype: e.target.value }))}
                          options={OTHER_TYPE_OPTIONS}
                        />
                      ) : null}

                      {(() => {
                        const labels = getAssetFieldLabels(assetForm.assetType);
                        const useBalanceAsBuying = !["crypto", "equity"].includes(assetForm.assetType);
                        const totalAmount = Number(assetForm.currentValue || assetForm.buyingPrice || assetForm.buyPrice || 0) || 0;
                        return (
                          <>
                            <FloatingInput
                              label={labels.nameLabel}
                              value={assetForm.name}
                              onChange={handleAssetChange("name")}
                            />

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
                                <FloatingInput label={`${labels.balanceLabel} (${currencyCode})`} type="number" value={assetForm.currentValue} onChange={handleAssetChange("currentValue")} />
                              </>
                            ) : (
                              <FloatingInput
                                label={labels.balanceLabel}
                                type="number"
                                value={useBalanceAsBuying ? (assetForm.currentValue || assetForm.buyingPrice) : assetForm.currentValue}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  setAssetForm((prev) => ({ ...prev, currentValue: next, buyingPrice: useBalanceAsBuying ? next : prev.buyingPrice }));
                                }}
                              />
                            )}

                            <div>
                              <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{labels.dateLabel}</div>
                              <CalendarPicker C={CALENDAR_COLORS} value={assetForm.buyDate} onChange={(value) => setAssetForm((prev) => ({ ...prev, buyDate: value }))} />
                            </div>

                            <div style={{ background: "rgba(15, 23, 42, 0.03)", borderRadius: 14, padding: "16px 16px 14px", border: `1px solid ${BORDER}` }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                <div style={{ fontSize: 16, fontWeight: 600, color: TEXT }}>Total amount</div>
                                <div style={{ fontSize: 16, fontWeight: 500, color: TEXT }}>{formatCurrencyAmount(totalAmount, currencyCode, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                              </div>
                              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                <div>
                                  <div style={{ fontSize: 14, color: TEXT, fontWeight: 500 }}>Show in Net Worth</div>
                                  <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Assets sum up to your net worth</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setAssetForm((prev) => ({ ...prev, includeInNetWorth: !prev.includeInNetWorth }))}
                                  style={{
                                    ...buttonReset,
                                    width: 40,
                                    height: 22,
                                    borderRadius: 999,
                                    background: assetForm.includeInNetWorth ? "#2f2f2f" : "#d4d4d8",
                                    position: "relative",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                  }}
                                >
                                  <span
                                    style={{
                                      position: "absolute",
                                      top: 2,
                                      left: assetForm.includeInNetWorth ? 20 : 2,
                                      width: 18,
                                      height: 18,
                                      borderRadius: "50%",
                                      background: "#fff",
                                      transition: "left 0.15s ease",
                                    }}
                                  />
                                </button>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <Notice msg={assetMsg} />
                    <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "flex-end" }}>
                      <button type="button" onClick={saveAsset} disabled={assetSaving} style={{ minWidth: 98, borderRadius: 10, border: "none", background: SURFACE_STRONG, color: TEXT_ON_STRONG, padding: "12px 18px", cursor: assetSaving ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                        {assetSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "10px 0", flex: 1, overflowY: "auto" }}>
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
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
