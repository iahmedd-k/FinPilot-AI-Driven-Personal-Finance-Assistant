const stats = [
  { num: "< 3s", label: "AI Categorization" },
  { num: "< 4s", label: "AI Advice Response" },
  { num: "$380", label: "Avg. Monthly Savings" },
  { num: "87%", label: "Hit First Goal" },
];

export default function StatsBar() {
  return (
    <section className="py-12 px-3 sm:px-6 bg-[#111827] text-white">
      <div className="max-w-[1200px] mx-auto grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-2xl xs:text-3xl sm:text-4xl font-extrabold mb-2 text-gradient-primary">{s.num}</div>
            <div className="text-xs xs:text-sm text-[#9ca3af]">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
