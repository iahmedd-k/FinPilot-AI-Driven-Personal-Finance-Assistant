import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "../../hooks/useAuthContext";
import { ROUTES } from "../../constants/routes";

/* ─── Exact Origin Navbar — 1:1 Clone ─── */
export default function Navbar() {
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user, logout } = useAuthContext();

  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProductsOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div className="div-block-7">
        {/* ── Left: Logo ── */}
        <div className="navbar-left">
          <Link
            to={ROUTES.HOME}
            aria-current="page"
            className="brand w-nav-brand w--current"
            aria-label="home"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0A0A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #fff", position: "relative" }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />
              </div>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#e5e7eb", letterSpacing: "-0.02em", fontFamily: "Inter, sans-serif" }}>FinPilot</span>
          </Link>
        </div>

        {/* ── Center: Navigation Menu ── */}
        <div className="div-block-8">
          <nav role="navigation" className="navigation-menu w-nav-menu">
            <button onClick={() => scrollTo("features")} className="nav-link">Features</button>
            <button onClick={() => scrollTo("how-it-works")} className="nav-link">How it Works</button>
            <button onClick={() => scrollTo("pricing")} className="nav-link">Pricing</button>
            <Link to={ROUTES.LOGIN} className="nav-link min-lg-hidden">Log In</Link>
          </nav>
        </div>

        {/* ── Right: Auth Buttons ── */}
        <div className="header-right">
          <Link to={ROUTES.LOGIN} className="nav-link max-lg-hidden">Log In</Link>
          <Link
            to={`${ROUTES.LOGIN}?mode=signup`}
            className="w-inline-block max-lg-hidden"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(12px)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              textDecoration: "none",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              transition: "all 0.2s ease",
              cursor: "pointer",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            <div className="text-block-2">Get Started</div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
          {/* Mobile hamburger */}
          <button className="menu-button-mobile" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            <div className={`menu-bar-mobile menu-bar-mobile-1 ${mobileOpen ? "open" : ""}`}></div>
            <div className={`menu-bar-mobile menu-bar-mobile-2 ${mobileOpen ? "open" : ""}`}></div>
            <div className={`menu-bar-mobile menu-bar-mobile-3 ${mobileOpen ? "open" : ""}`}></div>
          </button>
        </div>
      </div>

      {/* ── Mobile Menu Overlay ── */}
      {mobileOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileOpen(false)}>
          <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => scrollTo("features")} className="mobile-menu-link">Features</button>
            <button onClick={() => scrollTo("how-it-works")} className="mobile-menu-link">How it Works</button>
            <button onClick={() => scrollTo("pricing")} className="mobile-menu-link">Pricing</button>
            <div className="mobile-menu-divider" />
            <Link to={ROUTES.LOGIN} className="mobile-menu-link" onClick={() => setMobileOpen(false)}>Log In</Link>
            <Link to={`${ROUTES.LOGIN}?mode=signup`} className="mobile-menu-link mobile-menu-cta" onClick={() => setMobileOpen(false)}>Get Started</Link>
          </div>
        </div>
      )}

      {/* ── Navbar Styles (1:1 from Origin) ── */}
      <style>{`
        /* Navbar container */
        .div-block-7 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 72px;
          padding: 0 48px;
          background: transparent;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          overflow-x: hidden;
        }

        /* Navbar left - logo */
        .navbar-left {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          min-width: 0;
        }

        .brand {
          display: flex;
          align-items: center;
          text-decoration: none;
          flex-shrink: 0;
        }

        .image-8 {
          width: 20px;
          height: 22px;
        }

        /* Navbar center - menu */
        .div-block-8 {
          display: flex;
          align-items: center;
          gap: 32px;
          flex: 1;
          justify-content: center;
          min-width: 0;
        }

        .navigation-menu {
          display: flex;
          align-items: center;
          gap: 32px;
          flex-wrap: nowrap;
        }

        /* Nav links */
        .nav-link {
          color: rgba(255,255,255,0.7);
          font-size: 15px;
          font-weight: 500;
          text-decoration: none;
          font-family: 'Inter', sans-serif;
          transition: color 0.2s ease;
          padding: 8px 0;
          cursor: pointer;
        }

        .nav-link:hover {
          color: #fff;
        }

        .text-block {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Dropdown */
        .nav-dropdown-menu {
          position: relative;
        }

        .nav-dropdown-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .nav-dropdown-icon {
          transition: transform 0.2s ease;
        }

        .nav-dropdown-menu:hover .nav-dropdown-icon,
        .nav-dropdown-menu:focus-within .nav-dropdown-icon {
          transform: rotate(180deg);
        }

        .nav-dropdown-list-wrapper {
          position: absolute;
          top: calc(100% + 12px);
          left: -16px;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
          transform: translateY(-8px);
          z-index: 100;
        }

        .nav-dropdown-menu:hover .nav-dropdown-list-wrapper,
        .nav-dropdown-menu:focus-within .nav-dropdown-list-wrapper {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .nav-dropdown-list {
          display: flex;
          flex-direction: column;
          background: #111622;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 8px 0;
          min-width: 200px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .nav-dropdown-link {
          display: block;
          padding: 10px 20px;
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          font-family: 'Inter', sans-serif;
          transition: color 0.2s ease, background 0.2s ease;
        }

        .nav-dropdown-link:hover {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }

        /* Header right */
        .header-right {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-shrink: 0;
        }

        .text-link {
          color: rgba(255,255,255,0.7);
        }

        .text-link:hover {
          color: #fff;
        }

        .text-block-2 {
          white-space: nowrap;
        }

        /* Mobile hamburger button */
        .menu-button-mobile {
          display: none;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          padding: 8px;
          background: none;
          border: none;
        }

        .menu-bar-mobile {
          width: 24px;
          height: 2px;
          background: rgba(255,255,255,0.7);
          border-radius: 2px;
          transition: all 0.3s ease;
          transform-origin: center;
        }

        .menu-bar-mobile.open:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .menu-bar-mobile.open:nth-child(2) {
          opacity: 0;
        }
        .menu-bar-mobile.open:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }

        /* Old mobile menu button (inside nav, hidden on mobile) */
        .menu-button {
          display: none;
        }

        /* Mobile menu overlay */
        .mobile-menu-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .mobile-menu-content {
          background: #111622;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 260px;
          max-width: 320px;
          width: 90%;
          animation: slideUp 0.25s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .mobile-menu-link {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.7);
          font-size: 15px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .mobile-menu-link:hover {
          background: rgba(255,255,255,0.06);
          color: #fff;
        }

        .mobile-menu-divider {
          height: 1px;
          background: rgba(255,255,255,0.08);
          margin: 8px 0;
        }

        .mobile-menu-cta {
          background: rgba(255,255,255,0.1) !important;
          border: 1px solid rgba(255,255,255,0.2) !important;
          color: #fff !important;
          font-weight: 700 !important;
          font-size: 13px !important;
          letter-spacing: 0.1em !important;
          text-transform: uppercase !important;
          justify-content: center;
          margin-top: 8px;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .min-lg-hidden {
            display: none !important;
          }
          .max-lg-hidden {
            display: inline-flex !important;
          }
          .navigation-menu {
            gap: 20px;
          }
          .div-block-7 {
            padding: 0 24px;
          }
          .header-right {
            gap: 16px;
          }
        }

        @media (max-width: 768px) {
          .div-block-8 {
            display: none;
          }
          .max-lg-hidden {
            display: none !important;
          }
          .menu-button-mobile {
            display: flex;
          }
          .div-block-7 {
            padding: 0 16px;
          }
          .header-right {
            gap: 12px;
          }
          .navbar-left span {
            font-size: 16px !important;
          }
        }

        @media (max-width: 400px) {
          .div-block-7 {
            padding: 0 12px;
          }
          .header-right {
            gap: 8px;
          }
          .menu-button-mobile {
            padding: 6px;
          }
          .menu-bar-mobile {
            width: 20px;
          }
        }
      `}</style>
    </>
  );
}
