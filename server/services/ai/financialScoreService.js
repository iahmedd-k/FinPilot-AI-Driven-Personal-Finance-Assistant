/**
 * Calculates a financial health score (0 - 100)
 * Based on savings rate, expense ratio, and goal progress
 */
const calculateFinancialScore = ({ totalIncome, totalExpense, savingsPercent, goals }) => {
  let score = 0;

  // ── 1. Savings Rate (40 points) ────────────────────
  // 20%+ savings = full points, scales down below
  const savingsScore = Math.min((savingsPercent / 20) * 40, 40);
  score += savingsScore;

  // ── 2. Expense Ratio (35 points) ──────────────────
  // Spending less than 80% of income = full points
  const expenseRatio = totalIncome > 0 ? totalExpense / totalIncome : 1;
  if (expenseRatio <= 0.5)       score += 35;
  else if (expenseRatio <= 0.7)  score += 28;
  else if (expenseRatio <= 0.8)  score += 20;
  else if (expenseRatio <= 0.9)  score += 10;
  else                           score += 0;

  // ── 3. Goals Progress (25 points) ─────────────────
  if (goals && goals.length > 0) {
    const avgProgress = goals.reduce((sum, g) => sum + g.progressPercent, 0) / goals.length;
    score += Math.min((avgProgress / 100) * 25, 25);
  } else {
    score += 10;                  // Neutral if no goals set
  }

  return {
    score: Math.round(score),
    label: getScoreLabel(score),
    breakdown: {
      savingsScore: Math.round(savingsScore),
      expenseScore: Math.round(score - savingsScore),
    },
  };
};

const getScoreLabel = (score) => {
  if (score >= 80) return "Excellent 🟢";
  if (score >= 60) return "Good 🟡";
  if (score >= 40) return "Fair 🟠";
  return "Needs Attention 🔴";
};

module.exports = calculateFinancialScore;