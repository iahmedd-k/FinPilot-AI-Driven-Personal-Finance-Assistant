const cards = [
  { icon: "😰", title: '"Where did it all go?"', desc: "You make decent money but somehow always running low by month-end." },
  { icon: "📊", title: '"Too many spreadsheets"', desc: "You've tried budgeting apps but they take forever to set up and maintain." },
  { icon: "🤷", title: '"What should I do?"', desc: "You want financial advice but can't afford a financial advisor." },
];

export default function PainPoints() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-[700px] mx-auto text-center mb-16">
        <span className="inline-block py-1.5 px-4 rounded-full text-sm font-semibold mb-4" style={{ background: "#d1fae5", color: "#059669" }}>
          The Problem
        </span>
        <h2 className="text-3xl md:text-[2.8rem] leading-tight text-[#111827] mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Sound familiar?
        </h2>
        <p className="text-lg text-[#4b5563]">
          You're not alone. Most people struggle with these financial pain points.
        </p>
      </div>
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
        {cards.map((c) => (
          <div
            key={c.title}
            className="p-8 rounded-2xl border border-[#e5e7eb] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[#10b981]"
            style={{ background: "#f9fafb", boxShadow: "0 0 0 transparent" }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5" style={{ background: "linear-gradient(135deg, #10b981, #6366f1)" }}>
              {c.icon}
            </div>
            <h3 className="text-xl font-bold text-[#111827] mb-3">{c.title}</h3>
            <p className="text-[#4b5563] text-[0.95rem] leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
