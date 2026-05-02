import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { SearchX, TableProperties, UserX } from "lucide-react";

const cards = [
  {
    icon: SearchX,
    title: '"Where did it all go?"',
    desc: "You earn well but somehow end up broke by month-end — with no clear idea why.",
    accent: "#ef4444",
    bg: "rgba(239,68,68,0.06)",
  },
  {
    icon: TableProperties,
    title: '"Too many spreadsheets"',
    desc: "You've tried budgeting apps but they take forever to set up and you abandon them in a week.",
    accent: "#f59e0b",
    bg: "rgba(245,158,11,0.06)",
  },
  {
    icon: UserX,
    title: '"What should I do?"',
    desc: "You want real financial advice but can't afford a personal financial advisor.",
    accent: "#6366f1",
    bg: "rgba(99,102,241,0.06)",
  },
];

export default function PainPoints() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-[680px] mx-auto text-center mb-16">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="inline-block py-1.5 px-4 rounded-full text-sm font-semibold mb-4"
          style={{ background: "#fee2e2", color: "#dc2626" }}
        >
          The Problem
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="text-3xl md:text-[2.8rem] leading-tight text-[#0f172a] mb-4"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Sound familiar?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="text-lg text-[#475569]"
        >
          Most people struggle with the same financial blind spots. FinPilot fixes all three.
        </motion.p>
      </div>

      <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.12 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-8 rounded-2xl border border-[#e2e8f0] cursor-default"
              style={{ background: "#fafafa" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: c.bg, border: `1px solid ${c.accent}22` }}
              >
                <Icon size={22} style={{ color: c.accent }} />
              </div>
              <h3 className="text-[1.1rem] font-bold text-[#0f172a] mb-3">{c.title}</h3>
              <p className="text-[#475569] text-[0.92rem] leading-relaxed">{c.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
