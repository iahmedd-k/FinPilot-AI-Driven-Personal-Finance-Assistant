const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const clampPercent = (value, { min = 0, max = 100 } = {}) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return clamp(numeric, min, max);
};

const DISCRETIONARY_CATEGORIES = new Set(["Dining", "Entertainment", "Shopping"]);

const calculateFinancialScore = ({
  totalIncome = 0,
  totalExpense = 0,
  goals = [],
  monthlyChart = [],
  transactions = [],
  budget = null,
}) => {
  const income = Number(totalIncome) || 0;
  const expense = Number(totalExpense) || 0;
  const net = income - expense;
  const savingsRate = income > 0 ? clampPercent((net / income) * 100, { min: -100, max: 100 }) : 0;

  const sortedMonths = [...monthlyChart].sort((a, b) => String(a?.month || "").localeCompare(String(b?.month || "")));
  const recentMonths = sortedMonths.slice(-3);
  const monthlyExpenses = recentMonths.map((item) => Number(item?.expense) || 0);
  const meanExpense = monthlyExpenses.length
    ? monthlyExpenses.reduce((sum, value) => sum + value, 0) / monthlyExpenses.length
    : 0;
  const variance = monthlyExpenses.length > 1
    ? monthlyExpenses.reduce((sum, value) => sum + ((value - meanExpense) ** 2), 0) / monthlyExpenses.length
    : 0;
  const cv = clampPercent(meanExpense > 0 ? (Math.sqrt(variance) / meanExpense) * 100 : 0);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const discretionarySpend = transactions
    .filter((tx) => {
      if (tx?.type !== "expense" || !DISCRETIONARY_CATEGORIES.has(tx?.category)) return false;
      const txDate = new Date(tx?.date);
      return !Number.isNaN(txDate.getTime()) && txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
    })
    .reduce((sum, tx) => sum + Math.abs(Number(tx?.amount) || 0), 0);
  const discretionaryPercent = clampPercent(income > 0 ? (discretionarySpend / income) * 100 : 0);

  const goalProgress = goals.length > 0
    ? clampPercent((goals.reduce((sum, goal) => {
      const target = Number(goal?.targetAmount) || 0;
      const current = Number(goal?.currentAmount) || 0;
      const progressPercent = Number(goal?.progressPercent);
      if (Number.isFinite(progressPercent)) return sum + clampPercent(progressPercent);
      if (target <= 0) return sum;
      return sum + clampPercent((current / target) * 100);
    }, 0) / goals.length))
    : 0;

  const incomeMonths = sortedMonths.filter((month) => (Number(month?.income) || 0) > 0).length;
  const totalMonths = sortedMonths.length || 1;
  const incomeStability = clampPercent((incomeMonths / totalMonths) * 100);

  const p1 = clampPercent(savingsRate * 5);
  const p2 = clampPercent(100 - cv);
  const p3 = budget?.amount > 0
    ? clampPercent((1 - ((expense - budget.amount) / budget.amount)) * 100)
    : clampPercent(100 - discretionaryPercent * 2);
  const p4 = goalProgress;
  const p5 = incomeStability;

  const score = clampPercent(Math.round((p1 * 0.30) + (p2 * 0.20) + (p3 * 0.20) + (p4 * 0.15) + (p5 * 0.15)));
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs Work";

  return {
    score,
    label,
    savingsRate: Math.round(savingsRate),
    discPercent: Math.round(discretionaryPercent),
    breakdown: {
      savingsRate: Math.round(p1),
      consistency: Math.round(p2),
      discipline: Math.round(p3),
      goals: Math.round(p4),
      stability: Math.round(p5),
    },
  };
};

module.exports = calculateFinancialScore;
