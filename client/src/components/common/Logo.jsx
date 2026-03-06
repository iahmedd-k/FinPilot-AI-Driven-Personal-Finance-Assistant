import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";

export default function Logo({ size = "md", dark = false }) {
  const sizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <Link
      to={ROUTES.HOME}
      className={`font-bold tracking-tight ${sizes[size]} ${dark ? "text-dark" : "text-white"}`}
      style={{ fontFamily: "Inter, sans-serif", letterSpacing: "-0.4px" }}
    >
      Fin<span style={{ color: "#2563eb" }}>Pilot</span>{" "}
      <span className={dark ? "text-dark/60" : "text-white/60"}>AI</span>
    </Link>
  );
}