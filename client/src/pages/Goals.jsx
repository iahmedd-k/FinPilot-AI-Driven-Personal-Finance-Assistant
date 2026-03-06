import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, PlusCircle, Loader2, Target, Trash2 } from "lucide-react";
import { goalService } from "../services/goalService";
import { ROUTES } from "../constants/routes";
import { toast } from "sonner";

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#0c0f18",
  backgroundImage:
    "radial-gradient(ellipse at 10% 10%, rgba(45,212,191,0.10) 0%, transparent 55%), radial-gradient(ellipse at 90% 90%, rgba(212,168,83,0.06) 0%, transparent 50%)",
};

function formatCurrency(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
}

export default function Goals() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    targetAmount: "",
    currentAmount: "0",
    deadline: "",
    category: "Other",
  });

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
      toast.success("Goal deleted");
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to delete"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const targetAmount = parseFloat(form.targetAmount);
    const currentAmount = parseFloat(form.currentAmount) || 0;
    if (!form.title.trim()) {
      toast.error("Enter a goal title");
      return;
    }
    if (!targetAmount || targetAmount <= 0) {
      toast.error("Enter a valid target amount");
      return;
    }
    if (!form.deadline || new Date(form.deadline) <= new Date()) {
      toast.error("Deadline must be in the future");
      return;
    }
    createMutation.mutate({
      title: form.title.trim(),
      targetAmount,
      currentAmount,
      deadline: new Date(form.deadline).toISOString(),
      category: form.category,
    });
  };

  const goals = data?.goals || [];

  return (
    <div className="min-h-screen pb-12" style={pageStyle}>
      <header className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(12,15,24,0.9)" }}>
        <Link to={ROUTES.DASHBOARD} className="p-2 rounded-lg" style={{ color: "#8b90a0" }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-semibold" style={{ fontFamily: "Playfair Display, serif", color: "#f5f0e8" }}>
          Goals
        </h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors"
          style={{ border: "1px solid rgba(212,168,83,0.5)", color: "#d4a853" }}
        >
          <PlusCircle size={18} /> {showForm ? "Cancel" : "Create goal"}
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-xl p-4 space-y-4" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#8b90a0" }}>Goal name</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Emergency fund"
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-transparent outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#f5f0e8" }}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#8b90a0" }}>Target amount (₹)</label>
              <input
                type="number"
                step="1"
                min="1"
                value={form.targetAmount}
                onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-transparent outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#f5f0e8" }}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#8b90a0" }}>Current amount (₹)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.currentAmount}
                onChange={(e) => setForm((f) => ({ ...f, currentAmount: e.target.value }))}
                placeholder="0"
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-transparent outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#f5f0e8" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#8b90a0" }}>Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-transparent outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#f5f0e8" }}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#8b90a0" }}>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-transparent outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#f5f0e8" }}
              >
                {goalService.CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-white disabled:opacity-60"
              style={{ backgroundColor: "#d4a853" }}
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              Create goal
            </button>
          </form>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#8b90a0" }}>
            Your goals
          </p>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#d4a853" }} /></div>
          ) : goals.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: "#8b90a0" }}>No goals yet. Create one above.</p>
          ) : (
            <ul className="space-y-3">
              {goals.map((g) => (
                <li
                  key={g._id}
                  className="rounded-xl p-4"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Target size={18} style={{ color: "#d4a853" }} />
                      <span className="text-sm font-medium truncate" style={{ color: "#f5f0e8" }}>{g.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(g._id)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 rounded text-red-400 hover:bg-red-400/10 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: "#8b90a0" }}>
                    <span>{formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}</span>
                    <span>{g.progressPercent ?? 0}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden mb-1" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, g.progressPercent ?? 0)}%`, backgroundColor: "#d4a853" }}
                    />
                  </div>
                  <p className="text-xs" style={{ color: "#8b90a0" }}>
                    {g.daysRemaining} days left · Save {formatCurrency(g.monthlySavingNeeded)}/mo
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
