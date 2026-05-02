import { usePortfolio } from "../context/PortfolioContext";
const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

function MiniDonut({ assets }) {
  const total = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
  if (!total) return null;
  const r = 40, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = assets.map((a, i) => {
    const pct = (a.currentValue || 0) / total;
    const el = (
      <circle key={a._id} cx={cx} cy={cy} r={r}
        fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="18"
        strokeDasharray={`${pct * circ} ${circ - pct * circ}`}
        strokeDashoffset={-offset * circ}
      />
    );
    offset += pct;
    return el;
  });
  return (
    <svg viewBox="0 0 100 100" style={{ width: 110, height: 110, transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="18" />
      {slices}
    </svg>
  );
}

export default function PortfolioBreakdownChartCard() {
  const { assets, loading, refreshAssets } = usePortfolio();

  const currentValue = assets.reduce((s, a) => s + (a.currentValue || 0), 0);

  return (
    <div style={{
      background: "white",
      border: "1px solid #e2e8f0",
      borderRadius: 14,
      padding: "20px"
    }}>
      {/* header */}
      <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: ".06em", marginBottom: 6 }}>
        INVESTMENT PORTFOLIO
      </p>
      <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
        ${currentValue.toLocaleString()}
      </h3>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
        Asset Allocation
      </p>
      {loading ? (
        <p style={{ fontSize: 12, color: "#94a3b8" }}>Loading...</p>
      ) : assets.length === 0 ? (
        <p style={{ fontSize: 12, color: "#94a3b8" }}>No investments yet</p>
      ) : (
        <div style={{ display: "flex", gap: 18 }}>
          {/* donut */}
          <div style={{ position: "relative" }}>
            <MiniDonut assets={assets} />
          </div>
          {/* legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {assets.map((a, i) => {
              const pct = currentValue > 0 ? ((a.currentValue || 0) / currentValue * 100).toFixed(1) : "0.0";
              return (
                <div key={a._id} style={{ display: "flex", alignItems: "center", fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], display: "inline-block", marginRight: 8 }} />
                  <span style={{ flex: 1 }}>{a.symbol.toUpperCase()}</span>
                  <span style={{ fontWeight: 600 }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div
        style={{ marginTop: 14, textAlign: "right", fontSize: 13, color: "#10b981", fontWeight: 600, cursor: "pointer" }}
        onClick={() => window.location.href = "/dashboard?tab=portfolio"}
      >
        View Portfolio →
      </div>
    </div>
  );
}