import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Logo from "../components/common/Logo";
import { ROUTES } from "../constants/routes";

export default function Careers() {
  const values = [
    {
      title: "Innovation First",
      description: "We push boundaries with AI to solve real financial challenges and make money management accessible to everyone.",
    },
    {
      title: "User-Centric",
      description: "Every decision we make starts with understanding our users' needs and creating solutions that truly help them.",
    },
    {
      title: "Transparency",
      description: "We believe in open communication, clear pricing, and building trust through honest relationships.",
    },
    {
      title: "Continuous Learning",
      description: "We're committed to growing our skills and staying ahead of the curve in finance and technology.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white" style={{ fontFamily: "var(--font-sans)" }}>
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900/80 p-10 shadow-2xl shadow-slate-950/20">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <Logo size="md" textColor="#fff" accentColor="#fff" />
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Join our mission to democratize personal finance through AI-powered insights and intelligent automation.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20 hover:border-white/30"
            >
              Back to landing
            </Link>
          </div>

          <div className="mb-16">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Careers at FinPilot AI
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              We're building the future of personal finance. Help us create tools that empower millions to make smarter financial decisions.
            </p>
          </div>

          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-white mb-8">Our Values</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {values.map((value, index) => (
                <div key={index} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">{value.title}</h3>
                  <p className="text-sm leading-6 text-slate-300">{value.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-white mb-8">Open Positions</h2>
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-12 text-center">
              <h3 className="text-xl font-semibold text-white mb-4">Currently No Positions Open</h3>
              <p className="text-slate-300">
                We're not actively hiring at the moment, but we're always interested in connecting with talented individuals. Check back later for future opportunities.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center">
            <h2 className="text-2xl font-semibold text-white mb-4">Don't see the perfect role?</h2>
            <p className="text-slate-300 mb-6">
              We're always looking for talented individuals who share our passion for financial innovation.
            </p>
            <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-slate-100">
              Send us your resume
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
