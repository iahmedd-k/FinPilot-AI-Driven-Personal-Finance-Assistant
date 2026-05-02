import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Zap, MessageSquare, PiggyBank, Trophy } from "lucide-react";

const stats = [
  { num: "< 3s", label: "AI Categorization Speed", icon: Zap },
  { num: "< 4s", label: "AI Advice Response", icon: MessageSquare },
  { num: "$380", label: "Avg. Monthly Savings", icon: PiggyBank },
  { num: "87%", label: "Users Hit First Goal", icon: Trophy },
];

export default function StatsBar() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      ref={ref}
      className="py-14 px-4 sm:px-6 text-white"
      style={{
        background: "linear-gradient(180deg, #0f1011 0%, #121722 100%)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="max-w-[1200px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 text-center">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center gap-3"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-1"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}
              >
                <Icon size={20} className="text-[#9dc7ff]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-gradient-primary">{s.num}</div>
              <div className="text-xs sm:text-sm text-[#aab5c3] leading-tight">{s.label}</div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
