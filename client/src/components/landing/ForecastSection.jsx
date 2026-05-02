import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Home, X as XIcon } from "lucide-react";

/* ── Pure SVG forecast chart — no external libs ── */
function ForecastChart() {
  // Points: [x%, y%] on a 0-100 normalized grid (y inverted — 0=top,100=bottom)
  const solidPts = [
    [0, 78], [4, 76], [8, 72], [10, 68], [12, 50],
    [14, 55], [16, 52], [18, 53], [20, 51],
  ];
  const dashedPts = [
    [20, 51], [25, 48], [30, 46], [33, 42], [38, 44],
    [41, 40], [44, 41], [48, 38], [52, 39],
    [56, 36], [60, 37], [65, 35], [70, 36],
    [75, 34], [80, 35], [85, 33], [90, 34], [95, 33], [100, 34],
  ];

  const W = 800, H = 240;
  const toSVG = ([xPct, yPct]) => [xPct / 100 * W, yPct / 100 * H];

  const solidPath = solidPts.map((p, i) => {
    const [x, y] = toSVG(p);
    return i === 0 ? `M${x},${y}` : `L${x},${y}`;
  }).join(" ");

  const dashedPath = dashedPts.map((p, i) => {
    const [x, y] = toSVG(p);
    return i === 0 ? `M${x},${y}` : `L${x},${y}`;
  }).join(" ");

  // Area fill under solid line
  const solidFirst = toSVG(solidPts[0]);
  const solidLast  = toSVG(solidPts[solidPts.length - 1]);
  const areaPath   = `${solidPath} L${solidLast[0]},${H} L${solidFirst[0]},${H} Z`;

  // Milestone markers
  const milestones = [
    { pt: dashedPts[6], icon: "🏠", label: "Buy home" },
    { pt: dashedPts[13], icon: "✈️", label: "Retire" },
  ];

  const xLabels = [
    { pct: 14, label: "TODAY" },
    { pct: 33, label: "AGE 40" },
    { pct: 48, label: "AGE 50" },
    { pct: 63, label: "AGE 60" },
    { pct: 78, label: "AGE 70" },
    { pct: 93, label: "AGE 80" },
  ];

  const yLabels = [
    { pct: 5, label: "$1.25M" },
    { pct: 25, label: "$1M" },
    { pct: 45, label: "$500K" },
    { pct: 65, label: "$250K" },
    { pct: 85, label: "$0K" },
  ];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(30,40,80,0.9) 0%, rgba(20,30,60,0.95) 100%)",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(20px)",
      }}>
      {/* Stats row */}
      <div className="flex items-start justify-between px-6 pt-6 pb-3">
        <div>
          <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wider">Current net worth</p>
          <p className="text-2xl font-bold text-white">$325,472</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wider">Future net worth at 90</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-white">$1,240,056</p>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 12L12 4M12 4H5M12 4v7" stroke="#34d399" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-xs text-emerald-400">+$914,584 (281%)</p>
        </div>
      </div>

      {/* SVG chart */}
      <div className="relative px-4 pb-8">
        <svg
          viewBox={`0 0 ${W} ${H + 20}`}
          className="w-full"
          preserveAspectRatio="none"
          style={{ height: 200 }}
        >
          <defs>
            <linearGradient id="fcAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {yLabels.map(({ pct }) => {
            const y = pct / 100 * H;
            return (
              <line key={pct} x1={0} y1={y} x2={W} y2={y}
                stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            );
          })}

          {/* Solid area fill */}
          <path d={areaPath} fill="url(#fcAreaGrad)" />

          {/* Solid line — white, thick */}
          <path d={solidPath} fill="none" stroke="rgba(255,255,255,0.9)"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Today vertical line */}
          <line x1={toSVG(solidPts[solidPts.length - 1])[0]}
            y1={0} x2={toSVG(solidPts[solidPts.length - 1])[0]} y2={H}
            stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4 4" />

          {/* Dashed future line */}
          <path d={dashedPath} fill="none" stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.8" strokeDasharray="6 5" strokeLinecap="round" />

          {/* Milestone markers */}
          {milestones.map(({ pt }, i) => {
            const [x, y] = toSVG(pt);
            return (
              <g key={i}>
                <line x1={x} y1={y} x2={x} y2={H}
                  stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4 4" />
                <circle cx={x} cy={y} r={14} fill="rgba(255,255,255,0.12)"
                  stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                <text x={x} y={y + 5} textAnchor="middle" fontSize="12" fill="white">
                  {milestones[i].icon}
                </text>
              </g>
            );
          })}

          {/* Y-axis labels */}
          {yLabels.map(({ pct, label }) => (
            <text key={pct} x={W - 2} y={pct / 100 * H - 4}
              textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.3)"
              fontFamily="Inter, sans-serif">
              {label}
            </text>
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between px-0 mt-1">
          {xLabels.map(({ label }) => (
            <span key={label} className="text-[9px] font-semibold tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.3)" }}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ForecastSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-28 px-4 sm:px-6 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #080A0F 0%, #0d1a3a 40%, #1a2850 70%, #0d1a3a 100%)",
      }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(59,130,246,0.15) 0%, transparent 65%)", filter: "blur(40px)" }} />
      </div>

      <div className="relative z-10 max-w-[960px] mx-auto">
        {/* Heading */}
        <div className="text-center mb-14">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-5"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            <em className="not-italic" style={{ fontStyle: "italic" }}>Forecast</em>{" "}
            your future
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="text-zinc-400 text-lg max-w-md mx-auto leading-relaxed mb-8"
          >
            Map out future scenarios — from market swings to life milestones — and watch how your wealth could compound over time.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.22 }}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-bold tracking-widest uppercase text-white transition-all hover:opacity-90 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(12px)",
            }}
          >
            More About Forecasting <ArrowRight size={13} />
          </motion.button>
        </div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <ForecastChart />
        </motion.div>
      </div>
    </section>
  );
}
