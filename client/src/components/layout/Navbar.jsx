import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { ROUTES } from "../../constants/routes";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Use Cases", href: "#use-cases" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[1000] transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: scrolled ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 flex items-center h-[68px] justify-between">
        <Link
          to={ROUTES.HOME}
          className="text-[1.4rem] font-extrabold text-[#111827] no-underline tracking-tight"
          style={{ fontFamily: "Inter, sans-serif", letterSpacing: "-0.5px" }}
        >
          Fin<span className="text-gradient-primary">Pilot</span> AI
        </Link>

        <ul className="hidden md:flex items-center gap-8 list-none">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="text-sm font-medium text-[#4b5563] no-underline transition-colors hover:text-[#111827]"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <Link
            to={ROUTES.REGISTER}
            className="inline-block px-6 py-2.5 bg-[#111827] text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all no-underline hover:bg-[#1f2937] hover:-translate-y-px"
          >
            Start Free Trial
          </Link>
        </div>

        <button
          className="md:hidden p-2 border-none cursor-pointer bg-transparent"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} className="text-[#111827]" /> : <Menu size={24} className="text-[#111827]" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden px-6 pb-6 border-t border-[#e5e7eb] flex flex-col gap-4 pt-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-[#4b5563] no-underline"
            >
              {l.label}
            </a>
          ))}
          <Link
            to={ROUTES.REGISTER}
            className="text-center py-3 rounded-lg text-sm font-semibold bg-[#111827] text-white no-underline"
          >
            Start Free Trial
          </Link>
        </div>
      )}
    </nav>
  );
}
