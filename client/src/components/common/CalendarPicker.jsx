import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseDateInputValue(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatDateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CalendarPicker({ C = {}, value, onChange, minDate }) {
  const [open, setOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const date = parseDateInputValue(value) || new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const wrapperRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    const date = parseDateInputValue(value) || new Date();
    date.setDate(1);
    setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    const handle = (event) => {
      if (!open) return;
      const target = event.target;
      const insideTrigger = wrapperRef.current?.contains(target);
      const insidePopup = popupRef.current?.contains(target);
      if (!insideTrigger && !insidePopup) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const updatePopupPosition = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const width = 260;
      const estimatedHeight = 320;
      const roomBelow = window.innerHeight - rect.bottom;
      const roomAbove = rect.top;
      const top = roomBelow >= estimatedHeight || roomBelow >= roomAbove ? rect.bottom + 8 : rect.top - estimatedHeight - 8;
      const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.left));
      setPopupStyle({ position: "fixed", top: Math.max(12, top), left, width });
    };
    updatePopupPosition();
    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
    };
  }, [open]);

  const monthLabel = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const selectedDate = parseDateInputValue(value);
  const minimumDate = parseDateInputValue(minDate);
  if (minimumDate) minimumDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const displayText = selectedDate
    ? selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Select date";
  const cardBg = C.bg || C.cardBg || "var(--bg-card)";
  const borderColor = C.border || "var(--border-default, #e6e9ef)";
  const textColor = C.text || "var(--text-primary, #0f172a)";
  const mutedColor = C.muted || "var(--text-muted, #6b7280)";
  const strongColor = C.strong || textColor;
  const onStrongColor = C.onStrong || "#fff";

  const startDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  const calendarStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1 - startDay);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(calendarStart);
    cellDate.setDate(calendarStart.getDate() + index);
    return { key: formatDateInputValue(cellDate), date: cellDate, day: cellDate.getDate(), isCurrentMonth: cellDate.getMonth() === viewMonth.getMonth() && cellDate.getFullYear() === viewMonth.getFullYear() };
  });

  const handleSelect = (next) => {
    if (!next) return;
    if (minimumDate && next < minimumDate) return;
    onChange(formatDateInputValue(next));
    if (next.getMonth() !== viewMonth.getMonth() || next.getFullYear() !== viewMonth.getFullYear()) setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          minHeight: 40,
          border: `1px solid ${C.border || "#e6e9ef"}`,
          borderRadius: 10,
          padding: "8px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          background: "var(--bg-card)",
          color: C.text || "#0f172a",
          cursor: "pointer",
          boxShadow: open ? "0 8px 20px rgba(0,0,0,0.06)" : "0 1px 0 rgba(0,0,0,0.02)",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.01em" }}>{displayText}</span>
        <ChevronDown size={16} color="var(--text-secondary)" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
      </button>
      {open && popupStyle && createPortal(
        <div ref={popupRef} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} style={{
            ...popupStyle,
            padding: 12,
            borderRadius: 14,
            border: `1px solid ${borderColor}`,
            boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
            background: cardBg,
            zIndex: 10001,
            boxSizing: "border-box",
            overflow: "hidden",
          }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
            <div style={{ display: "grid", gap: 2 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted || "#6b7280", textTransform: "uppercase", letterSpacing: "0.12em" }}>Calendar</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text || "#0f172a" }}>{monthLabel}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <button type="button" onClick={() => setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ height: 32, borderRadius: 999, border: `1px solid ${C.border || "#e6e9ef"}`, background: "var(--bg-card)", padding: "0 8px", cursor: "pointer", color: C.text, fontSize: 12, fontWeight: 600 }}>Today</button>
              <button type="button" onClick={() => setViewMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))} style={{ width: 32, height: 32, border: `1px solid ${C.border || "#e6e9ef"}`, background: "var(--bg-card)", padding: 0, cursor: "pointer", color: C.text, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronLeft size={16} /></button>
              <button type="button" onClick={() => setViewMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))} style={{ width: 32, height: 32, border: `1px solid ${C.border || "#e6e9ef"}`, background: "var(--bg-card)", padding: 0, cursor: "pointer", color: C.text, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={16} /></button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", fontSize: 10.5, color: C.muted || "#6b7280", textAlign: "center", marginBottom: 8 }}>
            {WEEKDAYS.map((day) => (<div key={day} style={{ padding: "6px 0 8px", fontWeight: 700, textTransform: "uppercase" }}>{day[0]}</div>))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
            {cells.map((cell) => {
              const dateForCell = cell.date;
              const isDisabled = minimumDate && dateForCell < minimumDate;
              const isSelected = selectedDate && selectedDate.getFullYear() === dateForCell.getFullYear() && selectedDate.getMonth() === dateForCell.getMonth() && selectedDate.getDate() === dateForCell.getDate();
              const isToday = dateForCell.getTime() === today.getTime();
              const isOutsideMonth = !cell.isCurrentMonth;
              return (
                <button key={cell.key} type="button" onClick={() => handleSelect(dateForCell)} disabled={isDisabled} style={{
                height: 36,
                borderRadius: 10,
                border: isSelected
                  ? `2px solid ${strongColor}`
                  : `1px solid ${isOutsideMonth ? "transparent" : borderColor}`,
                background: isSelected
                  ? strongColor
                  : isToday
                    ? `rgba(59, 130, 246, 0.12)`
                    : "transparent",
                color: isSelected
                  ? onStrongColor
                  : isOutsideMonth
                    ? mutedColor
                    : textColor,
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.35 : isOutsideMonth && !isSelected ? 0.75 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: isSelected ? 700 : 500,
                boxShadow: isSelected ? "0 10px 24px rgba(0,0,0,0.16)" : "none",
                transition: "all 0.15s ease",
              }}>
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
