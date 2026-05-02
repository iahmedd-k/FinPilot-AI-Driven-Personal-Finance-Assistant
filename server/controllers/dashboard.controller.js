const Transaction = require("../models/Transaction");
const Goal = require("../models/Goal");
const User = require("../models/User");
const ForecastCustomization = require("../models/ForecastCustomization");
const calculateFinancialScore = require("../services/ai/financialScoreService");
const calculateForecast = require("../services/ai/forecastService");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const DEFAULT_SPENDING_SETTINGS = {
  budgetSettings: {
    defaultMonthlyBudget: 0,
    budgetWarning50: true,
    budgetWarning80: true,
    budgetWarning100: true,
    carryForwardBudget: true,
    resetPeriod: "monthly",
  },
  categorySettings: {
    hiddenCategoryIds: [],
  },
  alertSettings: {
    notificationsEnabled: true,
    categorySpikeAlerts: true,
    categorySpikePercent: 25,
    largeTransactionAlerts: true,
    largeTransactionAmount: 500,
    recurringReminderAlerts: true,
  },
  recurringSettings: {
    reminderDaysBefore: 3,
    autoDetectRecurring: true,
    showInferredRecurring: true,
    defaultExpenseCategory: "Subscriptions",
    defaultIncomeCategory: "Salary",
  },
  transactionPreferences: {
    defaultReviewStatus: "needs_review",
    includeHiddenInAnalytics: false,
    includeRecurringInBudget: true,
    defaultSortDirection: "desc",
  },
  reportPreferences: {
    defaultRange: "last_6_months",
    defaultTab: "cashflow",
    defaultViewBy: "Category",
  },
};

const toNonNegativeNumber = (value, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

const toBoolean = (value, fallback) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
};

const sanitizeStringList = (value = []) => (
  Array.isArray(value)
    ? [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))]
    : []
);

