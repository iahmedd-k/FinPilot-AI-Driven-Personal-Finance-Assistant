import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate(`${ROUTES.REGISTER}?email=${encodeURIComponent(email)}`);
  };

  return (
    <section className="py-24 px-6 bg-[#111827] text-white relative overflow-hidden">
      <div
        className="absolute w-[800px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(16,185,129,0.15) 0%, transparent 70%)",
        }}
      />
      <div className="max-w-[800px] mx-auto text-center relative z-[1]">
        <h2 className="text-3xl md:text-[3rem] leading-tight mb-5" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Ready to take control of your finances?
        </h2>
        <p className="text-xl text-[#9ca3af] mb-10">
          Join 2,000+ users already using FinPilot. Start free today.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-[500px] mx-auto mb-6 p-2 rounded-xl backdrop-blur-md" style={{ background: "rgba(255,255,255,0.1)" }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="flex-1 py-3.5 px-5 bg-transparent border-none text-white text-base outline-none placeholder:text-[#9ca3af]"
          />
          <button
            type="submit"
            className="py-3.5 px-7 bg-white text-[#111827] border-none rounded-lg font-bold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/20"
          >
            Start Free →
          </button>
        </form>
        <p className="text-sm text-[#6b7280]">
          No credit card required • 3-minute setup • Cancel anytime
        </p>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="pt-16 pb-8 px-6 bg-[#111827] text-white">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-14 mb-10">
        <div className="md:col-span-2">
          <h3 className="text-xl font-extrabold mb-3">
            Fin<span className="text-gradient-primary">Pilot</span> AI
          </h3>
          <p className="text-sm text-[#9ca3af] leading-relaxed mb-5">
            Your AI-powered personal finance co-pilot. Track everything, ask anything, save more.
          </p>
          <p className="text-xs text-[#4b5563] leading-relaxed mt-4">
            ⚠️ <strong className="text-[#6b7280]">Disclaimer:</strong> FinPilot AI is not a licensed financial advisor. The AI provides informational guidance only. Always consult a certified professional for financial decisions. We do not guarantee investment returns or provide guaranteed financial advice.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-bold mb-4 text-white">Product</h4>
          <ul className="list-none">
            {["Features", "Pricing", "How it Works", "Security"].map((item) => (
              <li key={item} className="mb-3">
                <a href={item === "How it Works" ? "#how-it-works" : `#${item.toLowerCase().replace(/ /g, "-")}`} className="text-sm text-[#9ca3af] no-underline hover:text-white transition-colors">
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold mb-4 text-white">Company</h4>
          <ul className="list-none">
            {["About", "Blog", "Careers", "Contact"].map((item) => (
              <li key={item} className="mb-3">
                <a href="#" className="text-sm text-[#9ca3af] no-underline hover:text-white transition-colors">{item}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold mb-4 text-white">Legal</h4>
          <ul className="list-none">
            {["Privacy Policy", "Terms of Service", "GDPR", "Cookie Policy"].map((item) => (
              <li key={item} className="mb-3">
                <a href="#" className="text-sm text-[#9ca3af] no-underline hover:text-white transition-colors">{item}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-5 flex-wrap">
        <p className="text-xs text-[#6b7280] leading-relaxed">
          © {new Date().getFullYear()} FinPilot AI. All rights reserved. Built with 💚 for your financial future.
        </p>
        <div className="flex gap-4">
          <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center text-[#9ca3af] transition-all hover:bg-white/10 hover:text-white" style={{ background: "rgba(255,255,255,0.1)" }}>𝕏</a>
          <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center text-[#9ca3af] transition-all hover:bg-white/10 hover:text-white" style={{ background: "rgba(255,255,255,0.1)" }}>in</a>
          <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center text-[#9ca3af] transition-all hover:bg-white/10 hover:text-white" style={{ background: "rgba(255,255,255,0.1)" }}>IG</a>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-[#111827]">
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
