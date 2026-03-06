const features = [
  { icon: "⚡", title: "Auto-Categorization", desc: "AI instantly categorizes every transaction. No manual tagging needed.", time: "Categorizes in < 3 seconds" },
  { icon: "🤖", title: "AI Chat Advisor", desc: "Ask anything about your finances. Get personalized advice instantly.", time: "Responds in < 4 seconds" },
  { icon: "📈", title: "Cash Flow Forecast", desc: "See when you'll hit your goals. Predict cash gaps before they happen.", time: "AI-powered predictions" },
  { icon: "📊", title: "Smart Dashboard", desc: "See your entire financial picture at a glance. No clutter, just insights.", time: "Real-time updates" },
  { icon: "🎯", title: "Goal Tracking", desc: "Set savings goals. AI helps you optimize your path to reach them faster.", time: "Progress tracking" },
  { icon: "💳", title: "Subscription Finder", desc: "AI spots recurring charges you might have forgotten about.", time: "Save $50-200/month" },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 bg-white">
      <div className="max-w-[700px] mx-auto text-center mb-16">
        <span className="inline-block py-1.5 px-4 rounded-full text-sm font-semibold mb-4" style={{ background: "#d1fae5", color: "#059669" }}>
          Features
        </span>
        <h2 className="text-3xl md:text-[2.8rem] leading-tight text-[#111827] mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Everything you need in one place
        </h2>
        <p className="text-lg text-[#4b5563]">
          Track, forecast, and optimize—powered by AI
        </p>
      </div>
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
        {features.map((f) => (
          <div
            key={f.title}
            className="p-8 text-center rounded-2xl border border-[#e5e7eb] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            style={{ background: "#f9fafb" }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5" style={{ background: "linear-gradient(135deg, #10b981, #6366f1)" }}>
              {f.icon}
            </div>
            <h3 className="text-lg font-bold text-[#111827] mb-3">{f.title}</h3>
            <p className="text-[#4b5563] text-sm leading-relaxed mb-3">{f.desc}</p>
            <span className="inline-block mt-3 py-1 px-3 rounded-full text-xs font-semibold" style={{ background: "#d1fae5", color: "#059669" }}>
              {f.time}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
