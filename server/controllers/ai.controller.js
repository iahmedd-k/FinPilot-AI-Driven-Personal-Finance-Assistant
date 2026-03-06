const Transaction = require("../models/Transaction");
const Goal = require("../models/Goal");
const User = require("../models/User");
const { chat } = require("../services/ai/chatService");

// ─── @POST /api/ai/chat ────────────────────────────────
const aiChat = async (req, res, next) => {
  try {
    const user = req.user;

    // Check AI usage limit
    if (!user.canUseAI()) {
      return res.status(403).json({
        success: false,
        message: "Free tier AI limit reached (5/month). Upgrade to Pro.",
      });
    }

    const { message, history = [] } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    // ── Fetch user's financial context ─────────────────
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [transactions, goals] = await Promise.all([
      Transaction.find({ userId: user._id, date: { $gte: startOfMonth } }),
      Goal.find({ userId: user._id, isCompleted: false }),
    ]);

    // Build summary
    let totalIncome = 0, totalExpense = 0;
    const categoryMap = {};
    transactions.forEach((t) => {
      if (t.type === "income")  totalIncome  += t.amount;
      if (t.type === "expense") totalExpense += t.amount;
      if (t.type === "expense") {
        const cat = t.category || "Other";
        categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
      }
    });

    const summary = {
      totalIncome:    Math.round(totalIncome),
      totalExpense:   Math.round(totalExpense),
      netBalance:     Math.round(totalIncome - totalExpense),
      savingsPercent: totalIncome > 0
        ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
        : 0,
    };

    const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
      category,
      amount: Math.round(amount),
      percent: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }));

    // ── Call AI ────────────────────────────────────────
    const reply = await chat({
      user,
      summary,
      categoryBreakdown,
      goals,
      history,
      message,
    });

    // ── Increment AI usage ─────────────────────────────
    await User.findByIdAndUpdate(user._id, { $inc: { aiQueriesUsed: 1 } });

    res.status(200).json({
      success: true,
      reply,
      usage: {
        aiQueriesUsed: user.aiQueriesUsed + 1,
        limit: user.subscriptionTier === "pro" ? "unlimited" : 5,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/ai/quick-prompts ───────────────────────
const getQuickPrompts = (req, res) => {
  const prompts = [
    "Can I afford a MacBook this month?",
    "Why is my savings rate low?",
    "How can I reduce my expenses?",
    "Am I on track with my goals?",
    "Where am I spending the most?",
    "How much should I save each month?",
  ];
  res.status(200).json({ success: true, prompts });
};

module.exports = { aiChat, getQuickPrompts };