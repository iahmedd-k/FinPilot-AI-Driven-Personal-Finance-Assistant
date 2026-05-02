import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ShieldCheck, Ban, Lock, BadgeCheck } from "lucide-react";

const items = [
  {
    icon: ShieldCheck,
    label: "Bank-level Encryption",
    desc: "256-bit SSL encryption on all data",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
  },
  {
    icon: Ban,
    label: "No Bank API",
    desc: "Manual entry only — you're in full control",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.08)",
  },
  {
    icon: Lock,
    label: "Your Data, Your Control",
    desc: "We never sell or share your data — ever",
    color: "#0ea5e9",
    bg: "rgba(14,165,233,0.08)",
  },
  {
    icon: BadgeCheck,
    label: "GDPR Compliant",
    desc: "Delete your account and data anytime",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
  },
];

export default function SecuritySection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      id="security"
      ref={ref}
      className="py-16 px-4 sm:px-6 bg-white border-t border-b border-[#f1f5f9]"
    >
      <div className="max-w-[1100px] mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="text-center text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-10"
        >
          Built with security-first principles
        </motion.p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 md:gap-10 text-center">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex flex-col items-center gap-3"
              >
                <div
                  className="w-13 h-13 w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ background: item.bg, border: `1px solid ${item.color}22` }}
                >
                  <Icon size={22} style={{ color: item.color }} />
                </div>
                <div className="text-sm font-semibold text-[#0f172a] leading-snug">{item.label}</div>
                <div className="text-xs text-[#64748b] leading-snug">{item.desc}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
