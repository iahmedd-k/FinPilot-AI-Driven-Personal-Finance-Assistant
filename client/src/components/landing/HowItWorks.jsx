import { useState } from "react";

const responses = {
  "Can I afford a MacBook?": "Based on your current savings rate of $280/month and spending patterns, you could afford a $1,200 MacBook in about 4-5 months. I'd recommend cutting your dining expenses by $100/month to reach your goal faster. Want me to create a savings plan?",
  "Why is my savings low?": "I analyzed your spending and found 3 areas:\n\n1. Subscriptions: $87/month you might not use\n2. Dining out: $420/month (28% of income)\n3. Impulse purchases: Average $150/month\n\nCutting just one of these could boost savings by $150-400/month. Which would you like to tackle first?",
  "How to save $5,000?": "Great goal! Based on your income of $4,200/month, here's a realistic plan:\n\n• Save $420/month (10% of income) = 12 months\n• Or save $625/month (15%) = 8 months\n\nQuick wins: Cancel unused subscriptions ($87/mo), reduce dining out by 30% ($126/mo), set up auto-transfer on payday.\n\nWant me to set up automatic tracking?",
  "When will I hit my goal?": "Your current goal: Save $3,000 for vacation\n\nCurrent progress: $840 (28%)\nMonthly savings rate: $280\nProjected completion: 8 months\n\n💡 Tip: If you reduce dining expenses by $100/month, you'll hit your goal 2 months earlier!",
};

const quickQuestions = ["Can I afford a MacBook?", "Why is my savings low?", "How to save $5,000?", "When will I hit my goal?"];

export default function HowItWorks() {
  const [messages, setMessages] = useState([
    { type: "ai", text: "👋 Hi! I'm your AI financial co-pilot. I analyze your spending, income, and goals to give you personalized advice. Try asking me a question!" },
  ]);

  const askAI = (question) => {
    setMessages((m) => [...m, { type: "user", text: question }]);
    setTimeout(() => {
      const reply = responses[question] || "That's a great question! I analyze your income, expenses, and goals to give you personalized advice. Try one of the example questions to see how I work!";
      setMessages((m) => [...m, { type: "ai", text: reply }]);
    }, 1500);
  };

  return (
    <section id="how-it-works" className="py-24 px-6 bg-[#f9fafb]">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div>
          <span className="inline-block py-1.5 px-4 rounded-full text-sm font-semibold mb-4" style={{ background: "#d1fae5", color: "#059669" }}>
            Meet Your AI Co-Pilot
          </span>
          <h2 className="text-3xl md:text-[2.8rem] leading-tight text-[#111827] mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Ask anything. Get instant, personalized answers.
          </h2>
          <p className="text-lg text-[#4b5563] leading-relaxed mb-8">
            FinPilot analyzes your spending, income, and goals to give you advice that actually works for YOUR situation.
          </p>
          <h4 className="text-lg font-bold text-[#111827] mb-4">Try asking:</h4>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => askAI(q)}
                className="py-2 px-4 bg-white border border-[#d1d5db] rounded-lg text-sm text-[#374151] cursor-pointer transition-all hover:border-[#10b981] hover:bg-[#d1fae5]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl p-6 h-[500px] flex flex-col border border-[#e5e7eb]"
          style={{ background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" }}
        >
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#e5e7eb]">
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-bold text-sm" style={{ background: "linear-gradient(135deg, #10b981, #6366f1)" }}>
              FP
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#111827]">FinPilot AI</h4>
              <p className="text-xs text-[#6b7280]">Your personal finance co-pilot</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 mb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[85%] py-3 px-4 rounded-xl text-sm leading-relaxed ${
                  msg.type === "user"
                    ? "bg-[#111827] text-white self-end rounded-br-none"
                    : "bg-[#f3f4f6] text-[#111827] self-start rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
