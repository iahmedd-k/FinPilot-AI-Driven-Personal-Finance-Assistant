import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";

const SIZE_MAP = {
  sm: {
    wrapper: "gap-2",
    iconBox: "h-7 w-7 rounded-lg",
    dotOuter: "h-3.5 w-3.5",
    dotInner: "h-[5px] w-[5px]",
    name: "text-[1rem]",
    suffix: "text-[0.82rem]",
  },
  md: {
    wrapper: "gap-2.5",
    iconBox: "h-8 w-8 rounded-xl",
    dotOuter: "h-4 w-4",
    dotInner: "h-[5px] w-[5px]",
    name: "text-[1.1rem]",
    suffix: "text-[0.9rem]",
  },
  lg: {
    wrapper: "gap-3",
    iconBox: "h-9 w-9 rounded-xl",
    dotOuter: "h-4.5 w-4.5",
    dotInner: "h-[5px] w-[5px]",
    name: "text-[1.3rem]",
    suffix: "text-[1rem]",
  },
};

export default function Logo({ size = "md", dark = false, className = "" }) {
  const currentSize = SIZE_MAP[size] || SIZE_MAP.md;
  const primaryText = dark ? "#0b0914" : "#e5e7eb";
  const accentText = dark ? "#475569" : "#a1a1aa";

  return (
    <Link
      to={ROUTES.HOME}
      className={`inline-flex items-center no-underline shrink-0 group ${currentSize.wrapper} ${className}`}
    >
      <div
        className={`relative flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${currentSize.iconBox}`}
        style={{
          background: "#0A0A1A",
        }}
      >
        <div
          className={`relative flex items-center justify-center ${currentSize.dotOuter}`}
          style={{
            borderRadius: "50%",
            border: "2px solid #fff",
          }}
        >
          <div
            className={`absolute ${currentSize.dotInner}`}
            style={{
              borderRadius: "50%",
              background: "#fff",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
            }}
          />
        </div>
      </div>

      <span
        className={`font-bold tracking-tight ${currentSize.name}`}
        style={{ color: primaryText, fontFamily: "Inter, sans-serif", letterSpacing: "-0.04em" }}
      >
        FinPilot{" "}
        <span
          className={`font-medium ${currentSize.suffix}`}
          style={{ color: accentText }}
        >
          AI
        </span>
      </span>
    </Link>
  );
}
