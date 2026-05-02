import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Zap, Bot, TrendingUp, LayoutDashboard, Target, CreditCard } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Auto-Categorization",
    desc: "Every transaction sorted instantly — no tagging, no manual work.",
    badge: "Categorizes in < 3s",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
  },
  {
    icon: Bot,
    title: "AI Chat Advisor",
    desc: "Ask anything about your finances. Get personalized, data-backed answers immediately.",
    badge: "Responds in < 4s",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.08)",
  },
  {
    icon: TrendingUp,
    title: "Cash Flow Forecast",
    desc: "See when you'll hit goals and predict cash shortfalls weeks before they happen.",
    badge: "AI-powered predictions",
    color: "#0ea5e9",
    bg: "rgba(14,165,233,0.08)",
  },
  {
    icon: LayoutDashboard,
    title: "Smart Dashboard",
    desc: "Your entire financial picture in one clean view — no clutter, just clear insights.",
    badge: "Real-time updates",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
  },
  {
    icon: Target,
    title: "Goal Tracking",
    desc: "Set savings goals and let AI optimize your spending path to reach them faster.",
    badge: "Progress tracking",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
  },
  {
    icon: CreditCard,
    title: "Subscription Finder",
    desc: "Automatically spots recurring charges you've forgotten about — and what to cut.",
    badge: "Save $50–200/month",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
  },
];

export default function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" ref={ref} className="py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-[680px] mx-auto text-center mb-16">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="inline-block py-1.5 px-4 rounded-full text-sm font-semibold mb-4"
          style={{ background: "#d1fae5", color: "#059669" }}
        >
          Features
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="text-3xl md:text-[2.8rem] leading-tight text-[#0f172a] mb-4"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Everything you need, nothing you don't
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="text-lg text-[#475569]"
        >
          Track, forecast, and optimize your finances — powered by AI that actually understands your situation.
        </motion.p>
      </div>

      <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.09 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="p-7 rounded-2xl border border-[#e2e8f0] cursor-default group"
              style={{ background: "#fafafa" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                style={{ background: f.bg, border: `1px solid ${f.color}22` }}
              >
                <Icon size={22} style={{ color: f.color }} />
              </div>
              <h3 className="text-[1.05rem] font-bold text-[#0f172a] mb-2.5">{f.title}</h3>
              <p className="text-[#475569] text-[0.88rem] leading-relaxed mb-4">{f.desc}</p>
              <span
                className="inline-block py-1 px-3 rounded-full text-[0.72rem] font-semibold"
                style={{ background: f.bg, color: f.color }}
              >
                {f.badge}
              </span>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
