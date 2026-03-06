import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import {
  LayoutDashboard, CreditCard, BarChart3, Target, MessageSquare,
  FileText, Settings, Plus, ChevronRight, Bell, HelpCircle,
  Bot, ArrowUpRight, ArrowDownRight, ShoppingBag, Coffee, Car,
  Home, Zap, DollarSign, Shield, PiggyBank, TrendingUp, Wallet,
  Menu, X, Search, Sparkles, CircleDollarSign, RefreshCw,
  BookOpen, Users, Briefcase, GraduationCap, ChevronDown,
  Star, Award, Flame, Upload
} from "lucide-react";
import { dashboardService } from "../services/dashboardService";
import { transactionService } from "../services/transactionService";
import { aiService } from "../services/aiService";
import { useAuth } from "../hooks/useAuth";
import { useAuthContext } from "../hooks/useAuthContext";
import { ROUTES } from "../constants/routes";

/* ─── Design Tokens ─────────────────────────────────────── */
const C = {
  bg:       "#f7f6f2",
  white:    "#ffffff",
  border:   "#e6e3dc",
  border2:  "#edeae4",
  text:     "#111827",
  sub:      "#6b7280",
  muted:    "#9ca3af",
  green:    "#1a5c42",
  greenMid: "#2e7d5e",
  greenLt:  "#4ade80",
  greenBg:  "#ecfdf5",
  greenBg2: "#d1fae5",
  teal:     "#0d9488",
  tealLt:   "#5eead4",
  blue:     "#3b82f6",
  red:      "#ef4444",
  redBg:    "#fef2f2",
  gold:     "#d97706",
  goldBg:   "#fffbeb",
  indigo:   "#6366f1",
  pink:     "#ec4899",
  amber:    "#f59e0b",
  sidebar:  "#111827",
  sidebarT: "rgba(255,255,255,0.7)",
  sidebarM: "rgba(255,255,255,0.4)",
  sidebarB: "rgba(255,255,255,0.08)",
  sidebarA: "rgba(255,255,255,0.12)",
};

/* ─── Category/transaction icon & color map ───────────────── */
const CAT_COLORS = ["#0d9488","#6366f1","#d97706","#ec4899","#4ade80","#d1d5db","#3b82f6","#c07a3a"];
const catToIcon = { Groceries:ShoppingBag, Income:DollarSign, Subscriptions:Zap, Transport:Car, Dining:Coffee, Salary:DollarSign, Freelance:Briefcase, Investment:TrendingUp, "Other Income":DollarSign, Shopping:ShoppingBag, Health:Shield, Education:GraduationCap, Utilities:Zap, Rent:Home, Entertainment:Star, Travel:Car, "Other Expense":CreditCard };
const goalIcons = [Shield, Target, PiggyBank, Briefcase, GraduationCap, Home, Car, Star];

/* ─── Nav items (with icons) ────────────────────────────── */
const navItems = [
  {id:"dashboard",       label:"Home",             icon:LayoutDashboard},
  {id:"spending",        label:"Spending",          icon:CreditCard     },
  {id:"portfolio",       label:"Portfolio",         icon:BarChart3      },
  {id:"planning",        label:"Financial Planning",icon:Briefcase      },
  {id:"benefits",        label:"Benefits",          icon:Award          },
  {id:"equity",          label:"Equity",            icon:TrendingUp     },
  {id:"learning",        label:"Learning",          icon:GraduationCap  },
];

const timeTabs = ["1W","1M","3M","YTD","ALL"];
const aiInitial = [{role:"bot",text:"👋 Ask me about your spending, goals, or how to improve your financial score."}];

/* ─── Tooltip ───────────────────────────────────────────── */
const ChartTip = ({active,payload,label}) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",boxShadow:"0 8px 24px rgba(0,0,0,0.10)",fontSize:12}}>
      <div style={{color:C.muted,marginBottom:5,fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{color:p.color,fontWeight:700,marginBottom:2}}>
          {`${p.name}: $${typeof p.value==="number"&&p.value>10000?(p.value/1000).toFixed(0)+"k":p.value?.toLocaleString?.() ?? p.value}`}
        </div>
      ))}
    </div>
  );
};

/* ─── Reusable Card ─────────────────────────────────────── */
const Card = ({children,style={},className=""}) => (
  <div className={`fp-card ${className}`} style={{
    background:C.white,border:`1px solid ${C.border}`,
    borderRadius:16,padding:"20px",
    boxShadow:"0 1px 3px rgba(0,0,0,0.04),0 1px 2px rgba(0,0,0,0.03)",
    transition:"box-shadow 0.2s,transform 0.2s",...style
  }}>{children}</div>
);