const normalizeSpendingSettings = (input = {}) => {
  const budgetSettings = input?.budgetSettings || {};
  const categorySettings = input?.categorySettings || {};
  const alertSettings = input?.alertSettings || {};
  const recurringSettings = input?.recurringSettings || {};
  const transactionPreferences = input?.transactionPreferences || {};
  const reportPreferences = input?.reportPreferences || {};

  return {
    budgetSettings: {
      defaultMonthlyBudget: toNonNegativeNumber(budgetSettings.defaultMonthlyBudget, DEFAULT_SPENDING_SETTINGS.budgetSettings.defaultMonthlyBudget),
      budgetWarning50: toBoolean(budgetSettings.budgetWarning50, DEFAULT_SPENDING_SETTINGS.budgetSettings.budgetWarning50),
      budgetWarning80: toBoolean(budgetSettings.budgetWarning80, DEFAULT_SPENDING_SETTINGS.budgetSettings.budgetWarning80),
      budgetWarning100: toBoolean(budgetSettings.budgetWarning100, DEFAULT_SPENDING_SETTINGS.budgetSettings.budgetWarning100),
      carryForwardBudget: toBoolean(budgetSettings.carryForwardBudget, DEFAULT_SPENDING_SETTINGS.budgetSettings.carryForwardBudget),
      resetPeriod: "monthly",
    },
    categorySettings: {
      hiddenCategoryIds: sanitizeStringList(categorySettings.hiddenCategoryIds),
    },
    alertSettings: {
      notificationsEnabled: toBoolean(alertSettings.notificationsEnabled, DEFAULT_SPENDING_SETTINGS.alertSettings.notificationsEnabled),
      categorySpikeAlerts: toBoolean(alertSettings.categorySpikeAlerts, DEFAULT_SPENDING_SETTINGS.alertSettings.categorySpikeAlerts),
      categorySpikePercent: clamp(toNonNegativeNumber(alertSettings.categorySpikePercent, DEFAULT_SPENDING_SETTINGS.alertSettings.categorySpikePercent), 0, 500),
      largeTransactionAlerts: toBoolean(alertSettings.largeTransactionAlerts, DEFAULT_SPENDING_SETTINGS.alertSettings.largeTransactionAlerts),
      largeTransactionAmount: toNonNegativeNumber(alertSettings.largeTransactionAmount, DEFAULT_SPENDING_SETTINGS.alertSettings.largeTransactionAmount),
      recurringReminderAlerts: toBoolean(alertSettings.recurringReminderAlerts, DEFAULT_SPENDING_SETTINGS.alertSettings.recurringReminderAlerts),
    },
    recurringSettings: {
      reminderDaysBefore: clamp(toNonNegativeNumber(recurringSettings.reminderDaysBefore, DEFAULT_SPENDING_SETTINGS.recurringSettings.reminderDaysBefore), 0, 60),
      autoDetectRecurring: toBoolean(recurringSettings.autoDetectRecurring, DEFAULT_SPENDING_SETTINGS.recurringSettings.autoDetectRecurring),
      showInferredRecurring: toBoolean(recurringSettings.showInferredRecurring, DEFAULT_SPENDING_SETTINGS.recurringSettings.showInferredRecurring),
      defaultExpenseCategory: String(recurringSettings.defaultExpenseCategory || DEFAULT_SPENDING_SETTINGS.recurringSettings.defaultExpenseCategory).trim() || DEFAULT_SPENDING_SETTINGS.recurringSettings.defaultExpenseCategory,
      defaultIncomeCategory: String(recurringSettings.defaultIncomeCategory || DEFAULT_SPENDING_SETTINGS.recurringSettings.defaultIncomeCategory).trim() || DEFAULT_SPENDING_SETTINGS.recurringSettings.defaultIncomeCategory,
    },
    transactionPreferences: {
      defaultReviewStatus: transactionPreferences.defaultReviewStatus === "reviewed" ? "reviewed" : DEFAULT_SPENDING_SETTINGS.transactionPreferences.defaultReviewStatus,
      includeHiddenInAnalytics: toBoolean(transactionPreferences.includeHiddenInAnalytics, DEFAULT_SPENDING_SETTINGS.transactionPreferences.includeHiddenInAnalytics),
      includeRecurringInBudget: toBoolean(transactionPreferences.includeRecurringInBudget, DEFAULT_SPENDING_SETTINGS.transactionPreferences.includeRecurringInBudget),
      defaultSortDirection: transactionPreferences.defaultSortDirection === "asc" ? "asc" : "desc",
    },
    reportPreferences: {
      defaultRange: ["last_30_days", "last_90_days", "last_6_months", "year_to_date", "all_time"].includes(reportPreferences.defaultRange)
        ? reportPreferences.defaultRange
        : DEFAULT_SPENDING_SETTINGS.reportPreferences.defaultRange,
      defaultTab: ["cashflow", "expenses", "income"].includes(reportPreferences.defaultTab)
        ? reportPreferences.defaultTab
        : DEFAULT_SPENDING_SETTINGS.reportPreferences.defaultTab,
      defaultViewBy: reportPreferences.defaultViewBy === "Merchant" ? "Merchant" : "Category",
    },
  };
};

