import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { ROUTES } from "../../constants/routes";

export default function AuthCard({ title, subtitle, children }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "#080A0F" }}
    >
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: "absolute",
          top: "30%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700, height: 500,
          background: "radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
      </div>

      {/* Logo */}
      <Link
        to={ROUTES.HOME}
        className="flex items-center gap-2.5 no-underline mb-9 group"
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            boxShadow: "0 0 16px rgba(99,102,241,0.4)",
          }}
        >
          <TrendingUp size={15} color="white" strokeWidth={2.5} />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">
          Fin
          <span style={{
            background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Pilot
          </span>
          {" "}
          <span className="text-zinc-500 font-medium text-base">AI</span>
        </span>
      </Link>

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-2xl p-8 overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* Inner top highlight */}
        <div className="absolute top-0 inset-x-0 h-px"
          style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.12), transparent)" }} />

        <div className="mb-7">
          <h1
            className="text-2xl font-bold text-white mb-1.5 tracking-tight"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {title}
          </h1>
          <p className="text-sm text-zinc-400">{subtitle}</p>
        </div>

        {children}
      </div>

      <Link
        to={ROUTES.HOME}
        className="mt-6 text-sm text-zinc-600 no-underline transition-colors hover:text-zinc-300 flex items-center gap-1.5"
      >
        ← Back to home
      </Link>
    </div>
  );
}
