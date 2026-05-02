const Transaction  = require("../models/Transaction");
const Goal         = require("../models/Goal");
const User         = require("../models/User");
const CryptoAsset  = require("../models/CryptoAsset");
const ChatSession  = require("../models/ChatSession");
const mongoose     = require("mongoose");
const { chat }     = require("../services/ai/chatService");
const calculateFinancialScore = require("../services/ai/financialScoreService");

const normalizeMsg = (text = "") => String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const hasAny = (text, terms = []) => terms.some((term) => text.includes(term));

const isLastSpendingIntent = (text = "") => {
  const t = normalizeMsg(text);
  const lastWords = ["last", "latest", "recent"];
  const spendingWords = ["spending", "speding", "expense", "expenses", "spent"];
  return (
    (hasAny(t, lastWords) && hasAny(t, spendingWords)) ||
    /\bwhat\s+did\s+i\s+spen(d|t)\s+last\b/.test(t)
  );
};

const isLastTransactionIntent = (text = "") => {
  const t = normalizeMsg(text);
  const lastWords = ["last", "latest", "recent"];
  const transactionWords = ["transaction", "transactions", "transction", "transctions", "transctin", "transctins", "txn", "txns"];
  return hasAny(t, lastWords) && hasAny(t, transactionWords);
};

const isTransactionListIntent = (text = "") => {
  const t = normalizeMsg(text);
  const transactionWords = ["transaction", "transactions", "transction", "transctions", "transctin", "transctins", "txn", "txns"];
  return hasAny(t, transactionWords);
};

