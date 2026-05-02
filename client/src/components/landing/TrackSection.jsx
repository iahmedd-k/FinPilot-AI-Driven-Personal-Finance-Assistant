import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ROUTES } from "../../constants/routes";

export default function TrackSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const cards = [
    {
      title: "Watch your daily spending",
      desc: "Every purchase logged and organized automatically.",
      image: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bf6605b4df5f9a02f2489b_spend-this-month.png",
      imageSrcSet: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bf6605b4df5f9a02f2489b_spend-this-month-p-500.png 500w, https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bf6605b4df5f9a02f2489b_spend-this-month.png 716w",
      imageSizes: "(max-width: 716px) 100vw, 716px",
      bgImage: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68ade502cb28cdafcd93510c_Frame%201171277096.jpg",
    },
    {
      title: "Set a realistic budget",
      desc: "AI builds a spending plan and helps you stay on course each month.",
      image: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68c02b1aa2d9315689379726_budgetcard.png",
      imageSrcSet: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68c02b1aa2d9315689379726_budgetcard-p-500.png 500w, https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68c02b1aa2d9315689379726_budgetcard.png 716w",
      imageSizes: "(max-width: 716px) 100vw, 716px",
      bgImage: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68ade4d51f31e1e9f347cf81_Frame%201171277095.jpg",
    },
    {
      title: "Drop unnecessary subscriptions",
      desc: "Spot, review, and cancel recurring charges in moments.",
      image: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bf64b1237dc852e9cbcdc0_upcoming-card-3.png",
      imageSrcSet: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bf64b1237dc852e9cbcdc0_upcoming-card-3-p-500.png 500w, https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68bf64b1237dc852e9cbcdc0_upcoming-card-3.png 716w",
      imageSizes: "(max-width: 716px) 100vw, 716px",
      bgImage: "https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68ade51d592c71c8975df4b7_Frame%2048100179.jpg",
    },
  ];

  return (
    <section ref={ref} className="intro" style={{ padding: "96px 0", background: "#080A0F" }}>
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
          {/* Hero wrapper */}
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
              <em className="text-italics" style={{ fontStyle: "italic" }}>Track</em> everything
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
                Sync all your finances.
              </p>
              <p className="p-60" style={{
                fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)",
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.5)",
                margin: 0,
                padding: "0 20px",
                fontFamily: "'Inter', sans-serif",
              }}>
                Link every account to view your full financial picture—simple to navigate, simple to follow.
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

              {/* MORE ABOUT SPENDING button */}
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
                <div>MORE ABOUT SPENDING</div>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
            </motion.div>
          </div>
        </div>

        {/* Track grid */}
        <div
          className="track__grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
            maxWidth: 1200,
            margin: "64px auto 0",
            padding: "0 24px",
          }}
        >
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              className="track__card"
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: idx * 0.1 + 0.3 }}
              style={{
                position: "relative",
                borderRadius: 16,
                overflow: "hidden",
                aspectRatio: "3 / 4",
                cursor: "default",
              }}
            >
              {/* Image wrapper */}
              <div className="track__card-image-wrapper" style={{
                position: "absolute",
                inset: 0,
              }}>
                <div className="image__blur-bg" style={{
                  position: "absolute",
                  inset: 0,
                  overflow: "hidden",
                }}>
                  <img
                    src={card.image}
                    loading="lazy"
                    sizes={card.imageSizes}
                    srcSet={card.imageSrcSet}
                    alt=""
                    className="image"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: "blur(2px)",
                      transform: "scale(1.05)",
                    }}
                  />
                </div>
              </div>

              {/* Text wrapper */}
              <div className="track__card-text-wrapper" style={{
                position: "relative",
                zIndex: 10,
                padding: "0 0 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
              }}>
                <p style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#fff",
                  margin: "0 0 4px",
                  padding: "20px 20px 0",
                  fontFamily: "'Inter', sans-serif",
                  textAlign: "center",
                  width: "100%",
                }}>
                  {card.title}
                </p>
                <p className="p-60" style={{
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: "rgba(255,255,255,0.6)",
                  margin: 0,
                  padding: "0 20px",
                  fontFamily: "'Inter', sans-serif",
                  textAlign: "center",
                }}>
                  {card.desc}
                </p>
              </div>

              {/* Background image fill */}
              <img
                src={card.bgImage}
                loading="lazy"
                alt=""
                className="image-fill"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  zIndex: 5,
                }}
              />

              {/* Gradient overlay */}
              <div className="track__card-gradient-overlay" style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(8,10,15,0.3) 0%, rgba(8,10,15,0.85) 100%)",
                zIndex: 8,
              }} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
