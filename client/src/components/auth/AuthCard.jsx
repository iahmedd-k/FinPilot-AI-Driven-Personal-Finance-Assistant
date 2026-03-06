import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";

export default function AuthCard({ title, subtitle, children }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{
        background: "linear-gradient(180deg, #fff 0%, #f9fafb 100%)",
      }}
    >
      {/* Logo */}
      <Link
        to={ROUTES.HOME}
        className="text-2xl font-extrabold text-[#111827] no-underline tracking-tight mb-8"
        style={{ fontFamily: "Inter, sans-serif", letterSpacing: "-0.5px" }}
      >
        Fin<span className="text-gradient-primary">Pilot</span> AI
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl p-8 border border-[#e5e7eb]"
        style={{
          background: "#fff",
          boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.04)",
        }}
      >
        <div className="mb-7">
          <h1
            className="text-2xl font-normal text-[#111827] mb-2"
            style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: "-0.3px" }}
          >
            {title}
          </h1>
          <p className="text-sm text-[#4b5563]">{subtitle}</p>
        </div>

        {children}
      </div>

      <Link
        to={ROUTES.HOME}
        className="mt-6 text-sm text-[#6b7280] no-underline transition-colors hover:text-[#111827]"
      >
        ← Back to home
      </Link>
    </div>
  );
}
