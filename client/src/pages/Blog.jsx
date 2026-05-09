import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Logo from "../components/common/Logo";
import { ROUTES } from "../constants/routes";

export default function Blog() {

  return (
    <div className="min-h-screen bg-slate-950 text-white" style={{ fontFamily: "var(--font-sans)" }}>
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900/80 p-10 shadow-2xl shadow-slate-950/20">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <Logo size="md" textColor="#fff" accentColor="#fff" />
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Insights, tips, and stories about personal finance, investing, and building wealth with AI-powered tools.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20 hover:border-white/30"
            >
              Back to landing
            </Link>
          </div>

          <div className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              FinPilot AI Blog
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Stay informed with the latest insights on personal finance, investment strategies, and how AI is transforming money management.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="col-span-full rounded-3xl border border-white/10 bg-slate-900/80 p-12 text-center">
              <h2 className="text-2xl font-semibold text-white mb-4">No Blog Posts Currently Available</h2>
              <p className="text-slate-300">
                We're working on creating valuable content about personal finance and AI. Check back soon for insights, tips, and updates.
              </p>
            </div>
          </div>

          <div className="mt-16 rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center">
            <h2 className="text-2xl font-semibold text-white mb-4">Stay Updated</h2>
            <p className="text-slate-300 mb-6">
              Subscribe to our newsletter for the latest finance tips and FinPilot AI updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-full border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-400 outline-none focus:border-white/20"
              />
              <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-slate-100">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
