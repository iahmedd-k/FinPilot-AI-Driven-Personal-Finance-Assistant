/**
 * Forecasts next month's cash flow based on
 * last 3 months average income & expenses
 */
const calculateForecast = (transactions) => {
  const now = new Date();

  // Group transactions by month (last 3 months)
  const monthlyData = {};

  transactions.forEach((t) => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0 };
    if (t.type === "income")  monthlyData[key].income  += t.amount;
    if (t.type === "expense") monthlyData[key].expense += t.amount;
  });

  const months = Object.values(monthlyData);
  if (months.length === 0) {
    return { predictedIncome: 0, predictedExpense: 0, predictedSavings: 0, confidence: "low" };
  }

  // Average across available months
  const avgIncome  = months.reduce((s, m) => s + m.income,  0) / months.length;
  const avgExpense = months.reduce((s, m) => s + m.expense, 0) / months.length;
  const predictedSavings = avgIncome - avgExpense;

  return {
    predictedIncome:  Math.round(avgIncome),
    predictedExpense: Math.round(avgExpense),
    predictedSavings: Math.round(predictedSavings),
    confidence: months.length >= 3 ? "high" : months.length === 2 ? "medium" : "low",
  };
};

module.exports = calculateForecast;