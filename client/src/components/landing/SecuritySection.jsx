const items = [
  { icon: "🔒", label: "Bank-level Encryption", desc: "256-bit SSL encryption" },
  { icon: "🚫", label: "No Bank API", desc: "Manual entry only (for now)" },
  { icon: "🔐", label: "Your Data, Your Control", desc: "We never sell your data" },
  { icon: "✅", label: "GDPR Compliant", desc: "Delete data anytime" },
];

export default function SecuritySection() {
  return (
    <section id="security" className="py-20 px-6 bg-white border-t border-b border-[#e5e7eb]">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 text-center">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style={{ background: "#d1fae5" }}>
              {item.icon}
            </div>
            <div className="text-sm font-semibold text-[#111827]">{item.label}</div>
            <div className="text-xs text-[#4b5563]">{item.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
