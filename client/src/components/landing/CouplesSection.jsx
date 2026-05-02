import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function CouplesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="sphere-section" style={{
      position: "relative",
      minHeight: 700,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "80px 0",
      background: "#080A0F",
      overflow: "hidden",
    }}>
      {/* Globe background */}
      <div className="div-block-9" style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 1000,
        height: 1000,
        pointerEvents: "none",
        zIndex: 1,
      }}>
        <motion.img
          className="globe"
          src="https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acd2db507fa7c358f3bf43_Group%2048100208.avif"
          loading="lazy"
          alt="Group 48100208"
          sizes="100vw"
          srcSet="https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acd2db507fa7c358f3bf43_Group%2048100208-p-500.avif 500w, https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acd2db507fa7c358f3bf43_Group%2048100208-p-800.png 800w, https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acd2db507fa7c358f3bf43_Group%2048100208-p-1080.png 1080w, https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acd2db507fa7c358f3bf43_Group%2048100208-p-1600.avif 1600w, https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acd2db507fa7c358f3bf43_Group%2048100208.avif 2086w"
          initial={{ opacity: 0, transform: "scale(1) rotate(171deg)" }}
          animate={inView ? { opacity: 0.15, transform: "scale(1.15) rotate(171deg)" } : {}}
          transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
          style={{
            willChange: "transform, opacity",
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Centered content */}
      <div className="site-wrapper" style={{ position: "relative", zIndex: 10 }}>
        <motion.div
          className="sphere-center"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          <h3 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            fontWeight: 400,
            lineHeight: 1.05,
            color: "#fff",
            letterSpacing: "-0.03em",
            margin: "0 0 12px",
          }}>
            <span className="text-italics" style={{ fontStyle: "italic" }}>Manage</span> money together
          </h3>
          <p className="p-60" style={{
            fontSize: "clamp(1rem, 1.8vw, 1.15rem)",
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.55)",
            margin: 0,
            padding: "0 20px",
            fontFamily: "'Inter', sans-serif",
          }}>
            Build a shared smart hub for your finances.
            <br />Add your partner at no extra cost.
          </p>
          <img
            src="https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acd078571a5d311d25fee7_manage.svg"
            loading="lazy"
            alt="manage"
            className="m-t-40"
            style={{
              marginTop: 40,
              width: 72,
              height: "auto",
              display: "block",
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}
