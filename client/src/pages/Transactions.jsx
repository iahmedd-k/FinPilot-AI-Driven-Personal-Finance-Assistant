import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, PlusCircle, Loader2, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { transactionService } from "../services/transactionService";
import { useAuthContext } from "../hooks/useAuthContext";
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

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const INCOME_CATS = ["Salary", "Freelance", "Investment", "Other Income"];
const EXPENSE_CATS = [
  "Dining", "Groceries", "Transport", "Subscriptions", "Shopping",
  "Health", "Education", "Utilities", "Rent", "Entertainment", "Travel", "Other Expense",
];

export default function Transactions() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [showForm, setShowForm] = useState(false);
  const isPro = user?.subscriptionTier === "pro";
  const txLimitReached = !isPro && (user?.transactionsUsed ?? 0) >= 10;
  const [form, setForm] = useState({
    amount: "",
    type: "expense",
    category: "",
    merchant: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => transactionService.getList({ limit: 50 }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body) => transactionService.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowForm(false);
      setForm({ amount: "", type: "expense", category: "", merchant: "", date: new Date().toISOString().slice(0, 10), notes: "" });
      toast.success("Transaction added");
    },
    onError: (e) => {
      if (e.response?.status === 403) {
        toast.error(e.response?.data?.message || "Free limit reached", {
          action: { label: "Upgrade to Pro", onClick: () => navigate(ROUTES.SUBSCRIPTION) },
        });
      } else {
        toast.error(e.response?.data?.message || "Failed to add");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => transactionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Deleted");
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to delete"),
  });

  const categories = form.type === "income" ? INCOME_CATS : EXPENSE_CATS;

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    createMutation.mutate({
      amount,
      type: form.type,
      category: form.category || undefined,
      merchant: form.merchant || "",
      date: form.date ? new Date(form.date).toISOString() : undefined,
      notes: form.notes || "",
    });
  };

  const transactions = data?.transactions || [];

  return (
    <div className="min-h-screen pb-12" style={pageStyle}>
      {txLimitReached && (
        <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap" style={{ background: "rgba(239,68,68,0.12)", borderBottom: "1px solid rgba(239,68,68,0.3)" }}>
          <p className="text-sm font-medium" style={{ color: "#f87171" }}>You’ve reached the free limit (10 transactions/month). Upgrade to add more.</p>
          <Link to={ROUTES.SUBSCRIPTION} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: "#10b981" }}>Upgrade to Pro</Link>
        </div>
      )}
      <header className="sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(12,15,24,0.9)" }}>
        <Link to={ROUTES.DASHBOARD} className="p-2 rounded-lg" style={{ color: "#8b90a0" }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-semibold" style={{ fontFamily: "Playfair Display, serif", color: "#f5f0e8" }}>
          Transactions
        </h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors"
          style={{ border: "1px solid rgba(45,212,191,0.5)", color: "#2dd4bf" }}
        >
          <PlusCircle size={18} /> {showForm ? "Cancel" : "Add transaction"}
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-xl p-4 space-y-4" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#8b90a0" }}>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, category: "" }))}
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-transparent outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#f5f0e8" }}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#8b90a0" }}>Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0"
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
                <option value="">Select</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#8b90a0" }}>Merchant / description</label>
              <input
                type="text"
                value={form.merchant}
                onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
                placeholder="e.g. Amazon"
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-transparent outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#f5f0e8" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#8b90a0" }}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-transparent outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#f5f0e8" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#8b90a0" }}>Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-transparent outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#f5f0e8" }}
              />
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-white disabled:opacity-60"
              style={{ backgroundColor: "#2dd4bf" }}
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              Save transaction
            </button>
          </form>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#8b90a0" }}>
            Recent
          </p>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2dd4bf" }} /></div>
          ) : transactions.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: "#8b90a0" }}>No transactions yet. Add one above.</p>
          ) : (
            <ul className="space-y-2">
              {transactions.map((t) => (
                <li
                  key={t._id}
                  className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span style={{ color: t.type === "income" ? "#2dd4bf" : "#f87171" }}>
                      {t.type === "income" ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#f5f0e8" }}>
                        {t.merchant || t.category || (t.type === "income" ? "Income" : "Expense")}
                      </p>
                      <p className="text-xs" style={{ color: "#8b90a0" }}>{formatDate(t.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium" style={{ color: t.type === "income" ? "#2dd4bf" : "#f87171" }}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(t._id)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 rounded text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
