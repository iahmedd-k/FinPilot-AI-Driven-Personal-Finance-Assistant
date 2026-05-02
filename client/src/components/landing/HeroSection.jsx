import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ROUTES } from "../../constants/routes";

const SEARCH_QUERIES = [
  "How did market shifts affect my investments?",
  "Am I on track to retire at 60?",
  "Which categories am I overspending on?",
  "What will my savings look like in 5 years?",
  "Should I prioritize savings or debt payoff?",
];

export default function HeroSection() {
  const [queryIndex, setQueryIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = SEARCH_QUERIES[queryIndex];
    const speed = deleting ? 25 : 45;

    const timer = setTimeout(() => {
      if (!deleting) {
        const next = current.slice(0, displayed.length + 1);
        setDisplayed(next);
        if (next === current) {
          setTimeout(() => setDeleting(true), 2000);
        }
      } else {
        const next = current.slice(0, displayed.length - 1);
        setDisplayed(next);
        if (next === "") {
          setDeleting(false);
          setQueryIndex((prev) => (prev + 1) % SEARCH_QUERIES.length);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [displayed, deleting, queryIndex]);

  return (
    <section
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "96px 24px 64px",
        position: "relative",
        overflow: "hidden",
        background: "#080A0F",
      }}
    >
      {/* Background video */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          overflow: "hidden",
        }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bb73e8d95f81619ab0f106_Clouds1-poster-00001.jpg"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        >
          <source src="https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bb73e8d95f81619ab0f106_Clouds1-transcode.mp4" type="video/mp4" />
          <source src="https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bb73e8d95f81619ab0f106_Clouds1-transcode.webm" type="video/webm" />
        </video>
        {/* Dark overlay so text stays readable */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(8, 10, 15, 0.55)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Background glow */}
      <div
        style={{
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
        }}
      />

      {/* ─── Hero Content ─── */}
      <div
        className="container"
        style={{
          opacity: 1,
          transform: "translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)",
          transformStyle: "preserve-3d",
          maxWidth: 800,
          margin: "0 auto",
          textAlign: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div className="hero__wrapper" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

          {/* Promo bar */}
          <motion.div
            className="promocontainer"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
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

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "clamp(3rem, 7vw, 5.5rem)",
              fontWeight: 400,
              lineHeight: 1.05,
              color: "#fff",
              letterSpacing: "-0.03em",
              margin: "0 0 16px",
            }}
          >
            <em style={{ fontStyle: "italic" }}>Own</em> your wealth.
          </motion.h1>

          {/* Sub wrapper */}
          <motion.div
            className="hero__sub-wrapper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            style={{ marginBottom: 20 }}
          >
            <p style={{
              fontSize: "clamp(1rem, 2vw, 1.2rem)",
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.7)",
              margin: "0 0 8px",
              fontFamily: "'Inter', sans-serif",
            }}>
              FinPilot is your personal AI Financial Advisor.
            </p>
            <p className="p-60" style={{
              fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.5)",
              margin: 0,
              padding: "0 20px",
              fontFamily: "'Inter', sans-serif",
            }}>
              View your spending, investments, and net worth while optimizing your financial future—all in one place.
            </p>
          </motion.div>

          {/* Get Started CTA */}
          <motion.a
            href={`${ROUTES.LOGIN}?mode=signup`}
            className="w-inline-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
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
              marginBottom: 20,
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
            <div>Get Started</div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </motion.a>

          {/* Typed words bar (search bar) */}
          <motion.a
            href={`${ROUTES.LOGIN}?mode=signup`}
            className="top__search-bar w-inline-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              width: "100%",
              maxWidth: 520,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 999,
              padding: "2px 2px 2px 20px",
              marginBottom: 20,
              gap: 0,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            <div className="typed-words" style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
            }}>
              <span style={{
                color: "#fff",
                fontSize: 14,
                lineHeight: 1.25,
                fontFamily: "'Inter', sans-serif",
                padding: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {displayed}
              </span>
            </div>
            <div className="typing-search-btn" style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4f86ff 0%, #6e6bff 55%, #8d8aff 100%)",
              border: "none",
              flexShrink: 0,
              transition: "all 0.2s ease",
              boxShadow: "0 4px 16px rgba(79, 134, 255, 0.3)",
            }}>
              <img
                loading="lazy"
                src="https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acc0dd9b190be3a4886ccb_up-arrow.svg"
                alt="up-arrow"
                className="typing-search-btn-icon"
                width="16"
                height="16"
                style={{ flexShrink: 0 }}
              />
            </div>
          </motion.a>

          {/* Track everything line */}
          <motion.div
            className="hero__sub-wrapper_pad"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            style={{ marginBottom: 10 }}
          >
            <p className="p-60" style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'Inter', sans-serif",
              margin: 0,
              padding: "0 40px",
            }}>
              Track every detail. Get instant answers.
            </p>
          </motion.div>
        </div>
      </div>

    </section>
  );
}
