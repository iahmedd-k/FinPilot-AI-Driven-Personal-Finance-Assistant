import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Check, X, ArrowRight, Sparkles } from "lucide-react";
import { ROUTES } from "../../constants/routes";

// Exact data from PRD Section 9: Subscription Model
const FREE_FEATURES = [
  { text: "10 transactions / month", included: true },
  { text: "5 AI queries / month", included: true },
  { text: "Goal tracking", included: true },
  { text: "Cash flow forecasting", included: false },
  { text: "Unlimited AI", included: false },
  { text: "Export data anytime", included: false },
];

const PRO_FEATURES = [
  { text: "Unlimited transactions", included: true },
  { text: "Unlimited AI queries", included: true },
  { text: "AI auto-categorization", included: true },
  { text: "Advanced analytics", included: true },
  { text: "Priority support", included: true },
  { text: "Export data anytime", included: true },
];

function FeatureRow({ text, included }) {
  return (
    <li className="flex items-center gap-3 py-2.5 text-sm text-[#374151] border-b border-[#f1f5f9] last:border-0">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: included ? "#dcfce7" : "#f1f5f9",
        }}
      >
        {included
          ? <Check size={11} color="#16a34a" strokeWidth={3} />
          : <X size={11} color="#94a3b8" strokeWidth={2.5} />
        }
      </div>
      <span style={{ color: included ? "#374151" : "#94a3b8" }}>{text}</span>
    </li>
  );
}

export default function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="pricing" ref={ref} className="py-24 px-4 sm:px-6 bg-[#f8fafc]">
      <div className="max-w-[680px] mx-auto text-center mb-16">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="inline-block py-1.5 px-4 rounded-full text-sm font-semibold mb-4"
          style={{ background: "#d1fae5", color: "#059669" }}
        >
          Pricing
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="text-3xl md:text-[2.8rem] leading-tight text-[#0f172a] mb-4"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Simple, transparent pricing
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="text-lg text-[#475569]"
        >
          Start free. Upgrade when you need more.
        </motion.p>
      </div>

      <div className="max-w-[860px] mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">

        {/* ── Free ── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl border-2 border-[#e2e8f0] flex flex-col p-8"
        >
          {/* Plan header */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-[#0f172a] mb-1">Free</h3>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-4xl font-extrabold text-[#0f172a]">$0</span>
              <span className="text-[#94a3b8] text-sm mb-1.5">/month</span>
            </div>
            <p className="text-sm text-[#64748b]">Perfect for getting started.</p>
          </div>

          {/* Features — flex-1 so both cards grow equally */}
          <ul className="flex-1 flex flex-col mb-6">
            {FREE_FEATURES.map((f) => (
              <FeatureRow key={f.text} {...f} />
            ))}
          </ul>

          {/* Button always at bottom */}
          <Link
            to={`${ROUTES.LOGIN}?mode=signup`}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#0f172a] text-white rounded-xl text-sm font-semibold no-underline transition-all hover:bg-[#1e293b] hover:-translate-y-0.5 active:scale-[0.98]"
          >
            Get Started Free <ArrowRight size={14} />
          </Link>
        </motion.div>

        {/* ── Pro ── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-2xl border-2 border-[#10b981] flex flex-col p-8 relative"
          style={{ boxShadow: "0 20px 60px rgba(16,185,129,0.12)" }}
        >
          {/* Badge */}
          <div
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 py-1 px-4 rounded-full text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap"
            style={{ background: "linear-gradient(135deg, #10b981, #6366f1)" }}
          >
            <Sparkles size={11} /> Most Popular
          </div>

          {/* Plan header */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-[#0f172a] mb-1">Pro</h3>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-4xl font-extrabold text-[#0f172a]">$12</span>
              <span className="text-[#94a3b8] text-sm mb-1.5">/month</span>
            </div>
            <p className="text-sm text-[#64748b]">For serious budgeters.</p>
          </div>

          {/* Features */}
          <ul className="flex-1 flex flex-col mb-6">
            {PRO_FEATURES.map((f) => (
              <FeatureRow key={f.text} {...f} />
            ))}
          </ul>

          {/* Button always at bottom */}
          <Link
            to={`${ROUTES.LOGIN}?mode=signup`}
            className="flex items-center justify-center gap-2 w-full py-3.5 text-white rounded-xl text-sm font-semibold no-underline transition-all hover:opacity-90 hover:-translate-y-0.5 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #10b981, #6366f1)" }}
          >
            Start Free Trial <ArrowRight size={14} />
          </Link>
        </motion.div>
      </div>

      {/* Beta note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.5 }}
        className="text-center mt-7 text-[#64748b] text-sm flex items-center justify-center gap-2"
      >
        <Sparkles size={13} className="text-[#10b981]" />
        Beta users get Pro free for 3 months — no credit card required
      </motion.p>
    </section>
  );
}
