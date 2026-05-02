import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Brain, Pencil, Settings, X } from "lucide-react";
import { useAuthContext } from "../../../hooks/useAuthContext";
import api from "../../../services/api";
import { BG, BORDER, Card, InfoRow, MUTED, SUB, SURFACE_MUTED, SURFACE_STRONG, TEXT, TEXT_ON_STRONG, WHITE, fi, fo, inp, labelSx } from "../shared";
import { formatCurrencyAmount, getUserCurrency } from "../../../utils/currency";

const EMP_OPTS = ["Employed", "Self-employed", "Freelance", "Business owner", "Student", "Retired", "Unemployed"];
const RISK_OPTS = ["Conservative", "Moderately Conservative", "Moderate", "Moderately Aggressive", "Aggressive"];

export default function AIProfileTab() {
  const { user, fetchMe } = useAuthContext();
  const currencyCode = getUserCurrency(user);
  const [profile, setProfile] = useState({ age: "", location: "", employment: "Self-employed", annualIncome: "", riskProfile: "Moderately Aggressive", dependents: 0 });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...profile });
  const [saving, setSaving] = useState(false);
  const [memories, setMemories] = useState([]);
  const [memoryAssistEnabled, setMemoryAssistEnabled] = useState(true);
  const [memoryToggleDraft, setMemoryToggleDraft] = useState(true);
  const [memorySettingsSaving, setMemorySettingsSaving] = useState(false);
  const [showMemorySettings, setShowMemorySettings] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({
      age: user?.age ?? "",
      location: user?.location ?? "",
      employment: user?.employment || "Self-employed",
      annualIncome: user?.annualIncome ?? "",
      riskProfile: user?.riskProfile || "Moderately Aggressive",
      dependents: user?.dependents ?? 0,
    });
    setMemoryAssistEnabled(user?.memoryAssistEnabled !== false);
  }, [user]);

  const openMemorySettings = () => {
    setMemoryToggleDraft(memoryAssistEnabled);
    setShowMemorySettings(true);
  };

  const startEdit = () => {
    setDraft({ ...profile });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/auth/financial-profile", draft).catch(() => {});
    } finally {
      setProfile({ ...draft });
      setEditing(false);
      setSaving(false);
    }
  };

  const fmtIncome = (value) => {
    const num = Number(value);
    return num ? formatCurrencyAmount(num, currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "—";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        @media (max-width: 720px) {
          .ai-profile-header,
          .ai-profile-toggle-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .ai-profile-edit-grid {
            grid-template-columns: 1fr !important;
          }
          .ai-profile-edit-actions {
            width: 100%;
            justify-content: stretch !important;
          }
          .ai-profile-edit-actions > button {
            flex: 1 1 0;
          }
        }

        @media (max-width: 560px) {
          .ai-profile-card-body {
            padding: 20px 16px !important;
          }
          .ai-profile-settings-modal {
            padding: 20px 16px 16px !important;
          }
        }
      `}</style>
      <Card>
        <div className="ai-profile-header" style={{ padding: "13px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Brain size={13} style={{ color: MUTED }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em" }}>AI Memory</span>
          </div>
          <button type="button" onClick={openMemorySettings} style={{ border: `1px solid ${BORDER}`, background: SURFACE_MUTED, borderRadius: 8, padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", color: SUB, fontSize: 11, fontWeight: 600 }}>
            <Settings size={13} /> Memories Settings
          </button>
        </div>
        <div style={{ padding: "24px 20px" }}>
          {!memoryAssistEnabled && <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 9, background: "#fff7ed", border: "1px solid #fed7aa", fontSize: 12, color: "#9a3412" }}>AI memory is disabled. AI Advisor will not save or use memories from previous conversations.</div>}
          {memories.length === 0 ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>No Memories Yet</div>
              <div style={{ fontSize: 13.5, color: MUTED }}>Allow AI to remember your conversations.</div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {memories.map((memory, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: BG, border: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 13.5, color: TEXT }}>{memory}</span>
                  <button type="button" onClick={() => setMemories((prev) => prev.filter((_, currentIndex) => currentIndex !== index))} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, display: "flex" }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {showMemorySettings &&
        createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", padding: 16 }} onClick={() => !memorySettingsSaving && setShowMemorySettings(false)}>
            <div className="ai-profile-settings-modal" style={{ background: WHITE, borderRadius: 20, width: "100%", maxWidth: 480, padding: "24px 24px 20px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em" }}>Settings</span>
                <button type="button" onClick={() => setShowMemorySettings(false)} style={{ border: "none", background: "none", cursor: "pointer", color: MUTED, display: "flex", padding: 2 }}>
                  <X size={17} />
                </button>
              </div>
              <div className="ai-profile-toggle-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderRadius: 14, border: `1px solid ${BORDER}`, background: BG, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, marginBottom: 4 }}>Memories enabled</div>
                  <div style={{ fontSize: 13, color: MUTED }}>Allow AI Advisor to save and recall memories when asked.</div>
                </div>
                <div onClick={() => !memorySettingsSaving && setMemoryToggleDraft((value) => !value)} style={{ width: 52, height: 30, borderRadius: 100, background: memoryToggleDraft ? "#1a1a1a" : BORDER, position: "relative", cursor: memorySettingsSaving ? "not-allowed" : "pointer", flexShrink: 0, marginLeft: 20, transition: "background 0.2s" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: memoryToggleDraft ? 25 : 3, transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }} />
                </div>
              </div>
              <button
                type="button"
                disabled={memorySettingsSaving}
                onClick={() => {
                  setMemorySettingsSaving(true);
                  api
                    .put("/auth/financial-profile", { memoryAssistEnabled: memoryToggleDraft })
                    .then(async () => {
                      setMemoryAssistEnabled(memoryToggleDraft);
                      await fetchMe?.();
                      setShowMemorySettings(false);
                    })
                    .catch(() => {})
                    .finally(() => setMemorySettingsSaving(false));
                }}
                style={{ width: "100%", padding: "15px 0", borderRadius: 12, border: "none", background: "#0f0f0f", color: "#fff", fontSize: 15, fontWeight: 600, cursor: memorySettingsSaving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: memorySettingsSaving ? 0.7 : 1, transition: "opacity 0.15s" }}
              >
                {memorySettingsSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>,
          document.body
        )}

      <Card>
        <div className="ai-profile-header" style={{ padding: "13px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Brain size={13} style={{ color: MUTED }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em" }}>About You</span>
          </div>
          {!editing ? (
            <button type="button" onClick={startEdit} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, display: "flex", padding: 4 }}>
              <Pencil size={15} />
            </button>
          ) : (
            <div className="ai-profile-edit-actions" style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setEditing(false)} style={{ padding: "5px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE_MUTED, fontSize: 12, color: SUB, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving} style={{ padding: "5px 14px", borderRadius: 8, border: "none", background: SURFACE_STRONG, color: TEXT_ON_STRONG, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>
        {!editing ? (
          <div style={{ padding: "0 20px" }}>
            <InfoRow label="Age" value={profile.age || "—"} />
            <InfoRow label="Location" value={profile.location || "—"} />
            <InfoRow label="Employment status" value={profile.employment} />
            <InfoRow label="Annual income" value={fmtIncome(profile.annualIncome)} />
            <InfoRow label="Risk profile" value={profile.riskProfile} />
            <InfoRow label="Dependents" value={profile.dependents} last />
          </div>
        ) : (
          <div className="ai-profile-card-body" style={{ padding: 20 }}>
            <div className="ai-profile-edit-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[{ label: "Age", key: "age", type: "number", ph: "e.g. 27" }, { label: "Location", key: "location", type: "text", ph: "e.g. US" }].map((field) => (
                <div key={field.key}>
                  <label style={labelSx}>{field.label}</label>
                  <input type={field.type} value={draft[field.key]} onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))} placeholder={field.ph} style={inp} onFocus={fi} onBlur={fo} />
                </div>
              ))}
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelSx}>Employment Status</label>
                <select value={draft.employment} onChange={(e) => setDraft((prev) => ({ ...prev, employment: e.target.value }))} style={inp}>
                  {EMP_OPTS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelSx}>Annual Income ({currencyCode})</label>
                <input type="number" value={draft.annualIncome} onChange={(e) => setDraft((prev) => ({ ...prev, annualIncome: e.target.value }))} placeholder="e.g. 75000" style={inp} onFocus={fi} onBlur={fo} />
              </div>
              <div>
                <label style={labelSx}>Dependents</label>
                <input type="number" value={draft.dependents} onChange={(e) => setDraft((prev) => ({ ...prev, dependents: Number(e.target.value) }))} style={inp} onFocus={fi} onBlur={fo} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelSx}>Risk Profile</label>
                <select value={draft.riskProfile} onChange={(e) => setDraft((prev) => ({ ...prev, riskProfile: e.target.value }))} style={inp}>
                  {RISK_OPTS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
