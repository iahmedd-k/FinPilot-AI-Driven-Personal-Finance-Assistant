const groq = require("../../config/groq");

/**
 * Builds the system prompt with user's full financial context
 * so AI gives personalized answers, not generic advice
 */
const buildSystemPrompt = ({ user, summary, categoryBreakdown, goals }) => {
  const categories = categoryBreakdown
    .map((c) => `  - ${c.category}: $${c.amount} (${c.percent}%)`)
    .join("\n");

  const goalsList = goals.length
    ? goals.map((g) => `  - ${g.title}: $${g.currentAmount}/$${g.targetAmount} (${g.progressPercent}% done, ${g.daysRemaining} days left)`).join("\n")
    : "  - No active goals set";

  return `You are FinPilot, a friendly and smart personal finance assistant.
You give short, practical, personalized financial advice based on the user's real data.

USER FINANCIAL SNAPSHOT (current month):
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

RULES:
- Be concise. Max 4-5 sentences per reply.
- Always refer to the user's actual numbers when relevant.
- Never guarantee investment returns.
- Never suggest illegal financial activity.
- If asked about something outside personal finance, politely redirect.
- End every response with a one-line disclaimer if giving financial advice.`;
};

/**
 * Sends conversation to Groq with full financial context
 * history = array of { role: "user"|"assistant", content: string }
 */
const chat = async ({ user, summary, categoryBreakdown, goals, history, message }) => {
  const systemPrompt = buildSystemPrompt({ user, summary, categoryBreakdown, goals });

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