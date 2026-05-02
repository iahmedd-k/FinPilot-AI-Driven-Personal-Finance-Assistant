/**
 * Forecast next month's cash flow from recent transaction history.
 * Supports optional customization payload (ForecastCustomization doc).
 */

const calculateUserAge = (birthDate) => {
  if (!birthDate) return null;

  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
};

const groupMonthly = (transactions = []) => {
  const monthMap = {};

  for (const t of transactions) {
    const d = new Date(t.date);
    if (Number.isNaN(d.getTime())) continue;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[key]) monthMap[key] = { month: key, income: 0, expense: 0 };

    if (t.type === "income") monthMap[key].income += Number(t.amount) || 0;
    if (t.type === "expense") monthMap[key].expense += Number(t.amount) || 0;
  }

  return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
};

const weightedPrediction = (monthly = []) => {
  const recent3 = monthly.slice(-3);

  if (recent3.length === 0) {
    return {
      predictedIncome: 0,
      predictedExpense: 0,
      predictedSavings: 0,
      confidence: "low",
    };
  }

  const weights = recent3.length === 3 ? [1, 2, 3] : recent3.length === 2 ? [1, 2] : [1];
  const wTotal = weights.reduce((s, w) => s + w, 0);

  const predictedIncome = Math.round(
    recent3.reduce((s, m, i) => s + (m.income || 0) * weights[i], 0) / wTotal
  );
  const predictedExpense = Math.round(
    recent3.reduce((s, m, i) => s + (m.expense || 0) * weights[i], 0) / wTotal
  );

  return {
    predictedIncome,
    predictedExpense,
    predictedSavings: predictedIncome - predictedExpense,
    confidence: monthly.length >= 3 ? "high" : monthly.length === 2 ? "medium" : "low",
  };
};

const parseYearMonth = (value) => {
  if (!value || !/^\d{4}-\d{2}$/.test(String(value))) return null;
  const [year, month] = String(value).split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
};

const monthDiffFromNow = ({ year, month }) => {
  const now = new Date();
  return (year - now.getFullYear()) * 12 + (month - (now.getMonth() + 1));
};

const resolveEventMonthIndex = (event, customData) => {
  const details = event?.details || {};

  const explicitMonth = parseYearMonth(details.month);
  if (explicitMonth) return Math.max(0, monthDiffFromNow(explicitMonth));

  const age = Number(details.age);
  const userAge = calculateUserAge(customData?.birthDate);
  if (Number.isFinite(age) && Number.isFinite(userAge)) {
    return Math.max(0, Math.round((age - userAge) * 12));
  }

  // If no timing info can be derived, apply the event immediately.
  return 0;
};

const mortgagePayment = (principal, annualRate = 0.065, years = 30) => {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const months = years * 12;
  if (monthlyRate <= 0) return principal / months;
  return principal * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
};

const applyCustomizations = (baseForecast, customization) => {
  if (!customization) return baseForecast;

  const out = { ...baseForecast };
  const customData = customization.customData || {};
  const events = Array.isArray(customization.events)
    ? customization.events.filter((e) => e?.enabled === true)
    : [];

  const baseIncome = customData.annualIncome != null && !Number.isNaN(Number(customData.annualIncome))
    ? Number(customData.annualIncome) / 12
    : out.predictedIncome;
  const baseExpense = customData.monthlyExpenses != null && !Number.isNaN(Number(customData.monthlyExpenses))
    ? Number(customData.monthlyExpenses)
    : out.predictedExpense;

  const horizonMonths = 12;
  const monthlyIncome = Array.from({ length: horizonMonths }, () => Number(baseIncome) || 0);
  const monthlyExpense = Array.from({ length: horizonMonths }, () => Number(baseExpense) || 0);

  const liabilities = Number(customData.liabilities) || 0;
  if (liabilities > 0) {
    const liabilityDrag = liabilities / 120; // Approximate 10-year spread for monthly cash impact.
    for (let i = 0; i < horizonMonths; i += 1) monthlyExpense[i] += liabilityDrag;
  }

  for (const event of events) {
    const details = event?.details || {};
    const startIndex = resolveEventMonthIndex(event, customData);
    if (startIndex >= horizonMonths) continue;

    switch (event.type) {
      case "retirement": {
        const replacementPct = Number(details.incomeReplacement);
        const ratio = Number.isFinite(replacementPct) ? Math.max(0, replacementPct) / 100 : 0.3;
        for (let i = startIndex; i < horizonMonths; i += 1) {
          monthlyIncome[i] = monthlyIncome[i] * ratio;
        }
        break;
      }

      case "home_purchase": {
        const amount = Number(details.amount) || 0;
        const downPayment = Number(details.downPayment) || 0;
        const principal = Math.max(0, amount - downPayment);
        const payment = mortgagePayment(principal);
        for (let i = startIndex; i < horizonMonths; i += 1) {
          monthlyExpense[i] += payment;
        }
        break;
      }

      case "home_sale": {
        const amount = Number(details.amount) || 0;
        monthlyIncome[startIndex] += amount;
        break;
      }

      case "child": {
        const annualCost = Number(details.annualCost) || 0;
        const monthlyCost = annualCost / 12;
        for (let i = startIndex; i < horizonMonths; i += 1) {
          monthlyExpense[i] += monthlyCost;
        }
        break;
      }

      case "college": {
        const annualContribution = Number(details.annualContribution) || 0;
        const monthlyContribution = annualContribution / 12;
        for (let i = startIndex; i < horizonMonths; i += 1) {
          monthlyExpense[i] += monthlyContribution;
        }
        break;
      }

      case "additional_income": {
        const amount = Number(details.amount) || 0;
        for (let i = startIndex; i < horizonMonths; i += 1) {
          monthlyIncome[i] += amount;
        }
        break;
      }

      case "windfall": {
        const amount = Number(details.amount) || 0;
        monthlyIncome[startIndex] += amount;
        break;
      }

      case "equity": {
        const amount = Number(details.amount) || 0;
        monthlyIncome[startIndex] += amount;
        break;
      }

      case "custom": {
        const amount = Number(details.amount) || 0;
        if (amount >= 0) monthlyIncome[startIndex] += amount;
        else monthlyExpense[startIndex] += Math.abs(amount);
        break;
      }

      default:
        break;
    }
  }

  out.predictedIncome = Math.round(monthlyIncome.reduce((s, v) => s + v, 0) / horizonMonths);
  out.predictedExpense = Math.round(monthlyExpense.reduce((s, v) => s + v, 0) / horizonMonths);
  out.predictedSavings = out.predictedIncome - out.predictedExpense;
  return out;
};

const calculateForecast = (transactions = [], customization = null) => {
  const monthly = groupMonthly(transactions);
  const base = weightedPrediction(monthly);
  return applyCustomizations(base, customization);
};

module.exports = calculateForecast;
