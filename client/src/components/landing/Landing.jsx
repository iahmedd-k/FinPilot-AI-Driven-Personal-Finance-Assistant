import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Twitter, Linkedin, Instagram, TrendingUp } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import HeroSection from "../components/landing/HeroSection";
import StatsBar from "../components/landing/StatsBar";
import PainPoints from "../components/landing/PainPoints";
import FeaturesSection from "../components/landing/FeaturesSection";
import HowItWorks from "../components/landing/HowItWorks";
import PricingSection from "../components/landing/PricingSection";
import Testimonials from "../components/landing/Tesimonials";
import SecuritySection from "../components/landing/SecuritySection";
import { ROUTES } from "../constants/routes";

function FinalCTA() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate(`${ROUTES.LOGIN}?mode=signup&email=${encodeURIComponent(email)}`);
  };

  return (
    <section ref={ref} className="py-28 px-4 sm:px-6 bg-[#0f172a] text-white relative overflow-hidden">
      {/* Glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 800, height: 400,
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />
      <div className="max-w-[720px] mx-auto text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-5xl leading-tight mb-5"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Ready to take control of your finances?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-lg text-[#94a3b8] mb-10"
        >
          Join 2,400+ users already using FinPilot. Start free today — no credit card needed.
        </motion.p>
        <motion.form
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-2 max-w-[500px] mx-auto mb-5 p-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            className="flex-1 py-3 px-4 bg-transparent border-none text-white text-sm outline-none placeholder:text-[#64748b]"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-2.5 py-3 px-6 rounded-xl text-xs font-bold tracking-widest uppercase text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(12px)", whiteSpace: "nowrap" }}
          >
            Start Free
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </motion.form>
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.4 }}
          className="text-xs text-[#475569]"
        >
          No credit card required · 3-minute setup · Cancel anytime
        </motion.p>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="pt-16 pb-8 px-4 sm:px-6 bg-[#0f172a] text-white border-t border-white/5">
      <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
        <div className="sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #10b981, #6366f1)" }}
            >
              <TrendingUp size={16} color="white" />
            </div>
            <span className="text-lg font-extrabold">
              Fin<span style={{ color: "#10b981" }}>Pilot</span> AI
            </span>
          </div>
          <p className="text-sm text-[#64748b] leading-relaxed mb-4">
            Your AI-powered personal finance co-pilot. Track everything, ask anything, save more.
          </p>
          <p className="text-xs text-[#374151] leading-relaxed">
            <strong className="text-[#475569]">Disclaimer:</strong> FinPilot AI is not a licensed financial advisor. AI responses are informational only. Always consult a certified professional for financial decisions.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold mb-4">Product</h4>
          <ul className="flex flex-col gap-3">
            {["Features", "Pricing", "How it Works", "Security"].map((item) => (
              <li key={item}>
                <a
                  href={item === "How it Works" ? "#how-it-works" : `#${item.toLowerCase().replace(/ /g, "-")}`}
                  className="text-sm text-[#64748b] no-underline hover:text-white transition-colors"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold mb-4">Company</h4>
          <ul className="flex flex-col gap-3">
            {["About", "Blog", "Careers", "Contact"].map((item) => (
              <li key={item}>
                <a href="#" className="text-sm text-[#64748b] no-underline hover:text-white transition-colors">{item}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold mb-4">Legal</h4>
          <ul className="flex flex-col gap-3">
            {["Privacy Policy", "Terms of Service", "GDPR", "Cookie Policy"].map((item) => (
              <li key={item}>
                <a href="#" className="text-sm text-[#64748b] no-underline hover:text-white transition-colors">{item}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-5">
        <p className="text-xs text-[#374151]">
          © {new Date().getFullYear()} FinPilot AI. All rights reserved. Built for your financial future.
        </p>
        <div className="flex gap-3">
          {[
            { icon: Twitter, label: "Twitter" },
            { icon: Linkedin, label: "LinkedIn" },
            { icon: Instagram, label: "Instagram" },
          ].map(({ icon: Icon, label }) => (
            <a
              key={label}
              href="#"
              aria-label={label}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#64748b] transition-all hover:bg-white/10 hover:text-white"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <Icon size={15} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-[#0f172a]">
      <Navbar />
      <main>
        <HeroSection />
        <StatsBar />
        <PainPoints />
        <HowItWorks />
        <FeaturesSection />
        <Testimonials />
        <PricingSection />
        <SecuritySection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
