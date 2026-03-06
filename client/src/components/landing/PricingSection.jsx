import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { Check } from "lucide-react";

const freeFeatures = [
  "10 transactions/month",
  "5 AI queries/month",
  "Basic dashboard",
  "Manual categorization",
  "Goal tracking",
];

const proFeatures = [
  "Unlimited transactions",
  "Unlimited AI queries",
  "AI auto-categorization",
  "Cash flow forecasting",
  "Advanced analytics",
  "Priority support",
  "Export data anytime",
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-6 bg-[#f9fafb]">
      <div className="max-w-[700px] mx-auto text-center mb-16">
        <span className="inline-block py-1.5 px-4 rounded-full text-sm font-semibold mb-4" style={{ background: "#d1fae5", color: "#059669" }}>
          Pricing
        </span>
        <h2 className="text-3xl md:text-[2.8rem] leading-tight text-[#111827] mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Simple, transparent pricing
        </h2>
        <p className="text-lg text-[#4b5563]">
          Start free. Upgrade only if you love it.
        </p>
      </div>
      <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div
          className="p-10 rounded-2xl border-2 border-[#e5e7eb] transition-all relative bg-white"
        >
          <h3 className="text-xl font-bold text-[#111827] mb-3">Free</h3>
          <div className="text-4xl font-extrabold text-[#111827] mb-2">
            $0<span className="text-lg text-[#6b7280] font-medium">/month</span>
          </div>
          <p className="text-[#4b5563] text-sm mb-6">Perfect for testing FinPilot</p>
          <ul className="list-none mb-8">
            {freeFeatures.map((f) => (
              <li key={f} className="py-3 border-b border-[#e5e7eb] flex items-center gap-3 text-sm text-[#374151] last:border-0">
                <Check size={18} className="text-[#10b981] font-extrabold shrink-0" strokeWidth={3} />
                {f}
              </li>
            ))}
          </ul>
          <Link
            to={ROUTES.REGISTER}
            className="block w-full py-4 text-center bg-[#111827] text-white border-none rounded-xl text-base font-semibold no-underline transition-all hover:bg-[#1f2937] hover:-translate-y-0.5"
          >
            Start Free
          </Link>
        </div>

        <div
          className="p-10 rounded-2xl border-2 border-[#10b981] transition-all relative bg-white scale-100 md:scale-[1.02] shadow-xl"
          style={{ boxShadow: "0 20px 60px rgba(16,185,129,0.15)" }}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 py-1.5 px-5 rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #10b981, #6366f1)" }}>
            Most Popular
          </div>
          <h3 className="text-xl font-bold text-[#111827] mb-3">Pro</h3>
          <div className="text-4xl font-extrabold text-[#111827] mb-2">
            $12<span className="text-lg text-[#6b7280] font-medium">/month</span>
          </div>
          <p className="text-[#4b5563] text-sm mb-6">For serious budgeters</p>
          <ul className="list-none mb-8">
            {proFeatures.map((f) => (
              <li key={f} className="py-3 border-b border-[#e5e7eb] flex items-center gap-3 text-sm text-[#374151] last:border-0">
                <Check size={18} className="text-[#10b981] font-extrabold shrink-0" strokeWidth={3} />
                {f}
              </li>
            ))}
          </ul>
          <Link
            to={ROUTES.REGISTER}
            className="block w-full py-4 text-center text-white border-none rounded-xl text-base font-semibold no-underline transition-all hover:opacity-95 hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #10b981, #6366f1)" }}
          >
            Start Free Trial
          </Link>
        </div>
      </div>
      <p className="text-center mt-8 text-[#4b5563] text-sm">
        💡 Beta users get Pro free for 3 months
      </p>
    </section>
  );
}
