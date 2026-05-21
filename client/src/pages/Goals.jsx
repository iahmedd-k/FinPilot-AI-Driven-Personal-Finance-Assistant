import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, PlusCircle, Loader2, Target, Trash2, MoreVertical } from "lucide-react";
import { goalService } from "../services/goalService";
import { ROUTES } from "../constants/routes";
import { toast } from "sonner";
import { CalendarPicker, formatDateInputValue, parseDateInputValue } from "../components/dashboard/tabs/SpendingTab";
import { useAuthContext } from "../hooks/useAuthContext";
import { formatCurrencyAmount, getUserCurrency } from "../utils/currency";

/* ─── Origin Design Tokens (theme-aware) ─── */
const O = {
  bg: "var(--bg-primary)",
  bgHover: "var(--bg-secondary)",
  navActive: "var(--border-default)",
  cardBg: "var(--bg-card)",
  cardShadow: "var(--shadow-card)",
  cardRadius: 16,
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textMuted: "var(--text-muted)",
  border: "var(--border-default)",
  borderLight: "var(--border-subtle)",
  green: "#1A8B5C",
  teal: "#0D7377",
  navy: "var(--bg-primary)",
  pillBg: "var(--bg-secondary)",
  gold: "#D4A853",
  goldLight: "rgba(212,168,83,0.12)",
};

const goalCategoryColors = {
  "Emergency Fund": "#1A8B5C",
  Travel: "#0D7377",
  Education: "#5A8BB8",
  Home: "#7B8BA0",
  Car: "#B8734A",
  Retirement: "#7BA55A",
  Business: "#E8935A",
  Other: "#8B8BA3",
};

function getGoalCatColor(cat) { return goalCategoryColors[cat] || "#8B8BA3"; }

