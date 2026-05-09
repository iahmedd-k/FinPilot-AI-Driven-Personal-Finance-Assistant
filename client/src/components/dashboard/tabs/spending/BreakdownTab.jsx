import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronDown, ArrowDownRight, ArrowUpRight, Filter, X, BadgeDollarSign, Plus, Settings2, ShoppingCart } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import api from "../../../../services/api";
import { dedupToast, getSpendingCategoryMeta, SPENDING_CATEGORY_META } from "../../dashboardShared.jsx";
import { useAuthContext } from "../../../../hooks/useAuthContext";
import { formatCurrencyAmount, getUserCurrency } from "../../../../utils/currency";

function BreakdownTab({ C, apiTransactions = [], monthlyChart = [], budget = {}, onBudgetSaved, isMobile, preferredCurrency: preferredCurrencyProp, setSpendTab, initialTab = "expenses" }) {
  const { user } = useAuthContext();
  const preferredCurrency = preferredCurrencyProp || getUserCurrency(user);
  const latestTransactionDate = useMemo(() => {
    const timestamps = (apiTransactions || [])
      .map((tx) => new Date(tx?.date).getTime())
      .filter((value) => Number.isFinite(value));
    return timestamps.length ? new Date(Math.max(...timestamps)) : new Date();
  }, [apiTransactions]);
  const currentMonth = `${latestTransactionDate.getFullYear()}-${String(latestTransactionDate.getMonth()+1).padStart(2,"0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetInput, setBudgetInput]         = useState("");
  const [budgetSaving, setBudgetSaving]       = useState(false);
  const [monthBudget, setMonthBudget]         = useState(budget || null);
  const [budgetLoading, setBudgetLoading]     = useState(false);
  const [breakdownTab, setBreakdownTab]       = useState(initialTab);
  const [timePeriod, setTimePeriod]           = useState("Monthly");
  const [periodDropOpen, setPeriodDropOpen]   = useState(false);
  const [showAllCats, setShowAllCats]         = useState(false);
  const [viewBy, setViewBy]                 = useState("Category"); // Category | Merchant
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedIncomeCategoryId, setSelectedIncomeCategoryId] = useState(null);
  const timelineRef       = useRef(null);
  const currentMonthBtnRef = useRef(null);
  const prevDefaultMonthRef = useRef(currentMonth);
  // Touch tooltip: tap-to-toggle on mobile
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    setSelectedMonth((prev) => (prev === prevDefaultMonthRef.current ? currentMonth : prev));
    prevDefaultMonthRef.current = currentMonth;
  }, [currentMonth]);

  useEffect(() => {
    if (timelineRef.current && currentMonthBtnRef.current) {
      const container = timelineRef.current;
      const btn = currentMonthBtnRef.current;
      container.scrollLeft = Math.max(0, btn.offsetLeft - container.clientWidth + btn.offsetWidth + 20);
    }
  }, []);

  useEffect(() => {
    if (breakdownTab === "income") setSelectedCategoryId(null);
    if (breakdownTab !== "income") setSelectedIncomeCategoryId(null);
  }, [breakdownTab]);

  useEffect(() => {
    if (breakdownTab === "budget" && timePeriod !== "Monthly") {
      setTimePeriod("Monthly");
    }
    if (breakdownTab === "budget" && viewBy !== "Category") {
      setViewBy("Category");
    }
  }, [breakdownTab, timePeriod, viewBy]);

  useEffect(() => {
    setShowAllCats(false);
    setSelectedCategoryId(null);
  }, [selectedMonth, timePeriod, breakdownTab, viewBy]);

  useEffect(() => {
    // When timePeriod changes, reset selectedMonth to current period
    const [cy, cm] = currentMonth.split("-").map(Number);
    if (timePeriod === "Yearly") {
      setSelectedMonth(String(cy));
    } else if (timePeriod === "Quarterly") {
      const cq = Math.ceil(cm / 3);
      setSelectedMonth(`${cy}-Q${cq}`);
    } else if (timePeriod === "Monthly") {
      setSelectedMonth(currentMonth);
    }
  }, [timePeriod, currentMonth]);

  useEffect(() => {
    let ignore = false;
    const loadBudget = async () => {
      if (timePeriod !== "Monthly") {
        setMonthBudget(null);
        return;
      }
      if (selectedMonth === currentMonth) {
        setMonthBudget(budget || null);
        return;
      }
      try {
        setBudgetLoading(true);
        const response = await api.get("/dashboard/budget", { params: { month: selectedMonth } });
        if (!ignore) setMonthBudget(response?.data?.budget || null);
      } catch {
        if (!ignore) setMonthBudget(null);
      } finally {
        if (!ignore) setBudgetLoading(false);
      }
    };
    loadBudget();
    return () => { ignore = true; };
  }, [budget, currentMonth, selectedMonth, timePeriod]);

  const allMonths = useMemo(() => {
    const fromChart = monthlyChart.map(m => m.month);
    const set = new Set([...fromChart, currentMonth]);
    return [...set].sort().reverse();
  }, [monthlyChart, currentMonth]);

  const prevMonthKey = useMemo(() => {
    if (timePeriod === "Yearly") {
      return String(parseInt(selectedMonth) - 1);
    } else if (timePeriod === "Quarterly") {
      const parts = selectedMonth.split("-");
      const y = parseInt(parts[0]);
      const q = parseInt(parts[1]?.replace("Q", "") || "1");
      if (q === 1) return `${y - 1}-Q4`;
      return `${y}-Q${q - 1}`;
    } else {
      const [y,mo] = selectedMonth.split("-").map(Number);
      const d = new Date(y, mo-2, 1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    }
  }, [selectedMonth, timePeriod]);

  const monthTx = useMemo(() => {
    let y, mo;
    
    if (timePeriod === "Yearly") {
      y = parseInt(selectedMonth);
    } else if (timePeriod === "Quarterly") {
      const parts = selectedMonth.split("-");
      y = parseInt(parts[0]);
      const q = parseInt(parts[1]?.replace("Q", "") || "1");
      const startMo = (q - 1) * 3 + 1;
      return apiTransactions.filter(t => {
        const d = new Date(t.date);
        const ty = d.getFullYear();
        const tm = d.getMonth() + 1;
        const tq = Math.ceil(tm / 3);
        return ty === y && tq === q;
      });
    } else {
      [y, mo] = selectedMonth.split("-").map(Number);
    }
    
    return apiTransactions.filter(t => {
      const d = new Date(t.date);
      const ty = d.getFullYear();
      const tm = d.getMonth() + 1;
      
      if (timePeriod === "Yearly") return ty === y;
      return ty === y && tm === mo;
    });
  }, [apiTransactions, selectedMonth, timePeriod]);

  const prevMonthTx = useMemo(() => {
    let y, mo;
    
    if (timePeriod === "Yearly") {
      y = parseInt(prevMonthKey);
    } else if (timePeriod === "Quarterly") {
      const parts = prevMonthKey.split("-");
      y = parseInt(parts[0]);
      const q = parseInt(parts[1]?.replace("Q", "") || "1");
      return apiTransactions.filter(t => {
        const d = new Date(t.date);
        const ty = d.getFullYear();
        const tm = d.getMonth() + 1;
        const tq = Math.ceil(tm / 3);
        return ty === y && tq === q;
      });
    } else {
      [y, mo] = prevMonthKey.split("-").map(Number);
    }
    
    return apiTransactions.filter(t => {
      const d = new Date(t.date);
      const ty = d.getFullYear();
      const tm = d.getMonth() + 1;
      if (timePeriod === "Yearly") return ty === y;
      return ty === y && tm === mo;
    });
  }, [apiTransactions, prevMonthKey, timePeriod]);

  const catTotals = useMemo(() => {
    const map = {};
    monthTx.filter(t=>t.type==="expense").forEach(t=>{
      const meta = getSpendingCategoryMeta(t.category);
      map[meta.id] = (map[meta.id]||0) + Math.abs(t.amount||0);
    });
    return map;
  }, [monthTx]);

  const incomeCatTotals = useMemo(() => {
    const map = {};
    monthTx.filter(t=>t.type==="income").forEach(t=>{
      const c = t.category||"Other Income";
      map[c] = (map[c]||0) + Math.abs(t.amount||0);
    });
    return map;
  }, [monthTx]);

  const prevTotals = useMemo(() => {
    const map = {};
    const type = breakdownTab === "income" ? "income" : "expense";
    prevMonthTx.filter(t => t.type === type).forEach(t => {
      let key;
      if (viewBy === "Merchant") {
        key = t.merchant || "Unknown";
      } else if (type === "expense") {
        key = getSpendingCategoryMeta(t.category).id;
      } else {
        key = t.category || "Other Income";
      }
      map[key] = (map[key] || 0) + Math.abs(t.amount || 0);
    });
    return map;
  }, [prevMonthTx, breakdownTab, viewBy]);

  const totalSpent  = Object.values(catTotals).reduce((s,v)=>s+v, 0);
  const totalIncome = monthTx.filter(t=>t.type==="income").reduce((s,t)=>s+Math.abs(t.amount||0), 0);
  const netCashFlow = totalIncome - totalSpent;
  const isCurrentMonth = selectedMonth === currentMonth;
  const budgetAmt   = timePeriod === "Monthly" ? (monthBudget?.amount || 0) : 0;
  const rawBudgetPct = budgetAmt > 0 ? (totalSpent / budgetAmt) * 100 : 0;
  const budgetPct   = Math.min(rawBudgetPct, 100);
  const overBudget  = budgetAmt > 0 && totalSpent > budgetAmt;
  const selectedCategoryMeta = selectedCategoryId ? getSpendingCategoryMeta(selectedCategoryId) : null;

  const largestTx = useMemo(() => {
    const type = breakdownTab === "income" ? "income" : "expense";
    return [...monthTx]
      .filter(t => t.type === type)
      .sort((a, b) => Math.abs(b.amount || 0) - Math.abs(a.amount || 0))
      .slice(0, 3);
  }, [monthTx, breakdownTab]);

  const freqCats = useMemo(() => {
    const freq = {};
    const type = breakdownTab === "income" ? "income" : "expense";
    
    monthTx.filter(t => t.type === type).forEach(t => {
      let key;
      if (type === "expense") {
        key = getSpendingCategoryMeta(t.category).id;
      } else {
        key = t.category || "Other Income";
      }
      freq[key] = (freq[key] || 0) + 1;
    });
    
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [monthTx, breakdownTab]);
  const fmt = n => {
    const abs = Math.abs(n||0), s = n<0?"-":"";
    const formatted = formatCurrencyAmount(abs, preferredCurrency, { maximumFractionDigits: 0 });
    return `${s}${formatted}`;
  };
  const fmtFull = n => formatCurrencyAmount(Math.abs(n||0), preferredCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtMonthShort = m => {
    if(!m) return "";
    const parts = m.split("-");
    if (parts.length === 1) return parts[0];
    const y = parseInt(parts[0]);
    const mo = parseInt(parts[1]);
    if (isNaN(mo)) return m;
    return new Date(y,mo-1,1).toLocaleDateString("en-US",{month:"short",year:"2-digit"}).replace(" ","'");
  };
  const fmtMonth = m => {
    if(!m) return "";
    const parts = m.split("-");
    if (parts.length === 1) return parts[0];
    const y = parseInt(parts[0]);
    const mo = parseInt(parts[1]);
    if (isNaN(mo)) return m;
    return new Date(y,mo-1,1).toLocaleDateString("en-US",{month:"short",year:"numeric"});
  };
  const selectedPeriodLabel = useMemo(() => {
    if (timePeriod === "Yearly") {
      return selectedMonth;
    }
    if (timePeriod === "Quarterly") {
      const parts = selectedMonth.split("-");
      const y = parseInt(parts[0]);
      const q = parseInt(parts[1]?.replace("Q", "") || "1");
      return `Q${q} ${y}`;
    }
    const [y, mo] = selectedMonth.split("-").map(Number);
    return fmtMonth(selectedMonth);
  }, [selectedMonth, timePeriod]);

  const activeRows = useMemo(() => {
    if (viewBy === "Merchant") {
      const map = {};
      monthTx.filter(t => breakdownTab === "income" ? t.type === "income" : t.type === "expense").forEach(t => {
        const m = t.merchant || "Unknown";
        map[m] = (map[m] || 0) + Math.abs(t.amount || 0);
      });
      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amt]) => ({
          id: name,
          label: name,
          amount: amt,
          color: breakdownTab === "income" ? "#2f9cff" : "#64748b",
          icon: breakdownTab === "income" ? BadgeDollarSign : ShoppingCart
        }));
    }
    
    if (breakdownTab === "income") {
      return Object.entries(incomeCatTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amt]) => ({
          id: name,
          label: name,
          amount: amt,
          color: "#2f9cff",
          icon: BadgeDollarSign
        }));
    }

    return SPENDING_CATEGORY_META
      .map((meta) => ({ ...meta, amount: catTotals[meta.id] || 0 }))
      .filter((meta) => meta.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [breakdownTab, viewBy, incomeCatTotals, catTotals, monthTx]);

  const activeTotal = breakdownTab === "income" ? totalIncome : totalSpent;
  const displayRows = showAllCats ? activeRows : activeRows.slice(0, 6);
  const selectedCategoryTransactions = useMemo(() => {
    if (!selectedCategoryId) return [];
    return monthTx
      .filter((tx) => tx.type === "expense" && getSpendingCategoryMeta(tx.category).id === selectedCategoryId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);
  }, [monthTx, selectedCategoryId]);
  const selectedCategorySpent = selectedCategoryId ? (catTotals[selectedCategoryId] || 0) : 0;
  const selectedCategoryShare = activeTotal > 0 ? (selectedCategorySpent / activeTotal) * 100 : 0;
  const selectedCategoryPrev = selectedCategoryId ? (prevTotals[selectedCategoryId] || 0) : 0;
  let selectedCategoryChangeDisplay = "No previous-month comparison";
  if (selectedCategoryPrev > 0) {
    const rawPct = ((selectedCategorySpent - selectedCategoryPrev) / selectedCategoryPrev) * 100;
    const isUp = rawPct > 0;
    const absPct = Math.abs(Math.round(rawPct));
    const displayPct = absPct > 999 ? ">999%" : `${absPct}%`;
    selectedCategoryChangeDisplay = `${isUp ? "+" : ""}${rawPct < 0 ? "-" : ""}${displayPct} vs last month`;
  }

  const selectedIncomeCategoryTransactions = useMemo(() => {
    if (!selectedIncomeCategoryId) return [];
    return monthTx
      .filter((tx) => tx.type === "income" && (tx.category || "Other Income") === selectedIncomeCategoryId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);
  }, [monthTx, selectedIncomeCategoryId]);
  const selectedIncomeCategoryTotal = selectedIncomeCategoryId ? (incomeCatTotals[selectedIncomeCategoryId] || 0) : 0;
  const selectedIncomeCategoryShare = totalIncome > 0 ? (selectedIncomeCategoryTotal / totalIncome) * 100 : 0;
  const selectedIncomeCategoryPrev = selectedIncomeCategoryId ? (prevTotals[selectedIncomeCategoryId] || 0) : 0;
  let selectedIncomeCategoryChangeDisplay = "No previous-month comparison";
  if (selectedIncomeCategoryPrev > 0) {
    const rawPct = ((selectedIncomeCategoryTotal - selectedIncomeCategoryPrev) / selectedIncomeCategoryPrev) * 100;
    const isUp = rawPct > 0;
    const absPct = Math.abs(Math.round(rawPct));
    const displayPct = absPct > 999 ? ">999%" : `${absPct}%`;
    selectedIncomeCategoryChangeDisplay = `${isUp ? "+" : ""}${rawPct < 0 ? "-" : ""}${displayPct} vs last month`;
  }

  const donutData = activeRows.slice(0, 8).map(row => [row.id, row.amount]);
  const R = 90, cx = 110, cy = 110, stroke = 10;
  const circ = 2 * Math.PI * R;

  const pieData = useMemo(() => {
    return activeRows.slice(0, 8).map((row) => {
      return { name: row.label, value: row.amount, color: row.color };
    });
  }, [activeRows]);

  const handleBudgetSave = async () => {
    const amount = parseFloat(budgetInput);
    if(!amount||isNaN(amount)||amount<=0) return;
    setBudgetSaving(true);
    try {
      await api.post("/dashboard/budget",{ month: selectedMonth, amount });
      setMonthBudget({ month: selectedMonth, amount });
      onBudgetSaved?.();
      setBudgetModalOpen(false);
      setBudgetInput("");
    } catch(e) {
      dedupToast.error("Failed to save budget");
    } finally { setBudgetSaving(false); }
  };

  useEffect(() => {
    const handler = e => { if(!e.target.closest(".period-drop")) setPeriodDropOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close tooltip on outside tap (mobile)
  useEffect(() => {
    if (!tooltip) return;
    const handler = () => setTooltip(null);
    document.addEventListener("touchstart", handler);
    return () => document.removeEventListener("touchstart", handler);
  }, [tooltip]);

  /* ─── Tooltip component (fixed position) ─── */
  const TooltipEl = tooltip && (
    <div style={{
      position:"fixed",
      left: tooltip.x,
      top: tooltip.y - 8,
      transform:"translateX(-50%) translateY(-100%)",
      background:C.white,
      border:`1px solid ${C.border}`,
      borderRadius:12,
      padding:"12px 16px",
      boxShadow:"0 8px 28px rgba(0,0,0,0.13)",
      zIndex:9999,
      minWidth: isMobile ? 190 : 210,
      pointerEvents:"none",
    }}>
      <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:10 }}>{fmtMonth(tooltip.m)}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {[
          { dot:"#bfdbfe", label:"Income", val:formatCurrencyAmount(tooltip.data.income, preferredCurrency, {minimumFractionDigits:2,maximumFractionDigits:2}) },
          { dot:"#3b82f6", label:"Expenses", val:`-${formatCurrencyAmount(tooltip.data.expense, preferredCurrency, {minimumFractionDigits:2,maximumFractionDigits:2})}` },
        ].map(({ dot,label,val }) => (
          <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:8,height:8,borderRadius:99,background:dot }}/>
              <span style={{ fontSize:12, color:"#6b7280" }}>{label}</span>
            </div>
            <span style={{ fontSize:12, fontWeight:600, color:C.text }}>{val}</span>
          </div>
        ))}
        <div style={{ borderTop:`1px solid ${C.border2}`, paddingTop:7, display:"flex", justifyContent:"space-between", alignItems:"center", gap:16 }}>
          <span style={{ fontSize:12, color:"#6b7280" }}>Net Cash Flow</span>
          <span style={{ fontSize:12, fontWeight:700, color: tooltip.net >= 0 ? "#10b981" : "#ef4444" }}>
            {tooltip.net >= 0 ? "" : "-"}{formatCurrencyAmount(Math.abs(tooltip.net), preferredCurrency, {minimumFractionDigits:2,maximumFractionDigits:2})}
          </span>
        </div>
      </div>
      <div style={{ position:"absolute", bottom:-6, left:"50%", transform:"translateX(-50%) rotate(45deg)", width:10, height:10, background:C.white, borderRight:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}/>
    </div>
  );

  /* ─── Timeline ─── */
  const Timeline = (() => {
    const periodList = [];
    const [cy2, cm2] = currentMonth.split("-").map(Number);
    const monthData = {};

    if (timePeriod === "Yearly") {
      // Generate 12 past years + current year + 12 future years (25 total, same ratio as monthly)
      for (let i = 12; i >= 0; i--) {
        const year = cy2 - i;
        periodList.push(String(year));
      }
      for (let i = 1; i <= 12; i++) {
        periodList.push(String(cy2 + i));
      }
      apiTransactions.forEach(t => {
        const d = new Date(t.date);
        const key = String(d.getFullYear());
        if (!monthData[key]) monthData[key] = { income:0, expense:0 };
        if (t.type === "income")  monthData[key].income  += Math.abs(t.amount||0);
        if (t.type === "expense") monthData[key].expense += Math.abs(t.amount||0);
      });
    } else if (timePeriod === "Quarterly") {
      // Generate 12 past quarters + current quarter + 12 future quarters (25 total, same as monthly)
      const currentQ = Math.ceil(cm2 / 3);
      for (let i = 12; i >= 0; i--) {
        let q = currentQ - i;
        let y = cy2;
        while (q <= 0) {
          q += 4;
          y -= 1;
        }
        const key = `${y}-Q${q}`;
        if (!periodList.includes(key)) periodList.push(key);
      }
      for (let i = 1; i <= 12; i++) {
        let q = currentQ + i;
        let y = cy2;
        while (q > 4) {
          q -= 4;
          y += 1;
        }
        const key = `${y}-Q${q}`;
        if (!periodList.includes(key)) periodList.push(key);
      }
      apiTransactions.forEach(t => {
        const d = new Date(t.date);
        const q = Math.ceil((d.getMonth() + 1) / 3);
        const key = `${d.getFullYear()}-Q${q}`;
        if (!monthData[key]) monthData[key] = { income:0, expense:0 };
        if (t.type === "income")  monthData[key].income  += Math.abs(t.amount||0);
        if (t.type === "expense") monthData[key].expense += Math.abs(t.amount||0);
      });
    } else {
      // Monthly (original logic) - show 12 past months + current month + 12 future months
      for (let i = 12; i >= 0; i--) {
        const d = new Date(cy2, cm2 - 1 - i, 1);
        periodList.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
      }
      for (let i = 1; i <= 12; i++) {
        const d = new Date(cy2, cm2 - 1 + i, 1);
        periodList.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
      }
      apiTransactions.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        if (!monthData[key]) monthData[key] = { income:0, expense:0 };
        if (t.type === "income")  monthData[key].income  += Math.abs(t.amount||0);
        if (t.type === "expense") monthData[key].expense += Math.abs(t.amount||0);
      });
    }
    
    const maxVal = Math.max(1, ...periodList.map(m => Math.max(monthData[m]?.income||0, monthData[m]?.expense||0)));
    const BAR_MAX_H = isMobile ? 22 : 28;
    const selIdx = periodList.indexOf(selectedMonth);

    return (
      <div style={{ display:"flex", alignItems:"stretch", gap:0, padding:"0 8px" }}>
        <button type="button"
          onClick={() => { if(selIdx > 0) setSelectedMonth(periodList[selIdx-1]); }}
          disabled={selIdx <= 0}
          style={{ flexShrink:0, width:24, display:"flex", alignItems:"center", justifyContent:"center", background:"none", border:"none", cursor:selIdx>0?"pointer":"default", color:selIdx>0?C.sub:C.border, padding:0, borderRadius:6 }}>
          <ChevronRight size={14} style={{ transform:"rotate(180deg)" }}/>
        </button>

        <div style={{ flex:1, overflowX:"auto", overflowY:"visible", WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }} ref={timelineRef}>
          <div style={{ display:"flex", alignItems:"flex-end", gap:0, minWidth:"max-content", borderBottom:`1px solid ${C.border2}` }}>
            {periodList.map((m, idx) => {
              const isSelected = m === selectedMonth;
              let isCurrentPeriod = false;
              if (timePeriod === "Yearly") {
                const [currentYear] = currentMonth.split("-").map(Number);
                isCurrentPeriod = parseInt(m) === currentYear;
              } else if (timePeriod === "Quarterly") {
                const [cy, cm] = currentMonth.split("-").map(Number);
                const cq = Math.ceil(cm / 3);
                isCurrentPeriod = m === `${cy}-Q${cq}`;
              } else {
                isCurrentPeriod = m === currentMonth;
              }
              const data = monthData[m] || { income:0, expense:0 };
              const hasData = data.income > 0 || data.expense > 0;
              const incH = hasData ? Math.max(3, Math.round((data.income / maxVal) * BAR_MAX_H)) : 0;
              const expH = hasData ? Math.max(3, Math.round((data.expense / maxVal) * BAR_MAX_H)) : 0;
              const net = data.income - data.expense;
              const colW = isMobile ? 52 : 64;

              return (
                <div key={m} ref={isCurrentPeriod ? currentMonthBtnRef : null} style={{ position:"relative", flexShrink:0 }}
                  onMouseEnter={!isMobile ? e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ x: rect.left + rect.width/2, y: rect.top, m, data, net });
                  } : undefined}
                  onMouseLeave={!isMobile ? () => setTooltip(null) : undefined}
                  onTouchEnd={isMobile ? e => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip(prev => prev?.m === m ? null : { x: rect.left + rect.width/2, y: rect.top, m, data, net });
                  } : undefined}
                >
                  <button type="button" onClick={() => setSelectedMonth(m)}
                    style={{
                      flexShrink:0,
                      padding:`8px ${isMobile?8:10}px 10px`,
                      background: isSelected ? "var(--surface-muted)" : "transparent",
                      border:"none", cursor:"pointer", fontFamily:"inherit",
                      display:"flex", flexDirection:"column", alignItems:"center", gap:0,
                      position:"relative",
                      borderRadius: 12,
                      transition:"background 0.15s",
                      minWidth: colW,
                      height: isMobile ? 74 : 78,
                      justifyContent: "flex-end",
                    }}>
                    <div style={{ height: BAR_MAX_H + 4, display:"flex", alignItems:"flex-end", justifyContent:"center", gap:2, marginBottom:5 }}>
                      {hasData ? (
                        <>
                          <div style={{ width:isMobile?3:4, height:incH, borderRadius:"2px 2px 0 0", background:"#bfdbfe" }}/>
                          <div style={{ width:isMobile?3:4, height:expH, borderRadius:"2px 2px 0 0", background:"#3b82f6" }}/>
                        </>
                      ) : (
                        <div style={{ width:2, height:8, borderRadius:1, background: isSelected ? C.teal : C.border2 }}/>
                      )}
                    </div>
                    <span style={{ fontSize:isMobile?10:11, fontWeight:isSelected?700:400, color:isSelected?C.teal:C.muted, whiteSpace:"nowrap" }}>
                      {timePeriod === "Yearly" ? m : (timePeriod === "Quarterly" ? m : fmtMonthShort(m))}
                    </span>
                    {isSelected && <div style={{ position:"absolute", bottom:0, left:10, right:10, height:2, background:C.teal, borderRadius:99 }}/>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <button type="button"
          onClick={() => { if(selIdx < periodList.length-1) setSelectedMonth(periodList[selIdx+1]); }}
          disabled={selIdx >= periodList.length-1}
          style={{ flexShrink:0, width:24, display:"flex", alignItems:"center", justifyContent:"center", background:"none", border:"none", cursor:selIdx<periodList.length-1?"pointer":"default", color:selIdx<periodList.length-1?C.sub:C.border, padding:0, borderRadius:6 }}>
          <ChevronRight size={14}/>
        </button>
      </div>
    );
  })();

  /* ─── Category table rows ─── */
  const CategoryRows = displayRows.map((row, i) => {
    const cat   = row.id;
    const amt   = row.amount;
    const pct   = activeTotal > 0 ? ((amt/activeTotal)*100).toFixed(0) : "0";
    const prev  = prevTotals[cat] || 0;
    const change = prev > 0 ? (((amt-prev)/prev)*100).toFixed(0) : null;
    const color = row.color;
    const Icon  = row.icon || BadgeDollarSign;
    const isIncome = breakdownTab === "income";
    const isUp  = change !== null && parseFloat(change) > 0;
    const changeColor = isUp ? (isIncome ? "#16a34a" : "#ef4444") : (isIncome ? "#ef4444" : "#16a34a");

    let displayChange = "—";
    if (change !== null) {
      const absChange = Math.abs(parseFloat(change));
      displayChange = absChange > 999 ? ">999%" : `${absChange}%`;
    }

    if (isMobile) {
      /* Mobile: condensed 2-col card-style row */
      return (
        <div key={cat} onClick={() => {
          if (viewBy === "Category") {
            if (breakdownTab === "income") {
              setSelectedIncomeCategoryId(cat);
            } else {
              setSelectedCategoryId(cat);
            }
          }
        }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, cursor: viewBy === "Category" ? "pointer" : "default", background: (selectedCategoryId === cat || selectedIncomeCategoryId === cat) ? "var(--surface-muted)" : "transparent", transition: "background 0.2s" }}>
          {/* Icon */}
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface-muted)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: color }}>
            <Icon size={16} />
          </div>
          {/* Name + bar */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmt(amt)}</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: "var(--border-subtle)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: color, transition: "width 0.6s ease" }} />
            </div>
          </div>
          {/* % change badge */}
          <div style={{ flexShrink: 0, minWidth: 50, textAlign: "right" }}>
            {change === null ? (
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>—</span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 700, color: changeColor }}>
                {isUp ? "+" : ""}{displayChange}
              </span>
            )}
          </div>
        </div>
      );
    }

    /* Desktop: full 4-col table row */
    return (
      <tr key={cat} style={{ borderBottom: `1px solid ${C.border2}`, transition: "all 0.2s ease", cursor: viewBy === "Category" ? "pointer" : "default", background: (selectedCategoryId === cat || selectedIncomeCategoryId === cat) ? "var(--surface-muted)" : "transparent" }}
        onClick={() => {
          if (viewBy === "Category") {
            if (breakdownTab === "income") {
              setSelectedIncomeCategoryId(cat);
            } else {
              setSelectedCategoryId(cat);
            }
          }
        }}
        className="breakdown-row"
      >
        <td style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--surface-muted)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: color }}>
              <Icon size={18} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{row.label}</span>
          </div>
        </td>
        <td style={{ padding: "16px 20px", textAlign: "right", fontSize: 14, fontWeight: 700, color: C.text }}>{fmt(amt)}</td>
        <td style={{ padding: "16px 20px", textAlign: "right" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{pct}%</span>
            <div style={{ width: 60, height: 4, borderRadius: 99, background: "var(--surface-muted)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} />
            </div>
          </div>
        </td>
        <td style={{ padding: "16px 20px", textAlign: "right" }}>
          {change === null ? (
            <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, background: "var(--surface-muted)", borderRadius: 6, padding: "4px 8px" }}>—</span>
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, color: changeColor, fontWeight: 700, fontSize: 12 }}>
              {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {displayChange}
            </div>
          )}
        </td>
      </tr>
    );
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0, animation:"fadeUp 0.3s ease" }}>
      <style>{`
        .budget-input-no-spin::-webkit-outer-spin-button,
        .budget-input-no-spin::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .budget-input-no-spin {
          -moz-appearance: textfield;
          appearance: textfield;
        }
        .breakdown-row:hover {
          background: var(--surface-muted) !important;
        }
      `}</style>
      {TooltipEl}

      {/* ── TIME PERIOD + TIMELINE ── */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:20, padding:`${isMobile?16:20}px 0 0`, marginBottom:20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display:"flex", alignItems: "center", justifyContent:"space-between", gap:12, marginBottom:20, padding:`0 ${isMobile?16:24}px`, flexDirection:isMobile?"column":"row" }}>
          <div style={{ display:"flex", alignItems: "center", gap: 16 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Analytics Mode</div>
              <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{timePeriod}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:isMobile?"flex-start":"flex-end" }}>
            <div className="period-drop" style={{ position:"relative" }}>
              <button type="button" onClick={()=>setPeriodDropOpen(v=>!v)}
                style={{ display:"flex", alignItems:"center", gap:8, height:40, padding:"0 16px", borderRadius:12, border:`1px solid ${C.border}`, background:"var(--surface-muted)", fontSize:13, fontWeight:700, color:C.text, cursor:"pointer", transition: "all 0.2s" }}>
                {timePeriod} <ChevronDown size={14}/>
              </button>
              {periodDropOpen && (
                <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", background:C.white, border:`1px solid ${C.border}`, borderRadius:12, boxShadow:"0 12px 40px rgba(0,0,0,0.15)", zIndex:300, minWidth:160, overflow: "hidden" }}>
                  {["Monthly","Quarterly","Yearly"].map(p=>(
                    <button key={p} type="button"
                      onClick={()=>{ setTimePeriod(p); setPeriodDropOpen(false); if (p !== "Monthly" && breakdownTab === "budget") setBreakdownTab("expenses"); }}
                      style={{ display:"block", width:"100%", textAlign:"left", padding:"12px 20px", background:timePeriod===p?"var(--surface-muted)":"transparent", border:"none", fontSize:13, fontWeight:timePeriod===p?700:500, color:timePeriod===p?"var(--brand-primary)":C.text, cursor:"pointer", transition: "all 0.2s" }}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {breakdownTab !== "budget" && (
              <button type="button" onClick={() => setViewBy(v => v === "Category" ? "Merchant" : "Category")}
                style={{
                  display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 18px",
                  border: `1px solid ${C.border}`, borderRadius: 12, background: C.white,
                  color: C.text, cursor: "pointer", fontWeight: 700, fontSize: 13,
                  transition: "all 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}
              >
                <Filter size={14} />
                By {viewBy}
              </button>
            )}
            <button type="button" onClick={() => setSpendTab?.("settings")} style={{ display:"flex", alignItems:"center", gap:8, height:40, border: `1px solid ${C.border}`, background: C.white, color: C.text, borderRadius: 12, padding: "0 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <Settings2 size={15} />
              Setup
            </button>
          </div>
        </div>
        {Timeline}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) 268px", gap:14, alignItems:"start" }}>

        {/* LEFT: category breakdown */}
        <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden" }}>

          {/* Tabs */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", borderBottom:`1px solid ${C.border2}` }}>
            {[["expenses","Expenses"],["budget","Budget"],["income","Income"]].map(([id,label])=>(
              <button key={id} type="button" onClick={()=>setBreakdownTab(id)}
                style={{ padding:isMobile?"11px 0":"13px 0", background:"none", border:"none", borderBottom:`2px solid ${breakdownTab===id?C.text:"transparent"}`, fontSize:isMobile?12:13, fontWeight:breakdownTab===id?700:400, color:breakdownTab===id?C.text:C.muted, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Budget tab */}
          {breakdownTab === "budget" ? (
            <div style={{ padding: isMobile ? "20px 16px" : "24px 24px" }}>
              {budgetAmt > 0 ? (
                <>
                  <div style={{ textAlign:"center", marginBottom:20 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Budget for {fmtMonth(selectedMonth)}</div>
                    <div style={{ fontSize:26, fontWeight:800, color:C.text, letterSpacing:"-0.4px" }}>{fmt(budgetAmt)}</div>
                    {budgetLoading && <div style={{ marginTop: 6, fontSize: 11.5, color: C.muted }}>Loading budget…</div>}
                  </div>
                  <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
                    <svg width={isMobile?180:220} height={isMobile?180:220} viewBox="0 0 220 220">
                      <circle cx={110} cy={110} r={R} fill="none" stroke={C.border2} strokeWidth={stroke} opacity={0.5}/>
                      <circle cx={110} cy={110} r={R} fill="none"
                        stroke={overBudget?"#ef4444":budgetPct>80?"#f59e0b":"#0d9488"}
                        strokeWidth={stroke}
                        strokeDasharray={`${(budgetPct/100)*circ} ${circ}`}
                        strokeLinecap="round"
                        transform="rotate(-90 110 110)"
                        style={{ transition:"stroke-dasharray 0.6s ease" }}
                      />
                      <text x={110} y={105} textAnchor="middle" style={{ fontSize: fmt(totalSpent).length > 10 ? (fmt(totalSpent).length > 13 ? 15 : 18) : 22, fontWeight:800, fill:C.text, fontFamily:"'Inter', sans-serif" }}>{fmt(totalSpent)}</text>
                      <text x={110} y={125} textAnchor="middle" style={{ fontSize:11, fill:C.muted, fontFamily:"'Inter', sans-serif" }}>Spent this month</text>
                    </svg>
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:11, color:C.muted }}>Spent</span>
                      <span style={{ fontSize:11, fontWeight:700, color:overBudget?C.red:C.text }}>{rawBudgetPct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height:8, borderRadius:99, background:C.border2, overflow:"hidden" }}>
                      <div style={{ width:`${budgetPct}%`, height:"100%", borderRadius:99, background:overBudget?"#ef4444":budgetPct>80?"#f59e0b":"#0d9488", transition:"width 0.6s ease" }}/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                      <span style={{ fontSize:11, color:C.muted }}>{fmt(totalSpent)} spent</span>
                      <span style={{ fontSize:11, color:C.muted }}>{fmt(budgetAmt)} budget</span>
                    </div>
                  </div>
                  {overBudget && (
                    <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:10, padding:"10px 14px", fontSize:12, color:C.red, fontWeight:600, textAlign:"center", marginBottom:12 }}>
                      Over budget by {fmt(totalSpent - budgetAmt)}
                    </div>
                  )}
                  <button type="button" onClick={()=>{ setBudgetInput(budgetAmt?.toString()||""); setBudgetModalOpen(true); }}
                    style={{ width:"100%", padding:"10px 0", borderRadius:10, border:`1px solid ${C.border}`, background:"transparent", color:C.text, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    Edit Budget
                  </button>
                </>
              ) : (
                <div style={{ textAlign:"center", padding:"40px 0" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:6 }}>No budget set</div>
                  <div style={{ fontSize:12, color:C.muted, marginBottom:20 }}>Set a monthly budget for {fmtMonth(selectedMonth)} to track your spending against a goal.</div>
                  <button type="button" onClick={()=>{ setBudgetInput(""); setBudgetModalOpen(true); }}
                    style={{ padding:"10px 24px", borderRadius:10, border:"none", background:C.strong, color:C.onStrong, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    Set Budget
                  </button>
                </div>
              )}
              <div style={{ marginTop: 18, borderTop: `1px solid ${C.border2}`, paddingTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Category details</div>
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
                  {SPENDING_CATEGORY_META.filter((meta) => (catTotals[meta.id] || 0) > 0).slice(0, 6).map((meta, index) => (
                    <button key={meta.id} type="button" onClick={() => setSelectedCategoryId(meta.id)} style={{ width: "100%", border: "none", borderTop: index ? `1px solid ${C.border2}` : "none", background: selectedCategoryId === meta.id ? "var(--surface-muted)" : "var(--bg-secondary)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ width: 30, height: 30, borderRadius: 10, background: `${meta.color}20`, color: meta.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><meta.icon size={14} /></span>
                        <span style={{ fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.label}</span>
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{fmt(catTotals[meta.id] || 0)}</span>
                    </button>
                  ))}
                  {!SPENDING_CATEGORY_META.some((meta) => (catTotals[meta.id] || 0) > 0) && <div style={{ padding: "16px 14px", fontSize: 12, color: C.muted, textAlign: "center" }}>No category spending yet this month.</div>}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Donut */}
              <div style={{ position: "relative", display: "flex", justifyContent: "center", padding: isMobile ? "24px 16px 12px" : "32px 24px 16px", minHeight: isMobile ? 216 : 268 }}>
                <PieChart width={isMobile ? 180 : 220} height={isMobile ? 180 : 220}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 77 : 87}
                    outerRadius={isMobile ? 85 : 95}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={800}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "8px 12px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{payload[0].name}</div>
                            <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{fmt(payload[0].value)}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>{breakdownTab === "income" ? "Total Earned" : "Total Spent"}</div>
                  <div style={{ fontSize: fmt(activeTotal).length > 10 ? (fmt(activeTotal).length > 13 ? 18 : 22) : 28, fontWeight: 900, color: C.text, letterSpacing: "-0.04em", lineHeight: 1 }}>{fmt(activeTotal)}</div>
                </div>
              </div>

              {/* Category rows */}
              {activeRows.length === 0 ? (
                <div style={{ padding:"32px 0", textAlign:"center", color:C.muted, fontSize:12 }}>
                  No {breakdownTab === "income" ? "income" : "expense"} transactions in {fmtMonth(selectedMonth)}
                </div>
              ) : isMobile ? (
                /* Mobile: div rows */
                <div>
                  {/* Header row */}
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", borderTop:`1px solid ${C.border2}`, borderBottom:`1px solid ${C.border2}` }}>
                    <div style={{ width:32, flexShrink:0 }}/>
                    <div style={{ flex:1, fontSize:10, fontWeight:600, color:C.muted, letterSpacing:"0.04em" }}>CATEGORY</div>
                    <div style={{ fontSize:10, fontWeight:600, color:C.muted, letterSpacing:"0.04em", marginRight:44 }}>AMOUNT</div>
                  </div>
                  {CategoryRows}
                  {activeRows.length > 6 && (
                    <div style={{ borderTop:`1px solid ${C.border2}`, padding:"12px 0", textAlign:"center" }}>
                      <button type="button" onClick={()=>setShowAllCats(v=>!v)}
                        style={{ background:"none", border:"none", fontSize:12, fontWeight:600, color:C.teal, cursor:"pointer", fontFamily:"inherit" }}>
                        {showAllCats ? "Show less" : `Show all (${activeRows.length})`}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Desktop: table */
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderTop:`1px solid ${C.border2}`, borderBottom:`1px solid ${C.border2}` }}>
                        <th style={{ padding:"9px 20px", textAlign:"left", fontSize:10, fontWeight:600, color:C.muted, letterSpacing:"0.04em" }}>Category</th>
                        <th style={{ padding:"9px 20px", textAlign:"right", fontSize:10, fontWeight:600, color:C.muted, letterSpacing:"0.04em" }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4 }}>Amount <ArrowDownRight size={10}/></div>
                        </th>
                        <th style={{ padding:"9px 20px", textAlign:"right", fontSize:10, fontWeight:600, color:C.muted, letterSpacing:"0.04em" }}>% of total</th>
                        <th style={{ padding:"9px 20px", textAlign:"right", fontSize:10, fontWeight:600, color:C.muted, letterSpacing:"0.04em" }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4 }}>vs last month <ArrowUpRight size={10}/></div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>{CategoryRows}</tbody>
                  </table>
                  {activeRows.length > 6 && (
                    <div style={{ borderTop:`1px solid ${C.border2}`, padding:"12px 0", textAlign:"center" }}>
                      <button type="button" onClick={()=>setShowAllCats(v=>!v)}
                        style={{ background:"none", border:"none", fontSize:12, fontWeight:600, color:C.teal, cursor:"pointer", fontFamily:"inherit" }}>
                        {showAllCats ? "Show less" : `Show all (${activeRows.length})`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT: sidebar */}
        <div style={{ display:"flex", flexDirection: isMobile ? "column" : "column", gap:12 }}>

          {/* On mobile, show as 2-col grid for Cash Flow + Largest side by side */}
          {isMobile ? (
            <>
              {/* Cash Flow — full width on mobile */}
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px" }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:12 }}>Cash Flow</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:12, color:C.sub }}>Income</span>
                      <span style={{ fontSize:12, fontWeight:700, color:C.text }}>{fmtFull(totalIncome)}</span>
                    </div>
                    <div style={{ height:4, borderRadius:99, background:C.border2, overflow:"hidden" }}>
                      <div style={{ width: totalIncome > 0 ? "100%" : "2%", height:"100%", borderRadius:99, background:C.teal }}/>
                    </div>
                  </div>
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:12, color:C.sub }}>Expenses</span>
                      <span style={{ fontSize:12, fontWeight:700, color:C.red }}>-{fmtFull(totalSpent)}</span>
                    </div>
                    <div style={{ height:4, borderRadius:99, background:C.border2, overflow:"hidden" }}>
                      <div style={{ width: totalIncome > 0 ? `${Math.min((totalSpent/Math.max(totalIncome,1))*100,100)}%` : "100%", height:"100%", borderRadius:99, background:C.blue }}/>
                    </div>
                  </div>
                  <div style={{ borderTop:`1px solid ${C.border2}`, paddingTop:8, display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, color:C.sub }}>Net</span>
                    <span style={{ fontSize:12, fontWeight:700, color:netCashFlow>=0?C.greenMid:C.red }}>{netCashFlow>=0?"":"-"}{fmtFull(Math.abs(netCashFlow))}</span>
                  </div>
                </div>
              </div>

              {/* Largest + Most Frequent — 2-col grid on mobile */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {/* Largest Transactions */}
                <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 14px" }}>
                  <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:12 }}>
                    Largest {breakdownTab === "income" ? "Incomes" : "Expenses"}
                  </div>
                  {largestTx.length === 0 ? (
                    <div style={{ fontSize:11, color:C.muted, textAlign:"center", padding:"8px 0" }}>None</div>
                  ) : largestTx.map((tx, i) => {
                    const meta = getSpendingCategoryMeta(tx.category);
                    const color = meta.color;
                    const Icon = meta.icon || BadgeDollarSign;
                    return (
                      <div key={tx._id || `ltx-${i}`} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <div style={{ width:26,height:26,borderRadius:7,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                          <Icon size={11} style={{ color }}/>
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:11, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{tx.merchant||meta.label||"Expense"}</div>
                          <div style={{ fontSize:10.5, fontWeight:600, color:C.text }}>{fmtFull(Math.abs(tx.amount||0))}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Most Frequent */}
                <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 14px" }}>
                  <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:12 }}>
                    Frequent {breakdownTab === "income" ? "Incomes" : "Expenses"}
                  </div>
                  {freqCats.length === 0 ? (
                    <div style={{ fontSize:11, color:C.muted, textAlign:"center", padding:"8px 0" }}>None</div>
                  ) : freqCats.map(([cat, count], i) => {
                    const meta = getSpendingCategoryMeta(cat);
                    const color = meta.color;
                    const Icon = meta.icon || BadgeDollarSign;
                    return (
                      <div key={`fcat-${cat}-${i}`} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <div style={{ width:26,height:26,borderRadius:7,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                          <Icon size={11} style={{ color }}/>
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:11, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{meta.label}</div>
                          <div style={{ fontSize:10.5, color:C.muted }}>{count}x</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Desktop sidebar — unchanged layout */
            <>
              {/* Cash Flow */}
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px" }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:14 }}>Cash Flow</div>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:12, color:C.sub }}>Income</span>
                      <span style={{ fontSize:12, fontWeight:700, color:C.text }}>{fmtFull(totalIncome)}</span>
                    </div>
                    <div style={{ height:4, borderRadius:99, background:C.border2, overflow:"hidden" }}>
                      <div style={{ width: totalIncome > 0 ? "100%" : "2%", height:"100%", borderRadius:99, background:C.teal }}/>
                    </div>
                  </div>
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:12, color:C.sub }}>Expenses</span>
                      <span style={{ fontSize:12, fontWeight:700, color:C.red }}>-{fmtFull(totalSpent)}</span>
                    </div>
                    <div style={{ height:4, borderRadius:99, background:C.border2, overflow:"hidden" }}>
                      <div style={{ width: totalIncome > 0 ? `${Math.min((totalSpent/Math.max(totalIncome,1))*100,100)}%` : "100%", height:"100%", borderRadius:99, background:C.blue }}/>
                    </div>
                  </div>
                  <div style={{ borderTop:`1px solid ${C.border2}`, paddingTop:10, display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, color:C.sub }}>Net Cash Flow</span>
                    <span style={{ fontSize:12, fontWeight:700, color:netCashFlow>=0?C.greenMid:C.red }}>{netCashFlow>=0?"":"-"}{fmtFull(Math.abs(netCashFlow))}</span>
                  </div>
                </div>
              </div>

              {/* Largest Transactions */}
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px" }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:14 }}>
                  Largest {breakdownTab === "income" ? "Income" : "Transactions"}
                </div>
                {largestTx.length === 0 ? (
                  <div style={{ fontSize:12, color:C.muted, textAlign:"center", padding:"16px 0" }}>No transactions this month</div>
                ) : largestTx.map((tx,i) => {
                  const meta = getSpendingCategoryMeta(tx.category);
                  const color = meta.color;
                  const Icon = meta.icon || BadgeDollarSign;
                  const d = new Date(tx.date);
                  const dateStr = d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
                  return (
                    <div key={tx._id || `ltx-dt-${i}`} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:i<largestTx.length-1?12:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                        <div style={{ width:30,height:30,borderRadius:8,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                          <Icon size={12} style={{ color }}/>
                        </div>
                        <div>
                          <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{tx.merchant||meta.label||"Expense"}</div>
                          <div style={{ fontSize:10.5, color:C.muted }}>{dateStr}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:8, height:8, borderRadius:99, background:color, flexShrink:0 }}/>
                        <span style={{ fontSize:12, fontWeight:700, color:C.text }}>{fmtFull(Math.abs(tx.amount||0))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Most Frequent Expenses */}
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px" }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:14 }}>
                  Most Frequent {breakdownTab === "income" ? "Income" : "Expenses"}
                </div>
                {freqCats.length === 0 ? (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"20px 0", gap:8 }}>
                    <div style={{ fontSize:24 }}>🔗</div>
                    <div style={{ fontSize:11.5, color:C.muted, textAlign:"center", lineHeight:1.5 }}>No transactions found for the selected month</div>
                  </div>
                ) : freqCats.map(([cat, count], i) => {
                  const meta = getSpendingCategoryMeta(cat);
                  const color = meta.color;
                  const Icon = meta.icon || BadgeDollarSign;
                  return (
                    <div key={`fcat-dt-${cat}-${i}`} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:i<freqCats.length-1?10:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:28,height:28,borderRadius:7,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                          <Icon size={11} style={{ color }}/>
                        </div>
                        <span style={{ fontSize:12, color:C.text }}>{meta.label}</span>
                      </div>
                      <span style={{ fontSize:11, color:C.muted }}>{count}x</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedCategoryMeta && (
        <>
          <div onClick={() => setSelectedCategoryId(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 380 }} />
          <div style={{ position: "fixed", top: isMobile ? "auto" : 12, right: isMobile ? 0 : 12, bottom: 0, width: isMobile ? "100vw" : 360, height: isMobile ? "72vh" : "calc(100vh - 24px)", background: C.white, borderLeft: isMobile ? "none" : `1px solid ${C.border}`, borderTop: isMobile ? `1px solid ${C.border}` : "none", borderRadius: isMobile ? "20px 20px 0 0" : 16, boxShadow: "-18px 0 40px rgba(0,0,0,0.28)", zIndex: 381, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {isMobile && <div style={{ width: 40, height: 4, borderRadius: 99, background: C.border, margin: "10px auto 0" }} />}
            <div style={{ padding: isMobile ? "14px 16px" : "16px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted, fontWeight: 700, marginBottom: 6 }}>Category detail</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: `${selectedCategoryMeta.color}20`, color: selectedCategoryMeta.color, display: "flex", alignItems: "center", justifyContent: "center" }}><selectedCategoryMeta.icon size={15} /></div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{selectedCategoryMeta.label}</div>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedCategoryId(null)} style={{ width: 30, height: 30, borderRadius: 10, border: `1px solid ${C.border}`, background: "var(--bg-secondary)", color: C.muted, cursor: "pointer" }}><X size={16} style={{ margin: "0 auto" }} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0, scrollbarGutter: "stable", padding: isMobile ? "14px" : "16px" }}>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Spent in {fmtMonth(selectedMonth)}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: "-0.04em", marginBottom: 8 }}>{fmt(selectedCategorySpent)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11.5, color: C.muted }}>
                  <span>{selectedCategoryShare.toFixed(0)}% of {breakdownTab === "budget" ? "budget spending" : "expenses"}</span>
                  <span>{selectedCategoryChangeDisplay}</span>
                </div>
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border2}`, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted }}>Latest transactions</div>
                {selectedCategoryTransactions.length ? selectedCategoryTransactions.map((tx, index) => (
                  <div key={tx._id || index} style={{ padding: "12px 14px", borderTop: index ? `1px solid ${C.border2}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.merchant || selectedCategoryMeta.label}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, flexShrink: 0 }}>{fmt(Math.abs(tx.amount || 0))}</div>
                  </div>
                )) : <div style={{ padding: "16px 14px", textAlign: "center", fontSize: 11.5, color: C.muted }}>No transactions found for this category in the selected month.</div>}
              </div>
            </div>
          </div>
        </>
      )}

      {selectedIncomeCategoryId && (
        <>
          <div onClick={() => setSelectedIncomeCategoryId(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 380 }} />
          <div style={{ position: "fixed", top: isMobile ? "auto" : 12, right: isMobile ? 0 : 12, bottom: 0, width: isMobile ? "100vw" : 360, height: isMobile ? "72vh" : "calc(100vh - 24px)", background: C.white, borderLeft: isMobile ? "none" : `1px solid ${C.border}`, borderTop: isMobile ? `1px solid ${C.border}` : "none", borderRadius: isMobile ? "20px 20px 0 0" : 16, boxShadow: "-18px 0 40px rgba(0,0,0,0.28)", zIndex: 381, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {isMobile && <div style={{ width: 40, height: 4, borderRadius: 99, background: C.border, margin: "10px auto 0" }} />}
            <div style={{ padding: isMobile ? "14px 16px" : "16px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted, fontWeight: 700, marginBottom: 6 }}>Income detail</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: "#2f9cff20", color: "#2f9cff", display: "flex", alignItems: "center", justifyContent: "center" }}><BadgeDollarSign size={15} /></div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{selectedIncomeCategoryId}</div>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedIncomeCategoryId(null)} style={{ width: 30, height: 30, borderRadius: 10, border: `1px solid ${C.border}`, background: "var(--bg-secondary)", color: C.muted, cursor: "pointer" }}><X size={16} style={{ margin: "0 auto" }} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0, scrollbarGutter: "stable", padding: isMobile ? "14px" : "16px" }}>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Earned in {fmtMonth(selectedMonth)}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: "-0.04em", marginBottom: 8 }}>{fmt(selectedIncomeCategoryTotal)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11.5, color: C.muted }}>
                  <span>{selectedIncomeCategoryShare.toFixed(0)}% of income</span>
                  <span>{selectedIncomeCategoryChangeDisplay}</span>
                </div>
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border2}`, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted }}>Latest transactions</div>
                {selectedIncomeCategoryTransactions.length ? selectedIncomeCategoryTransactions.map((tx, index) => (
                  <div key={tx._id || index} style={{ padding: "12px 14px", borderTop: index ? `1px solid ${C.border2}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.merchant || selectedIncomeCategoryId}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, flexShrink: 0 }}>{fmt(Math.abs(tx.amount || 0))}</div>
                  </div>
                )) : <div style={{ padding: "16px 14px", textAlign: "center", fontSize: 11.5, color: C.muted }}>No transactions found for this category in the selected month.</div>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Budget modal */}
      {budgetModalOpen && (
        <div style={{ position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.45)",padding:16 }}
          onClick={()=>setBudgetModalOpen(false)}>
          <div style={{ background:C.white,borderRadius:20,border:`1px solid ${C.border}`,boxShadow:"0 24px 64px rgba(0,0,0,0.18)",width:"100%",maxWidth:380,padding:"24px 24px 20px" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18 }}>
              <div>
            <div style={{ fontSize:17,fontWeight:700,color:C.text }}>{budgetAmt>0?"Edit Budget":"Set Monthly Budget"}</div>
            <div style={{ fontSize:11.5,color:C.muted,marginTop:2 }}>
              {new Date(`${selectedMonth}-01`).toLocaleDateString("en-US",{month:"long", year:"numeric"})}
            </div>
          </div>
              <button type="button" onClick={()=>setBudgetModalOpen(false)} style={{ background:"none",border:"none",cursor:"pointer",color:C.muted }}><X size={18}/></button>
            </div>
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:11,fontWeight:600,color:C.sub,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.04em" }}>Total budget for this month</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.muted,fontWeight:600 }}>$</span>
                <input className="budget-input-no-spin" type="number" min="0" step="100" value={budgetInput}
                  onChange={e=>setBudgetInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter") handleBudgetSave(); }}
                  placeholder="e.g. 15000" autoFocus
                  style={{ width:"100%",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"12px 14px 12px 30px",fontSize:16,fontWeight:600,color:C.text,background:C.bg,outline:"none",fontFamily:"inherit",boxSizing:"border-box",appearance:'textfield',WebkitAppearance:'none',MozAppearance:'textfield' }}
                  onFocus={e=>e.target.style.borderColor="#6366f1"}
                  onBlur={e=>e.target.style.borderColor=C.border}
                />
              </div>
              {budgetAmt>0 && <div style={{ fontSize:11,color:C.muted,marginTop:6 }}>Current: {fmt(budgetAmt)}</div>}
            </div>
            <button type="button" onClick={handleBudgetSave} disabled={budgetSaving||!budgetInput}
              style={{ width:"100%",padding:"13px 0",borderRadius:10,border:"none",background:C.strong,color:C.onStrong,fontSize:14,fontWeight:700,cursor:budgetSaving||!budgetInput?"not-allowed":"pointer",opacity:budgetSaving||!budgetInput?0.65:1,transition:"opacity 0.15s" }}>
              {budgetSaving?"Saving…":budgetAmt>0?"Update Budget":"Set Budget"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BreakdownTab;
