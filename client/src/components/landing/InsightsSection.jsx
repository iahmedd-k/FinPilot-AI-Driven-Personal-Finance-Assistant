import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Sparkles, TrendingUp, ThumbsUp, ThumbsDown } from "lucide-react";

/* ── Mini sparkline SVG ── */
function MiniSparkline({ color = "#34d399" }) {
  const pts = [30, 28, 32, 27, 25, 28, 22, 24, 20, 18, 20, 16];
  const W = 120, H = 36;
  const min = Math.min(...pts), max = Math.max(...pts);
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * W);
  const ys = pts.map((v) => H - ((v - min) / (max - min || 1)) * H * 0.8 - H * 0.1);
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const area = `${path} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sg)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Left panel: Instant Insights ── */
function InsightsPanel({ inView }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -32 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex-1 rounded-3xl overflow-hidden flex flex-col p-10 min-h-[480px]"
      style={{
        background: "linear-gradient(145deg, #1a1040 0%, #2a1060 35%, #3b1890 60%, #4a22b0 100%)",
      }}
    >
      {/* Header */}
      <div className="text-center mb-10">
        <h3 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight"
          style={{ fontFamily: "'DM Serif Display', serif" }}>
          <em style={{ fontStyle: "italic" }}>See</em> instant insights
        </h3>
        <p className="text-indigo-300 text-sm leading-relaxed max-w-[260px] mx-auto">
          Get clear answers and tailored insights on your portfolio, spending, and goals — in seconds.
        </p>
      </div>

      {/* Insight card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, delay: 0.25 }}
        className="rounded-2xl p-5 flex flex-col gap-3 max-w-[320px] mx-auto w-full"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(139,92,246,0.3)" }}>
          <Sparkles size={14} className="text-violet-300" />
        </div>
        <h4 className="text-white font-bold text-[0.95rem] leading-snug">
          Tech sector leads with standout performances
        </h4>
        <p className="text-indigo-200/70 text-xs leading-relaxed">
          Technology stocks are driving market gains, with the sector up 3.20% over the past week. Nvidia hit an all-time high with a 4.3% jump, while analysts raised price targets citing strong AI demand. This contrasts sharply with energy stocks falling .04% as oil prices declined.
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ── Right panel: Deep Recaps ── */
function RecapsPanel({ inView }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 32 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.65, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex-1 rounded-3xl overflow-hidden flex flex-col p-10 min-h-[480px]"
      style={{
        background: "linear-gradient(145deg, #0d0820 0%, #1a1245 35%, #251870 60%, #1a1245 100%)",
      }}
    >
      {/* Header */}
      <div className="text-center mb-10">
        <h3 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight"
          style={{ fontFamily: "'DM Serif Display', serif" }}>
          <em style={{ fontStyle: "italic" }}>Unlock</em> deep recaps
        </h3>
        <p className="text-indigo-300 text-sm leading-relaxed max-w-[260px] mx-auto">
          Your financial life, summarized daily — stay in sync with the markets, the news, and your money.
        </p>
      </div>

      {/* Recap modal mockup */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.55, delay: 0.3 }}
        className="rounded-2xl overflow-hidden max-w-[300px] mx-auto w-full shadow-2xl"
        style={{
          background: "rgba(15,12,35,0.95)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <div className="w-2 h-2 rounded-full bg-white/20" />
          </div>
          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/10 cursor-pointer">
            <span className="text-white/60 text-xs">✕</span>
          </div>
        </div>

        {/* Modal body */}
        <div className="px-5 py-5">
          <p className="text-zinc-400 text-xs mb-2">Your net worth</p>
          <h4 className="text-white font-bold text-xl mb-4 leading-snug">
            increased by $1,850
          </h4>

          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">NET WORTH</p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-white font-bold text-lg">$210,150</span>
            <span className="text-emerald-400 text-xs">+0.9%</span>
          </div>

          {/* Mini chart */}
          <div className="mb-4">
            <MiniSparkline color="#34d399" />
          </div>

          <p className="text-zinc-400 text-xs leading-relaxed mb-4">
            Investment performance helped as well, with your portfolio rising 1.7% — a gain of about $560. Tech holdings were a key driver, buoyed by a market rebound. Overall, a steady week of growth across the board.
          </p>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-300 transition-all hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <ThumbsUp size={11} /> More like this
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 transition-all hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <ThumbsDown size={11} /> Less like this
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function InsightsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-16 px-4 sm:px-6 relative overflow-hidden"
      style={{ background: "#080A0F" }}>
      <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row gap-5">
        <InsightsPanel inView={inView} />
        <RecapsPanel inView={inView} />
      </div>
    </section>
  );
}
