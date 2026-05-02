import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { BarChart2, Calendar, CreditCard } from "lucide-react";

/* ── Spend calendar card ── */
function SpendCard() {
  const days = Array.from({ length: 31 }, (_, i) => ({
    n: i + 1,
    spend: [null, "$80", "$8", "$1.3k", "$64", "$102", "$32",
      null, null, null, null, null, null, null,
      null, null, null, null, null, null, null,
      null, null, null, null, null, null, null,
      null, null, null][i],
    highlight: [3, 4, 5].includes(i),
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Glass UI panel */}
      <div className="flex-1 rounded-2xl overflow-hidden mx-4 mt-4 mb-6"
        style={{
          background: "rgba(15,15,25,0.85)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(16px)",
        }}>
        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-[9px] font-semibold tracking-widest uppercase text-zinc-400">Spend this month</span>
          <div className="flex gap-2">
            <BarChart2 size={12} className="text-zinc-500" />
            <Calendar size={12} className="text-zinc-500" />
            <span className="text-zinc-500 text-xs">+</span>
          </div>
        </div>

        <div className="px-4 pt-3 pb-1">
          <p className="text-2xl font-bold text-white">$1,586</p>
        </div>

        {/* Calendar grid */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-7 gap-1 mt-2">
            {days.map(({ n, spend, highlight }) => (
              <div key={n}
                className={`rounded-md px-1 py-1.5 text-center cursor-pointer transition-all hover:bg-white/10 ${highlight ? "" : ""}`}
                style={{
                  background: highlight ? "rgba(255,255,255,0.15)" : "transparent",
                  border: highlight ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
                }}>
                <div className="text-[9px] text-zinc-400">{n}</div>
                {spend && (
                  <div className="text-[8px] font-semibold text-white mt-0.5 leading-tight">{spend}</div>
                )}
                {!spend && <div className="text-[8px] text-zinc-700 mt-0.5">—</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Caption */}
      <div className="px-6 pb-8">
        <p className="text-white font-semibold text-sm mb-1">Monitor your spending</p>
        <p className="text-zinc-400 text-xs leading-relaxed">See every transaction, automatically categorized.</p>
      </div>
    </div>
  );
}

/* ── Budget breakdown card ── */
function BudgetCard() {
  const items = [
    { icon: "🍜", label: "Food",            pct: 41.1, color: "#a78bfa" },
    { icon: "🚗", label: "Auto & Transport", pct: 8.3,  color: "#60a5fa" },
    { icon: "💳", label: "Everything Else", pct: 47.9, color: "#34d399" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 rounded-2xl overflow-hidden mx-4 mt-4 mb-6"
        style={{
          background: "rgba(20,13,8,0.85)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(16px)",
        }}>
        <div className="px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-[9px] font-semibold tracking-widest uppercase text-zinc-500">Budget</span>
        </div>

        <div className="px-5 py-4">
          <div className="flex justify-between items-baseline mb-3">
            <p className="text-sm font-medium text-zinc-300">Total Budget</p>
            <p className="text-sm font-bold text-white">$2,234 of $5,000</p>
          </div>

          {/* Master bar */}
          <div className="h-1.5 bg-white/10 rounded-full mb-6 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "44.7%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(to right, #6366f1, #a855f7)" }}
            />
          </div>

          {/* Category rows */}
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.label}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-xs text-zinc-300 flex-1">{item.label}</span>
                  <span className="text-xs text-zinc-500">{item.pct}%</span>
                </div>
                <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${item.pct * 2}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.3, ease: [0.4, 0, 0.2, 1] }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 pb-8">
        <p className="text-white font-semibold text-sm mb-1">Build a budget</p>
        <p className="text-zinc-400 text-xs leading-relaxed">AI sets up your budget and helps you track progress all month long.</p>
      </div>
    </div>
  );
}

/* ── Subscriptions calendar card ── */
function SubscriptionsCard() {
  const dayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Week 1 (row with 28)
  const week1 = [
    { n: 27, prev: true },
    { n: 28, today: true, subs: [{ color: "#1db954", icon: "🎵" }], amount: null },
    { n: 29, subs: [], amount: null },
    { n: 30, subs: [], amount: null },
    { n: 1,  subs: [{ color: "#e50914", icon: "🎬" }, { color: "#1da0f2", icon: "☁" }], amount: "$21.98" },
    { n: 2,  subs: [], amount: null },
    { n: 3,  subs: [{ color: "#ff0000", icon: "▶" }], amount: "$82.99" },
  ];
  const week2 = [
    { n: 4,  subs: [{ color: "#6366f1", icon: "🎮" }], amount: "$144.99" },
    { n: 5,  subs: [], amount: null },
    { n: 6,  subs: [], amount: null },
    { n: 7,  subs: [{ color: "#71717a", icon: "⚙" }], amount: "$9.99" },
    { n: 8,  subs: [], amount: null },
    { n: 9,  subs: [], amount: null },
    { n: 10, subs: [], amount: null },
  ];

  const CalCell = ({ day }) => (
    <div className={`rounded-lg p-1.5 text-center min-h-[52px] flex flex-col items-center justify-start gap-0.5 border transition-colors cursor-pointer hover:bg-white/10 ${day.today ? "bg-indigo-500/20" : "bg-transparent"}`}
      style={{
        border: day.today ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.05)",
      }}>
      <span className={`text-[9px] font-semibold ${day.today ? "text-indigo-300" : day.prev ? "text-zinc-700" : "text-zinc-400"}`}>
        {day.n}
      </span>
      {day.subs?.length > 0 && (
        <div className="flex gap-0.5 flex-wrap justify-center">
          {day.subs.map((s, i) => (
            <span key={i} className="w-4 h-4 rounded-full text-[8px] flex items-center justify-center"
              style={{ background: s.color }}>
              {s.icon}
            </span>
          ))}
        </div>
      )}
      {day.amount && <span className="text-[8px] text-zinc-400">{day.amount}</span>}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 rounded-2xl overflow-hidden mx-4 mt-4 mb-6"
        style={{
          background: "rgba(8,12,25,0.85)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(16px)",
        }}>
        <div className="px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-[9px] font-semibold tracking-widest uppercase text-zinc-400">Upcoming Transactions</span>
        </div>

        <div className="px-4 py-3">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayLabels.map((d) => (
              <div key={d} className="text-center text-[8px] font-semibold tracking-wider text-zinc-600">{d}</div>
            ))}
          </div>

          {/* Week rows */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {week1.map((d) => <CalCell key={d.n + "-w1"} day={d} />)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {week2.map((d) => <CalCell key={d.n + "-w2"} day={d} />)}
          </div>
        </div>
      </div>

      <div className="px-6 pb-8">
        <p className="text-white font-semibold text-sm mb-1">Cancel unwanted subscriptions</p>
        <p className="text-zinc-400 text-xs leading-relaxed">Find, manage, and cancel subscriptions in seconds.</p>
      </div>
    </div>
  );
}

/* ── Background image panels (CSS only, no img files needed) ── */
const CARD_BGNDS = [
  // Warm desert orange-brown
  "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(10,8,5,0.7) 80%), linear-gradient(135deg, #7c5c3e 0%, #a06a35 25%, #c4813a 50%, #8b5e2a 75%, #5c3d1a 100%)",
  // Sandy dune
  "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(10,8,5,0.7) 80%), linear-gradient(160deg, #8B7355 0%, #A0896A 20%, #C4A882 40%, #8B7355 60%, #6B5340 100%)",
  // Dark ocean blue
  "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(5,10,20,0.7) 80%), linear-gradient(135deg, #0a1628 0%, #0d2040 20%, #102850 40%, #0d2040 70%, #080e1e 100%)",
];

export default function FeatureCardsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const cards = [
    { component: SpendCard,         bg: CARD_BGNDS[0] },
    { component: BudgetCard,        bg: CARD_BGNDS[1] },
    { component: SubscriptionsCard, bg: CARD_BGNDS[2] },
  ];

  return (
    <section id="features" ref={ref} className="py-16 px-4 sm:px-6 relative"
      style={{ background: "#080A0F" }}>
      <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map(({ component: Comp, bg }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: i * 0.12, ease: [0.4, 0, 0.2, 1] }}
            whileHover={{ y: -6, transition: { duration: 0.22 } }}
            className="rounded-3xl overflow-hidden cursor-default"
            style={{
              background: bg,
              border: "1px solid rgba(255,255,255,0.08)",
              minHeight: 480,
            }}
          >
            <Comp />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
