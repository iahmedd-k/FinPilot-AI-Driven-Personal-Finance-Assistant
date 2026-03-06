const statCards = [
  { label: "Total Income", value: "$8,400", isGreen: true, badge: "↑ 12% this month", badgeType: "up" },
  { label: "Total Expenses", value: "$5,230", isGreen: false, badge: "↑ 4% this month", badgeType: "dn" },
  { label: "Net Balance", value: "$3,170", isGreen: true, badge: "37% savings rate", badgeType: "up" },
  { label: "AI Score", value: "74", valueSuffix: "/100", isGreen: false, badge: "Good 🟡", badgeType: "neu" },
];

const barData = [
  { inc: 34, exp: 24 }, { inc: 40, exp: 30 }, { inc: 36, exp: 27 },
  { inc: 50, exp: 33 }, { inc: 44, exp: 27 }, { inc: 56, exp: 36 },
];
const barLabels = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const pieItems = [
  { label: "Rent", pct: "37%", color: "#10b981" },
  { label: "Dining", pct: "24%", color: "#6366f1" },
  { label: "Transport", pct: "18%", color: "#d4a853" },
  { label: "Shopping", pct: "14%", color: "#f87171" },
];

const sideNav = [
  { label: "📊 Dashboard", active: true },
  { label: "💳 Transactions", active: false },
  { label: "🎯 Goals", active: false },
  { label: "🤖 AI Assistant", active: false },
  { label: "📈 Forecast", active: false },
  { label: "⚙️ Settings", active: false },
];

const badgeStyle = {
  up: { background: "rgba(16,185,129,.1)", color: "#10b981" },
  dn: { background: "rgba(248,113,113,.08)", color: "#f87171" },
  neu: { background: "rgba(212,168,83,.1)", color: "#d4a853" },
};