const formatDateLabel = (dateVal) => {
  const d = new Date(dateVal);
  return Number.isNaN(d.getTime())
    ? "unknown date"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const saveSessionMessagesIfValid = async ({ sessionId, userId, message, reply, memoryAssistEnabled }) => {
  if (!memoryAssistEnabled || !sessionId) return;
  if (!mongoose.Types.ObjectId.isValid(String(sessionId))) return;

  await ChatSession.findOneAndUpdate(
    { _id: sessionId, userId },
    {
      $push: {
        messages: {
          $each: [
            { role: "user", text: message },
            { role: "bot",  text: reply   },
          ],
        },
      },
    }
  );
};

// ─── @POST /api/ai/chat ────────────────────────────────
const aiChat = async (req, res, next) => {
  try {
    const user = req.user;

    // ── Usage guard ────────────────────────────────────
    if (!user.canUseAI()) {
      return res.status(403).json({
        success: false,
        message: "Free tier AI limit reached (5/month). Upgrade to Pro.",
      });
    }

    const { message, history = [], sessionId } = req.body;
    const memoryAssistEnabled = user.memoryAssistEnabled !== false;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear  = new Date(now.getFullYear(), 0, 1);

    // ── Fetch everything in parallel ───────────────────
    const [ytdTransactions, goals, cryptoAssets] = await Promise.all([
      Transaction.find({ userId: user._id, date: { $gte: startOfYear } }).sort({ date: -1 }),
      Goal.find({ userId: user._id, isCompleted: false }),
      CryptoAsset.find({ userId: user._id }),
    ]);

    // Split current month from YTD
    const monthTransactions = ytdTransactions.filter(
      (t) => new Date(t.date) >= startOfMonth
    );

    const expenses = ytdTransactions.filter((t) => t.type === "expense");

    // Deterministic answer for "last spending" style queries.
    if (isLastSpendingIntent(message)) {
      const lastExpense = expenses.length ? expenses[0] : null;

      if (!lastExpense) {
        await User.findByIdAndUpdate(user._id, { $inc: { aiQueriesUsed: 1 } });
        return res.status(200).json({
          success: true,
          reply: "I couldn't find any expense transactions yet. Add your expenses and I can show your latest spending instantly.",
          usage: {
            aiQueriesUsed: user.aiQueriesUsed + 1,
            limit: user.subscriptionTier === "pro" ? "unlimited" : 5,
          },
        });
      }

      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const recent7DaySpend = expenses
        .filter((t) => new Date(t.date) >= sevenDaysAgo)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const dateLabel = formatDateLabel(lastExpense.date);

      const merchant = lastExpense.merchant || lastExpense.description || "Unknown merchant";
      const category = lastExpense.category || "Other Expense";
      const amount = Math.round(Number(lastExpense.amount) || 0).toLocaleString("en-US");
      const sevenDayAmount = Math.round(recent7DaySpend).toLocaleString("en-US");

      const reply = [
        `Your latest expense was $${amount} on ${dateLabel}.`,
        `Merchant: ${merchant} (${category}).`,
        `You spent $${sevenDayAmount} in total over the last 7 days.`,
      ].join(" ");

      await saveSessionMessagesIfValid({ sessionId, userId: user._id, message, reply, memoryAssistEnabled });

      await User.findByIdAndUpdate(user._id, { $inc: { aiQueriesUsed: 1 } });

      return res.status(200).json({
        success: true,
        reply,
        usage: {
          aiQueriesUsed: user.aiQueriesUsed + 1,
          limit: user.subscriptionTier === "pro" ? "unlimited" : 5,
        },
      });
    }

    if (isLastTransactionIntent(message)) {
      const tx = ytdTransactions.length ? ytdTransactions[0] : null;

      if (!tx) {
        await User.findByIdAndUpdate(user._id, { $inc: { aiQueriesUsed: 1 } });
        return res.status(200).json({
          success: true,
          reply: "I couldn't find any transactions yet. Add one transaction and I can show your latest activity.",
          usage: {
            aiQueriesUsed: user.aiQueriesUsed + 1,
            limit: user.subscriptionTier === "pro" ? "unlimited" : 5,
          },
        });
      }

      const typeLabel = tx.type === "expense" ? "expense" : "income";
      const merchant = tx.merchant || tx.description || "Unknown merchant";
      const category = tx.category || (tx.type === "expense" ? "Other Expense" : "Other Income");
      const amount = Math.round(Number(tx.amount) || 0).toLocaleString("en-US");
      const dateLabel = formatDateLabel(tx.date);
      const reply = `Your latest transaction was a ${typeLabel} of $${amount} on ${dateLabel}. Merchant: ${merchant} (${category}).`;

      await saveSessionMessagesIfValid({ sessionId, userId: user._id, message, reply, memoryAssistEnabled });
      await User.findByIdAndUpdate(user._id, { $inc: { aiQueriesUsed: 1 } });

      return res.status(200).json({
        success: true,
        reply,
        usage: {
          aiQueriesUsed: user.aiQueriesUsed + 1,
          limit: user.subscriptionTier === "pro" ? "unlimited" : 5,
        },
      });
    }

    if (isTransactionListIntent(message) && ytdTransactions.length) {
      const latest = ytdTransactions.slice(0, 3).map((t) => {
        const sign = t.type === "expense" ? "-" : "+";
        const amount = Math.round(Number(t.amount) || 0).toLocaleString("en-US");
        const merchant = t.merchant || t.description || "Unknown merchant";
        return `${formatDateLabel(t.date)}: ${sign}$${amount} (${merchant})`;
      });

      const reply = `Here are your 3 most recent transactions: ${latest.join(" | ")}.`;

      await saveSessionMessagesIfValid({ sessionId, userId: user._id, message, reply, memoryAssistEnabled });
      await User.findByIdAndUpdate(user._id, { $inc: { aiQueriesUsed: 1 } });

      return res.status(200).json({
        success: true,
        reply,
        usage: {
          aiQueriesUsed: user.aiQueriesUsed + 1,
          limit: user.subscriptionTier === "pro" ? "unlimited" : 5,
        },
      });
    }

    // ── Monthly summary ────────────────────────────────
    let totalIncome = 0, totalExpense = 0;
    const categoryMap = {};

    monthTransactions.forEach((t) => {
      if (t.type === "income")  totalIncome  += t.amount;
      if (t.type === "expense") totalExpense += t.amount;
      if (t.type === "expense") {
        const cat = t.category || "Other";
        categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
      }
    });

    const netBalance     = totalIncome - totalExpense;
    const savingsPercent = totalIncome > 0
      ? Math.round((netBalance / totalIncome) * 100)
      : 0;

    const summary = {
      totalIncome:    Math.round(totalIncome),
      totalExpense:   Math.round(totalExpense),
      netBalance:     Math.round(netBalance),
      savingsPercent,
    };

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, amount]) => ({
        category,
        amount:  Math.round(amount),
        percent: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // ── Monthly trend (YTD grouped by month) ──────────
    const trendMap = {};
    ytdTransactions.forEach((t) => {
      const d   = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!trendMap[key]) trendMap[key] = { month: key, income: 0, expense: 0 };
      if (t.type === "income")  trendMap[key].income  += t.amount;
      if (t.type === "expense") trendMap[key].expense += t.amount;
    });
    const monthlyTrend = Object.values(trendMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        month:   m.month,
        income:  Math.round(m.income),
        expense: Math.round(m.expense),
      }));

    // ── Forecast: weighted avg of last 3 months ────────
    let forecast = null;
    const recent3 = monthlyTrend.slice(-3);
    if (recent3.length >= 2) {
      const weights  = recent3.length === 3 ? [1, 2, 3] : [1, 2];
      const wTotal   = weights.reduce((s, w) => s + w, 0);
      const pIncome  = Math.round(recent3.reduce((s, m, i) => s + m.income  * weights[i], 0) / wTotal);
      const pExpense = Math.round(recent3.reduce((s, m, i) => s + m.expense * weights[i], 0) / wTotal);
      forecast = {
        predictedIncome:  pIncome,
        predictedExpense: pExpense,
        confidence: recent3.length >= 3 ? "high" : "medium",
      };
    }

    const financialScore = calculateFinancialScore({
      totalIncome,
      totalExpense,
      goals,
      monthlyChart: monthlyTrend,
      transactions: monthTransactions,
      budget: null,
    });

    // ── Assets from CryptoAsset model ─────────────────
    // Handles both crypto (coin/symbol/quantity/buyPrice)
    // and non-crypto (name/buyingPrice/currentValue)
    let assetsSummary = null;

    if (cryptoAssets.length > 0) {
      let totalValue = 0, totalCost = 0;
      const detailLines = [];

      cryptoAssets.forEach((a) => {
        const isCrypto = a.assetType === "crypto" || !!a.coin;
        const value    = a.currentValue ?? 0;
        const cost     = isCrypto
          ? (a.buyPrice ?? 0) * (a.quantity ?? 0)
          : (a.buyingPrice ?? 0);

        totalValue += value;
        totalCost  += cost;

        const name = isCrypto
          ? `${a.coin ?? a.symbol ?? "Crypto"}${a.symbol ? ` (${a.symbol})` : ""}`
          : (a.name ?? a.assetType ?? "Asset");

        detailLines.push(
          `  ${name} [${a.assetType}]: ` +
          `current $${Math.round(value).toLocaleString()} | ` +
          `cost $${Math.round(cost).toLocaleString()} | ` +
          `P&L $${Math.round(value - cost).toLocaleString()}`
        );
      });

      assetsSummary = {
        count:       cryptoAssets.length,
        totalValue:  Math.round(totalValue),
        totalCost:   Math.round(totalCost),
        gainLoss:    Math.round(totalValue - totalCost),
        detailLines,
      };
    }

    // ── Goals with progress ────────────────────────────
    const goalsWithProgress = goals.map((g) => ({
      title:           g.title,
      category:        g.category,
      currentAmount:   g.currentAmount  || 0,
      targetAmount:    g.targetAmount   || 0,
      progressPercent: g.targetAmount > 0
        ? Math.round(((g.currentAmount || 0) / g.targetAmount) * 100)
        : 0,
      daysRemaining: g.deadline
        ? Math.ceil((new Date(g.deadline) - now) / 86400000)
        : null,
    }));

    // ── Recent 20 transactions ─────────────────────────
    const recentTx = ytdTransactions.slice(0, 20).map((t) => ({
      date:     t.date,
      merchant: t.merchant || t.description,
      category: t.category,
      type:     t.type,
      amount:   t.amount,
    }));

    // ── Call AI ────────────────────────────────────────
    const reply = await chat({
      user,
      summary,
      categoryBreakdown,
      goals:         goalsWithProgress,
      monthlyTrend,
      recentTx,
      forecast,
      financialScore,
      assets:        assetsSummary,
      history: memoryAssistEnabled ? history : [],
      message,
    });

    // ── Save to session ────────────────────────────────
    await saveSessionMessagesIfValid({ sessionId, userId: user._id, message, reply, memoryAssistEnabled });

    // ── Increment usage ────────────────────────────────
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
    "What's my total portfolio value?",
    "How much have I gained on crypto?",
    "How much should I save each month?",
  ];
  res.status(200).json({ success: true, prompts });
};

module.exports = { aiChat, getQuickPrompts };
