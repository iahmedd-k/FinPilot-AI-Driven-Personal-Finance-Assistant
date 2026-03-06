import { Link } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import Logo from "../components/common/Logo";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{
        backgroundColor: "#0c0f18",
        backgroundImage: "radial-gradient(ellipse at 50% 30%, rgba(45,212,191,0.08) 0%, transparent 60%)",
      }}
    >
      <div className="mb-10"><Logo size="lg" /></div>

      <p className="text-8xl font-bold mb-4" style={{ color: "rgba(45,212,191,0.15)", fontFamily: "Playfair Display, serif" }}>
        404
      </p>
      <h1 className="text-2xl font-bold mb-3" style={{ color: "#f5f0e8", fontFamily: "Playfair Display, serif" }}>
        Page not found
      </h1>
      <p className="text-sm mb-8 max-w-xs" style={{ color: "#8b90a0", lineHeight: 1.7 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>

      <Link
        to={ROUTES.HOME}
        className="px-6 py-3 rounded-lg text-sm font-semibold transition-all"
        style={{ background: "#2dd4bf", color: "#0c0f18" }}
      >
        Back to Home →
      </Link>
    </div>
  );
}