export default function DashboardPreview() {
  return (
    <div className="w-full px-6">
      <div
        className="rounded-t-[14px] overflow-hidden border border-[rgba(0,0,0,.08)]"
        style={{
          background: "#fff",
          boxShadow: "0 20px 60px rgba(0,0,0,.08), 0 4px 20px rgba(0,0,0,.04)",
        }}
      >
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ background: "#f3f4f6", borderBottom: "1px solid rgba(0,0,0,.05)" }}
        >
          <span className="w-[9px] h-[9px] rounded-full bg-[#ef4444] opacity-60" />
          <span className="w-[9px] h-[9px] rounded-full bg-[#f59e0b] opacity-60" />
          <span className="w-[9px] h-[9px] rounded-full bg-[#10b981] opacity-60" />
          <span className="text-[.75rem] font-medium text-[#6b7280] ml-1.5">FinPilot AI — Dashboard · March 2026</span>
          <span
            className="ml-auto text-[.7rem] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "#d1fae5", color: "#10b981" }}
          >
            <span className="w-[5px] h-[5px] rounded-full bg-[#10b981]" style={{ animation: "blink 2s infinite" }} />
            Live
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] min-h-[360px]">
          <div
            className="hidden md:block py-4 px-3 border-r border-[rgba(0,0,0,.05)]"
            style={{ background: "#f9fafb" }}
          >
            <span className="text-[.82rem] font-extrabold text-[#111827] px-2 py-1 block mb-5">
              Fin<span style={{ color: "#10b981" }}>Pilot</span>
            </span>
            <ul className="list-none">
              {sideNav.map((n) => (
                <li
                  key={n.label}
                  className="flex items-center gap-2 py-2 px-2.5 rounded-[7px] text-[.75rem] font-medium text-[#6b7280] cursor-pointer mb-0.5"
                  style={{
                    background: n.active ? "rgba(16,185,129,.1)" : "transparent",
                    color: n.active ? "#10b981" : undefined,
                  }}
                >
                  {n.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 bg-white">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
              {statCards.map((c) => (
                <div
                  key={c.label}
                  className="rounded-[10px] p-3.5 border border-[rgba(0,0,0,.05)]"
                  style={{ background: "#f9fafb" }}
                >
                  <div className="text-[.62rem] font-semibold uppercase tracking-wider text-[#9ca3af] mb-2">{c.label}</div>
                  <div className="text-[1.2rem] font-bold tracking-tight text-[#111827]" style={{ color: c.isGreen ? "#10b981" : undefined }}>
                    {c.value}{c.valueSuffix && <span className="text-[.7rem] text-[#9ca3af] font-medium">{c.valueSuffix}</span>}
                  </div>
                  <span className="inline-flex items-center text-[.6rem] font-semibold px-2 py-0.5 rounded-full mt-1.5" style={badgeStyle[c.badgeType]}>
                    {c.badge}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-3 mb-3">
              <div className="rounded-[10px] p-3.5 border border-[rgba(0,0,0,.05)]" style={{ background: "#f9fafb" }}>
                <div className="text-[.65rem] font-semibold uppercase tracking-wider text-[#9ca3af] mb-3">Income vs Expenses — 6 months</div>
                <div className="flex items-end gap-1.5 h-[60px]">
                  {barData.map((b, i) => (
                    <div key={i} className="flex-1 flex gap-0.5 items-end">
                      <div className="flex-1 min-w-[8px] rounded-t-[3px] bg-[#10b981] opacity-70" style={{ height: `${b.inc}px` }} />
                      <div className="flex-1 min-w-[8px] rounded-t-[3px] bg-[#6366f1] opacity-60" style={{ height: `${b.exp}px` }} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5 mt-1">
                  {barLabels.map((l) => (
                    <span key={l} className="flex-1 text-center text-[.56rem] text-[#9ca3af]">{l}</span>
                  ))}
                </div>
                <div className="flex gap-3 mt-2">
                  <span className="flex items-center gap-1 text-[.62rem] text-[#9ca3af]">
                    <span className="w-[7px] h-[7px] rounded-sm bg-[#10b981] opacity-80 inline-block" /> Income
                  </span>
                  <span className="flex items-center gap-1 text-[.62rem] text-[#9ca3af]">
                    <span className="w-[7px] h-[7px] rounded-sm bg-[#6366f1] opacity-70 inline-block" /> Expenses
                  </span>
                </div>
              </div>

              <div className="rounded-[10px] p-3.5 border border-[rgba(0,0,0,.05)]" style={{ background: "#f9fafb" }}>
                <div className="text-[.65rem] font-semibold uppercase tracking-wider text-[#9ca3af] mb-3">Spending by Category</div>
                <div className="flex items-center gap-3">
                  <svg width="76" height="76" viewBox="0 0 32 32" className="shrink-0">
                    <circle r="12" cx="16" cy="16" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="28 76" strokeDashoffset="0" opacity=".8" />
                    <circle r="12" cx="16" cy="16" fill="none" stroke="#6366f1" strokeWidth="4" strokeDasharray="18 76" strokeDashoffset="-28" opacity=".7" />
                    <circle r="12" cx="16" cy="16" fill="none" stroke="#d4a853" strokeWidth="4" strokeDasharray="14 76" strokeDashoffset="-46" opacity=".75" />
                    <circle r="12" cx="16" cy="16" fill="none" stroke="#f87171" strokeWidth="4" strokeDasharray="10 76" strokeDashoffset="-60" opacity=".65" />
                  </svg>
                  <div className="flex-1">
                    {pieItems.map((p) => (
                      <div key={p.label} className="flex items-center gap-2 mb-2">
                        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: p.color }} />
                        <span className="flex-1 text-[.67rem] text-[#6b7280]">{p.label}</span>
                        <span className="text-[.67rem] font-semibold text-[#111827]">{p.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-[10px] p-3.5 flex gap-3 items-start"
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,.06), rgba(99,102,241,.05))",
                border: "1px solid rgba(16,185,129,.12)",
              }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: "linear-gradient(135deg, #10b981, #6366f1)" }}>
                🤖
              </div>
              <div>
                <div className="text-[.67rem] text-[#9ca3af] mb-1">You asked: "Can I afford a MacBook this month?"</div>
                <div className="text-[.71rem] text-[#111827] leading-relaxed">
                  Based on your balance of <strong className="text-[#10b981]">$3,170</strong> and projected expenses of <strong className="text-[#10b981]">$1,800</strong> remaining, you can — but it will drop your savings rate from <strong className="text-[#10b981]">37% to 18%</strong>. Consider waiting one more month.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
