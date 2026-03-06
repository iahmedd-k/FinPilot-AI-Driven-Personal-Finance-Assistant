const Transaction = require("../models/Transaction");
const Goal = require("../models/Goal");
const calculateFinancialScore = require("../services/ai/financialScoreService");
const calculateForecast = require("../services/ai/forecastService");

// ─── @GET /api/dashboard ──────────────────────────────
// Main dashboard — all widgets in one call
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Current month range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Last 3 months range (for forecast)
    const last3Months = new Date();
    last3Months.setMonth(last3Months.getMonth() - 3);

    // ── Fetch all needed data in parallel ─────────────
    const [currentMonthTx, last3MonthsTx, goals] = await Promise.all([
      Transaction.find({ userId, date: { $gte: startOfMonth, $lte: endOfMonth } }),
      Transaction.find({ userId, date: { $gte: last3Months } }),
      Goal.find({ userId, isCompleted: false }),
    ]);

    // ── Current month totals ───────────────────────────
    let totalIncome = 0, totalExpense = 0;
    currentMonthTx.forEach((t) => {
      if (t.type === "income")  totalIncome  += t.amount;
      if (t.type === "expense") totalExpense += t.amount;
    });

    const netBalance    = totalIncome - totalExpense;
    const savingsPercent = totalIncome > 0
      ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
      : 0;

    // ── Category breakdown (pie chart) ────────────────
    const categoryMap = {};
    currentMonthTx
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = t.category || "Other Expense";
        categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
      });
    const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
      category,
      amount: Math.round(amount),
      percent: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    // ── Monthly chart (last 6 months) ─────────────────
    const last6Months = new Date();
    last6Months.setMonth(last6Months.getMonth() - 5);
    const allTx = await Transaction.find({ userId, date: { $gte: last6Months } });

    const chartMap = {};
    allTx.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!chartMap[key]) chartMap[key] = { month: key, income: 0, expense: 0 };
      if (t.type === "income")  chartMap[key].income  += t.amount;
      if (t.type === "expense") chartMap[key].expense += t.amount;
    });
    const monthlyChart = Object.values(chartMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        ...m,
        income:  Math.round(m.income),
        expense: Math.round(m.expense),
      }));

    // ── AI Financial Score ─────────────────────────────
    const financialScore = calculateFinancialScore({
      totalIncome,
      totalExpense,
      savingsPercent,
      goals,
    });

    // ── Forecast (Pro only) ────────────────────────────
    let forecast = null;
    if (req.user.subscriptionTier === "pro") {
      forecast = calculateForecast(last3MonthsTx);
    }

    // ── Response ───────────────────────────────────────
    res.status(200).json({
      success: true,
      dashboard: {
        summary: {
          totalIncome:    Math.round(totalIncome),
          totalExpense:   Math.round(totalExpense),
          netBalance:     Math.round(netBalance),
          savingsPercent,
        },
        financialScore,
        categoryBreakdown,
        monthlyChart,
        forecast,
        goals: goals.map((g) => ({
          _id:                g._id,
          title:              g.title,
          targetAmount:       g.targetAmount,
          currentAmount:      g.currentAmount,
          progressPercent:    g.progressPercent,
          daysRemaining:      g.daysRemaining,
          monthlySavingNeeded: g.monthlySavingNeeded,
          deadline:           g.deadline,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/dashboard/summary ──────────────────────
// Lightweight — just numbers, no charts
const getSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startOfMonth },
    });

    let totalIncome = 0, totalExpense = 0;
    transactions.forEach((t) => {
      if (t.type === "income")  totalIncome  += t.amount;
      if (t.type === "expense") totalExpense += t.amount;
    });

    res.status(200).json({
      success: true,
      summary: {
        totalIncome:    Math.round(totalIncome),
        totalExpense:   Math.round(totalExpense),
        netBalance:     Math.round(totalIncome - totalExpense),
        savingsPercent: totalIncome > 0
          ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
          : 0,
        transactionCount: transactions.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard, getSummary };