// @GET /api/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const last6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [allRecentTx, goals, user] = await Promise.all([
      Transaction.find({ userId, date: { $gte: last6Months } }).lean(),
      Goal.find({ userId, isCompleted: false }).lean(),
      User.findById(userId).select("budgets spendingSettings").lean(),
    ]);

    const currentMonthTx = allRecentTx.filter((t) => t.date >= startOfMonth && t.date <= endOfMonth);
    const last3MonthsTx = allRecentTx.filter((t) => t.date >= last3Months);

    let totalIncome = 0;
    let totalExpense = 0;

    currentMonthTx.forEach((t) => {
      if (t.type === "income") totalIncome += t.amount;
      if (t.type === "expense") totalExpense += t.amount;
    });

    const netBalance = totalIncome - totalExpense;
    const savingsPercent = totalIncome > 0
      ? Math.round(clamp(((totalIncome - totalExpense) / totalIncome) * 100, -100, 100))
      : 0;

    const categoryMap = {};
    currentMonthTx
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = t.category || "Other Expense";
        categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
      });

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount),
        percent: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const chartMap = {};
    allRecentTx.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!chartMap[key]) chartMap[key] = { month: key, income: 0, expense: 0, categories: {} };
      if (t.type === "income") chartMap[key].income += t.amount;
      if (t.type === "expense") {
        chartMap[key].expense += t.amount;
        const cat = t.category || "Other Expense";
        chartMap[key].categories[cat] = (chartMap[key].categories[cat] || 0) + t.amount;
      }
    });

    const monthlyChart = Object.values(chartMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        ...m,
        income: Math.round(m.income),
        expense: Math.round(m.expense),
        categories: Object.fromEntries(
          Object.entries(m.categories || {}).map(([cat, amount]) => [cat, Math.round(amount)])
        ),
      }));

    const budgetEntry = user?.budgets?.find((b) => b.month === currentMonth) || null;
    const budget = budgetEntry
      ? { month: budgetEntry.month, amount: budgetEntry.amount }
      : null;

    const financialScore = calculateFinancialScore({
      totalIncome,
      totalExpense,
      goals,
      monthlyChart,
      transactions: currentMonthTx,
      budget,
    });

    const forecast = req.user.subscriptionTier === "pro"
      ? calculateForecast(last3MonthsTx)
      : null;

    res.status(200).json({
      success: true,
      dashboard: {
        summary: {
          totalIncome: Math.round(totalIncome),
          totalExpense: Math.round(totalExpense),
          netBalance: Math.round(netBalance),
          savingsPercent,
        },
        financialScore,
        categoryBreakdown,
        monthlyChart,
        forecast,
        budget,
        spendingSettings: normalizeSpendingSettings(user?.spendingSettings),
        goals: goals.map((g) => ({
          _id: g._id,
          title: g.title,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          progressPercent: g.progressPercent,
          daysRemaining: g.daysRemaining,
          monthlySavingNeeded: g.monthlySavingNeeded,
          deadline: g.deadline,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @GET /api/dashboard/spending-settings
const getSpendingSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("spendingSettings").lean();
    res.status(200).json({
      success: true,
      spendingSettings: normalizeSpendingSettings(user?.spendingSettings),
    });
  } catch (err) {
    next(err);
  }
};

// @POST /api/dashboard/spending-settings
const saveSpendingSettings = async (req, res, next) => {
  try {
    const spendingSettings = normalizeSpendingSettings(req.body || {});
    await User.findByIdAndUpdate(
      req.user._id,
      { $set: { spendingSettings } },
      { new: false, runValidators: true }
    );

    res.status(200).json({
      success: true,
      spendingSettings,
    });
  } catch (err) {
    next(err);
  }
};

// @GET /api/dashboard/summary
const getSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startOfMonth },
    }).lean();

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t) => {
      if (t.type === "income") totalIncome += t.amount;
      if (t.type === "expense") totalExpense += t.amount;
    });

    res.status(200).json({
      success: true,
      summary: {
        totalIncome: Math.round(totalIncome),
        totalExpense: Math.round(totalExpense),
        netBalance: Math.round(totalIncome - totalExpense),
        savingsPercent: totalIncome > 0
          ? Math.round(clamp(((totalIncome - totalExpense) / totalIncome) * 100, -100, 100))
          : 0,
        transactionCount: transactions.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @GET /api/dashboard/forecast
const getForecast = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: last3Months },
    }).lean();

    const useCustomizations = req.query.useCustomizations === "true";
    let customization = null;

    if (useCustomizations) {
      customization = await ForecastCustomization.findOne({ userId });
      if (!customization) {
        customization = new ForecastCustomization({
          userId,
          events: [{ type: "retirement", enabled: true, details: { age: 67 } }],
        });
        await customization.save();
      }
    }

    const forecast = calculateForecast(transactions, customization);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthTx = transactions.filter((t) => t.date >= startOfMonth);

    let currentIncome = 0;
    let currentExpense = 0;

    currentMonthTx.forEach((t) => {
      if (t.type === "income") currentIncome += t.amount;
      if (t.type === "expense") currentExpense += t.amount;
    });

    const currentBalance = currentIncome - currentExpense;

    res.status(200).json({
      success: true,
      isPro: true,
      forecast: {
        ...forecast,
        currentBalance: Math.round(currentBalance),
        forecastBalance: Math.round(
          currentBalance + forecast.predictedIncome - forecast.predictedExpense
        ),
        usedCustomizations: useCustomizations,
        customizationId: customization?._id || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @POST /api/dashboard/budget
const setBudget = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { month, amount } = req.body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "month must be in YYYY-MM format" });
    }

    if (amount == null || Number.isNaN(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({ success: false, message: "amount must be a non-negative number" });
    }

    const existing = await User.findOne({ _id: userId, "budgets.month": month });

    if (existing) {
      await User.updateOne(
        { _id: userId, "budgets.month": month },
        { $set: { "budgets.$.amount": Number(amount) } }
      );
    } else {
      await User.updateOne(
        { _id: userId },
        { $push: { budgets: { month, amount: Number(amount) } } }
      );
    }

    res.status(200).json({
      success: true,
      budget: { month, amount: Number(amount) },
    });
  } catch (err) {
    next(err);
  }
};

