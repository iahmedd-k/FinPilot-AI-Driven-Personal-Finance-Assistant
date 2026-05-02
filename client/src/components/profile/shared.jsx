import { useState } from "react";
import { ChevronRight } from "lucide-react";

export const BG = "var(--bg-primary)";
export const WHITE = "var(--bg-secondary)";
export const BORDER = "var(--border-subtle)";
export const TEXT = "var(--text-primary)";
export const SUB = "var(--text-secondary)";
export const MUTED = "var(--text-secondary)";
export const GREEN = "var(--accent)";
export const RED = "var(--error, #ef4444)";
export const SURFACE_MUTED = "var(--surface-muted)";
export const SURFACE_STRONG = "var(--surface-strong)";
export const TEXT_ON_STRONG = "var(--text-on-strong)";

export const inp = {
  width: "100%",
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: "14px 16px",
  fontSize: 14,
  color: TEXT,
  background: WHITE,
  outline: "none",
  fontFamily: "Inter, sans-serif",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

export const inputStyle = inp;

export const labelSx = {
  fontSize: 10.5,
  fontWeight: 600,
  color: MUTED,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 7,
  display: "block",
};

export const fi = (e) => {
  e.target.style.borderColor = "#999";
};

export const fo = (e) => {
  e.target.style.borderColor = BORDER;
};

export function SectionDivider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 14px" }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
    </div>
  );
}

export function FloatingInput({ label, value, onChange, type = "text", readOnly = false, style = {}, inputStyle: customInputStyle = {} }) {
  const [focused, setFocused] = useState(false);
  const hasVal = value !== undefined && value !== null && String(value).length > 0;
  const lifted = focused || hasVal;

  return (
    <div style={{ position: "relative", width: "100%", ...style }}>
      <label
        style={{
          position: "absolute",
          left: 16,
          top: lifted ? 10 : "50%",
          transform: lifted ? "none" : "translateY(-50%)",
          fontSize: lifted ? 11 : 14,
          color: focused ? "#555" : MUTED,
          transition: "all 0.15s ease",
          pointerEvents: "none",
          zIndex: 1,
          fontFamily: "inherit",
          fontWeight: lifted ? 500 : 400,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          border: `1px solid ${focused ? "#aaa" : BORDER}`,
          borderRadius: 12,
          padding: lifted ? "24px 16px 8px" : "16px 16px",
          fontSize: 14,
          color: TEXT,
          background: readOnly ? BG : WHITE,
          outline: "none",
          fontFamily: "inherit",
          boxSizing: "border-box",
          transition: "border-color 0.15s, padding 0.15s",
          cursor: readOnly ? "default" : "text",
          ...customInputStyle,
        }}
      />
    </div>
  );
}

export function FloatingSelect({ label, value, onChange, options }) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <label style={{ position: "absolute", left: 16, top: 10, fontSize: 11, color: MUTED, pointerEvents: "none", zIndex: 1, fontFamily: "inherit", fontWeight: 500 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          border: `1px solid ${focused ? "#aaa" : BORDER}`,
          borderRadius: 12,
          padding: "24px 40px 8px 16px",
          fontSize: 14,
          color: TEXT,
          background: WHITE,
          outline: "none",
          fontFamily: "inherit",
          boxSizing: "border-box",
          appearance: "none",
          cursor: "pointer",
          transition: "border-color 0.15s",
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronRight size={15} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: MUTED, pointerEvents: "none" }} />
    </div>
  );
}

export function Card({ children, style = {} }) {
  return <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", ...style }}>{children}</div>;
}

export function CardHeader({ label, right }) {
  return (
    <div style={{ padding: "13px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</span>
      {right}
    </div>
  );
}

export function InfoRow({ label, value, last }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 0", borderBottom: last ? "none" : `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 14, color: SUB }}>{label}</span>
      <span style={{ fontSize: 14, color: TEXT }}>{value ?? "—"}</span>
    </div>
  );
}

export function StatusMsg({ msg }) {
  if (!msg) return null;

  const ok = msg.type === "success";

  return (
    <div
      style={{
        padding: "11px 16px",
        borderRadius: 10,
        background: ok ? "var(--accent-transparent)" : "var(--error-transparent, rgba(239,68,68,0.1))",
        border: `1px solid ${ok ? "var(--accent)" : "rgba(239,68,68,0.4)"}`,
        marginBottom: 12,
      }}
    >
      <span style={{ fontSize: 13, color: ok ? "var(--accent)" : "var(--error, #ef4444)" }}>{msg.text}</span>
    </div>
  );
}

export function Notice({ msg }) {
  return <StatusMsg msg={msg} />;
}
