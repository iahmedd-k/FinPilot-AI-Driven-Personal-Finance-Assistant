import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import api from "../../../services/api";
import { BORDER, Card, GREEN, MUTED, RED, SURFACE_STRONG, TEXT_ON_STRONG, StatusMsg, fi, fo, inp } from "../shared";

function PwField({ value, onChange, show, onToggle, placeholder }) {
  return (
    <div style={{ position: "relative" }}>
      <input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} style={{ ...inp, paddingRight: 48, fontSize: 15 }} onFocus={fi} onBlur={fo} />
      <button type="button" onClick={onToggle} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: MUTED, display: "flex", padding: 2 }}>
        {show ? <EyeOff size={19} /> : <Eye size={19} />}
      </button>
    </div>
  );
}

export default function SecurityTab({ pushNotif }) {
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [conPw, setConPw] = useState("");
  const [sCur, setSCur] = useState(false);
  const [sNew, setSNew] = useState(false);
  const [sCon, setSCon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const reqs = [
    { label: "1 uppercase", met: /[A-Z]/.test(newPw) },
    { label: "1 lowercase", met: /[a-z]/.test(newPw) },
    { label: "1 number", met: /[0-9]/.test(newPw) },
    { label: "8 to 64 characters", met: newPw.length >= 8 && newPw.length <= 64 },
    { label: "1 special character", met: /[^A-Za-z0-9]/.test(newPw) },
  ];
  const allMet = reqs.every((item) => item.met);
  const ok = curPw.length > 0 && allMet && conPw === newPw;

  const handleSave = async () => {
    if (!ok) return;

    setSaving(true);
    setMsg(null);
    try {
      await api.put("/auth/password", { currentPassword: curPw, newPassword: newPw });
      setMsg({ type: "success", text: "Password changed successfully." });
      pushNotif?.("success", "Password changed successfully.");
      setCurPw("");
      setNewPw("");
      setConPw("");
    } catch (error) {
      const errMsg = error?.response?.data?.message || "Failed to change password.";
      setMsg({ type: "error", text: errMsg });
      pushNotif?.("error", errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div style={{ padding: "18px 24px 6px" }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em" }}>Change Password</span>
      </div>
      <div style={{ padding: "10px 24px 6px", borderBottom: `1px solid ${BORDER}` }}>
        <PwField value={curPw} onChange={(e) => setCurPw(e.target.value)} show={sCur} onToggle={() => setSCur((value) => !value)} placeholder="Current password" />
      </div>
      <div style={{ padding: "18px 24px 6px" }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.12em" }}>Update Your Password</span>
      </div>
      <div style={{ padding: "10px 24px 30px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
          <PwField value={newPw} onChange={(e) => setNewPw(e.target.value)} show={sNew} onToggle={() => setSNew((value) => !value)} placeholder="New password" />
          <PwField value={conPw} onChange={(e) => setConPw(e.target.value)} show={sCon} onToggle={() => setSCon((value) => !value)} placeholder="Confirm new password" />
        </div>
        <ul style={{ listStyle: "disc", paddingLeft: 22, margin: "0 0 30px", display: "flex", flexDirection: "column", gap: 8 }}>
          {reqs.map((item) => (
            <li key={item.label} style={{ fontSize: 13, color: newPw.length === 0 ? MUTED : item.met ? GREEN : RED, transition: "color 0.2s" }}>
              {item.label}
            </li>
          ))}
        </ul>
        {msg && (
          <div style={{ marginBottom: 16 }}>
            <StatusMsg msg={msg} />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!ok || saving}
            style={{ padding: "13px 64px", borderRadius: 10, border: "none", background: ok && !saving ? SURFACE_STRONG : BORDER, color: ok && !saving ? TEXT_ON_STRONG : MUTED, fontSize: 14, fontWeight: 600, cursor: ok && !saving ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.15s" }}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </Card>
  );
}