// @GET /api/dashboard/budget
const getBudget = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "month must be in YYYY-MM format" });
    }

    const user = await User.findById(userId).select("budgets").lean();
    const entry = user?.budgets?.find((b) => b.month === month) || null;

    res.status(200).json({
      success: true,
      budget: entry ? { month: entry.month, amount: entry.amount } : null,
    });
  } catch (err) {
    next(err);
  }
};

// @GET /api/dashboard/forecast/customizations
const getForecastCustomizations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    let customization = await ForecastCustomization.findOne({ userId });

    if (!customization) {
      customization = new ForecastCustomization({
        userId,
        events: [{ type: "retirement", enabled: true, details: { age: 67 } }],
      });
      await customization.save();
    }

    res.status(200).json({
      success: true,
      customizations: customization,
    });
  } catch (err) {
    next(err);
  }
};

// @POST /api/dashboard/forecast/customizations
const saveForecastCustomizations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { events, customData } = req.body;

    if (!events || !Array.isArray(events) || !customData || typeof customData !== "object") {
      return res.status(400).json({
        success: false,
        message: "Invalid customization data",
      });
    }

    const normalizedEvents = events.map((event) => ({
      ...event,
      enabled: event?.enabled === true || event?.enabled === "true",
      details: event?.details && typeof event.details === "object" ? event.details : {},
    }));

    const MIN_EVENT_AGE = 30;
    const MAX_EVENT_AGE = 90;
    const isValidMonth = (month) => !month || /^\d{4}-\d{2}$/.test(String(month));
    const hasValidNonNegativeNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;

    const firstInvalidEventMessage = (() => {
      for (const event of normalizedEvents) {
        if (!event?.enabled) continue;
        const details = event?.details || {};

        if (!isValidMonth(details.month)) {
          return `${event.type} has an invalid month format`;
        }

        if (event.type === "retirement") {
          if (Number.isFinite(Number(details.age))) {
            const age = Number(details.age);
            if (age < MIN_EVENT_AGE || age > MAX_EVENT_AGE) {
              return `Retirement age must be between ${MIN_EVENT_AGE} and ${MAX_EVENT_AGE}`;
            }
          }
          continue;
        }

        const age = Number(details.age);
        if (!Number.isFinite(age) || age < MIN_EVENT_AGE || age > MAX_EVENT_AGE) {
          return `${event.type} requires an age between ${MIN_EVENT_AGE} and ${MAX_EVENT_AGE}`;
        }

        const requiredByType = {
          home_purchase: ["amount", "downPayment"],
          home_sale: ["amount"],
          additional_income: ["amount"],
          windfall: ["amount"],
          equity: ["amount"],
          child: ["annualCost"],
          college: ["annualContribution"],
        };

        const requiredFields = requiredByType[event.type] || [];
        for (const field of requiredFields) {
          if (!hasValidNonNegativeNumber(details[field])) {
            return `${event.type} requires a valid ${field}`;
          }
        }

        if (event.type === "custom") {
          const title = String(details.title || "").trim();
          const note = String(details.note || "").trim();
          if (!title && !note) {
            return "Custom event requires title or note";
          }
        }

      }

      return null;
    })();

    if (firstInvalidEventMessage) {
      return res.status(400).json({
        success: false,
        message: firstInvalidEventMessage,
      });
    }

    let customization = await ForecastCustomization.findOne({ userId });

    if (customization) {
      customization.events = normalizedEvents;
      customization.customData = { ...customization.customData, ...customData };
      await customization.save();
    } else {
      customization = new ForecastCustomization({ userId, events: normalizedEvents, customData });
      await customization.save();
    }

    res.status(200).json({
      success: true,
      customizations: customization,
      message: "Forecast customizations saved successfully",
    });
  } catch (err) {
    next(err);
  }
};

