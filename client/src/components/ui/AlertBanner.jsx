import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

/**
 * Variants:
 *   "error"   — red, for server / submission errors  (e.g. "User not found")
 *   "success" — green, for confirmations
 *   "info"    — blue, for neutral announcements
 */
const CONFIG = {
  error: {
    bg:     "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.28)",
    icon:   AlertCircle,
    iconColor: "#f87171",
    textColor: "#fca5a5",
    titleColor: "#fecaca",
  },
  success: {
    bg:     "rgba(52,211,153,0.10)",
    border: "rgba(52,211,153,0.28)",
    icon:   CheckCircle2,
    iconColor: "#34d399",
    textColor: "#6ee7b7",
    titleColor: "#a7f3d0",
  },
  info: {
    bg:     "rgba(59,130,246,0.10)",
    border: "rgba(59,130,246,0.28)",
    icon:   Info,
    iconColor: "#60a5fa",
    textColor: "#93c5fd",
    titleColor: "#bfdbfe",
  },
};

/**
 * Usage:
 *   <AlertBanner variant="error" message="User not found. Please check your email." />
 *   <AlertBanner variant="error" title="Login failed" message="User not found." onClose={() => setErr(null)} />
 */
export default function AlertBanner({ variant = "error", title, message, onClose }) {
  if (!message) return null;
  const c = CONFIG[variant] ?? CONFIG.error;
  const Icon = c.icon;

  return (
    <AnimatePresence>
      <motion.div
        role="alert"
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="flex items-start gap-3 rounded-xl px-4 py-3.5 text-sm"
        style={{
          background: c.bg,
          border: `1px solid ${c.border}`,
        }}
      >
        {/* Icon */}
        <Icon size={17} style={{ color: c.iconColor, flexShrink: 0, marginTop: 1 }} />

        {/* Text */}
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-semibold text-[0.82rem] mb-0.5" style={{ color: c.titleColor }}>
              {title}
            </p>
          )}
          <p className="text-[0.8rem] leading-snug" style={{ color: c.textColor }}>
            {message}
          </p>
        </div>

        {/* Optional close button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-0.5 rounded-lg transition-colors hover:bg-white/10 cursor-pointer bg-transparent border-none"
            style={{ color: c.iconColor }}
          >
            <X size={14} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
