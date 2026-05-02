import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const testimonials = [
  {
    name: "SARAH W.",
    quote: "FinPilot is a one-stop hub for every part of your financial life.",
  },
  {
    name: "ANDREW P.",
    quote: "I brought my partner into FinPilot within a few taps, and now we share a clear view of our spending and savings targets.",
  },
  {
    name: "SONIA H.",
    quote: "Keeping tabs on daily costs feels effortless. Having my net worth and all accounts in one spot is a genuine relief.",
  },
  {
    name: "ALEX C.",
    quote: "Every account links seamlessly and the data stays current. Sharing access with my partner makes teamwork effortless.",
  },
  {
    name: "JAMES L.",
    quote: "I finally know exactly where my money goes each month. The automatic sorting saves me hours I used to waste on spreadsheets.",
  },
  {
    name: "PRIYA M.",
    quote: "The forecasting feature showed me I could retire five years earlier if I adjusted my savings rate. That insight alone changed everything.",
  },
  {
    name: "MARCUS T.",
    quote: "As a freelancer, juggling irregular income was a nightmare. FinPilot smoothed that out and gave me a clear monthly baseline I can actually trust.",
  },
  {
    name: "RACHEL D.",
    quote: "We tried three other apps before FinPilot. This is the first one that both my husband and I stuck with — it just clicks.",
  },
];

export default function Testimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="testimonials" ref={ref} style={{
      padding: "96px 0",
      background: "#080A0F",
      overflow: "hidden",
    }}>
      <div className="site-wrapper">
        {/* Heading */}
        <motion.div
          className="hero__wrapper"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <h3 className="testimonial-title" style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            fontWeight: 400,
            lineHeight: 1.05,
            color: "#fff",
            letterSpacing: "-0.03em",
            margin: 0,
          }}>
            <span className="text-italics" style={{ fontStyle: "italic" }}>Read</span> what people say
          </h3>
        </motion.div>

        {/* Testimonial cards */}
        <div
          id="testimonial-slider"
          className="testimonial-slider"
          style={{
            display: "flex",
            gap: 20,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            paddingBottom: 8,
          }}
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              className={`quote-card _${i + 1}`}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 + 0.2 }}
              style={{
                flex: "0 0 min(336px, 85vw)",
                scrollSnapAlign: "start",
              }}
            >
              <div className="quote-card-inner" style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 24,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.3s ease",
              }}>
                {/* Stars */}
                <img
                  loading="lazy"
                  src="https://cdn.prod.website-files.com/68acbc076b672f730e0c77b9/68acd3d1459c4533e7d4649a_stars.svg"
                  alt="stars"
                  className="quote-card__stars"
                  style={{
                    width: 120,
                    height: "auto",
                    display: "block",
                    marginBottom: 20,
                  }}
                />

                {/* Quote text */}
                <div className="quote-card__text" style={{
                  marginBottom: 16,
                  flex: 1,
                }}>
                  <div className="quote-card__text_div" style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "rgba(255,255,255,0.75)",
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {t.quote}
                  </div>
                </div>

                {/* Author */}
                <div className="quite-card__author" style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}>
                  {t.name}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
