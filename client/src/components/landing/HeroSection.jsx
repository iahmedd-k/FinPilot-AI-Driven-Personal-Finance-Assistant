import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import DashboardPreview from "./DashboardPreveiw";

export default function HeroSection() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate(`${ROUTES.REGISTER}?email=${encodeURIComponent(email)}`);
  };

  return (
    <section
      className="min-h-screen flex flex-col pt-[120px] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #fff 0%, #f9fafb 100%)",
      }}
    >
      {/* Glow */}
      <div
        className="absolute w-[600px] h-[600px] pointer-events-none -top-[200px] -right-[200px]"
        style={{
          background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-[700px] mx-auto text-center relative z-[2] px-6 pb-[52px]">
        <div
          className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full text-sm font-semibold mb-6"
          style={{ background: "#d1fae5", color: "#059669" }}
        >
          <span
            className="w-2 h-2 rounded-full bg-[#10b981]"
            style={{ animation: "pulse 2s infinite" }}
          />
          AI-Powered Personal Finance
        </div>

        <h1
          className="text-4xl md:text-5xl lg:text-[3.5rem] font-normal leading-tight text-[#111827] mb-5 tracking-tight"
          style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: "-1px" }}
        >
          Unleash the power of <span className="text-gradient-primary">AI Finance</span>
        </h1>

        <p className="text-lg text-[#4b5563] mb-8 leading-[1.7]">
          Track income, expenses, and goals — with an AI co-pilot that gives you personalized advice in seconds. Built for professionals, freelancers, and entrepreneurs.
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex gap-0 max-w-[460px] mx-auto mb-6 bg-white border border-[#e5e7eb] rounded-[10px] pl-[18px] pr-1.5 py-1.5 shadow-sm"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="flex-1 min-w-0 text-sm bg-transparent border-none text-[#111827] outline-none font-sans"
          />
          <button
            type="submit"
            className="py-2.5 px-5 text-sm font-bold text-white bg-[#111827] border-none rounded-[7px] cursor-pointer whitespace-nowrap shrink-0 font-sans transition-all hover:bg-[#1f2937]"
          >
            Get Started →
          </button>
        </form>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="text-[#f59e0b] text-[.82rem]">★★★★★</span>
          <span className="text-xs text-[#6b7280]"><strong className="text-[#111827]">4.8 out of 5</strong></span>
          <span className="w-[3px] h-[3px] rounded-full bg-[#9ca3af] opacity-50" />
          <span className="text-xs text-[#6b7280]">2,000+ users</span>
          <span className="w-[3px] h-[3px] rounded-full bg-[#9ca3af] opacity-50" />
          <span className="text-xs text-[#6b7280]">No credit card required</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end relative z-[2] max-w-[1080px] mx-auto w-full">
        <DashboardPreview />
      </div>
    </section>
  );
}
