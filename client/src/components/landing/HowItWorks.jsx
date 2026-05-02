import { useState, useRef, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Bot, SendHorizonal, Sparkles } from "lucide-react";

// Pre-written conversation shown on load — looks real, no API needed
const PRESET_MESSAGES = [
  {
    type: "ai",
    text: "Hi! I'm FinPilot AI — your personal finance co-pilot. Ask me anything about your money.",
  },
  {
    type: "user",
    text: "Am I spending too much on dining out?",
  },
  {
    type: "ai",
    text: "Yes — $420/month on dining is 28% of your income, nearly double the ideal range.\n\nCut it to $270 and you save $1,800 extra this year.",
  },
  {
    type: "user",
    text: "How can I save $10,000 this year?",
  },
  {
    type: "ai",
    text: "Based on your income of $4,200/month, here's a clear path:\n\n• Cancel unused subscriptions → +$87/month\n• Reduce dining to $270/month → +$150/month\n• Auto-transfer $600 on payday → $7,200/year\n\nWith small adjustments you hit $10,000 in 11 months. Want me to set up a savings plan?",
  },
];

// Typewriter effect for a single message
function TypewriterText({ text, speed = 18, onDone }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    setDone(false);
    const iv = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) {
        clearInterval(iv);
        setDone(true);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text]);

  return (
    <span>
      {displayed}
      {!done && (
        <span
          className="inline-block w-[2px] h-[13px] ml-px align-middle rounded-full bg-current"
          style={{ animation: "fpBlink 0.7s step-end infinite", opacity: 0.6 }}
        />
      )}
    </span>
  );
}

// Animated dots while "thinking"
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: "#10b981" }}
          animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function HowItWorks() {
  const sectionRef = useRef(null);
  const chatBodyRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  // Which messages are visible
  const [visibleCount, setVisibleCount] = useState(0);
  const [showDots, setShowDots] = useState(false);
  const [started, setStarted] = useState(false);

  // Scroll chat to bottom whenever messages change
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [visibleCount, showDots]);

  // Mark as started when section comes into view
  useEffect(() => {
    if (inView && !started) {
      setStarted(true);
    }
  }, [inView, started]);

  // Reveal messages one by one with realistic delays
  useEffect(() => {
    if (!started) return;

    // Delays between messages (ms)
    const schedule = [
      800,   // user msg 1 appears
      400,   // dots
      1600,  // ai reply 1 (dots disappear, text appears)
      900,   // user msg 2
      400,   // dots
      1700,  // ai reply 2
    ];

    let cumulative = 0;
    const timers = [];

    // Show first AI message immediately via timeout
    timers.push(setTimeout(() => setVisibleCount(1), 0));

    // msg index 1 = first user question
    cumulative += schedule[0];
    timers.push(setTimeout(() => setVisibleCount(2), cumulative));

    // show dots before AI reply
    cumulative += schedule[1];
    timers.push(setTimeout(() => setShowDots(true), cumulative));

    // show AI reply 1, hide dots
    cumulative += schedule[2];
    timers.push(setTimeout(() => {
      setShowDots(false);
      setVisibleCount(3);
    }, cumulative));

    // user msg 2
    cumulative += schedule[3];
    timers.push(setTimeout(() => setVisibleCount(4), cumulative));

    // dots again
    cumulative += schedule[4];
    timers.push(setTimeout(() => setShowDots(true), cumulative));

    // AI reply 2
    cumulative += schedule[5];
    timers.push(setTimeout(() => {
      setShowDots(false);
      setVisibleCount(5);
    }, cumulative));

    return () => timers.forEach(clearTimeout);
  }, [started]);

  return (
    <section id="how-it-works" ref={sectionRef} className="py-24 px-4 sm:px-6 bg-[#f8fafc]">
      <style>{`@keyframes fpBlink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start">

        {/* ── Left: copy ── */}
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full text-sm font-semibold mb-5"
            style={{ background: "#d1fae5", color: "#059669" }}
          >
            <Sparkles size={13} /> Meet Your AI Co-Pilot
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="text-3xl md:text-[2.8rem] leading-tight text-[#0f172a] mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Ask anything. Get instant, personalized answers.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.14 }}
            className="text-lg text-[#475569] leading-relaxed mb-8"
          >
            FinPilot analyzes your actual spending, income, and goals — not generic advice, but answers tailored to your real financial life.
          </motion.p>

          {/* Feature list */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.22 }}
            className="flex flex-col gap-3"
          >
            {([
              "Analyzes your real income & spending patterns",
              "Gives specific numbers, not vague tips",
              "Remembers your goals and tracks progress",
              "Available 24/7 — no appointment needed",
            ]).map((item) => (
              <div key={item} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "#d1fae5" }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-sm text-[#374151]">{item}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Right: chat window ── */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.18 }}
          className="rounded-2xl border border-[#e2e8f0] overflow-hidden flex flex-col"
          style={{
            background: "#fff",
            boxShadow: "0 20px 60px rgba(0,0,0,0.09)",
            height: 520,
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f1f5f9] shrink-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #10b981, #6366f1)" }}
            >
              <Bot size={17} color="white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0f172a]">FinPilot AI</p>
              <p className="text-xs text-[#94a3b8]">Your personal finance co-pilot</p>
            </div>
            <div
              className="ml-auto flex items-center gap-1.5 text-[.68rem] font-semibold"
              style={{ color: "#16a34a" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"
                style={{ animation: "pulse 2s infinite" }}
              />
              Online
            </div>
          </div>

          {/* Messages */}
          <div
            ref={chatBodyRef}
            className="flex-1 overflow-y-auto flex flex-col gap-3 px-5 py-4"
          >
            <AnimatePresence initial={false}>
              {PRESET_MESSAGES.slice(0, visibleCount).map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={`max-w-[88%] py-3 px-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.type === "user"
                      ? "self-end rounded-br-sm text-white"
                      : "self-start rounded-bl-sm text-[#0f172a] border border-[#f1f5f9]"
                    }`}
                  style={
                    msg.type === "user"
                      ? { background: "#0f172a" }
                      : { background: "#f8fafc" }
                  }
                >
                  {/* Typewriter only on AI replies that just appeared */}
                  {msg.type === "ai" && i === visibleCount - 1 && i > 0 ? (
                    <TypewriterText text={msg.text} speed={14} />
                  ) : (
                    msg.text
                  )}
                </motion.div>
              ))}

              {showDots && (
                <motion.div
                  key="dots"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="self-start py-3 px-4 bg-[#f8fafc] border border-[#f1f5f9] rounded-2xl rounded-bl-sm"
                >
                  <TypingDots />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input bar — decorative, shows it's interactive */}
          <div className="px-4 py-3 border-t border-[#f1f5f9] shrink-0">
            <div className="flex items-center gap-2">
              <div
                className="flex-1 rounded-xl px-4 py-2.5 text-sm text-[#94a3b8]"
                style={{
                  background: "#f8fafc",
                  border: "1.5px solid #e2e8f0",
                }}
              >
                Ask anything about your finances…
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 opacity-50"
                style={{ background: "linear-gradient(135deg, #10b981, #6366f1)" }}
              >
                <SendHorizonal size={15} color="white" />
              </div>
            </div>
            <p className="text-[0.67rem] text-[#94a3b8] mt-2 text-center">
              Live AI advisor · Personalized to your finances
            </p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}