/* ─── Main Component ────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuthContext();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const isPro = user?.subscriptionTier === "pro";
  const aiLimitReached = !isPro && (user?.aiQueriesUsed ?? 0) >= 5;
  const [activeNav,   setActiveNav]   = useState("dashboard");
  const [activeTab,   setActiveTab]   = useState("1M");
  const [messages,    setMessages]    = useState(aiInitial);
  const [chatInput,   setChatInput]   = useState("");
  const [isTyping,    setIsTyping]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [sideCollapsed,setSideCollapsed] = useState(false);
  const [isMobile,    setIsMobile]    = useState(false);
  const [isTablet,    setIsTablet]    = useState(false);
  const [showSearch,  setShowSearch]  = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const fileInputRef = useRef(null);
  const msgsEndRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!profileOpen) return;

    const onPointerDown = (e) => {
      if (!profileRef.current) return;
      if (profileRef.current.contains(e.target)) return;
      setProfileOpen(false);
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") setProfileOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

  const queryClient = useQueryClient();
  const { data: dashboardRes } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardService.getDashboard().then((r) => r.data),
  });
  const { data: txRes } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => transactionService.getList({ limit: 20 }).then((r) => r.data),
  });

  const csvImportMutation = useMutation({
    mutationFn: (file) => transactionService.importCSV(file),
    onSuccess: (res) => {
      const count = res.data?.transactions?.length ?? res.data?.message?.match(/\d+/)?.[0] ?? 0;
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setAddModalOpen(false);
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success(res.data?.message || `${count} transactions imported`);
    },
    onError: (err) => {
      if (err.response?.status === 403) {
        toast.error(err.response?.data?.message || "Free limit reached", {
          action: { label: "Upgrade to Pro", onClick: () => navigate(ROUTES.SUBSCRIPTION) },
        });
      } else {
        toast.error(err.response?.data?.message || "CSV import failed");
      }
    },
  });

  const dashboard = dashboardRes?.dashboard || {};
  const summary = dashboard.summary || {};
  const categoryBreakdown = dashboard.categoryBreakdown || [];
  const monthlyChart = dashboard.monthlyChart || [];
  const apiGoals = dashboard.goals || [];
  const apiTransactions = txRes?.transactions || [];

  const statCards = useMemo(() => {
    const fmt = (n) => (n != null ? `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "$0");
    return [
      { label: "Total Income",   value: fmt(summary.totalIncome),   change: "—", up: true,  icon: TrendingUp,           accent: "#1a5c42", accentBg: "#ecfdf5" },
      { label: "Total Expenses", value: fmt(summary.totalExpense),  change: "—", up: false, icon: CreditCard,          accent: "#ef4444", accentBg: "#fef2f2" },
      { label: "Net Savings",    value: fmt(summary.netBalance),     change: "—", up: (summary.netBalance || 0) >= 0, icon: CircleDollarSign, accent: "#6366f1", accentBg: "#eef2ff" },
      { label: "Savings Rate",   value: `${summary.savingsPercent ?? 0}%`, change: "—", up: true, icon: Wallet, accent: "#d97706", accentBg: "#fffbeb" },
    ];
  }, [summary.totalIncome, summary.totalExpense, summary.netBalance, summary.savingsPercent]);

  const netWorthData = useMemo(() => {
    if (!monthlyChart?.length) return [{ d: "—", v: 0 }];
    let cum = 0;
    return monthlyChart.map((m) => {
      cum += (m.income || 0) - (m.expense || 0);
      return { d: new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short" }), v: cum };
    });
  }, [monthlyChart]);

  const cashFlowData = useMemo(() => {
    return (monthlyChart || []).map((m) => ({
      m: new Date(m.month + "-01").toLocaleDateString("en-IN", { month: "short" }),
      income: m.income || 0,
      expense: m.expense || 0,
    }));
  }, [monthlyChart]);

  const categoryData = useMemo(() => {
    const total = categoryBreakdown.reduce((s, c) => s + (c.amount || 0), 0) || 1;
    return categoryBreakdown.map((c, i) => ({
      name: c.category || "Other",
      value: c.percent || 0,
      color: CAT_COLORS[i % CAT_COLORS.length],
      amount: Math.round(c.amount || 0),
    }));
  }, [categoryBreakdown]);

  const goals = useMemo(() => {
    return apiGoals.map((g, i) => ({
      title: g.title,
      current: g.currentAmount ?? 0,
      target: g.targetAmount ?? 1,
      color: CAT_COLORS[i % CAT_COLORS.length],
      icon: goalIcons[i % goalIcons.length],
    }));
  }, [apiGoals]);

  const transactions = useMemo(() => {
    return apiTransactions.map((t, i) => {
      const amt = t.type === "income" ? t.amount : -t.amount;
      const Icon = catToIcon[t.category] || DollarSign;
      return {
        id: t._id,
        merchant: t.merchant || t.category || (t.type === "income" ? "Income" : "Expense"),
        category: t.category || t.type,
        amount: amt,
        date: new Date(t.date).toLocaleDateString("en-US", { day: "numeric", month: "short" }),
        icon: Icon,
        color: CAT_COLORS[i % CAT_COLORS.length],
      };
    });
  }, [apiTransactions]);

  const spendMerchants = useMemo(() => {
    const byName = {};
    apiTransactions.filter((t) => t.type === "expense" && (t.merchant || t.category)).forEach((t) => {
      const n = t.merchant || t.category;
      byName[n] = (byName[n] || 0) + 1;
    });
    const arr = Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const icons = [ShoppingBag, Coffee, Car];
    return arr.map(([name, amount], i) => ({ name, amount, icon: icons[i], color: CAT_COLORS[i] }));
  }, [apiTransactions]);

  const portfolioData = useMemo(() => {
    if (!monthlyChart?.length) return [{ d: "—", v: 0 }];
    let cum = 0;
    return monthlyChart.map((m, i) => {
      cum += (m.income || 0) - (m.expense || 0);
      return { d: String(i + 1), v: Math.max(0, cum) };
    });
  }, [monthlyChart]);

  useEffect(()=>{
    const check = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1100);
    };
    check();
    window.addEventListener("resize",check);
    return ()=>window.removeEventListener("resize",check);
  },[]);

  useEffect(()=>{
    msgsEndRef.current?.scrollIntoView({behavior:"smooth"});
  },[messages,isTyping]);

  const handleSend = async (txt) => {
    const msg = (txt || chatInput).trim();
    if (!msg) return;
    setMessages((p) => [...p, { role: "user", text: msg }]);
    setChatInput("");
    setIsTyping(true);
    try {
      const history = messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));
      const { data } = await aiService.chat(msg, history);
      setMessages((p) => [...p, { role: "bot", text: data.reply || "I couldn't generate a response." }]);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Something went wrong. Please try again.";
      setMessages((p) => [...p, { role: "bot", text: `⚠️ ${errorMsg}` }]);
      if (err.response?.status === 403) {
        toast.error(errorMsg, { action: { label: "Upgrade to Pro", onClick: () => navigate(ROUTES.SUBSCRIPTION) } });
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const sideW = isMobile ? 0 : sideCollapsed ? 68 : 220;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html,body { height:100%; background:${C.bg}; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:#d1cdc5; border-radius:4px; }
        ::-webkit-scrollbar-track { background:transparent; }

        @keyframes slideIn  { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounceY  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shimmer  { 0%{opacity:0.6} 100%{opacity:1} }

        .fp-card:hover { box-shadow:0 4px 20px rgba(0,0,0,0.09),0 1px 4px rgba(0,0,0,0.05) !important; }

        .nav-item { transition:all 0.15s ease; cursor:pointer; position:relative; }
        .nav-item:hover .nav-bg  { opacity:1 !important; }
        .nav-item:hover .nav-lbl { color:${C.white} !important; }
        .nav-item:hover .nav-ico { color:${C.white} !important; opacity:1 !important; }

        .tx-row  { border-radius:12px; transition:background 0.15s; cursor:pointer; }
        .tx-row:hover  { background:#f9f7f3 !important; }

        .sug-btn { transition:all 0.15s; }
        .sug-btn:hover { background:${C.greenBg} !important; border-color:#6ee7b7 !important; color:${C.greenMid} !important; }

        .tab-pill { transition:all 0.15s; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .tab-pill:hover { background:#e8e5de !important; }

        .stat-badge-up   { background:${C.greenBg}; color:${C.greenMid}; }
        .stat-badge-down { background:${C.redBg};   color:${C.red}; }

        .mobile-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;backdrop-filter:blur(2px); }

        @media (max-width:767px) {
          .center-grid3 { grid-template-columns:1fr !important; }
          .stat-grid    { grid-template-columns:1fr 1fr !important; }
          .right-strip  { display:none !important; }
          .mobile-bottom-strip { display:flex !important; }
        }
        @media (min-width:768px) and (max-width:1099px) {
          .center-grid3 { grid-template-columns:1fr 1fr !important; }
          .stat-grid    { grid-template-columns:1fr 1fr !important; }
          .right-strip  { display:none !important; }
        }
        @media (min-width:1100px) {
          .mobile-bottom-strip { display:none !important; }
        }

        .tooltip-container { position:relative; display:inline-block; }
        .tooltip-text { visibility:hidden;opacity:0;background:#111;color:#fff;font-size:11px;
          border-radius:6px;padding:4px 8px;position:absolute;left:calc(100% + 8px);top:50%;
          transform:translateY(-50%);white-space:nowrap;pointer-events:none;
          transition:opacity 0.15s;z-index:100; }
        .tooltip-container:hover .tooltip-text { visibility:visible;opacity:1; }

        .anim-1 { animation:fadeUp 0.4s ease 0.05s both; }
        .anim-2 { animation:fadeUp 0.4s ease 0.12s both; }
        .anim-3 { animation:fadeUp 0.4s ease 0.20s both; }
        .anim-4 { animation:fadeUp 0.4s ease 0.28s both; }
      `}</style>

      <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:"Inter, sans-serif",color:C.text,overflow:"hidden",position:"relative"}}>

        {/* ── MOBILE OVERLAY ── */}
        {mobileOpen && isMobile && (
          <div className="mobile-overlay" onClick={()=>setMobileOpen(false)}/>
        )}

        {/* ── Add Transaction (CSV) Modal ── */}
        {addModalOpen && (
          <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.5)",padding:16}} onClick={()=>!csvImportMutation.isPending && setAddModalOpen(false)}>
            <div style={{background:C.white,borderRadius:16,border:`1px solid ${C.border}`,boxShadow:"0 20px 60px rgba(0,0,0,0.15)",maxWidth:420,width:"100%",padding:24}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div style={{fontSize:18,fontWeight:700,fontFamily:"Inter, sans-serif",color:C.text}}>Add transactions</div>
                <button type="button" onClick={()=>!csvImportMutation.isPending && (setAddModalOpen(false), setCsvFile(null), fileInputRef.current && (fileInputRef.current.value=""))} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,padding:4}}><X size={20}/></button>
              </div>
              <p style={{fontSize:12,color:C.sub,marginBottom:16}}>Upload a CSV file. Columns: <strong>amount</strong>, <strong>type</strong> (income/expense), <strong>merchant</strong>, <strong>date</strong>, <strong>notes</strong>. Max 2MB. Free plan: 10 transactions/month.</p>
              <input ref={fileInputRef} type="file" accept=".csv" style={{display:"none"}} onChange={e=>{ const f=e.target.files?.[0]; setCsvFile(f || null); }} />
              <div onClick={()=>fileInputRef.current?.click()} style={{border:`2px dashed ${C.border}`,borderRadius:12,padding:24,textAlign:"center",cursor:"pointer",marginBottom:16,background:csvFile?C.greenBg:C.bg}}>
                {csvFile ? <><Upload size={24} style={{color:C.greenMid,marginBottom:8}}/><div style={{fontSize:13,fontWeight:600,color:C.greenMid}}>{csvFile.name}</div><div style={{fontSize:11,color:C.muted,marginTop:4}}>Click to change</div></> : <><Upload size={24} style={{color:C.muted,marginBottom:8}}/><div style={{fontSize:13,color:C.sub}}>Choose CSV file</div></>}
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <button type="button" disabled={!csvFile || csvImportMutation.isPending} onClick={()=>{ if(!csvFile) return; const MAX = 2*1024*1024; if(csvFile.size>MAX){ toast.error("File too large. Max 2MB."); return; } csvImportMutation.mutate(csvFile); }} style={{flex:1,minWidth:120,padding:"10px 16px",background:csvFile&&!csvImportMutation.isPending?C.sidebar:C.border,border:"none",borderRadius:10,fontSize:13,fontWeight:600,color:csvFile&&!csvImportMutation.isPending?C.white:C.muted,cursor:csvFile&&!csvImportMutation.isPending?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {csvImportMutation.isPending ? "Uploading…" : "Upload"}
                </button>
                <button type="button" onClick={()=>!csvImportMutation.isPending && setAddModalOpen(false)} style={{padding:"10px 16px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontWeight:600,color:C.sub,cursor:"pointer"}}>Cancel</button>
              </div>
              <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border2}`}}>
                <Link to={ROUTES.TRANSACTIONS} style={{fontSize:12,fontWeight:600,color:C.greenMid,textDecoration:"none"}} onClick={()=>setAddModalOpen(false)}>Add single transaction →</Link>
              </div>
            </div>
          </div>
        )}

        {/* ── SIDEBAR ── */}
        <aside style={{
          width: isMobile ? (mobileOpen?240:0) : sideW,
          flexShrink:0,
          background:C.sidebar,
          display:"flex",flexDirection:"column",
          transition:"width 0.25s cubic-bezier(.4,0,.2,1)",
          overflow:"hidden",
          position: isMobile ? "fixed" : "relative",
          height:"100%",zIndex:50,
          boxShadow: isMobile&&mobileOpen ? "4px 0 24px rgba(0,0,0,0.2)" : "none",
        }}>
          {/* Logo */}
          <div style={{padding:"20px 16px 16px",borderBottom:`1px solid ${C.sidebarB}`,display:"flex",alignItems:"center",gap:10,minWidth:0}}>
            <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${C.teal},${C.greenMid})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 0 0 3px rgba(94,234,212,0.15)`}}>
              <Sparkles size={16} color="#fff"/>
            </div>
            {(!sideCollapsed||isMobile) && (
              <div style={{overflow:"hidden"}}>
                <div style={{fontSize:15,fontWeight:700,color:C.white,fontFamily:"Inter, sans-serif",letterSpacing:"-0.2px",whiteSpace:"nowrap"}}>FinPilot</div>
                <div style={{fontSize:9.5,color:C.sidebarM,fontWeight:500,letterSpacing:"0.07em",textTransform:"uppercase"}}>AI Advisor</div>
              </div>
            )}
            {isMobile && (
              <button onClick={()=>setMobileOpen(false)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:C.sidebarM,display:"flex"}}>
                <X size={18}/>
              </button>
            )}
          </div>

          {/* Nav */}
          <nav style={{flex:1,padding:"10px 8px",overflowY:"auto",overflowX:"hidden"}}>
            {/* Section label */}
            {(!sideCollapsed||isMobile) && (
              <div style={{fontSize:9.5,fontWeight:700,color:C.sidebarM,textTransform:"uppercase",letterSpacing:"0.08em",padding:"6px 10px 4px",marginBottom:2}}>Menu</div>
            )}
            {navItems.map(({id,label,icon:Icon},idx)=>{
              const on = activeNav===id;
    return (
                <div key={id} className="nav-item tooltip-container"
                  onClick={()=>{setActiveNav(id);if(isMobile)setMobileOpen(false);}}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:10,marginBottom:2,position:"relative",userSelect:"none"}}
                >
                  {/* Active/hover bg */}
                  <div className="nav-bg" style={{
                    position:"absolute",inset:0,borderRadius:10,
                    background: on ? "rgba(255,255,255,0.12)" : "transparent",
                    transition:"opacity 0.15s",
                    boxShadow: on ? "inset 0 0 0 1px rgba(255,255,255,0.10)" : "none",
                  }}/>
                  {/* Active indicator bar */}
                  {on && <div style={{position:"absolute",left:0,top:"20%",bottom:"20%",width:3,borderRadius:"0 3px 3px 0",background:`linear-gradient(180deg,${C.tealLt},${C.greenMid})`}}/>}

                  <Icon size={17} className="nav-ico" style={{
                    color: on ? C.white : C.sidebarT,
                    opacity: on ? 1 : 0.75,
                    flexShrink:0,zIndex:1,transition:"all 0.15s"
                  }}/>
                  {(!sideCollapsed||isMobile) && (
                    <span className="nav-lbl" style={{
                      fontSize:13,fontWeight: on?600:400,
                      color: on?C.white:C.sidebarT,
                      zIndex:1,whiteSpace:"nowrap",transition:"all 0.15s"
                    }}>{label}</span>
                  )}
                  {/* Collapsed tooltip */}
                  {sideCollapsed && !isMobile && (
                    <span className="tooltip-text">{label}</span>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User + bottom */}
          <div style={{padding:"12px 8px",borderTop:`1px solid ${C.sidebarB}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:10,cursor:"pointer",background:"rgba(255,255,255,0.05)"}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${C.tealLt},${C.greenMid})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.white,flexShrink:0}}>{(user?.name?.[0]||"U").toUpperCase()}</div>
              {(!sideCollapsed||isMobile)&&(
                <div style={{flex:1,overflow:"hidden"}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:C.white,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user?.name || "User"}</div>
                  <div style={{fontSize:10,color:C.sidebarM}}>{(user?.subscriptionTier || "free") === "pro" ? "Pro Plan · Active" : "Free Plan"}</div>
                </div>
              )}
              {(!sideCollapsed||isMobile)&&<ChevronDown size={13} style={{color:C.sidebarM,flexShrink:0}}/>}
            </div>
            {(!sideCollapsed||isMobile)&&!isPro&&(
              <Link to={ROUTES.SUBSCRIPTION} style={{display:"block",marginTop:8,padding:"8px 10px",borderRadius:8,fontSize:11,fontWeight:600,color:C.tealLt,background:"rgba(255,255,255,0.06)",textAlign:"center",textDecoration:"none",border:"1px solid rgba(255,255,255,0.1)"}}>
                Upgrade to Pro
              </Link>
            )}
          </div>
        </aside>

        {/* ── MAIN AREA ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

          {/* ── TOP BAR ── */}
          <header style={{
            height:58,background:C.white,
            borderBottom:`1px solid ${C.border}`,
            display:"flex",alignItems:"center",padding:"0 20px",gap:12,
            flexShrink:0,zIndex:20,
            boxShadow:"0 1px 0 rgba(0,0,0,0.04)"
          }}>
            {/* Hamburger / collapse */}
            <button onClick={()=>isMobile?setMobileOpen(p=>!p):setSideCollapsed(p=>!p)}
              style={{background:"none",border:"none",cursor:"pointer",color:C.sub,display:"flex",alignItems:"center",padding:4,borderRadius:8,transition:"background 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.background="#f3f4f6"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}
            >
              <Menu size={19}/>
            </button>

            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:600,color:C.text,fontFamily:"Inter, sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {user?.name ? `Hi, ${user.name} 👋` : "Dashboard"}
              </div>
              <div style={{fontSize:10.5,color:C.muted,marginTop:1}}>March 2026 · Financial Overview</div>
            </div>

            {/* Search (desktop) */}
            {!isMobile && (
              <div style={{display:"flex",alignItems:"center",gap:8,background:C.bg,border:`1px solid ${C.border}`,borderRadius:100,padding:"7px 16px",width:200,cursor:"text"}}
                onClick={()=>setShowSearch(true)}>
                <Search size={13} style={{color:C.muted}}/>
                <span style={{fontSize:12,color:C.muted}}>Search...</span>
              </div>
            )}

            {/* Mobile search icon */}
            {isMobile && (
              <button style={{background:"none",border:"none",cursor:"pointer",color:C.sub,display:"flex",padding:4}}>
                <Search size={18}/>
              </button>
            )}

            {/* Add Transaction */}
            {!isMobile && (
              <button type="button" onClick={()=>setAddModalOpen(true)} style={{display:"flex",alignItems:"center",gap:6,background:C.sidebar,color:C.white,border:"none",borderRadius:100,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",transition:"opacity 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}
              >
                <Plus size={13}/> Add Transaction
              </button>
            )}

            {/* Notif */}
            <div style={{position:"relative"}}>
              <button style={{background:"none",border:"none",cursor:"pointer",color:C.sub,display:"flex",padding:4,borderRadius:8,transition:"background 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f3f4f6"}
                onMouseLeave={e=>e.currentTarget.style.background="none"}
              >
                <Bell size={18}/>
              </button>
              <div style={{position:"absolute",top:3,right:3,width:7,height:7,background:C.red,borderRadius:"50%",border:`2px solid ${C.white}`}}/>
            </div>

            {/* Avatar */}
            <div ref={profileRef} style={{position:"relative",flexShrink:0}}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                style={{
                  width:32,height:32,borderRadius:"50%",
                  background:`linear-gradient(135deg,${C.tealLt},${C.greenMid})`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:12,fontWeight:700,color:C.white,cursor:"pointer",
                  border:"none",padding:0
                }}
              >
                {(user?.name?.[0] || "U").toUpperCase()}
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  aria-label="Profile menu"
                  style={{
                    position:"absolute",top:40,right:0,
                    width:220,
                    background:C.white,
                    border:`1px solid ${C.border}`,
                    borderRadius:14,
                    boxShadow:"0 18px 40px rgba(17,24,39,0.10)",
                    overflow:"hidden",
                    zIndex:50,
                  }}
                >
                  <div style={{padding:"12px 12px 10px 12px",borderBottom:`1px solid ${C.border2}`}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {user?.name || "Profile"}
                    </div>
                    <div style={{marginTop:6,display:"flex",alignItems:"center",gap:8}}>
                      <div style={{fontSize:11,color:C.sub,fontWeight:600}}>Plan</div>
                      <div style={{
                        fontSize:11,fontWeight:700,
                        padding:"4px 10px",
                        borderRadius:999,
                        background:isPro ? "rgba(34,197,94,0.12)" : "rgba(99,102,241,0.10)",
                        color:isPro ? "#166534" : "#3730a3",
                        border:`1px solid ${isPro ? "rgba(34,197,94,0.25)" : "rgba(99,102,241,0.22)"}`,
                        textTransform:"capitalize"
                      }}>
                        {user?.subscriptionTier || "free"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate(ROUTES.SUBSCRIPTION);
                    }}
                    style={{
                      width:"100%",
                      textAlign:"left",
                      padding:"10px 12px",
                      background:"none",
                      border:"none",
                      cursor:"pointer",
                      fontSize:12.5,
                      fontWeight:600,
                      color:C.text,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    Manage plan
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      setProfileOpen(false);
                      await logout(); // redirects to Home in existing hook
                    }}
                    style={{
                      width:"100%",
                      textAlign:"left",
                      padding:"10px 12px",
                      background:"none",
                      border:"none",
                      cursor:"pointer",
                      fontSize:12.5,
                      fontWeight:700,
                      color:"#b91c1c",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* ── BODY ── */}
          <div style={{flex:1,display:"flex",overflow:"hidden"}}>

            {/* ── CENTER ── */}
            <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:16,minWidth:0}}>

              {activeNav === "dashboard" && (
              <>
              {/* Stat Cards */}
              <div className="stat-grid anim-1" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
                {statCards.map((s,i)=>(
                  <Card key={s.label} style={{padding:"16px 18px",cursor:"default"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                      <div style={{width:36,height:36,borderRadius:10,background:s.accentBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <s.icon size={17} style={{color:s.accent}}/>
                      </div>
                      <div className={s.up?"stat-badge-up":"stat-badge-down"} style={{display:"flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:100,fontSize:10.5,fontWeight:600}}>
                        {s.up?<ArrowUpRight size={10}/>:<ArrowDownRight size={10}/>}{s.change}
                      </div>
                    </div>
                    <div style={{fontSize:21,fontWeight:700,color:C.text,fontFamily:"Inter, sans-serif",letterSpacing:"-0.3px",marginBottom:3}}>{s.value}</div>
                    <div style={{fontSize:11.5,color:C.muted,fontWeight:400}}>{s.label}</div>
                  </Card>
                ))}
              </div>

              {/* Net Worth Chart */}
              <Card className="anim-2" style={{padding:"20px 22px"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4}}>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>NET WORTH</div>
                    <div style={{fontSize:30,fontWeight:700,fontFamily:"Inter, sans-serif",letterSpacing:"-0.5px",color:C.text,lineHeight:1.1}}>${(summary.netBalance ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                    <div style={{fontSize:12,color:C.greenMid,fontWeight:600,marginTop:5,display:"flex",alignItems:"center",gap:4}}>
                      <ArrowUpRight size={13}/> Net this month
                    </div>
                  </div>
                  <button type="button" onClick={()=>setAddModalOpen(true)} style={{width:32,height:32,borderRadius:"50%",background:C.sidebar,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"transform 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.transform="scale(1.08)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                  >
                    <Plus size={15} color={C.white}/>
                  </button>
                </div>

                <div style={{margin:"16px 0 10px"}}>
                  <ResponsiveContainer width="100%" height={130}>
                    <AreaChart data={netWorthData} margin={{top:4,right:0,bottom:0,left:0}}>
                      <defs>
                        <linearGradient id="nwG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={C.teal} stopOpacity={0.20}/>
                          <stop offset="95%" stopColor={C.teal} stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="d" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                      <YAxis hide/>
                      <Tooltip content={<ChartTip/>}/>
                      <Area type="monotone" dataKey="v" name="Net Worth" stroke={C.teal} strokeWidth={2.5} fill="url(#nwG)" dot={false} activeDot={{r:5,fill:C.teal,stroke:C.white,strokeWidth:2}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Time tabs */}
                <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                  {timeTabs.map(t=>(
                    <button key={t} className="tab-pill" onClick={()=>setActiveTab(t)} style={{
                      padding:"5px 14px",borderRadius:100,fontSize:11,fontWeight:500,
                      background:activeTab===t?C.sidebar:"transparent",
                      color:activeTab===t?C.white:C.muted,
                    }}>{t}</button>
                  ))}
                </div>
              </Card>

              {/* 3-col bottom row */}
              <div className="center-grid3 anim-3" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)",gap:14}}>

                {/* Goals + Cash Flow */}
                <Card style={{padding:"18px",minWidth:0,overflow:"hidden"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Financial Goals</div>
                      <div style={{fontSize:14,fontWeight:600,fontFamily:"Inter, sans-serif",color:C.text}}>Your Targets</div>
                    </div>
                    <Link to={ROUTES.GOALS} style={{width:28,height:28,borderRadius:"50%",background:C.greenBg,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.greenMid,textDecoration:"none"}}>
                      <Plus size={13}/>
                    </Link>
                  </div>
                  {goals.map(g=>{
                    const pct=Math.round((g.current/g.target)*100);
                    return (
                      <div key={g.title} style={{marginBottom:14}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <div style={{display:"flex",alignItems:"center",gap:7}}>
                            <div style={{width:24,height:24,borderRadius:7,background:`${g.color}14`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <g.icon size={12} style={{color:g.color}}/>
                            </div>
                            <span style={{fontSize:12.5,color:C.text,fontWeight:500}}>{g.title}</span>
                          </div>
                          <span style={{fontSize:11,color:g.color,fontWeight:700}}>{pct}%</span>
                        </div>
                        <div style={{background:C.border,borderRadius:100,height:5,overflow:"hidden"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:g.color,borderRadius:100,transition:"width 1s ease"}}/>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                          <span style={{fontSize:10,color:C.muted}}>${g.current.toLocaleString("en-US")}</span>
                          <span style={{fontSize:10,color:C.muted}}>${g.target.toLocaleString("en-US")}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Mini cash flow */}
                  <div style={{borderTop:`1px solid ${C.border2}`,paddingTop:14,marginTop:4}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>Net Cash Flow</div>
                    <div style={{fontSize:18,fontWeight:700,fontFamily:"Inter, sans-serif",color:C.text,marginBottom:10}}>${(summary.netBalance ?? 0).toLocaleString("en-US",{maximumFractionDigits:0})} <span style={{fontSize:12,color:C.greenMid,fontWeight:600}}>{(summary.netBalance ?? 0) >= 0 ? "▲ saved" : ""}</span></div>
                    <ResponsiveContainer width="100%" height={52}>
                      <BarChart data={cashFlowData} barSize={10} margin={{top:0,right:0,bottom:0,left:0}}>
                        <Bar dataKey="income"  fill={C.greenMid} radius={[3,3,0,0]} opacity={0.85}/>
                        <Bar dataKey="expense" fill={C.teal}     radius={[3,3,0,0]} opacity={0.60}/>
                        <XAxis dataKey="m" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                        <Tooltip content={<ChartTip/>}/>
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{display:"flex",gap:12,marginTop:6}}>
                      {[{l:"Income",c:C.greenMid},{l:"Expenses",c:C.teal}].map(x=>(
                        <div key={x.l} style={{display:"flex",alignItems:"center",gap:5,fontSize:10.5,color:C.sub}}>
                          <div style={{width:7,height:7,borderRadius:2,background:x.c}}/>{x.l}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link to={ROUTES.GOALS} style={{display:"block",width:"100%",marginTop:14,padding:"8px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,fontSize:11,fontWeight:600,color:C.sub,cursor:"pointer",letterSpacing:"0.04em",transition:"background 0.15s",textAlign:"center",textDecoration:"none"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#edeae4"}
                    onMouseLeave={e=>e.currentTarget.style.background=C.bg}
                  >SEE MORE</Link>
                </Card>

                {/* Breakdown */}
                <Card style={{padding:"18px",minWidth:0,overflow:"hidden"}}>
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Breakdown</div>
                    <div style={{fontSize:14,fontWeight:600,fontFamily:"Inter, sans-serif",color:C.text}}>Where You Spend</div>
                  </div>

                  <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={34} outerRadius={58} dataKey="value" strokeWidth={2} stroke={C.white}>
                          {categoryData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                        </Pie>
                        <Tooltip formatter={(v,n)=>[`${v}%`,n]} contentStyle={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {categoryData.slice(0,5).map(c=>(
                    <div key={c.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,padding:"3px 0"}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0}}/>
                      <span style={{fontSize:12,color:C.sub,flex:1}}>{c.name}</span>
                      <span style={{fontSize:11,color:C.muted}}>${c.amount.toLocaleString("en-US")}</span>
                      <span style={{fontSize:11.5,fontWeight:600,color:C.text,minWidth:28,textAlign:"right"}}>{c.value}%</span>
                    </div>
                  ))}
                  <button type="button" onClick={()=>setActiveNav("spending")} style={{width:"100%",marginTop:12,padding:"8px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,fontSize:11,fontWeight:600,color:C.sub,cursor:"pointer",letterSpacing:"0.04em",transition:"background 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#edeae4"}
                    onMouseLeave={e=>e.currentTarget.style.background=C.bg}
                  >SEE MORE</button>
                </Card>

                {/* Recent Transactions */}
                <Card style={{padding:"18px",minWidth:0,overflow:"hidden"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Transactions</div>
                      <div style={{fontSize:14,fontWeight:600,fontFamily:"Inter, sans-serif",color:C.text}}>Recent Activity</div>
                    </div>
                    <button type="button" onClick={()=>setActiveNav("spending")} style={{fontSize:11,fontWeight:600,color:C.greenMid,background:C.greenBg,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:3,padding:"4px 8px",borderRadius:8,flexShrink:0}}>
                      View all <ChevronRight size={12}/>
                    </button>
                  </div>

                  {/* Top merchants */}
                  <div style={{display:"flex",gap:8,marginBottom:14,padding:"10px",background:C.bg,borderRadius:10}}>
                    {spendMerchants.map(m=>(
                      <div key={m.name} style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                        <div style={{width:36,height:36,borderRadius:10,background:`${m.color}14`,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${m.color}20`}}>
                          <m.icon size={15} style={{color:m.color}}/>
                        </div>
                        <div style={{fontSize:10,color:C.sub,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{m.name}</div>
                        <div style={{fontSize:9.5,color:C.muted}}>{m.amount}x</div>
                      </div>
                    ))}
                  </div>

                  <div style={{height:1,background:C.border2,marginBottom:10}}/>

                  {transactions.slice(0, 4).map(tx=>(
                    <div key={tx.id} className="tx-row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 8px",marginBottom:2,gap:8,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0,overflow:"hidden"}}>
                        <div style={{width:32,height:32,borderRadius:9,background:`${tx.color}12`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`1px solid ${tx.color}18`}}>
                          <tx.icon size={13} style={{color:tx.color}}/>
                        </div>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:12.5,fontWeight:500,color:C.text,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.merchant}</div>
                          <div style={{fontSize:10,color:C.muted,marginTop:1}}>{tx.category} · {tx.date}</div>
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:12.5,fontWeight:700,color:tx.amount>0?C.greenMid:C.text}}>
                          {tx.amount>0?"+":""}${Math.abs(tx.amount).toLocaleString("en-US",{maximumFractionDigits:0})}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={()=>setActiveNav("spending")} style={{width:"100%",marginTop:10,padding:"8px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,fontSize:11,fontWeight:600,color:C.sub,cursor:"pointer",letterSpacing:"0.04em",transition:"background 0.15s",textAlign:"center"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#edeae4"}
                    onMouseLeave={e=>e.currentTarget.style.background=C.bg}
                  >SEE MORE</button>
                </Card>

              </div>{/* end 3-col */}

              {/* Mobile-only: AI + spending */}
              <div className="mobile-bottom-strip anim-4" style={{display:"none",flexDirection:"column",gap:14}}>
                <Card style={{padding:"18px"}}>
                  <AICopilotContent messages={messages} isTyping={isTyping} chatInput={chatInput} setChatInput={setChatInput} handleSend={handleSend} msgsEndRef={msgsEndRef} C={C} aiLimitReached={aiLimitReached}/>
                </Card>
                <Card style={{padding:"18px"}}>
                  <SpendingContent transactions={transactions} totalExpense={summary.totalExpense} C={C}/>
                </Card>
              </div>
              </>
              )}

              {activeNav === "spending" && (
                <>
                  <div style={{fontSize:18,fontWeight:700,fontFamily:"Inter, sans-serif",color:C.text,marginBottom:8}}>Spending</div>
                  <div className="stat-grid" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
                    <Card style={{padding:"18px"}}>
                      <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>Where you spend</div>
                      {categoryData.length ? (
                        <>
                          <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
                            <ResponsiveContainer width={140} height={140}>
                              <PieChart>
                                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={2} stroke={C.white}>
                                  {categoryData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                                </Pie>
                                <Tooltip formatter={(v,n)=>[`${v}%`,n]} contentStyle={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}}/>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          {categoryData.slice(0,6).map(c=>(
                            <div key={c.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                              <div style={{width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0}}/>
                              <span style={{fontSize:12,color:C.sub,flex:1}}>{c.name}</span>
                              <span style={{fontSize:11.5,fontWeight:600,color:C.text}}>${c.amount?.toLocaleString("en-US")} ({c.value}%)</span>
                            </div>
                          ))}
                        </>
                      ) : <p style={{fontSize:12,color:C.muted}}>No spending data yet. Add expenses to see breakdown.</p>}
                    </Card>
                    <Card style={{padding:"18px"}}>
                      <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>Recent transactions</div>
                      {transactions.length ? (
                        transactions.slice(0,10).map(tx=>(
                          <div key={tx.id} className="tx-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border2}`}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{width:32,height:32,borderRadius:9,background:`${tx.color}12`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <tx.icon size={13} style={{color:tx.color}}/>
                              </div>
                              <div>
                                <div style={{fontSize:12.5,fontWeight:500,color:C.text}}>{tx.merchant}</div>
                                <div style={{fontSize:10,color:C.muted}}>{tx.category} · {tx.date}</div>
                              </div>
                            </div>
                            <span style={{fontSize:12.5,fontWeight:700,color:tx.amount>0?C.greenMid:C.text}}>{tx.amount>0?"+":""}${Math.abs(tx.amount).toLocaleString("en-US",{maximumFractionDigits:0})}</span>
                          </div>
                        ))
                      ) : <p style={{fontSize:12,color:C.muted}}>No transactions yet.</p>}
                      <Link to={ROUTES.TRANSACTIONS} style={{display:"block",marginTop:12,fontSize:11,fontWeight:600,color:C.greenMid,textDecoration:"none"}}>View all →</Link>
                    </Card>
                  </div>
                </>
              )}

              {activeNav === "portfolio" && (
                <Card style={{padding:24}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Portfolio</div>
                  <div style={{fontSize:18,fontWeight:700,fontFamily:"Inter, sans-serif",color:C.text,marginBottom:12}}>Investments</div>
                  <p style={{fontSize:12,color:C.sub,marginBottom:16}}>Portfolio tracking coming soon. Your net cash flow trend is below.</p>
                  {portfolioData?.length > 0 && (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={portfolioData} margin={{top:4,right:0,bottom:0,left:0}}>
                        <defs>
                          <linearGradient id="pfGC" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={C.greenMid} stopOpacity={0.16}/>
                            <stop offset="95%" stopColor={C.greenMid} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="d" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                        <YAxis hide/>
                        <Tooltip content={<ChartTip/>}/>
                        <Area type="monotone" dataKey="v" name="Value" stroke={C.greenMid} strokeWidth={2} fill="url(#pfGC)" dot={false}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              )}

              {activeNav === "planning" && (
                <Card style={{padding:24}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Financial Planning</div>
                      <div style={{fontSize:18,fontWeight:700,fontFamily:"Inter, sans-serif",color:C.text}}>Goals & planning</div>
                      <p style={{fontSize:12,color:C.sub,marginTop:6}}>Track your goals in one place. Create a new goal and see progress below.</p>
                    </div>
                    <Link to={ROUTES.GOALS} style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:2,padding:"8px 16px",background:C.greenBg,borderRadius:10,fontSize:12,fontWeight:600,color:C.greenMid,textDecoration:"none"}}>
                      <Plus size={14}/> New goal
                    </Link>
                  </div>

                  {goals.length === 0 ? (
                    <p style={{fontSize:12,color:C.muted}}>No goals yet. Create one to get started.</p>
                  ) : (
                    <div className="space-y-3">
                      {goals.map((g) => {
                        const pct = Math.round((g.current / g.target) * 100);
                        return (
                          <div key={g.title} style={{padding:12,border:`1px solid ${C.border}`,borderRadius:12,background:C.bg}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <div style={{width:26,height:26,borderRadius:8,background:`${g.color}14`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                  <g.icon size={12} style={{color:g.color}}/>
                                </div>
                                <span style={{fontSize:13,fontWeight:600,color:C.text}}>{g.title}</span>
                              </div>
                              <span style={{fontSize:11,color:g.color,fontWeight:700}}>{pct}%</span>
                            </div>
                            <div style={{height:6,borderRadius:100,overflow:"hidden",background:C.border}}>
                              <div style={{width:`${pct}%`,height:"100%",background:g.color,transition:"width 0.3s ease"}}/>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:C.muted}}>
                              <span>${g.current.toLocaleString("en-US")}</span>
                              <span>${g.target.toLocaleString("en-US")}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )}

              {activeNav === "benefits" && (
                <Card style={{padding:24,display:"flex",flexDirection:"column",gap:16}}>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Benefits</div>
                    <div style={{fontSize:18,fontWeight:700,fontFamily:"Inter, sans-serif",color:C.text,marginBottom:4}}>Your FinPilot benefits</div>
                    <div style={{fontSize:12,color:C.sub}}>
                      Plan-specific limits and perks based on your current subscription.
                    </div>
                  </div>

                  {/* Current plan pill */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"10px 14px",borderRadius:12,background:"#f9fafb",border:`1px solid ${C.border2}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{
                        width:32,height:32,borderRadius:"999px",
                        background:isPro ? "rgba(34,197,94,0.12)" : "rgba(59,130,246,0.12)",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:11,fontWeight:700,
                        color:isPro ? "#15803d" : "#1d4ed8"
                      }}>
                        {isPro ? "PRO" : "FREE"}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:C.text}}>
                          {isPro ? "Pro plan" : "Free plan"}
                        </div>
                        <div style={{fontSize:11,color:C.muted}}>
                          {(user?.subscriptionTier || "free") === "pro"
                            ? "Unlimited AI & higher transaction capacity."
                            : "Starter limits with core insights to manage your money."}
                        </div>
                      </div>
                    </div>
                    {!isPro && (
                      <button
                        type="button"
                        onClick={() => navigate(ROUTES.SUBSCRIPTION)}
                        style={{
                          fontSize:11,fontWeight:600,
                          padding:"7px 14px",
                          borderRadius:999,
                          border:"none",
                          cursor:"pointer",
                          background:`linear-gradient(135deg,${C.tealLt},${C.greenMid})`,
                          color:C.white,
                          whiteSpace:"nowrap"
                        }}
                      >
                        Upgrade to Pro
                      </button>
                    )}
                  </div>

                  {/* Limits overview */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10,marginTop:4}}>
                    <div style={{borderRadius:12,border:`1px solid ${C.border2}`,padding:"10px 12px",background:"#fcfcfb"}}>
                      <div style={{fontSize:11,fontWeight:600,color:C.sub,marginBottom:4}}>Transactions / month</div>
                      <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:2}}>
                        {isPro ? "Unlimited" : "10"}
                      </div>
                      <div style={{fontSize:10,color:C.muted}}>
                        Free users can add up to 10 transactions per month.
                      </div>
                    </div>
                    <div style={{borderRadius:12,border:`1px solid ${C.border2}`,padding:"10px 12px",background:"#fcfcfb"}}>
                      <div style={{fontSize:11,fontWeight:600,color:C.sub,marginBottom:4}}>AI questions / month</div>
                      <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:2}}>
                        {isPro ? "Unlimited" : "5"}
                      </div>
                      <div style={{fontSize:10,color:C.muted}}>
                        Use the AI Co‑pilot to analyse your spending.
                      </div>
                    </div>
                    <div style={{borderRadius:12,border:`1px solid ${C.border2}`,padding:"10px 12px",background:"#fcfcfb"}}>
                      <div style={{fontSize:11,fontWeight:600,color:C.sub,marginBottom:4}}>CSV import</div>
                      <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:2}}>
                        {isPro ? "Priority" : "Standard"}
                      </div>
                      <div style={{fontSize:10,color:C.muted}}>
                        Upload your bank CSV to keep the dashboard in sync.
                      </div>
                    </div>
                  </div>

                  {/* Explainer */}
                  <div style={{marginTop:8,fontSize:11,color:C.muted,lineHeight:1.5}}>
                    Your current plan is detected from the backend user profile
                    (<code style={{fontSize:10,background:"#f3f4f6",padding:"1px 4px",borderRadius:4}}>subscriptionTier</code>).
                    Upgrade to Pro any time from here or the Subscription page.
                  </div>
                </Card>
              )}

              {activeNav === "equity" && (
                <Card style={{padding:24}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Equity</div>
                  <div style={{fontSize:18,fontWeight:700,fontFamily:"Inter, sans-serif",color:C.text,marginBottom:12}}>Equity overview</div>
                  <p style={{fontSize:12,color:C.sub}}>Equity and long-term wealth metrics will appear here.</p>
                </Card>
              )}

              {activeNav === "learning" && (
                <Card style={{padding:24}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Learning</div>
                  <div style={{fontSize:18,fontWeight:700,fontFamily:"Inter, sans-serif",color:C.text,marginBottom:12}}>Learn & improve</div>
                  <p style={{fontSize:12,color:C.sub}}>Tips and learning resources to improve your finances.</p>
                </Card>
              )}

            </div>{/* end center */}

            {/* ── RIGHT STRIP ── */}
            <div className="right-strip" style={{width:320,flexShrink:0,borderLeft:`1px solid ${C.border}`,background:C.white,overflowY:"auto",display:"flex",flexDirection:"column"}}>

              {/* Credit score (from backend: goals + savings + expenses) */}
              <div style={{padding:"18px 16px",borderBottom:`1px solid ${C.border2}`}}>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>✔ Credit score</div>
                {dashboard.financialScore != null && typeof dashboard.financialScore.score === "number" ? (
                  <>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
                      <div style={{width:48,height:48,borderRadius:12,background:C.greenBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:C.greenMid}}>
                        {dashboard.financialScore.score}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:C.text}}>{dashboard.financialScore.label || "—"}</div>
                        <div style={{fontSize:10.5,color:C.sub}}>Based on goals & savings</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p style={{fontSize:11,color:C.sub}}>Add goals & transactions to see your score.</p>
                )}
              </div>

              {/* AI Co-Pilot */}
              <div style={{padding:"18px 16px",borderBottom:`1px solid ${C.border2}`}}>
                {aiLimitReached && (
                  <div style={{marginBottom:12,padding:"10px 12px",background:C.redBg,borderRadius:10,border:`1px solid ${C.red}20`}}>
                    <p style={{fontSize:11,color:C.red,fontWeight:600,marginBottom:6}}>AI limit reached (5/month)</p>
                    <Link to={ROUTES.SUBSCRIPTION} style={{fontSize:11,fontWeight:600,color:C.greenMid,textDecoration:"none"}}>Upgrade to Pro →</Link>
                  </div>
                )}
                <AICopilotContent messages={messages} isTyping={isTyping} chatInput={chatInput} setChatInput={setChatInput} handleSend={handleSend} msgsEndRef={msgsEndRef} C={C} aiLimitReached={aiLimitReached}/>
              </div>

            </div>{/* end right strip */}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── AI Copilot Sub-Component ──────────────────────────── */
function AICopilotContent({messages,isTyping,chatInput,setChatInput,handleSend,msgsEndRef,C,aiLimitReached}) {
  return (
    <>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <div style={{width:28,height:28,borderRadius:9,background:`linear-gradient(135deg,${C.greenMid},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 0 3px ${C.greenBg}`}}>
          <Bot size={14} color="#fff"/>
        </div>
        <span style={{fontSize:13,fontWeight:600,fontFamily:"Inter, sans-serif",color:C.text}}>AI Co-Pilot</span>
        <div style={{marginLeft:"auto",fontSize:9,color:C.greenMid,background:C.greenBg,padding:"2px 8px",borderRadius:100,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
          <span style={{width:5,height:5,borderRadius:"50%",background:C.greenMid,display:"inline-block",animation:"pulse 2s infinite"}}/>
          Live
        </div>
      </div>

      <div style={{maxHeight:140,overflowY:"auto",display:"flex",flexDirection:"column",gap:6,marginBottom:8}}>
        {messages.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",animation:"fadeUp 0.3s ease"}}>
            <div style={{
              maxWidth:"90%",padding:"8px 11px",fontSize:11,lineHeight:1.65,
              borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",
              background:m.role==="user"?C.sidebar:C.bg,
              color:m.role==="user"?C.white:C.text,
              border:`1px solid ${m.role==="user"?C.sidebar:C.border}`,
              boxShadow:"0 1px 3px rgba(0,0,0,0.06)"
            }}
              dangerouslySetInnerHTML={{__html:m.text.replace(/\*\*(.*?)\*\*/g,`<strong style="color:${m.role==="user"?C.tealLt:C.greenMid}">$1</strong>`)}}
            />
          </div>
        ))}
        {isTyping&&(
          <div style={{display:"flex",gap:4,padding:"8px 11px",background:C.bg,borderRadius:"12px 12px 12px 2px",width:"fit-content",border:`1px solid ${C.border}`}}>
            {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:C.greenMid,opacity:0.7,animation:`bounceY 1s ${i*0.18}s infinite`}}/>)}
          </div>
        )}
        <div ref={msgsEndRef}/>
      </div>

      {!aiLimitReached && ["Where am I overspending?","Can I afford a MacBook?","Improve my score?"].map(s=>(
        <button key={s} className="sug-btn" onClick={()=>handleSend(s)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:9,padding:"6px 10px",fontSize:11,color:C.sub,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"left",marginBottom:5}}>
          {s}
        </button>
      ))}

      <div style={{display:"flex",gap:6,alignItems:"center",background:C.bg,border:`1px solid ${C.border}`,borderRadius:100,padding:"6px 7px 6px 14px",marginTop:4}}>
        <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!aiLimitReached&&handleSend()}
          placeholder={aiLimitReached ? "Upgrade to Pro to ask more" : "Ask anything..."}
          disabled={!!aiLimitReached}
          style={{flex:1,background:"none",border:"none",outline:"none",fontSize:11.5,color:C.text,fontFamily:"'DM Sans',sans-serif",opacity:aiLimitReached?0.7:1}}/>
        <button type="button" onClick={()=>!aiLimitReached&&handleSend()} disabled={!!aiLimitReached} style={{width:28,height:28,borderRadius:"50%",background:C.sidebar,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:aiLimitReached?"not-allowed": "pointer",opacity:aiLimitReached?0.6:1,transition:"transform 0.15s"}}
          onMouseEnter={e=>!aiLimitReached&&(e.currentTarget.style.transform="scale(1.08)")}
          onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
        >
          <ArrowUpRight size={13} color="#fff"/>
        </button>
      </div>
    </>
  );
}

/* ─── Spending Sub-Component ────────────────────────────── */
function SpendingContent({transactions,totalExpense,C}) {
  const spent = totalExpense ?? 0;
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Spending</span>
        <Link to={ROUTES.TRANSACTIONS} style={{color:C.muted}}><ChevronRight size={13}/></Link>
      </div>
      <div style={{fontSize:10.5,color:C.muted,marginBottom:3}}>Spent this month</div>
      <div style={{fontSize:22,fontWeight:700,fontFamily:"Inter, sans-serif",color:C.text,marginBottom:12}}>{`$${spent.toLocaleString("en-US",{maximumFractionDigits:0})}`}</div>

      <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:9}}>Latest transactions</div>
      {transactions.slice(0,3).map(tx=>(
        <div key={tx.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.border2}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:26,height:26,borderRadius:7,background:`${tx.color}12`,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${tx.color}18`}}>
              <tx.icon size={11} style={{color:tx.color}}/>
            </div>
            <span style={{fontSize:12,color:C.text}}>{tx.merchant}</span>
          </div>
          <span style={{fontSize:12,fontWeight:600,color:tx.amount>0?C.greenMid:C.text}}>
            {tx.amount>0?"+":""}${Math.abs(tx.amount).toLocaleString("en-US",{maximumFractionDigits:0})}
          </span>
        </div>
      ))}
    </>
    );
  }