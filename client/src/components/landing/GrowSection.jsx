import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ROUTES } from "../../constants/routes";

export default function GrowSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="intro py-0" style={{ padding: "96px 0 0", background: "#080A0F" }}>
      <div className="site-wrapper">
        <div
          className="container"
          style={{
            opacity: 1,
            transform: "translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)",
            transformStyle: "preserve-3d",
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            textAlign: "center",
          }}
        >
          <div className="hero__wrapper" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <motion.h2
              className="large-heading"
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                fontWeight: 400,
                lineHeight: 1.05,
                color: "#fff",
                letterSpacing: "-0.03em",
                margin: "0 0 16px",
              }}
            >
              <span className="text-italics" style={{ fontStyle: "italic" }}>Grow</span>
              <span> your money</span>
            </motion.h2>

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
                margin: "0 0 8px",
                fontFamily: "'Inter', sans-serif",
              }}>
                Invest with purpose.
              </p>
              <p className="p-60" style={{
                fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)",
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.5)",
                margin: 0,
                padding: "0 40px",
                fontFamily: "'Inter', sans-serif",
              }}>
                Watch your holdings change in real time and explore every position alongside your AI partner.
              </p>
            </motion.div>

            {/* Glowing wrapper */}
            <motion.div
              className="glowing-wrapper glowing-wrapper-active"
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.25 }}
              style={{
                position: "relative",
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "24px 20px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "visible",
              }}
            >
              {/* Glow effect */}
              <div className="glowing-wrapper-animations" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16 }}>
                <div className="glowing-wrapper-glow" style={{
                  position: "absolute",
                  top: "-50%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 300,
                  height: 200,
                  background: "radial-gradient(ellipse, rgba(79,134,255,0.25) 0%, transparent 70%)",
                  filter: "blur(30px)",
                }} />
                <div className="glowing-wrapper-mask-wrapper" style={{ position: "absolute", inset: 0 }}>
                  <div className="glowing-wrapper-mask" style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, rgba(79,134,255,0.15) 0%, transparent 50%)",
                    maskImage: "linear-gradient(180deg, #000 0%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(180deg, #000 0%, transparent 100%)",
                  }} />
                </div>
              </div>

              {/* Borders */}
              <div className="glowing-wrapper-borders-masker" style={{ position: "absolute", inset: 0, borderRadius: 16, overflow: "hidden", pointerEvents: "none" }}>
                <div className="glowing-wrapper-borders" style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 16,
                  padding: "1px",
                  background: "linear-gradient(135deg, rgba(79,134,255,0.4) 0%, rgba(79,134,255,0.1) 50%, rgba(79,134,255,0.4) 100%)",
                  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }} />
              </div>

              {/* MORE ABOUT INVESTING button */}
              <a
                href="#features"
                className="w-inline-block"
                style={{
                  position: "relative",
                  zIndex: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
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
                <div>MORE ABOUT INVESTING</div>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
