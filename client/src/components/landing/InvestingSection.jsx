import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function InvestingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const cards = [
    {
      italic: "Monitor",
      bold: " portfolio results",
      description: "From retirement accounts to digital assets, follow every holding across your portfolio and benchmark against key market indices.",
      img: {
        src: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bf62637b5f6813a3d48c56_portfolio-performance.png",
        srcSet: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bf62637b5f6813a3d48c56_portfolio-performance-p-500.png 500w, https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bf62637b5f6813a3d48c56_portfolio-performance.png 716w",
        sizes: "100vw",
        alt: "",
      },
    },
    {
      italic: "Visualize",
      bold: " your full allocation",
      description: "Understand where your capital sits and whether it aligns with your targets through a customized risk assessment.",
      img: {
        src: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acccfaa258c2a8cbe1b4e8_3_Card_.png",
        srcSet: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acccfaa258c2a8cbe1b4e8_3_Card_-p-500.png 500w, https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acccfaa258c2a8cbe1b4e8_3_Card_-p-800.png 800w, https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acccfaa258c2a8cbe1b4e8_3_Card_.png 1074w",
        sizes: "100vw",
        alt: "3_Card_",
      },
    },
    {
      italic: "Dive",
      bold: " into every holding",
      description: "From single equities to index funds, pull live returns, core metrics, and tailored analysis for each position.",
      img: {
        src: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acccfae513691732224781_5_Card_.png",
        srcSet: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acccfae513691732224781_5_Card_-p-500.png 500w, https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acccfae513691732224781_5_Card_-p-800.png 800w, https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acccfae513691732224781_5_Card_.png 1074w",
        sizes: "100vw",
        alt: "5_Card_",
      },
    },
    {
      italic: "Track",
      bold: " upcoming moves",
      description: "Scan the markets, build a watchlist, and stay informed with live updates and AI-driven signals.",
      img: {
        src: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68b7555efe58911d1050d3e4_1b7239eb1b5f8e3b968aebdff411859a_6_Card_.svg",
        alt: "6_Card_",
      },
    },
  ];

  return (
    <section ref={ref} className="two-col-section" style={{
      padding: "96px 0",
      background: "#080A0F",
      position: "relative",
    }}>
      <div className="site-wrapper" style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "0 24px",
      }}>
        <motion.div
          className="_2-col-grid"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          style={{
            opacity: 1,
            transform: "translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)",
            transformStyle: "preserve-3d",
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 24,
          }}
        >
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              className="track-card-black"
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              style={{
                background: "#111622",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                overflow: "hidden",
                transition: "all 0.3s ease",
                cursor: "default",
                display: "flex",
                flexDirection: "column",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 20px 60px rgba(0,0,0,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div className="track__card-text-wrapper wider" style={{
                padding: "0 0 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
              }}>
                <h3 style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "clamp(1.5rem, 3vw, 2rem)",
                  fontWeight: 400,
                  lineHeight: 1.15,
                  color: "#fff",
                  letterSpacing: "-0.02em",
                  margin: "0 0 4px",
                  padding: "20px 20px 0",
                  textAlign: "center",
                  width: "100%",
                }}>
                  <span className="text-italics" style={{ fontStyle: "italic" }}>{card.italic}</span>{card.bold}
                </h3>
                <p className="p-60" style={{
                  fontSize: "clamp(0.9rem, 1.5vw, 1.05rem)",
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.55)",
                  margin: 0,
                  padding: "0 20px",
                  fontFamily: "'Inter', sans-serif",
                  textAlign: "center",
                }}>
                  {card.description}
                </p>
                <img
                  className="m-t-40"
                  sizes={card.img.sizes || "100vw"}
                  srcSet={card.img.srcSet}
                  alt={card.img.alt || ""}
                  src={card.img.src}
                  loading="lazy"
                  style={{
                    marginTop: 16,
                    width: "85%",
                    maxWidth: 480,
                    height: "auto",
                    display: "block",
                    marginBottom: 16,
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
