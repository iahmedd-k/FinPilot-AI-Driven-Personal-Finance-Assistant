const groq = require("../../config/groq");

/**
 * Builds the system prompt with user's full financial context
 * so AI gives personalized answers, not generic advice
 */
const buildSystemPrompt = ({ user, summary, categoryBreakdown, goals, monthlyTrend = [], recentTx = [], forecast, financialScore, assets }) => {
  const categories = categoryBreakdown
    .map((c) => `  - ${c.category}: $${c.amount} (${c.percent}%)`)
    .join("\n");

  const goalsList = goals.length
    ? goals.map((g) => `  - ${g.title}: $${g.currentAmount}/$${g.targetAmount} (${g.progressPercent}% done, ${g.daysRemaining} days left)`).join("\n")
    : "  - No active goals set";

  const recentTransactions = recentTx.length
    ? recentTx.slice(0, 5).map((t) => {
      const d = new Date(t.date);
      const dateLabel = Number.isNaN(d.getTime())
        ? "unknown date"
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const merchant = t.merchant || "Unknown merchant";
      const category = t.category || (t.type === "expense" ? "Other Expense" : "Other Income");
      return `  - ${dateLabel}: ${t.type} $${Math.round(t.amount || 0)} (${merchant}, ${category})`;
    }).join("\n")
    : "  - No recent transactions";

  const trendLines = monthlyTrend.length
    ? monthlyTrend.slice(-3).map((m) => `  - ${m.month}: income $${m.income}, expense $${m.expense}`).join("\n")
    : "  - No monthly trend data";

  const forecastLine = forecast
    ? `  - Next month estimate: income $${forecast.predictedIncome}, expense $${forecast.predictedExpense} (${forecast.confidence} confidence)`
    : "  - Forecast unavailable";

  const scoreLine = financialScore
    ? `  - Financial score: ${financialScore.score} (${financialScore.label}), savings rate ${financialScore.savingsRate}%`
    : "  - Financial score unavailable";

  const assetsLine = assets
    ? `  - Assets: total value $${assets.totalValue}, cost $${assets.totalCost}, P&L $${assets.gainLoss}`
    : "  - Assets unavailable";

  return `You are FinPilot, a friendly and smart personal finance assistant.
You give short, practical, personalized financial advice based on the user's real data.

USER FINANCIAL SNAPSHOT (month-to-date):
- Monthly Income:   $${user.monthlyIncome}
- Total Income:     $${summary.totalIncome}
- Total Expenses:   $${summary.totalExpense}
- Net Balance:      $${summary.netBalance}
- Savings Rate:     ${summary.savingsPercent}%
- Plan:             ${user.subscriptionTier}

SPENDING BY CATEGORY:
${categories || "  - No transactions this month"}

ACTIVE GOALS:
${goalsList}

RECENT TRANSACTIONS (most recent first):
${recentTransactions}

MONTHLY TREND (last 3 months):
${trendLines}

FORECAST:
${forecastLine}

FINANCIAL SCORE:
${scoreLine}

ASSETS:
${assetsLine}

RULES:
- Be concise. Max 4-5 sentences per reply.
- Always refer to the user's actual numbers when relevant.
- If user asks for "last" spending/expense, answer with the most recent single expense transaction, not category aggregates.
- If user asks for last/latest transaction, answer with the most recent transaction from RECENT TRANSACTIONS.
- If user asks with typo words like "speding" or "transctins", infer the intent as spending/transactions.
- Never guarantee investment returns.
- Never suggest illegal financial activity.
- If asked about something outside personal finance, politely redirect.
`;
};

/**
 * Sends conversation to Groq with full financial context
 * history = array of { role: "user"|"assistant", content: string }
 */
const chat = async ({ user, summary, categoryBreakdown, goals, monthlyTrend, recentTx, forecast, financialScore, assets, history, message }) => {
  const systemPrompt = buildSystemPrompt({ user, summary, categoryBreakdown, goals, monthlyTrend, recentTx, forecast, financialScore, assets });

  // Keep last 10 messages to stay within token limits
  const trimmedHistory = history.slice(-10);

  const messages = [
    { role: "system",  content: systemPrompt },
    ...trimmedHistory,
    { role: "user",    content: message },
  ];

  try {
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      max_tokens: 400,
      temperature: 0.7,
      messages,
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("AI chat error:", err?.message || err, {
      code: err?.code,
      type: err?.type,
      response: err?.response?.data || err?.response,
    });
    throw new Error(
      "AI chat failed. Check server logs for details and verify your GROQ_API_KEY."
    );
  }
};

module.exports = { chat };