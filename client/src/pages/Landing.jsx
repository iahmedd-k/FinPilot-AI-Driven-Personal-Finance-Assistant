import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Twitter, Linkedin, Instagram } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import HeroSection from "../components/landing/HeroSection";
import SimplifySection from "../components/landing/SimplifySection";
import TrackSection from "../components/landing/TrackSection";
import GrowSection from "../components/landing/GrowSection";
import InvestingSection from "../components/landing/InvestingSection";
import CouplesSection from "../components/landing/CouplesSection";
import Testimonials from "../components/landing/Testimonials";
import ForecastSection from "../components/landing/ForecastSection";
import InsightsSection from "../components/landing/InsightsSection";
import FeatureCardsSection from "../components/landing/FeatureCardsSection";
import { ROUTES } from "../constants/routes";

/* ── Final CTA ── */
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
    <section id="pricing" ref={ref} className="site-wrapper__hero site-wrapper__hero__footer"
      style={{
        position: "relative",
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "96px 24px 64px",
        overflow: "hidden",
        background: "#080A0F",
      }}>
      {/* Background video */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, overflow: "hidden",
      }}>
        <video autoPlay loop muted playsInline
          poster="https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bb73e8d95f81619ab0f106_Clouds1-poster-00001.jpg"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}>
          <source src="https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bb73e8d95f81619ab0f106_Clouds1-transcode.mp4" type="video/mp4" />
          <source src="https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bb73e8d95f81619ab0f106_Clouds1-transcode.webm" type="video/webm" />
        </video>
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(8, 10, 15, 0.55)",
          pointerEvents: "none",
        }} />
      </div>

      {/* Background glow */}
      <div style={{
        position: "absolute",
        top: "-10%",
        left: "50%",
        transform: "translateX(-50%)",
        width: 800,
        height: 600,
        background: "radial-gradient(ellipse, rgba(79,134,255,0.08) 0%, transparent 70%)",
        filter: "blur(60px)",
        pointerEvents: "none",
        zIndex: 2,
      }} />

      <div
        className="container"
        style={{
          opacity: 1,
          transform: "translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)",
          transformStyle: "preserve-3d",
          maxWidth: 1200,
          margin: "0 auto",
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 40,
          width: "100%",
        }}
      >
        {/* Left: content */}
        <div className="div-block-28" style={{ flex: "0 1 auto", maxWidth: 560 }}>
          {/* Promo bar */}
          <motion.div
            className="div-block-28"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            style={{ marginBottom: 24 }}
          >
            <div className="promobar" style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 16px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}>
              <p className="smalltext _100dark" style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.02em",
              }}>
                $1 for 1 YEAR — limited time
              </p>
            </div>
          </motion.div>

          <div className="hero__wrapper" style={{ display: "flex", flexDirection: "column" }}>
            {/* Main heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(3rem, 6vw, 5rem)",
                fontWeight: 400,
                lineHeight: 1.05,
                color: "#fff",
                letterSpacing: "-0.03em",
                margin: "0 0 16px",
              }}
            >
              <span className="text-italics" style={{ fontStyle: "italic" }}>Ready</span> to take control of your financial future?
            </motion.h1>

            {/* Sub wrapper */}
            <motion.div
              className="hero__sub-wrapper"
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 }}
              style={{ marginBottom: 20 }}
            >
              <p style={{
                fontSize: "clamp(1rem, 2vw, 1.2rem)",
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.7)",
                margin: 0,
                fontFamily: "'Inter', sans-serif",
              }}>
                Join 2,400+ users already using FinPilot. Start free today — no credit card needed.
              </p>
            </motion.div>

            {/* CTA form */}
            <motion.form
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.25 }}
              onSubmit={handleSubmit}
              style={{ marginBottom: 20 }}
            >
              <a
                href={`${ROUTES.LOGIN}?mode=signup`}
                className="w-inline-block"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 24px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  backdropFilter: "blur(12px)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                  textDecoration: "none",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div>Get started</div>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
            </motion.form>

            {/* Trust badge */}
            <motion.div
              className="hero__sub-wrapper_pad"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)", margin: 0, fontSize: 12 }}>
                No credit card required · 3-minute setup · Cancel anytime
              </p>
            </motion.div>
          </div>
        </div>

        {/* Right: phone mockup */}
        <motion.div
          className="footer-hero-mobile-block"
          initial={{ opacity: 0, y: 60 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: "relative",
            flex: "0 0 auto",
            maxWidth: 380,
          }}
        >
          <img
            src="/footer-phone.png"
            loading="lazy"
            width="432"
            alt="FinPilot mobile app"
            className="footer-hero-mobile"
            style={{
              width: "100%",
              maxWidth: 380,
              height: "auto",
              display: "block",
              position: "relative",
              zIndex: 10,
            }}
          />
          {/* Gradient overlay at bottom */}
          <div className="footer-hero-gredient" style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 120,
            background: "linear-gradient(to top, #080A0F, transparent)",
            pointerEvents: "none",
            zIndex: 11,
          }} />
        </motion.div>
      </div>
    </section>
  );
}

/* ── Footer ── */
function LandingFooter() {
  return (
    <footer className="pt-16 pb-8 px-4 sm:px-6 text-white"
      style={{
        background: "#080A0F",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
      <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
        <div className="sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0A0A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #fff", position: "relative" }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />
              </div>
            </div>
            <span className="text-lg font-bold text-white" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "-0.02em" }}>
              Fin<span style={{ color: "rgba(255,255,255,0.6)" }}>Pilot</span> AI
            </span>
          </div>
          <p className="text-sm text-zinc-500 leading-relaxed mb-4">
            Your AI-powered personal finance co-pilot. Track everything, ask anything, save more.
          </p>
          <p className="text-xs text-zinc-700 leading-relaxed">
            <strong className="text-zinc-600">Disclaimer:</strong> FinPilot AI is not a licensed financial advisor. AI responses are informational only.
          </p>
        </div>

        {[
          { title: "Product", links: ["Features", "Pricing", "How it Works"] },
          { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
          { title: "Legal",   links: ["Privacy Policy", "Terms of Service", "GDPR", "Cookie Policy"] },
        ].map(({ title, links }) => (
          <div key={title}>
            <h4 className="text-sm font-semibold text-zinc-300 mb-4">{title}</h4>
            <ul className="flex flex-col gap-3">
              {links.map((item) => (
                <li key={item}>
                  <a href={item === "How it Works" ? "#how-it-works" : `#${item.toLowerCase().replace(/ /g, "-")}`}
                    className="text-sm text-zinc-500 no-underline hover:text-zinc-200 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-[1100px] mx-auto pt-8 flex flex-col sm:flex-row justify-between items-center gap-5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="text-xs text-zinc-700">
          © {new Date().getFullYear()} FinPilot AI. All rights reserved.
        </p>
        <div className="flex gap-3">
          {[
            { icon: Twitter,   label: "Twitter" },
            { icon: Linkedin,  label: "LinkedIn" },
            { icon: Instagram, label: "Instagram" },
          ].map(({ icon: Icon, label }) => (
            <a key={label} href="#" aria-label={label}
              className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-600 transition-all hover:bg-white/10 hover:text-zinc-300"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Icon size={15} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ── Page ── */
export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: "#080A0F", color: "#fafafa" }}>
      <Navbar />
      <main>
        <HeroSection />
        <SimplifySection />
        <TrackSection />
        <GrowSection />
        <InvestingSection />
        <CouplesSection />
        <ForecastSection />
        <InsightsSection />
        <FeatureCardsSection />
        <Testimonials />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