// @POST /api/dashboard/forecast/customizations/reset
const resetForecastCustomizations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await ForecastCustomization.deleteOne({ userId });

    const customization = new ForecastCustomization({
      userId,
      events: [{ type: "retirement", enabled: true, details: { age: 67 } }],
    });
    await customization.save();

    res.status(200).json({
      success: true,
      customizations: customization,
      message: "Forecast customizations reset to defaults",
    });
  } catch (err) {
    next(err);
  }
};

// @POST /api/dashboard/export ───────────────────────────────
const exportDashboardData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const last6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [allRecentTx, goals, dashboardUser] = await Promise.all([
      Transaction.find({ userId, date: { $gte: last6Months } }).sort({ date: -1 }).lean(),
      Goal.find({ userId }).lean(),
      User.findById(userId).select("budgets name email subscriptionTier").lean(),
    ]);

    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const budgetEntry = dashboardUser?.budgets?.find((b) => b.month === currentMonth) || null;

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap = {};
    const monthMap = {};

    allRecentTx.forEach((t) => {
      if (t.type === "income") totalIncome += t.amount;
      if (t.type === "expense") totalExpense += t.amount;
      if (t.type === "expense") {
        const cat = t.category || "Other Expense";
        categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
      }
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap[key]) monthMap[key] = { month: key, income: 0, expense: 0 };
      if (t.type === "income") monthMap[key].income += t.amount;
      if (t.type === "expense") monthMap[key].expense += t.amount;
    });

    const netBalance = totalIncome - totalExpense;
    const savingsPercent = totalIncome > 0
      ? Math.round(clamp(((totalIncome - totalExpense) / totalIncome) * 100, -100, 100))
      : 0;

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount),
        percent: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const monthlyChart = Object.values(monthMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        month: m.month,
        income: Math.round(m.income),
        expense: Math.round(m.expense),
        net: Math.round(m.income - m.expense),
      }));

    const financialScore = calculateFinancialScore({
      totalIncome,
      totalExpense,
      goals,
      monthlyChart,
      transactions: allRecentTx.filter((t) => t.date >= new Date(now.getFullYear(), now.getMonth(), 1)),
      budget: budgetEntry,
    });

    const forecast = calculateForecast(allRecentTx.filter((t) => t.date >= new Date(now.getFullYear(), now.getMonth() - 3, 1)));

    res.status(200).json({
      success: true,
      data: {
        user: {
          name: dashboardUser.name,
          email: dashboardUser.email,
          plan: dashboardUser.subscriptionTier,
          exportDate: now.toISOString(),
        },
        summary: {
          totalIncome: Math.round(totalIncome),
          totalExpense: Math.round(totalExpense),
          netBalance: Math.round(netBalance),
          savingsPercent,
        },
        financialScore,
        forecast,
        categoryBreakdown,
        monthlyChart,
        goals: goals.map((g) => ({
          title: g.title,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          progressPercent: g.progressPercent,
          daysRemaining: g.daysRemaining,
          isCompleted: g.isCompleted,
        })),
        transactions: allRecentTx.map((t) => ({
          date: t.date,
          merchant: t.merchant || t.description || "",
          category: t.category || "",
          type: t.type,
          amount: t.amount,
          notes: t.notes || "",
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard,
  getSummary,
  getForecast,
  setBudget,
  getBudget,
  getSpendingSettings,
  saveSpendingSettings,
  getForecastCustomizations,
  saveForecastCustomizations,
  resetForecastCustomizations,
  exportDashboardData,
};
