import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function SimplifySection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="intro pb-0"
      style={{
        padding: "96px 0 0",
        background: "#080A0F",
        position: "relative",
        overflow: "hidden",
      }}
    >
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
            <motion.h3
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
                margin: "0 0 40px",
              }}
            >
              <em className="text-italics" style={{ fontStyle: "italic" }}>Simplify</em> your money
            </motion.h3>
          </div>
        </div>
      </div>

      {/* Phone container */}
      <motion.div
        className="phone_container"
        initial={{ opacity: 0, y: 60 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        <img
          src="/hero-phone.png"
          alt="FinPilot dashboard preview"
          loading="lazy"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
        />
      </motion.div>
    </section>
  );
}
