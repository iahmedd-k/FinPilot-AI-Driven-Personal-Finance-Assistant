import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Logo from "../components/common/Logo";

export default function Contact() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white" style={{ fontFamily: "var(--font-sans)" }}>
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/20">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Logo size="md" textColor="#fff" accentColor="#fff" />
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Need help with FinPilot AI? Reach out to our team for product feedback, support questions, or partnership inquiries.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20 hover:border-white/30"
            >
              Back to landing
            </Link>
          </div>

          <div className="grid gap-10 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <h1 className="text-3xl font-bold text-white">Contact FinPilot AI</h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Whether you have questions about budgeting tools, equity tracking, AI insights, or account setup, we’re here to help.
              </p>

              <div className="mt-8 space-y-6 text-sm text-slate-300">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Email</div>
                  <p className="mt-2 text-base text-white">support@finpilot.ai</p>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Office</div>
                  <p className="mt-2 text-base text-white">123 Finance Way, Suite 400<br />Austin, TX 78701</p>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Hours</div>
                  <p className="mt-2 text-base text-white">Mon–Fri, 9:00 AM to 6:00 PM CST</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-8">
              <h2 className="text-xl font-semibold text-white">Quick message</h2>
              <form className="mt-6 space-y-5">
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block font-medium text-white">Your Name</span>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-white/20"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block font-medium text-white">Email</span>
                  <input
                    type="email"
                    placeholder="jane@finpilot.ai"
                    className="w-full rounded-3xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-white/20"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block font-medium text-white">Message</span>
                  <textarea
                    rows="5"
                    placeholder="Tell us about your question or project..."
                    className="w-full rounded-3xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-white/20"
                  />
                </label>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-slate-100"
                >
                  Send message
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
