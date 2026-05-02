import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronLeft, Plus, Calendar, Trash2 } from "lucide-react";
import api from "../../../services/api";
import { authService } from "../../../services/authService";
import { getUserCurrency } from "../../../utils/currency";
import {
  BORDER,
  MUTED,
  SURFACE_STRONG,
  TEXT,
  TEXT_ON_STRONG,
  WHITE,
  inp,
  fi,
  fo,
  FloatingInput,
  FloatingSelect,
  StatusMsg,
} from "../shared";

const COUNTRIES = ["United States","United Kingdom","Pakistan","India","Canada","Australia","Germany","France","UAE","Singapore","Netherlands","Sweden","Norway","Denmark","Switzerland","New Zealand","South Africa","Kenya","Nigeria","Brazil","Mexico","Argentina","Japan","South Korea","China","Other"];
const EMP_STATUS = ["Employed","Self-employed","Freelance","Business owner","Student","Retired","Unemployed"];
const TAX_STATUS = ["Single","Married filing jointly","Married filing separately","Head of household","Qualifying widow(er)"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["S","M","T","W","T","F","S"];

/* ─────────────────────────────────────────────────────────
   Custom DatePicker
   • No native <input type="date"> → zero duplicate icons
   • Custom calendar UI matching reference image
───────────────────────────────────────────────────────── */
function DatePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(null);
  const [viewMonth, setViewMonth] = useState(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const ref = useRef(null);

  const parsed = value ? new Date(value + "T00:00:00") : null;

  useEffect(() => {
    if (open) {
      const base = parsed || new Date();
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
      setShowYearPicker(false);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectDay = (day) => {
    onChange(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const daysInMonth = viewYear != null ? new Date(viewYear, viewMonth + 1, 0).getDate() : 30;
  const firstDow    = viewYear != null ? new Date(viewYear, viewMonth, 1).getDay() : 0;
  const selectedDay = parsed && viewYear != null
    && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth
    ? parsed.getDate() : null;

  const display = parsed
    ? `${String(parsed.getMonth() + 1).padStart(2, "0")}/${String(parsed.getDate()).padStart(2, "0")}/${parsed.getFullYear()}`
    : "";

  const currentYear = new Date().getFullYear();
  const yearList = Array.from({ length: 111 }, (_, i) => currentYear + 10 - i);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {/* ── Trigger: plain div, NOT a native date input ── */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          ...inp,
          padding: "0 44px 0 16px",
          height: 56,
          cursor: "pointer",
          userSelect: "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          boxSizing: "border-box",
          width: "100%",
          position: "relative",
        }}
      >
        <span style={{ fontSize: 11, color: MUTED, fontWeight: 500, lineHeight: 1, marginBottom: 4 }}>
          {label}
        </span>
        <span style={{ fontSize: 14, color: display ? TEXT : MUTED, lineHeight: 1 }}>
          {display || "MM/DD/YYYY"}
        </span>
        {/* Single calendar icon — no browser icon since no native input */}
        <Calendar
          size={16}
          style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: MUTED, pointerEvents: "none" }}
        />
      </div>

      {/* ── Dropdown calendar ── */}
      {open && viewYear != null && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 9999,
          background: WHITE,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: 16,
          width: 280,
          maxWidth: "min(280px, calc(100vw - 48px))",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          fontFamily: "inherit",
        }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setShowYearPicker((v) => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: TEXT, display: "flex", alignItems: "center", gap: 4, padding: "2px 4px", borderRadius: 6, fontFamily: "inherit" }}
            >
              {MONTHS[viewMonth]} {viewYear}
              <ChevronRight size={13} style={{ transform: showYearPicker ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.15s", color: MUTED }} />
            </button>
            {!showYearPicker && (
              <div style={{ display: "flex", gap: 2 }}>
                <button type="button" onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", color: TEXT }}>
                  <ChevronLeft size={15} />
                </button>
                <button type="button" onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", color: TEXT }}>
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>

          {showYearPicker ? (
            <div>
              {/* Month grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 10 }}>
                {MONTHS.map((m, i) => (
                  <button key={m} type="button"
                    onClick={() => { setViewMonth(i); setShowYearPicker(false); }}
                    style={{
                      padding: "5px 0", borderRadius: 8, border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 500, fontFamily: "inherit",
                      background: i === viewMonth ? TEXT : "transparent",
                      color: i === viewMonth ? WHITE : TEXT,
                    }}
                  >{m.slice(0, 3)}</button>
                ))}
              </div>
              {/* Year scroll */}
              <div style={{ maxHeight: 150, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3 }}>
                {yearList.map((y) => (
                  <button key={y} type="button"
                    onClick={() => { setViewYear(y); setShowYearPicker(false); }}
                    style={{
                      padding: "5px 0", borderRadius: 8, border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 500, fontFamily: "inherit",
                      background: y === viewYear ? TEXT : "transparent",
                      color: y === viewYear ? WHITE : TEXT,
                    }}
                  >{y}</button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Day-of-week headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
                {DOW.map((d, i) => (
                  <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: MUTED, padding: "2px 0" }}>{d}</div>
                ))}
              </div>
              {/* Day cells */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
                {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <button key={day} type="button" onClick={() => selectDay(day)}
                    style={{
                      width: "100%", aspectRatio: "1", borderRadius: "50%", border: "none",
                      cursor: "pointer", fontSize: 13, fontWeight: day === selectedDay ? 700 : 400,
                      fontFamily: "inherit",
                      background: day === selectedDay ? TEXT : "transparent",
                      color: day === selectedDay ? WHITE : TEXT,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >{day}</button>
                ))}
              </div>
              {/* Clear date */}
              {value && (
                <button type="button"
                  onClick={() => { onChange(""); setOpen(false); }}
                  style={{ marginTop: 10, width: "100%", padding: "6px 0", borderRadius: 8, border: `1px solid ${BORDER}`, background: "none", cursor: "pointer", fontSize: 12, color: MUTED, fontFamily: "inherit" }}
                >Clear date</button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Tiny section-label helper ── */
const SLabel = ({ text }) => (
  <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
    {text}
  </div>
);

/* ─────────────────────────────────────────────────────────
   ProfileTab
───────────────────────────────────────────────────────── */
export default function ProfileTab({ user, refreshUser, pushNotif }) {
  const currencyCode = getUserCurrency(user);
  const [form, setForm] = useState({
    fullName:     user?.name         || "",
    dob:          user?.dob          || "",
    country:      user?.country      || "",
    phone:        user?.phone        || "",
    address:      user?.address      || "",
    email:        user?.email        || "",
    employment:   user?.employment   || "",
    annualIncome: user?.annualIncome  || "",
    taxStatus:    user?.taxStatus    || "",
    preferredCurrency: currencyCode,
    dependents:   Array.isArray(user?.dependents) ? user.dependents : [],
  });
  const [currencyOptions, setCurrencyOptions] = useState(["USD"]);
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState(null);

  const set    = (key) => (e)   => setForm((p) => ({ ...p, [key]: e.target.value }));
  const setVal = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  const addDependent    = () => setForm((p) => ({ ...p, dependents: [...p.dependents, { name: "", relation: "", dob: "" }] }));
  const removeDependent = (i) => setForm((p) => ({ ...p, dependents: p.dependents.filter((_, idx) => idx !== i) }));
  const setDepDob       = (i) => (val) =>
    setForm((p) => {
      const deps = [...p.dependents];
      deps[i] = { ...deps[i], dob: val };
      return { ...p, dependents: deps };
    });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await authService.getCurrencyOptions();
        const options = Array.isArray(data?.currencies) && data.currencies.length ? data.currencies : ["USD"];
        if (!mounted) return;
        setCurrencyOptions(options);
        setForm((prev) => ({
          ...prev,
          preferredCurrency: prev.preferredCurrency || data?.selectedCurrency || "USD",
        }));
      } catch {
        if (mounted) setCurrencyOptions(["USD"]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      preferredCurrency: user?.preferredCurrency || prev.preferredCurrency || "USD",
    }));
  }, [user?.preferredCurrency]);

  const save = async () => {
    if (!form.fullName.trim()) return setMsg({ type: "error", text: "Full name is required." });
    if (!form.email.trim())    return setMsg({ type: "error", text: "Email is required." });
    setSaving(true); setMsg(null);
    try {
      await api.put("/auth/profile", {
        name:         form.fullName.trim(),
        email:        form.email.trim(),
        dob:          form.dob          || undefined,
        country:      form.country      || undefined,
        phone:        form.phone        || undefined,
        address:      form.address      || undefined,
        employment:   form.employment   || undefined,
        annualIncome: form.annualIncome ? parseFloat(form.annualIncome) : undefined,
        taxStatus:    form.taxStatus    || undefined,
        preferredCurrency: form.preferredCurrency || undefined,
        dependents:   form.dependents,
      });
      await refreshUser?.();
      setMsg({ type: "success", text: "Profile saved successfully." });
      pushNotif?.("success", "Profile saved successfully.");
    } catch (err) {
      const m = err?.response?.data?.message || "Failed to save profile.";
      setMsg({ type: "error", text: m });
      pushNotif?.("error", m);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", boxSizing: "border-box" }}>
      <style>{`
        @media (max-width: 720px) {
          .profile-tab-card {
            padding: 16px !important;
          }
          .profile-grid-two,
          .profile-dependent-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 560px) {
          .profile-phone-row {
            flex-direction: column !important;
          }
          .profile-phone-country {
            flex: 1 1 auto !important;
          }
          .profile-save-row {
            justify-content: stretch !important;
          }
          .profile-save-btn {
            width: 100%;
          }
        }
      `}</style>

      {/* ══ Personal Information ══════════════════════════ */}
      <div className="profile-tab-card" style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, width: "100%", boxSizing: "border-box" }}>
        <SLabel text="Personal Information" />

        {/* Row 1 — Full name + DOB */}
        <div className="profile-grid-two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <FloatingInput label="Full legal name" value={form.fullName} onChange={set("fullName")} />
          <DatePicker label="Date of birth" value={form.dob} onChange={setVal("dob")} />
        </div>

        {/* Row 2 — PHONE (left half) + ADDRESS (right half) */}
        <div className="profile-grid-two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

          {/* Left: Phone section */}
          <div>
            <SLabel text="Phone" />
            <div className="profile-phone-row" style={{ display: "flex", gap: 10 }}>
              {/* Country dropdown */}
              <div className="profile-phone-country" style={{ position: "relative", flex: "0 0 130px" }}>
                <select
                  value={form.country}
                  onChange={set("country")}
                  style={{
                    background: WHITE,
                    border: `1.5px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: "14px 36px 14px 16px",
                    fontSize: 14,
                    color: form.country ? TEXT : MUTED,
                    width: "100%",
                    boxSizing: "border-box",
                    appearance: "none",
                    WebkitAppearance: "none",
                    outline: "none",
                    fontFamily: "inherit",
                    transition: "border-color 0.15s",
                  }}
                >
                  <option value="">Country</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronRight size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: MUTED, pointerEvents: "none" }} />
              </div>
              {/* Phone number */}
              <FloatingInput label="Phone number" value={form.phone} onChange={set("phone")} style={{ flex: 1 }} />
            </div>
          </div>

          {/* Right: Address section */}
          <div>
            <SLabel text="Address" />
            <FloatingInput label="Address" value={form.address} onChange={set("address")} style={{ width: "100%" }} />
          </div>
        </div>

        {/* Row 3 — Emails full width */}
        <SLabel text="Emails" />
        <FloatingInput label="Email" value={form.email} onChange={set("email")} type="email" style={{ width: "100%" }} />
      </div>

      {/* ══ Taxes and Income Details ══════════════════════ */}
      <div className="profile-tab-card" style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, width: "100%", boxSizing: "border-box" }}>
        <SLabel text="Taxes and Income Details" />

        {/* Row 1 — Employment + Income */}
        <div className="profile-grid-two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div style={{ position: "relative", width: "100%" }}>
            <label style={{ position: "absolute", left: 16, top: 10, fontSize: 11, color: MUTED, pointerEvents: "none", zIndex: 1, fontWeight: 500 }}>
              Employment status
            </label>
            <select
              value={form.employment}
              onChange={set("employment")}
              style={{
                background: WHITE,
                border: `1.5px solid ${BORDER}`,
                borderRadius: 10,
                padding: "24px 36px 8px 16px",
                fontSize: 14,
                color: form.employment ? TEXT : MUTED,
                width: "100%",
                boxSizing: "border-box",
                appearance: "none",
                WebkitAppearance: "none",
                outline: "none",
                fontFamily: "inherit",
                transition: "border-color 0.15s",
              }}
            >
              <option value="">Select</option>
              {EMP_STATUS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronRight size={15} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: MUTED, pointerEvents: "none" }} />
          </div>

          {/* Annual gross income with US$ prefix */}
          <div style={{ position: "relative", width: "100%" }}>
            <label style={{ position: "absolute", left: 16, top: 10, fontSize: 11, color: MUTED, pointerEvents: "none", zIndex: 1, fontWeight: 500 }}>
              Annual gross income
            </label>
            <span style={{ position: "absolute", left: 16, bottom: 11, fontSize: 14, color: MUTED, pointerEvents: "none", zIndex: 1 }}>
              {form.preferredCurrency || currencyCode}
            </span>
            <input
              type="number"
              value={form.annualIncome}
              onChange={set("annualIncome")}
              style={{ ...inp, padding: "24px 16px 8px 52px", width: "100%", boxSizing: "border-box" }}
              onFocus={fi}
              onBlur={fo}
            />
          </div>
        </div>

        {/* Row 2 — Tax filing status full width */}
        <div className="profile-grid-two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div style={{ position: "relative", width: "100%" }}>
            <label style={{ position: "absolute", left: 16, top: 10, fontSize: 11, color: MUTED, pointerEvents: "none", zIndex: 1, fontWeight: 500 }}>
              Preferred currency
            </label>
            <select
              value={form.preferredCurrency}
              onChange={set("preferredCurrency")}
              style={{
                background: WHITE,
                border: `1.5px solid ${BORDER}`,
                borderRadius: 10,
                padding: "24px 36px 8px 16px",
                fontSize: 14,
                color: form.preferredCurrency ? TEXT : MUTED,
                width: "100%",
                boxSizing: "border-box",
                appearance: "none",
                WebkitAppearance: "none",
                outline: "none",
                fontFamily: "inherit",
                transition: "border-color 0.15s",
              }}
            >
              {currencyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronRight size={15} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: MUTED, pointerEvents: "none" }} />
          </div>

          <div style={{ position: "relative", width: "100%" }}>
          <label style={{ position: "absolute", left: 16, top: 10, fontSize: 11, color: MUTED, pointerEvents: "none", zIndex: 1, fontWeight: 500 }}>
            Tax filing status
          </label>
          <select
            value={form.taxStatus}
            onChange={set("taxStatus")}
            style={{
              background: WHITE,
              border: `1.5px solid ${BORDER}`,
              borderRadius: 10,
              padding: "24px 36px 8px 16px",
              fontSize: 14,
              color: form.taxStatus ? TEXT : MUTED,
              width: "100%",
              boxSizing: "border-box",
              appearance: "none",
              WebkitAppearance: "none",
              outline: "none",
              fontFamily: "inherit",
              transition: "border-color 0.15s",
            }}
          >
            <option value="">Select</option>
            {TAX_STATUS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <ChevronRight size={15} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: MUTED, pointerEvents: "none" }} />
          </div>
        </div>

        {/* Dependents section */}
        <SLabel text="Dependents" />

        {form.dependents.length > 0 && (
          <div className="profile-dependent-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {form.dependents.map((dep, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* DatePicker — custom, so no duplicate browser calendar icon */}
                <div style={{ flex: 1 }}>
                  <DatePicker
                    label={`Dependent ${i + 1} / date of birth`}
                    value={dep.dob}
                    onChange={setDepDob(i)}
                  />
                </div>
                {/* Red trash icon — outside the input box */}
                <button
                  type="button"
                  onClick={() => removeDependent(i)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4, flexShrink: 0, display: "flex", alignItems: "center" }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Dependent button */}
        <button
          type="button"
          onClick={addDependent}
          style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT }}
        >
          <span style={{ width: 24, height: 24, borderRadius: "50%", background: TEXT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Plus size={14} color={WHITE} strokeWidth={2.5} />
          </span>
          Add Dependent
        </button>
      </div>

      {/* ══ Footer ════════════════════════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        <StatusMsg msg={msg} />
        <div className="profile-save-row" style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="profile-save-btn"
            style={{
              padding: "12px 36px", borderRadius: 10, border: "none",
              background: saving ? BORDER : SURFACE_STRONG,
              color: saving ? MUTED : TEXT_ON_STRONG,
              fontSize: 14, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit", transition: "all 0.15s", minWidth: 120,
            }}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

    </div>
  );
}