export default function Goals() {
  const { user } = useAuthContext();
  const currencyCode = getUserCurrency(user);
  const fmtFull = (n) => formatCurrencyAmount(Math.abs(n || 0), currencyCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [form, setForm] = useState({ title: "", targetAmount: "", currentAmount: "0", deadline: "", category: "Other" });

  const minimumDeadline = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return formatDateInputValue(date);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: () => goalService.getList().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body) => goalService.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowForm(false);
      setForm({ title: "", targetAmount: "", currentAmount: "0", deadline: "", category: "Other" });
      toast.success("Goal created");
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to create goal"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => goalService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setConfirmingId(null);
      toast.success("Goal deleted");
    },
    onError: (e) => {
      setConfirmingId(null);
      toast.error(e.response?.data?.message || "Failed to delete");
    },
  });

  const handleDeleteGoal = (id) => {
    if (confirmingId !== id) {
      setConfirmingId(id);
      setTimeout(() => setConfirmingId(null), 3000);
      return;
    }
    deleteMutation.mutate(id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const targetAmount = parseFloat(form.targetAmount);
    const currentAmount = parseFloat(form.currentAmount) || 0;
    if (!form.title.trim()) { toast.error("Enter a goal title"); return; }
    if (!targetAmount || targetAmount <= 0) { toast.error("Enter a valid target amount"); return; }

    const parsedDeadline = parseDateInputValue(form.deadline);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    if (!parsedDeadline || parsedDeadline < tomorrow) { toast.error("Deadline must be in the future"); return; }

    createMutation.mutate({
      title: form.title.trim(),
      targetAmount,
      currentAmount,
      deadline: parsedDeadline.toISOString(),
      category: form.category,
    });
  };

  const goals = data?.goals || [];

  return (
    <div style={{ minHeight: "100vh", background: O.bg, fontFamily: "Inter, sans-serif" }}>
      {/* Back header */}
      <header style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "20px 32px",
        borderBottom: `1px solid ${O.border}`,
        background: O.bg,
      }}>
        <Link to={ROUTES.DASHBOARD} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 34, height: 34, borderRadius: "50%",
          border: `1px solid ${O.border}`, background: "transparent",
          cursor: "pointer", color: O.textSecondary,
        }}>
          <ArrowLeft size={18} />
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: O.textPrimary, letterSpacing: "-0.02em", margin: 0 }}>
          Goals
        </h1>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 32px 60px" }}>
        {/* Add goal toggle */}
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "10px 0",
            borderRadius: 999,
            border: `1px solid ${O.teal}`,
            background: "transparent",
            color: O.teal,
            fontSize: 14, fontWeight: 500,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            marginBottom: 20,
            transition: "all 0.15s",
          }}
        >
          <PlusCircle size={16} />
          {showForm ? "Cancel" : "Create goal"}
        </button>

        {/* Add form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            style={{
              border: `1px solid ${O.borderLight}`,
              borderRadius: O.cardRadius,
              background: O.cardBg,
              padding: "20px 24px",
              marginBottom: 24,
              boxShadow: O.cardShadow,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: O.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Goal name</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Emergency fund"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${O.border}`, background: O.bg, fontSize: 13, color: O.textPrimary, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box" }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: O.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Target amount</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={form.targetAmount}
                  onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
                  placeholder="0"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${O.border}`, background: O.bg, fontSize: 13, color: O.textPrimary, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box" }}
                  required
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: O.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Current amount</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={form.currentAmount}
                  onChange={(e) => setForm((f) => ({ ...f, currentAmount: e.target.value }))}
                  placeholder="0"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${O.border}`, background: O.bg, fontSize: 13, color: O.textPrimary, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: O.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Deadline</label>
                <CalendarPicker
                  C={{ border: O.border, text: O.textPrimary, muted: O.textMuted, strong: O.teal, onStrong: "#fff" }}
                  value={form.deadline}
                  onChange={(value) => setForm((f) => ({ ...f, deadline: value }))}
                  minDate={minimumDeadline}
                />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: O.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${O.border}`, background: O.bg, fontSize: 13, color: O.textPrimary, fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box" }}
              >
                {goalService.CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ backgroundColor: O.bg, color: O.textPrimary }}>{c}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{
                width: "100%", padding: "10px 0",
                borderRadius: 999,
                border: "none",
                background: O.navy,
                color: "#fff",
                fontSize: 14, fontWeight: 600,
                cursor: createMutation.isPending ? "not-allowed" : "pointer",
                fontFamily: "Inter, sans-serif",
                opacity: createMutation.isPending ? 0.7 : 1,
              }}
            >
              {createMutation.isPending && <Loader2 size={16} style={{ display: "inline", marginRight: 6, animation: "spin 1s linear infinite" }} />}
              Create goal
            </button>
          </form>
        )}

        {/* Goals card */}
        <div className="origin-card" style={{ padding: "24px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: O.textMuted }}>Your goals</span>
            <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: O.textMuted }}>
              <MoreVertical size={16} />
            </button>
          </div>

          {isLoading && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Loader2 style={{ width: 28, height: 28, color: O.teal, animation: "spin 1s linear infinite" }} />
            </div>
          )}

          {!isLoading && goals.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: O.textMuted, fontSize: 14 }}>
              No goals yet. Create one above.
            </div>
          )}

          {!isLoading && goals.length > 0 && (
            <div style={{ display: "grid", gap: 12 }}>
              {goals.map((g) => {
                const color = getGoalCatColor(g.category);
                const progress = Math.min(100, g.progressPercent ?? 0);
                return (
                  <div
                    key={g._id}
                    style={{
                      border: `1px solid ${O.borderLight}`,
                      borderRadius: 12,
                      background: O.cardBg,
                      padding: "18px 20px",
                      transition: "box-shadow 0.15s",
                    }}
                  >
                    {/* Top row */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: `${color}18`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <Target size={16} style={{ color }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: O.textPrimary }}>{g.title}</div>
                          <div style={{ fontSize: 12, color: O.textMuted, marginTop: 2 }}>{g.category}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(g._id)}
                        disabled={deleteMutation.isPending}
                        style={{
                          background: confirmingId === g._id ? "#ef4444" : "none",
                          border: confirmingId === g._id ? "none" : "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          color: confirmingId === g._id ? "#fff" : O.textMuted,
                          padding: confirmingId === g._id ? "4px 8px" : 4,
                          fontSize: confirmingId === g._id ? 10 : 12,
                          fontWeight: confirmingId === g._id ? 700 : 400,
                          opacity: deleteMutation.isPending ? 0.5 : 1,
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: 4
                        }}
                      >
                        <Trash2 size={confirmingId === g._id ? 12 : 14} />
                        {confirmingId === g._id && "Confirm?"}
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: O.textSecondary }}>
                          {fmtFull(g.currentAmount)} / {fmtFull(g.targetAmount)}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: O.textPrimary }}>{progress}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: O.borderLight, overflow: "hidden" }}>
                        <div
                          style={{ height: "100%", width: `${progress}%`, background: color, borderRadius: 3, transition: "width 0.3s ease" }}
                        />
                      </div>
                    </div>

                    {/* Bottom row */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: O.textMuted }}>
                      <span>{g.daysRemaining} days remaining</span>
                      <span>Save {fmtFull(g.monthlySavingNeeded)}/mo</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
