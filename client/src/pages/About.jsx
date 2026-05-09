import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Logo from "../components/common/Logo";
import { ROUTES } from "../constants/routes";

export default function About() {
  return (
    <div className="min-h-screen bg-slate-950 text-white" style={{ fontFamily: "var(--font-sans)" }}>
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900/80 p-10 shadow-2xl shadow-slate-950/20">
          <div className="mb-10 flex items-center gap-4">
            <Logo size="md" textColor="#fff" accentColor="#fff" />
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-300">
              About FinPilot AI
            </span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Smarter finance, brighter decisions.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            FinPilot AI helps people understand spending, manage budgets, track savings goals, and monitor equity all in one intelligent dashboard. Built for active money managers who want a clearer view of their financial future.
          </p>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {[
              {
                title: "Mission",
                description: "Bring clarity to everyday finances through personalized AI insights, budgeting guidance, and real-time portfolio visibility.",
              },
              {
                title: "What we track",
                description: "Transactions, savings goals, subscriptions, cash flow forecasts, and equity positions so you always know where your money is headed.",
              },
              {
                title: "Why it matters",
                description: "When you understand your cash flow, spending patterns, and long-term goals, you can make better decisions with confidence.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-6 rounded-3xl border border-white/10 bg-slate-900/80 p-8 sm:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold text-white">Built for real financial habits</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                FinPilot AI is designed to support recurring budgets, savings targets, equity management, and transaction categorization with useful summaries and next-step recommendations.
              </p>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Designed like the landing experience</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                The app theme stays consistent across pages: clean typography, subtle glassmorphism, clear contrast, and a calm finance-focused aesthetic.
              </p>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              to={ROUTES.CONTACT}
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-slate-100"
            >
              Contact our team
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20 hover:border-white/30"
            >
              Return to landing
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
