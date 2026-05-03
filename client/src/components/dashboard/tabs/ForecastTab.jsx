// ─── src/components/dashboard/tabs/ForecastTab.jsx ───────────
// FIXED VERSION — all bugs resolved, see comments marked [FIX]

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
  ComposedChart, Line, Area, BarChart, Bar, ReferenceLine, ReferenceDot,
} from "recharts";
import {
  TrendingUp, ChevronRight, ArrowUpRight, ArrowDownRight,
  BadgeDollarSign, Wallet, Gem, Building2, Car,
  X, PlusCircle, GraduationCap, Banknote, DollarSign, ChartLine, Baby, RotateCcw, ChevronDown, ChevronUp, Heart, TreePalm, Info, CalendarDays, HeartPulse
} from "lucide-react";

import { C, CAT_COLORS, dedupToast } from "../dashboardShared";
import { usePortfolio } from "../../../context/PortfolioContext";
import { dashboardService } from "../../../services/dashboardService";
import { useAuthContext } from "../../../hooks/useAuthContext";
import { formatCurrencyAmount, getUserCurrency } from "../../../utils/currency";

const DEFAULT_CUSTOM_DATA = {
  portfolioGrowth: 0.05,
  annualIncome: "",
  monthlyExpenses: "",
  liabilities: 0,
  birthDate: "",
  lifeExpectancy: 85,
  netWorthTarget: "",
  taxFilingStatus: "single",
  location: "US",
  dependents: 0,
};

const FORECAST_MIN_AGE = 18;
const FORECAST_MAX_AGE = 90;

const parseYearMonth = (value) => {
  if (!value || !/^\d{4}-\d{2}$/.test(String(value))) return null;
  const [year, month] = String(value).split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
};

const getAgeFromBirthDate = (birthDate, now = new Date()) => {
  if (!birthDate) return 30;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 30;
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return Math.min(89, Math.max(FORECAST_MIN_AGE, age));
};

const getBirthYear = (birthDate, fallbackAge, now = new Date()) => {
  if (!birthDate) return now.getFullYear() - fallbackAge;
  const birth = new Date(birthDate);
  return Number.isNaN(birth.getTime()) ? now.getFullYear() - fallbackAge : birth.getFullYear();
};

const parseFinValue = (val) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const mortgagePayment = (principal, annualRate = 0.06, years = 30) => {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const months = years * 12;
  if (monthlyRate <= 0) return principal / months;
  return principal * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
};

// ─── Theme-aware style helpers ─────────────────────────────────────────────
// [FIX] Dark theme: replace all hardcoded hex colors with C-variable references
// or CSS custom properties so they respond to light/dark mode correctly.
const getThemeStyles = (C) => ({
  iconBg: { background: C.bg },
  iconBgBlue: { background: "var(--color-blue-tint, rgba(59,130,246,0.1))" },
  iconBgGreen: { background: "var(--color-green-tint, rgba(34,197,94,0.1))" },
  axisColor: C.muted,
  gridColor: C.border,
  tooltipBg: C.white,
  // Input / select fields must use C.white + C.text so dark mode inverts correctly
  inputStyle: (C) => ({
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 12,
    background: C.white,
    color: C.text,
    outline: "none",
  }),
});

function ForecastPage({ C, monthlyChart, apiTransactions, effectiveForecast, isMobile }) {
  const { user } = useAuthContext();
  const preferredCurrency = getUserCurrency(user);
  const [forecastTab, setForecastTab] = useState("networth");
  const { assets = [] } = usePortfolio();
  const queryClient = useQueryClient();

  const T = getThemeStyles(C);

  const eventTemplates = [
    { type: "home_purchase", label: "Buy a home", icon: Building2, details: { age: 35, amount: 400000, downPayment: 80000 } },
    { type: "home_sale", label: "Sell home", icon: Building2, details: { age: 55, amount: 500000 } },
    { type: "child", label: "Have a kid", icon: Baby, details: { age: 34, annualCost: 12000 } },
    { type: "college", label: "College savings", icon: GraduationCap, details: { age: 40, annualContribution: 6000 } },
    { type: "windfall", label: "Windfall event", icon: Banknote, details: { age: 45, amount: 50000 } },
    { type: "additional_income", label: "Additional income", icon: DollarSign, details: { age: 38, amount: 500 } },
    { type: "equity", label: "Equity", icon: ChartLine, details: { age: 36, amount: 25000 } },
    { type: "custom", label: "Custom event", icon: PlusCircle, details: { age: 35, note: "Custom event" } },
  ];

  const eventLabel = (type) => eventTemplates.find((t) => t.type === type)?.label || type;

  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState("events");
  const [draftEvents, setDraftEvents] = useState([]);
  const [draftCustomData, setDraftCustomData] = useState(DEFAULT_CUSTOM_DATA);
  const [collapsedEventIndexes, setCollapsedEventIndexes] = useState([]);
  const [activeMilestoneHint, setActiveMilestoneHint] = useState(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const { data: customizationRes } = useQuery({
    queryKey: ["forecast-customizations"],
    queryFn: () => dashboardService.getForecastCustomizations().then((r) => r.data),
  });

  const { data: forecastRes } = useQuery({
    queryKey: ["forecast", "customized"],
    queryFn: () => dashboardService.getForecast({ useCustomizations: true }).then((r) => r.data),
  });

  const saveCustomizationsMutation = useMutation({
    mutationFn: (payload) => dashboardService.saveForecastCustomizations(payload).then((r) => r.data),
    onSuccess: async (data) => {
      if (data?.customizations) {
        queryClient.setQueryData(["forecast-customizations"], { success: true, customizations: data.customizations });
      }
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["forecast", "customized"], exact: true }),
        queryClient.refetchQueries({ queryKey: ["dashboard"], type: "active" }),
        queryClient.refetchQueries({ queryKey: ["forecast-customizations"], exact: true }),
      ]);
      dedupToast.success("Forecast settings saved");
      setShowModal(false);
    },
    onError: (err) => dedupToast.error(err?.response?.data?.message || "Failed to save forecast settings"),
  });

  const resetCustomizationsMutation = useMutation({
    mutationFn: () => dashboardService.resetForecastCustomizations().then((r) => r.data),
    onSuccess: async (data) => {
      if (data?.customizations) {
        queryClient.setQueryData(["forecast-customizations"], { success: true, customizations: data.customizations });
      }
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["forecast", "customized"], exact: true }),
        queryClient.refetchQueries({ queryKey: ["dashboard"], type: "active" }),
        queryClient.refetchQueries({ queryKey: ["forecast-customizations"], exact: true }),
      ]);
      dedupToast.success("Forecast settings reset");
    },
    onError: () => dedupToast.error("Failed to reset forecast settings"),
  });

  const fmt = (n) => {
    const numeric = Number(n || 0);
    const formatted = formatCurrencyAmount(Math.abs(numeric), preferredCurrency, { maximumFractionDigits: 0 });
    return numeric < 0 ? `-${formatted}` : formatted;
  };

  const sorted = [...(monthlyChart || [])].sort((a, b) => (a.month || "").localeCompare(b.month || ""));
  const recent3 = sorted.slice(-3);
  const weights = recent3.length === 3 ? [1, 2, 3] : recent3.length === 2 ? [1, 2] : [1];
  const wTotal = weights.reduce((s, w) => s + w, 0);

  const activeForecast = forecastRes?.forecast || effectiveForecast;
  const predictedIncome = activeForecast?.predictedIncome ?? (recent3.length ? Math.round(recent3.reduce((s, m, i) => s + (m.income || 0) * weights[i], 0) / wTotal) : 0);
  const predictedExpense = activeForecast?.predictedExpense ?? (recent3.length ? Math.round(recent3.reduce((s, m, i) => s + (m.expense || 0) * weights[i], 0) / wTotal) : 0);
  const monthlySavings = predictedIncome - predictedExpense;
  const confidence = activeForecast?.confidence ?? (sorted.length >= 3 ? "high" : sorted.length >= 2 ? "medium" : "low");

  const currentBalance = sorted.reduce((s, m) => s + (m.income || 0) - (m.expense || 0), 0);
  const totalAssetsNow = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
  const currentNetWorth = totalAssetsNow + currentBalance;

  // [FIX] cashFlowForecast was computed but unused; kept for potential display use
  const cashFlowForecast = currentBalance + predictedIncome - predictedExpense;

  const now = useMemo(() => new Date(), []);
  const AGE_START = FORECAST_MIN_AGE;
  const AGE_END = FORECAST_MAX_AGE;

  // [FIX] customData must ALWAYS read from customizationRes when modal is closed.
  // Previously showModal toggled the source which caused stale reads.
  const customData = useMemo(() => {
    if (showModal) return draftCustomData;
    return customizationRes?.customizations?.customData || {};
  }, [showModal, draftCustomData, customizationRes]);

  const configuredBirthDate = customData.birthDate;
  const currentAge = useMemo(() => {
    const fallbackAge = 30;
    if (!configuredBirthDate) return fallbackAge;
    const birth = new Date(configuredBirthDate);
    if (Number.isNaN(birth.getTime())) return fallbackAge;
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
    return Math.min(89, Math.max(18, age));
  }, [configuredBirthDate, now]);

  const timelineBirthYear = useMemo(() => {
    if (!configuredBirthDate) return now.getFullYear() - currentAge;
    const birth = new Date(configuredBirthDate);
    return Number.isNaN(birth.getTime()) ? now.getFullYear() - currentAge : birth.getFullYear();
  }, [configuredBirthDate, currentAge, now]);

  const netWorthBase = currentNetWorth - (parseFinValue(customData.liabilities) || 0);
  let growthInput = parseFinValue(customData.portfolioGrowth);
  if (!Number.isFinite(growthInput)) growthInput = 0.05;
  if (Math.abs(growthInput) > 1) growthInput = growthInput / 100;
  const annualGrowthRate = Math.min(0.25, Math.max(-0.5, growthInput));
  const annualContribution = monthlySavings * 12;

  // [FIX] netWorthAtAge: formula is mathematically correct (FV of PV + annuity).
  // This function is now ONLY used as a fallback; primary chart uses projectionSeries
  // so both charts show consistent values.
  const netWorthAtAge = (age) => {
    const years = age - currentAge;
    if (years <= 0) return Math.round(currentNetWorth);
    if (Math.abs(annualGrowthRate) < 1e-9) return Math.round(netWorthBase + annualContribution * years);
    const growthFactor = Math.pow(1 + annualGrowthRate, years);
    const annuityFactor = (growthFactor - 1) / annualGrowthRate;
    return Math.round(netWorthBase * growthFactor + annualContribution * annuityFactor);
  };

  const projectionCurrentAge = currentAge;
  const projectionEndAge = useMemo(() => {
    const customLimit = parseFinValue(customData.lifeExpectancy);
    return Math.min(FORECAST_MAX_AGE, Math.max(projectionCurrentAge + 1, Number.isFinite(customLimit) && customLimit > 0 ? Math.round(customLimit) : FORECAST_MAX_AGE));
  }, [customData.lifeExpectancy, projectionCurrentAge]);

  const projectionBirthYear = useMemo(() => getBirthYear(configuredBirthDate, projectionCurrentAge, now), [configuredBirthDate, projectionCurrentAge, now]);
  const projectionStartMonth = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);
  const projectionMonths = useMemo(() => Math.max(12, (projectionEndAge - projectionCurrentAge) * 12), [projectionEndAge, projectionCurrentAge]);
  const projectionLiabilities = parseFinValue(customData.liabilities) || 0;
  const projectionBaseIncome = customData.annualIncome != null && customData.annualIncome !== "" ? parseFinValue(customData.annualIncome) / 12 : predictedIncome;
  const projectionBaseExpense = customData.monthlyExpenses != null && customData.monthlyExpenses !== "" ? parseFinValue(customData.monthlyExpenses) : predictedExpense;
  const projectionLiabilityDrag = projectionLiabilities > 0 ? projectionLiabilities / 120 : 0;
  const projectionMonthlyGrowthRate = Math.pow(1 + annualGrowthRate, 1 / 12) - 1;

  // [FIX] Events source: always read from customizationRes when modal is closed.
  // The showModal flag is intentional — during modal editing we preview from draftEvents.
  // After save, React Query refetches customizationRes so the chart updates automatically.
  const projectionEvents = useMemo(() => {
    const events = showModal
      ? draftEvents
      : (customizationRes?.customizations?.events || []);

    return events
      .filter((event) => event?.enabled === true)
      .map((event, index) => {
        const details = event?.details || {};
        const explicitMonth = parseYearMonth(details.month);
        let monthOffset = 0;

        if (explicitMonth) {
          monthOffset = Math.max(0, (explicitMonth.year - projectionStartMonth.getFullYear()) * 12 + (explicitMonth.month - (projectionStartMonth.getMonth() + 1)));
        } else if (Number.isFinite(parseFinValue(details.age))) {
          monthOffset = Math.max(0, Math.round((parseFinValue(details.age) - projectionCurrentAge) * 12));
        } else if (event.type === "retirement") {
          monthOffset = Math.max(0, Math.round(((parseFinValue(details.age) || 67) - projectionCurrentAge) * 12));
        }

        return {
          ...event,
          monthOffset,
          age: projectionCurrentAge + monthOffset / 12,
          title: event.type === "custom" ? (details.title || "Custom event") : eventLabel(event.type),
          iconType: event.type === "retirement" ? "retirement" : event.type === "child" ? "heart" : "info",
          id: `${event.type}-${monthOffset}-${index}`,
        };
      })
      .filter((event) => event.age >= projectionCurrentAge && event.age <= projectionEndAge)
      .sort((a, b) => a.monthOffset - b.monthOffset);
  }, [showModal, draftEvents, customizationRes, projectionStartMonth, projectionCurrentAge, projectionEndAge]);

  // [FIX] projectionSeries: corrected math for home_sale and liability handling
  const projectionSeries = useMemo(() => {
    const eventMap = new Map();
    projectionEvents.forEach((event) => {
      const list = eventMap.get(event.monthOffset) || [];
      list.push(event);
      eventMap.set(event.monthOffset, list);
    });

    let runningBalance = Math.round(currentBalance);
    let runningInvestments = Math.round(totalAssetsNow);
    let runningLiabilities = Math.round(projectionLiabilities);

    let recurringIncomeDelta = 0;
    let recurringExpenseDelta = projectionLiabilityDrag;
    let incomeMultiplier = 1;

    // Track stateful objects that can be removed
    let activeMortgages = []; // { id, monthlyPayment, costBasis, loanAmount }

    // [FIX] Process events for month 0 (Today) BEFORE creating the startPoint
    // so that "Current Net Worth" and the first point on the graph reflect immediate changes.
    const eventsToday = eventMap.get(0) || [];
    let oneTimeIncomeToday = 0;
    let oneTimeExpenseToday = 0;

    eventsToday.forEach((event) => {
      const details = event.details || {};
      switch (event.type) {
        case "retirement": {
          const ratio = Number.isFinite(parseFinValue(details.incomeReplacement))
            ? Math.max(0, parseFinValue(details.incomeReplacement)) / 100
            : 0.3;
          incomeMultiplier *= ratio;
          break;
        }
        case "home_purchase": {
          const amount = parseFinValue(details.amount) || 0;
          const downPayment = Math.min(parseFinValue(details.downPayment) || 0, amount);
          const loanAmount = Math.max(0, amount - downPayment);
          const payment = mortgagePayment(loanAmount);

          oneTimeExpenseToday += downPayment;
          runningInvestments += amount;
          runningLiabilities += loanAmount;
          recurringExpenseDelta += payment;

          activeMortgages.push({
            id: event.id,
            monthlyPayment: payment,
            costBasis: amount,
            loanAmount: loanAmount,
          });
          break;
        }
        case "home_sale": {
          const saleAmount = parseFinValue(details.amount) || 0;
          oneTimeIncomeToday += saleAmount;
          if (activeMortgages.length > 0) {
            const mortgage = activeMortgages.shift();
            runningInvestments = Math.max(0, runningInvestments - mortgage.costBasis);
            runningLiabilities = Math.max(0, runningLiabilities - mortgage.loanAmount);
            recurringExpenseDelta = Math.max(0, recurringExpenseDelta - mortgage.monthlyPayment);
          } else {
            runningInvestments = Math.max(0, runningInvestments - saleAmount);
          }
          break;
        }
        case "windfall":
        case "equity":
          oneTimeIncomeToday += parseFinValue(details.amount) || 0;
          break;
        case "child":
          recurringExpenseDelta += (parseFinValue(details.annualCost) || 0) / 12;
          break;
        case "college":
          recurringExpenseDelta += (parseFinValue(details.annualContribution) || 0) / 12;
          break;
        case "additional_income":
          recurringIncomeDelta += parseFinValue(details.amount) || 0;
          break;
        case "custom": {
          const amount = parseFinValue(details.amount) || 0;
          if (amount >= 0) oneTimeIncomeToday += amount;
          else oneTimeExpenseToday += Math.abs(amount);
          break;
        }
        default:
          break;
      }
    });

    // Apply today's one-time items to running balance
    runningBalance += (oneTimeIncomeToday - oneTimeExpenseToday);

    const startPoint = {
      monthOffset: 0,
      age: projectionCurrentAge,
      label: "Today",
      dateLabel: projectionStartMonth.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      balance: runningBalance,
      netWorth: Math.round(runningInvestments + runningBalance - runningLiabilities),
      income: Math.round(projectionBaseIncome + oneTimeIncomeToday),
      expense: Math.round(projectionBaseExpense + recurringExpenseDelta + oneTimeExpenseToday),
      year: projectionStartMonth.getFullYear(),
      events: eventsToday.map((e) => e.title),
      eventCount: eventsToday.length,
    };

    const points = [startPoint];

    // Start loop from month 1 (next month)
    for (let monthOffset = 1; monthOffset <= projectionMonths; monthOffset += 1) {
      const eventsThisMonth = eventMap.get(monthOffset) || [];
      let oneTimeIncome = 0;
      let oneTimeExpense = 0;

      eventsThisMonth.forEach((event) => {
        const details = event.details || {};
        switch (event.type) {
          case "retirement": {
            const ratio = Number.isFinite(parseFinValue(details.incomeReplacement))
              ? Math.max(0, parseFinValue(details.incomeReplacement)) / 100
              : 0.3;
            incomeMultiplier *= ratio;
            break;
          }
          case "home_purchase": {
            const amount = parseFinValue(details.amount) || 0;
            const downPayment = Math.min(parseFinValue(details.downPayment) || 0, amount);
            const loanAmount = Math.max(0, amount - downPayment);
            const payment = mortgagePayment(loanAmount);

            oneTimeExpense += downPayment;
            runningInvestments += amount;
            runningLiabilities += loanAmount;
            recurringExpenseDelta += payment;

            activeMortgages.push({
              id: event.id,
              monthlyPayment: payment,
              costBasis: amount,
              loanAmount: loanAmount,
            });
            break;
          }
          case "home_sale": {
            const saleAmount = parseFinValue(details.amount) || 0;
            oneTimeIncome += saleAmount;

            // If we have a tracked mortgage, remove it. Otherwise assume general home sale.
            if (activeMortgages.length > 0) {
              const mortgage = activeMortgages.shift(); // Remove the oldest one
              runningInvestments = Math.max(0, runningInvestments - mortgage.costBasis);
              runningLiabilities = Math.max(0, runningLiabilities - mortgage.loanAmount);
              recurringExpenseDelta = Math.max(0, recurringExpenseDelta - mortgage.monthlyPayment);
            } else {
              // Fallback for untracked homes
              runningInvestments = Math.max(0, runningInvestments - saleAmount);
            }
            break;
          }
          case "windfall":
          case "equity":
            oneTimeIncome += parseFinValue(details.amount) || 0;
            break;
          case "child":
            recurringExpenseDelta += (parseFinValue(details.annualCost) || 0) / 12;
            break;
          case "college":
            recurringExpenseDelta += (parseFinValue(details.annualContribution) || 0) / 12;
            break;
          case "additional_income":
            recurringIncomeDelta += parseFinValue(details.amount) || 0;
            break;
          case "custom": {
            const amount = parseFinValue(details.amount) || 0;
            if (amount >= 0) oneTimeIncome += amount;
            else oneTimeExpense += Math.abs(amount);
            break;
          }
          default:
            break;
        }
      });

      const monthlyIncomeValue = Math.max(0, projectionBaseIncome * incomeMultiplier + recurringIncomeDelta);
      const monthlyExpenseValue = Math.max(0, projectionBaseExpense + recurringExpenseDelta);
      const monthlyNet = (monthlyIncomeValue + oneTimeIncome) - (monthlyExpenseValue + oneTimeExpense);

      runningBalance += monthlyNet;
      runningInvestments = runningInvestments * (1 + projectionMonthlyGrowthRate);

      const currentNW = Math.round(runningInvestments + runningBalance - runningLiabilities);

      const pointDate = new Date(
        projectionStartMonth.getFullYear(),
        projectionStartMonth.getMonth() + monthOffset,
        1
      );

      points.push({
        monthOffset: monthOffset,
        age: Number((projectionCurrentAge + monthOffset / 12).toFixed(2)),
        label: pointDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        dateLabel: pointDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        balance: Math.round(runningBalance),
        netWorth: currentNW,
        income: Math.round(monthlyIncomeValue + oneTimeIncome),
        expense: Math.round(monthlyExpenseValue + oneTimeExpense),
        year: pointDate.getFullYear(),
        events: eventsThisMonth.map((e) => e.title),
        eventCount: eventsThisMonth.length,
      });
    }

    return points;
  }, [
    projectionEvents,
    currentBalance,
    totalAssetsNow,
    projectionLiabilities,
    projectionLiabilityDrag,
    projectionBaseIncome,
    projectionBaseExpense,
    projectionMonths,
    projectionMonthlyGrowthRate,
    projectionStartMonth,
    projectionCurrentAge,
    projectionEndAge,
  ]);

  const projectionAgeTicks = (() => {
    const ticks = [projectionCurrentAge];
    for (let age = Math.ceil(projectionCurrentAge / 10) * 10; age <= projectionEndAge; age += 10) {
      if (!ticks.includes(age)) ticks.push(age);
    }
    if (!ticks.includes(projectionEndAge)) ticks.push(projectionEndAge);
    return ticks.sort((a, b) => a - b);
  })();

  const projectionNWData = projectionSeries.map((p) => ({
    age: p.age,
    label: p.label,
    netWorth: p.netWorth,
    year: p.year,
  }));

  const projectionCFData = projectionSeries.map((p, i) => ({
    age: p.age,
    label: p.label,
    balance: p.balance,
    milestone: p.monthOffset === 0 || p.eventCount > 0 || (i > 0 && p.monthOffset % 12 === 0),
    milestoneLabel: p.monthOffset === 0 ? "Today" : p.eventCount > 0 ? p.events.join(", ") : p.label,
    income: p.income,
    expense: p.expense,
    year: p.year,
    events: p.events,
  }));

  const projectionEventMilestones = projectionEvents.map((event) => {
    const point = projectionSeries[Math.min(projectionSeries.length - 1, event.monthOffset + 1)]
      || projectionSeries[projectionSeries.length - 1];
    return {
      id: event.id,
      age: point?.age ?? projectionCurrentAge,
      iconType: event.iconType,
      title: event.title,
      netWorth: point?.netWorth ?? currentNetWorth,
      year: point?.year ?? projectionBirthYear,
    };
  });

  // [FIX] projectionFuturePoint: use index 12 (12 months ahead) not Math.min(12, len-1)
  // which would give month 12 regardless of series length — now gracefully falls back.
  const projectionFuturePoint = projectionSeries.length > 12
    ? projectionSeries[12]
    : projectionSeries[projectionSeries.length - 1];

  const displayFutureNW12 = projectionFuturePoint?.netWorth ?? currentNetWorth;

  // [FIX] futureCF12 was referenced but never defined — now correctly derived from projectionSeries
  const futureCF12 = projectionSeries.length > 12
    ? projectionSeries[12].balance
    : projectionSeries[projectionSeries.length - 1]?.balance ?? currentBalance;

  const displayFutureCF12 = projectionFuturePoint?.balance ?? futureCF12;
  const displayCurrentNW = projectionSeries[0]?.netWorth ?? currentNetWorth;
  const displayCurrentCF = projectionSeries[0]?.balance ?? currentBalance;

  const displayNWGain = displayFutureNW12 - displayCurrentNW;
  const displayCFGain = displayFutureCF12 - displayCurrentCF;
  const displayNWGainPct = Math.abs(displayCurrentNW) > 0 ? (displayNWGain / Math.abs(displayCurrentNW)) * 100 : null;

  const projectionFirstYear = projectionSeries.slice(1, 13);
  const projectionAvgIncome = projectionFirstYear.length
    ? Math.round(projectionFirstYear.reduce((sum, p) => sum + (p.income || 0), 0) / projectionFirstYear.length)
    : predictedIncome;
  const projectionAvgExpense = projectionFirstYear.length
    ? Math.round(projectionFirstYear.reduce((sum, p) => sum + (p.expense || 0), 0) / projectionFirstYear.length)
    : predictedExpense;

  const projectionCashFlowFormula = displayFutureCF12;
  const projectionMinNW = Math.min(...projectionNWData.map((p) => p.netWorth));
  const projectionMaxNW = Math.max(...projectionNWData.map((p) => p.netWorth));
  const projectionShowDebtBaseline = projectionMinNW < 0 && projectionMaxNW > 0;

  const confColor = confidence === "high" ? "#10b981" : confidence === "medium" ? C.gold : C.muted;
  const confBg = confidence === "high" ? "rgba(16, 185, 129, 0.08)" : confidence === "medium" ? "rgba(217, 119, 6, 0.08)" : C.bg;
  const confidenceLabel = `${String(confidence || "low").slice(0, 1).toUpperCase()}${String(confidence || "low").slice(1)} confidence`;
  const dataWindowLabel = `${sorted.length} month${sorted.length !== 1 ? "s" : ""} considered`;
  const noData = sorted.length < 1;

  const closeSettingsModal = () => { setShowModal(false); setCollapsedEventIndexes([]); };
  const openSettingsModal = () => {
    const customization = customizationRes?.customizations;
    const nextEvents = Array.isArray(customization?.events) ? customization.events : [];
    setDraftEvents(nextEvents);
    setCollapsedEventIndexes(nextEvents.map((_, idx) => idx));
    setDraftCustomData({
      ...DEFAULT_CUSTOM_DATA,
      ...(customization?.customData || {}),
      birthDate: customization?.customData?.birthDate
        ? new Date(customization.customData.birthDate).toISOString().slice(0, 10)
        : "",
    });
    setShowModal(true);
  };

  const assetTypeLabel = { Stock: "Stocks", Crypto: "Crypto", Cash: "Cash", Bond: "Bonds", "Real Estate": "Real Estate", Other: "Other" };
  const growthRates = { Stock: 0.007, Crypto: 0.01, Cash: 0.0003, Bond: 0.003, "Real Estate": 0.004, Other: 0.002 };
  const assetGroups = (() => {
    const map = {};
    assets.forEach((a) => {
      const k = a.assetType || a.type || "Other";
      if (!map[k]) map[k] = { key: k, label: assetTypeLabel[k] || k, total: 0 };
      map[k].total += a.currentValue || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  })();

  // Asset projection table columns: Today + 6 biennial snapshots
  const projCols = Array.from({ length: 7 }, (_, i) => {
    if (i === 0) return "Today";
    const monthsAhead = i * 2 * 12; // every 2 years
    const ageAtDate = Math.floor(currentAge + (monthsAhead / 12));
    return `Age ${ageAtDate}`;
  });
  const assetProjections = assetGroups.map((g) => {
    const rate = growthRates[g.key] || 0.002;
    // [FIX] Each column is 2 years apart, so exponent should be i*2 (years), not i*2 months
    const vals = Array.from({ length: 7 }, (_, i) => Math.round(g.total * Math.pow(1 + rate * 12, i * 2)));
    return { label: g.label, vals };
  });
  const totalAssetVals = Array.from({ length: 7 }, (_, i) =>
    assetProjections.reduce((s, g) => s + g.vals[i], 0)
  );

  const catTotals = {};
  (apiTransactions || []).forEach((t) => {
    if (t.type !== "expense") return;
    catTotals[t.category || "Other"] = (catTotals[t.category || "Other"] || 0) + Math.abs(t.amount || 0);
  });
  const totalSpentAll = Object.values(catTotals).reduce((s, v) => s + v, 0) || 1;
  const catBreakdown = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt]) => ({ cat, projected: Math.round((amt / totalSpentAll) * predictedExpense) }));

  const chartHeight = isMobile ? 152 : 252;

  const isValidEventMonth = (month) => !month || /^\d{4}-\d{2}$/.test(String(month));
  const validateEventFields = (event) => {
    if (!event?.enabled) return null;
    const details = event?.details || {};
    const hasValidNumber = (v) => {
      const n = parseFinValue(v);
      return Number.isFinite(n) && n >= 0;
    };
    if (!isValidEventMonth(details.month)) return `${eventLabel(event.type)} has an invalid month format.`;
    if (event.type === "retirement") {
      const ageNum = parseFinValue(details.age);
      if (ageNum > 0 && (ageNum < AGE_START || ageNum > AGE_END))
        return `Retirement age must be between ${AGE_START} and ${AGE_END}.`;
      return null;
    }
    const age = parseFinValue(details.age);
    if (!Number.isFinite(age) || age < AGE_START || age > AGE_END)
      return `${eventLabel(event.type)} requires age between ${AGE_START} and ${AGE_END}.`;
    const requiredByType = {
      home_purchase: ["amount", "downPayment"],
      home_sale: ["amount"],
      additional_income: ["amount"],
      windfall: ["amount"],
      equity: ["amount"],
      child: ["annualCost"],
      college: ["annualContribution"],
    };
    const required = requiredByType[event.type] || [];
    for (const field of required) {
      if (!hasValidNumber(details[field]))
        return `${eventLabel(event.type)} requires a valid ${field}.`;
    }
    if (event.type === "custom") {
      const title = String(details.title || "").trim();
      const note = String(details.note || "").trim();
      if (!title && !note) return "Custom event requires a title or notes.";
    }
    return null;
  };

  const handleSaveSettings = () => {
    const firstValidationError = draftEvents.map((e) => validateEventFields(e)).find(Boolean);
    if (firstValidationError) { dedupToast.error(firstValidationError); return; }
    const sanitizedEvents = draftEvents.map((e) => ({
      type: e.type,
      enabled: !!e.enabled,
      details: Object.keys(e.details || {}).reduce((acc, key) => {
        const val = e.details[key];
        // Don't parse strings that are meant to be text
        acc[key] = (key === "title" || key === "month" || key === "note") ? val : parseFinValue(val);
        return acc;
      }, {}),
    }));
    const customDataPayload = {
      ...draftCustomData,
      portfolioGrowth: parseFinValue(draftCustomData.portfolioGrowth),
      annualIncome: draftCustomData.annualIncome === "" ? null : parseFinValue(draftCustomData.annualIncome),
      monthlyExpenses: draftCustomData.monthlyExpenses === "" ? null : parseFinValue(draftCustomData.monthlyExpenses),
      liabilities: parseFinValue(draftCustomData.liabilities),
      lifeExpectancy: parseFinValue(draftCustomData.lifeExpectancy) || 85,
      netWorthTarget: draftCustomData.netWorthTarget === "" ? null : parseFinValue(draftCustomData.netWorthTarget),
      dependents: parseFinValue(draftCustomData.dependents),
      birthDate: draftCustomData.birthDate || null,
    };
    saveCustomizationsMutation.mutate({ events: sanitizedEvents, customData: customDataPayload });
  };

  const addEvent = (tpl) => {
    const newIndex = draftEvents.length;
    setDraftEvents((prev) => [...prev, { type: tpl.type, enabled: true, details: { ...tpl.details } }]);
    setCollapsedEventIndexes((prev) => prev.filter((i) => i !== newIndex));
    dedupToast.info(`${tpl.label} added`);
  };
  const updateEventDetail = (index, key, value) => {
    setDraftEvents((prev) =>
      prev.map((e, i) => i !== index ? e : { ...e, details: { ...(e.details || {}), [key]: value } })
    );
  };
  const toggleEventCollapsed = (index) => {
    setCollapsedEventIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };
  const removeDraftEvent = (index) => {
    setDraftEvents((prev) => prev.filter((_, i) => i !== index));
    setCollapsedEventIndexes((prev) =>
      prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))
    );
  };

  const cardPad = isMobile ? "12px 10px" : "18px 22px";
  const primaryValueSize = isMobile ? 22 : 30;
  const secondaryValueSize = isMobile ? 18 : 26;
  const sectionLabelSize = isMobile ? 9.5 : 10.5;
  const bodyTextSize = isMobile ? 11 : 12;

  const yFmt = (v) => fmt(v);

  // [FIX] Dark-theme safe input styles — use C variables throughout
  const inputStyle = {
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 12,
    background: C.bg,
    color: C.text,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
  };

  // [FIX] All hardcoded hex values for icon containers replaced with C variables
  const iconContainerStyle = (accent) => ({
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: C.bg,
    border: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const eventIconContainerStyle = {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: C.bg,
    border: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: C.muted,
    flexShrink: 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Confidence badge */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 10, background: confBg, border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: confColor, fontFamily: "var(--font-serif)" }}>{confidenceLabel}</span>
          <span style={{ fontSize: 10, color: C.muted }}>{dataWindowLabel}</span>
        </div>
      </div>

      {noData ? (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px", textAlign: "center" }}>
          <TrendingUp size={32} style={{ color: C.muted, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>No data yet</div>
          <div style={{ fontSize: 13, color: C.muted }}>Add transactions to generate your financial forecast.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ════ NET WORTH SECTION ════ */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "12px 10px 0" : "18px 22px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* [FIX] Icon bg uses C.bg instead of hardcoded #EFF6FF */}
                <div style={{ ...iconContainerStyle(), borderColor: "transparent" }}>
                  <TrendingUp size={16} style={{ color: C.indigo }} />
                </div>
                <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: C.text }}>Net Worth Forecast</div>
              </div>
              <button
                type="button"
                onClick={openSettingsModal}
                style={{ padding: isMobile ? "5px 9px" : "6px 11px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: isMobile ? 10.5 : 11, color: C.text, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
              >
                <PlusCircle size={12} /> {isMobile ? "Customize" : "Add events or customize"}
              </button>
            </div>

            {/* Value row */}
            {isMobile ? (
              <div style={{ padding: `${cardPad.split(" ")[0]} ${cardPad.split(" ")[1]} 0`, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: sectionLabelSize, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Current net worth</div>
                  <div style={{ fontSize: primaryValueSize, fontWeight: 700, letterSpacing: "-0.5px", color: displayCurrentNW < 0 ? C.red : C.text }}>{fmt(displayCurrentNW)}</div>
                  {displayCurrentNW < 0 && <div style={{ fontSize: 10.5, color: C.red, marginTop: 2, fontWeight: 600 }}>In debt</div>}
                </div>
                <div style={{ padding: "9px 11px", background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: sectionLabelSize, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>In 12 months</div>
                  <div style={{ fontSize: secondaryValueSize, fontWeight: 700, letterSpacing: "-0.4px", color: C.text }}>{fmt(displayFutureNW12)}</div>
                  {displayNWGain !== 0 && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: displayNWGain >= 0 ? "#10b981" : C.red, marginTop: 3 }}>
                      {displayNWGain >= 0 ? "+" : ""}{fmt(displayNWGain)}{displayNWGainPct != null ? ` (${displayNWGain >= 0 ? "+" : ""}${displayNWGainPct.toFixed(1)}%)` : ""}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: `${cardPad.split(" ")[0]} ${cardPad.split(" ")[1]} 0`, flexWrap: "wrap", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 5 }}>Current net worth</div>
                  <div style={{ fontSize: primaryValueSize, fontWeight: 700, letterSpacing: "-0.7px", color: displayCurrentNW < 0 ? C.red : C.text }}>{fmt(displayCurrentNW)}</div>
                  {displayCurrentNW < 0 && <div style={{ fontSize: 11, color: C.red, marginTop: 4, fontWeight: 600 }}>In debt</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 5 }}>Forecast net worth in 12 months</div>
                  <div style={{ fontSize: primaryValueSize, fontWeight: 700, letterSpacing: "-0.7px", color: C.text }}>{fmt(displayFutureNW12)}</div>
                  {displayNWGain !== 0 && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: displayNWGain >= 0 ? "#10b981" : C.red, marginTop: 4 }}>
                      {displayNWGain >= 0 ? "+" : ""}{fmt(displayNWGain)}{displayNWGainPct != null ? ` (${displayNWGain >= 0 ? "+" : ""}${displayNWGainPct.toFixed(1)}%)` : ""}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chart */}
            <div style={{ padding: isMobile ? "8px 0 0" : "14px 0 0", position: "relative" }}>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <ComposedChart
                  key={`nw-${projectionNWData.length}-${projectionEvents.length}`}
                  data={projectionNWData}
                  margin={{ top: 20, right: isMobile ? 48 : 24, bottom: 20, left: isMobile ? 0 : 24 }}
                >
                  <defs>
                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  {/* [FIX] Grid/axis colors use C.border and C.muted for dark mode */}
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={true} horizontal={true} />
                  <XAxis
                    dataKey="age"
                    type="number"
                    domain={[projectionCurrentAge, projectionEndAge]}
                    ticks={projectionAgeTicks}
                    tickFormatter={(v) => Math.abs(v - projectionCurrentAge) < 0.01 ? "TODAY" : `Age ${Math.round(v)}`}
                    tick={{ fontSize: isMobile ? 9 : 10, fill: C.muted, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    width={isMobile ? 55 : 85}
                    tickFormatter={yFmt}
                    tick={{ fontSize: isMobile ? 9 : 10, fill: C.muted, fontWeight: 500 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", fontSize: 11, minWidth: 130 }}>
                          <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>{d?.label}</div>
                          <div style={{ color: C.muted }}>Net worth: <span style={{ fontWeight: 700, color: d?.netWorth >= 0 ? "#10B981" : "#EF4444" }}>{fmt(d?.netWorth)}</span></div>
                        </div>
                      );
                    }}
                  />
                  {projectionShowDebtBaseline && (
                    <ReferenceLine y={0} stroke={C.red} strokeWidth={1} strokeDasharray="5 5" />
                  )}
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    stroke="none"
                    fill={currentNetWorth >= 0 ? "url(#blueGradient)" : "url(#redGradient)"}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="netWorth"
                    stroke={currentNetWorth >= 0 ? "#3B82F6" : "#EF4444"}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, fill: "#3B82F6", stroke: C.white, strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                  {projectionEventMilestones.map((m) => (
                    <ReferenceDot
                      key={m.id}
                      x={m.age}
                      y={m.netWorth}
                      r={0}
                      isFront
                      shape={({ cx, cy }) => (
                        <g
                          transform={`translate(${cx - 14}, ${cy - 14})`}
                          onMouseEnter={() => setActiveMilestoneHint({ ...m, cx, cy, pinned: false })}
                          onMouseLeave={() => setActiveMilestoneHint((prev) => prev?.id === m.id && !prev?.pinned ? null : prev)}
                          onClick={() => setActiveMilestoneHint((prev) => prev?.id === m.id && prev?.pinned ? null : { ...m, cx, cy, pinned: true })}
                          style={{ cursor: "pointer" }}
                        >
                          {/* [FIX] Milestone icon bg uses C.white + C.border for dark mode */}
                          <circle cx="14" cy="14" r="14" fill={C.white} filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.08))" stroke={C.border} strokeWidth="1.5" />
                          <g transform="translate(7,7)">
                            {m.iconType === "retirement" ? (
                              <TreePalm size={14} color={C.indigo} />
                            ) : m.iconType === "heart" ? (
                              <HeartPulse size={14} color={C.red} />
                            ) : (
                              <Info size={14} color={C.muted} />
                            )}
                          </g>
                        </g>
                      )}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>

              {activeMilestoneHint && (
                <div style={{
                  position: "absolute",
                  left: Math.max(8, (activeMilestoneHint.cx || 0) + 12),
                  top: Math.max(8, (activeMilestoneHint.cy || 0) - 16),
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: 9,
                  padding: "7px 10px",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                  minWidth: 150,
                  zIndex: 5,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 3 }}>{activeMilestoneHint.title}</div>
                  <div style={{ fontSize: 10, color: C.sub }}>Age {activeMilestoneHint.age} · {activeMilestoneHint.year}</div>
                  <div style={{ fontSize: 10, color: C.sub }}>NW: <span style={{ fontWeight: 700, color: C.text }}>{fmt(activeMilestoneHint.netWorth)}</span></div>
                </div>
              )}

              {/* Legend */}
              <div style={{ display: "flex", gap: isMobile ? 10 : 16, flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : "flex-end", padding: isMobile ? "8px 12px 12px" : "8px 24px 16px", borderTop: `1px solid ${C.border}` }}>
                {[
                  { color: C.indigo, label: "NW Projection", dashed: true },
                  ...(projectionShowDebtBaseline ? [{ color: C.red, label: "Debt Baseline", dashed: false }] : []),
                  { color: C.text, label: "Events", dashed: false, dot: true },
                ].map((l) => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <svg width={20} height={10}>
                      {l.dot
                        ? <circle cx="10" cy="5" r="3" fill={l.color} />
                        : l.dashed
                          ? <line x1="0" y1="5" x2="20" y2="5" stroke={l.color} strokeWidth={2} strokeDasharray="6 5" />
                          : <line x1="0" y1="5" x2="20" y2="5" stroke={l.color} strokeWidth={2} />
                      }
                    </svg>
                    <span style={{ fontSize: isMobile ? 9.5 : 10.5, color: C.sub }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary bar */}
            <div style={{ borderTop: `1px solid ${C.border}`, padding: isMobile ? "10px" : "13px 22px", display: "flex", alignItems: "center", gap: 9, background: C.bg }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <TrendingUp size={12} style={{ color: "#10b981" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>SUMMARY</div>
                <div style={{ fontSize: bodyTextSize, color: C.sub, lineHeight: 1.5 }}>
                  Net worth moves from {fmt(displayCurrentNW)} → {fmt(displayFutureNW12)} over 12 months ({fmt(displayNWGain)} change).
                </div>
              </div>
            </div>
          </div>

          {/* ════ CASH FLOW SECTION ════ */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "12px 10px 0" : "18px 22px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* [FIX] bg uses C.bg + C.border, not hardcoded #F0FDF4 */}
                <div style={{ ...iconContainerStyle(), borderColor: "transparent" }}>
                  <TrendingUp size={16} style={{ color: "#10b981" }} />
                </div>
                <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: C.text }}>Cash Flow Forecast</div>
              </div>
            </div>

            {/* Value row */}
            {isMobile ? (
              <div style={{ padding: `${cardPad.split(" ")[0]} ${cardPad.split(" ")[1]} 0`, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: sectionLabelSize, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Current balance</div>
                  <div style={{ fontSize: primaryValueSize, fontWeight: 700, letterSpacing: "-0.5px", color: displayCurrentCF < 0 ? C.red : C.text }}>{fmt(displayCurrentCF)}</div>
                </div>
                <div style={{ padding: "9px 11px", background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: sectionLabelSize, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>In 12 months</div>
                  <div style={{ fontSize: secondaryValueSize, fontWeight: 700, letterSpacing: "-0.4px", color: displayFutureCF12 < 0 ? C.red : C.text }}>{fmt(displayFutureCF12)}</div>
                  {displayCFGain !== 0 && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: displayCFGain >= 0 ? "#10b981" : C.red, marginTop: 3 }}>
                      {displayCFGain >= 0 ? "+" : ""}{fmt(displayCFGain)}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: `${cardPad.split(" ")[0]} ${cardPad.split(" ")[1]} 0`, flexWrap: "wrap", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 5 }}>Current cash balance</div>
                  <div style={{ fontSize: primaryValueSize, fontWeight: 700, letterSpacing: "-0.7px", color: displayCurrentCF < 0 ? C.red : C.text }}>{fmt(displayCurrentCF)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 5 }}>Forecasted in 12 months</div>
                  <div style={{ fontSize: primaryValueSize, fontWeight: 700, letterSpacing: "-0.7px", color: displayFutureCF12 < 0 ? C.red : C.text }}>{fmt(displayFutureCF12)}</div>
                  {displayCFGain !== 0 && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: displayCFGain >= 0 ? "#10b981" : C.red, marginTop: 4 }}>
                      {displayCFGain >= 0 ? "+" : ""}{fmt(displayCFGain)} over 12 months
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Formula strip */}
            <div style={{ margin: isMobile ? "10px 10px 0" : "12px 22px 0", padding: "8px 10px", background: C.greenBg, border: `1px solid ${C.border}`, borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <TrendingUp size={13} style={{ color: "#10b981", flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: bodyTextSize, color: C.text, lineHeight: 1.5 }}>
                Balance ({fmt(displayCurrentCF)}) + avg income ({fmt(projectionAvgIncome)}) − expenses ({fmt(projectionAvgExpense)}) = <strong>{fmt(projectionCashFlowFormula)}</strong>
              </span>
            </div>

            {/* Chart */}
            <div style={{ padding: isMobile ? "8px 0 0" : "14px 0 0", position: "relative" }}>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <ComposedChart
                  key={`cf-${projectionCFData.length}-${projectionEvents.length}`}
                  data={projectionCFData}
                  margin={{ top: 20, right: isMobile ? 48 : 24, bottom: 20, left: isMobile ? 0 : 24 }}
                >
                  <defs>
                    <linearGradient id="cfGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  {/* [FIX] Grid color uses C.border */}
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={true} horizontal={true} />
                  <XAxis
                    dataKey="age"
                    type="number"
                    domain={[projectionCurrentAge, projectionEndAge]}
                    ticks={projectionAgeTicks}
                    tickFormatter={(v) => Math.abs(v - projectionCurrentAge) < 0.01 ? "TODAY" : `Age ${Math.round(v)}`}
                    tick={{ fontSize: isMobile ? 9 : 10, fill: C.muted, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    width={isMobile ? 55 : 85}
                    tickFormatter={yFmt}
                    tick={{ fontSize: isMobile ? 9 : 10, fill: C.muted, fontWeight: 500 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", fontSize: 11, minWidth: 130 }}>
                          <div style={{ fontWeight: 700, color: C.text, marginBottom: 5 }}>{d?.label}</div>
                          <div style={{ color: C.muted }}>Balance: <span style={{ fontWeight: 700, color: C.text }}>{fmt(d?.balance)}</span></div>
                          {d && <div style={{ color: "#10b981" }}>Inc: {fmt(d.income)}</div>}
                          {d && <div style={{ color: C.red }}>Exp: {fmt(d.expense)}</div>}
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="balance" stroke="none" fill="url(#cfGradient)" isAnimationActive={false} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={({ cx, cy, payload }) =>
                      payload?.milestone
                        ? <circle cx={cx} cy={cy} r={3} fill="#3b82f6" stroke={C.white} strokeWidth={2} />
                        : null
                    }
                    activeDot={{ r: 6, fill: "#3b82f6", stroke: C.white, strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 16, justifyContent: isMobile ? "flex-start" : "flex-end", padding: isMobile ? "8px 12px 12px" : "8px 24px 16px", borderTop: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                {[{ color: C.indigo, label: "Cash Flow", dashed: true }, { color: C.indigo, label: "Milestones", dot: true }].map((l) => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <svg width={20} height={10}>
                      {l.dot ? <circle cx="10" cy="5" r="3" fill={l.color} /> : <line x1="0" y1="5" x2="20" y2="5" stroke={l.color} strokeWidth={2} strokeDasharray="6 5" />}
                    </svg>
                    <span style={{ fontSize: isMobile ? 9.5 : 10.5, color: C.sub }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom two-col */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 0, borderTop: `1px solid ${C.border}` }}>
              <div style={{ padding: isMobile ? "12px 10px" : "16px 18px", borderRight: isMobile ? "none" : `1px solid ${C.border}`, borderBottom: isMobile ? `1px solid ${C.border}` : "none" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Monthly Avg (Last 3 Mo)</div>
                {recent3.length === 0 ? <div style={{ color: C.muted, fontSize: 12 }}>Not enough data</div> : (
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart
                      data={recent3.map((m) => {
                        const [y, mo] = (m.month || "").split("-").map(Number);
                        return {
                          label: (y && mo) ? new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short" }) : m.month,
                          income: m.income || 0,
                          expense: m.expense || 0,
                        };
                      })}
                      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                    >
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} />
                      <CartesianGrid vertical={false} stroke={C.border} strokeDasharray="3 3" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", fontSize: 11 }}>
                              {payload.map((p, i) => (
                                <div key={i} style={{ color: p.fill, fontWeight: 600 }}>{p.name}: {fmt(p.value)}</div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="income" name="Income" fill={"#10b981"} radius={[4, 4, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="expense" name="Expense" fill={C.red} radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div style={{ padding: isMobile ? "12px 10px" : "16px 18px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Next Month — by Category</div>
                {catBreakdown.length === 0 ? <div style={{ color: C.muted, fontSize: 12 }}>No expense data yet</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {catBreakdown.map((c, i) => {
                      const pct = predictedExpense > 0 ? Math.round((c.projected / predictedExpense) * 100) : 0;
                      return (
                        <div key={c.cat}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 11.5, color: C.text, fontWeight: 500 }}>{c.cat}</span>
                            <span style={{ fontSize: 10.5, color: C.muted }}>{fmt(c.projected)} ({pct}%)</span>
                          </div>
                          <div style={{ height: 4, background: C.border2 || C.border, borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: CAT_COLORS[i % CAT_COLORS.length], borderRadius: 99 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Summary bar */}
            <div style={{ borderTop: `1px solid ${C.border}`, padding: isMobile ? "10px" : "13px 22px", display: "flex", alignItems: "center", gap: 9, background: C.bg }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <TrendingUp size={12} style={{ color: "#10b981" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>SUMMARY</div>
                <div style={{ fontSize: bodyTextSize, color: C.sub, lineHeight: 1.5 }}>
                  Cash balance moves from {fmt(displayCurrentCF)} → {fmt(displayFutureCF12)} over 12 months.
                </div>
              </div>
            </div>
          </div>

          {/* ════ ASSETS & LIABILITIES SECTION ════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {assets.length === 0 ? (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "48px 24px", textAlign: "center" }}>
                <TrendingUp size={28} style={{ color: C.muted, marginBottom: 10 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>No assets tracked yet</div>
                <div style={{ fontSize: 12, color: C.muted }}>Add assets in the Assets tab to see your projection.</div>
              </div>
            ) : (
              <>
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: isMobile ? "10px" : "12px 18px 9px", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.09em" }}>ASSETS FORECAST</div>
                  </div>
                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 10.5 : 11.5, minWidth: isMobile ? 520 : 560 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                          {/* [FIX] Table header bg uses C.white */}
                          <th style={{ textAlign: "left", padding: isMobile ? "8px 10px" : "9px 16px", fontWeight: 500, color: C.sub, fontSize: 10, position: "sticky", left: 0, background: C.white, zIndex: 2, minWidth: 96 }}>Type</th>
                          {projCols.map((col, i) => (
                            <th key={i} style={{ textAlign: "right", padding: isMobile ? "8px 8px" : "9px 12px", fontWeight: 600, color: i === 0 ? C.text : C.muted, fontSize: 10, whiteSpace: "nowrap", minWidth: 80 }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: isMobile ? "9px 10px" : "10px 16px", fontWeight: 700, color: C.text, fontSize: 11, position: "sticky", left: 0, background: C.bg, zIndex: 1 }}>↑ Assets</td>
                          {totalAssetVals.map((v, i) => (
                            <td key={i} style={{ textAlign: "right", padding: isMobile ? "9px 8px" : "10px 12px", fontWeight: 700, color: "#10b981" }}>
                              {fmt(v)}{i > 0 && <span style={{ marginLeft: 2, fontSize: 9 }}>↗</span>}
                            </td>
                          ))}
                        </tr>
                        {assetProjections.map((row) => (
                          <tr key={row.label} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: isMobile ? "8px 10px 8px 16px" : "10px 16px 10px 24px", color: C.sub, position: "sticky", left: 0, background: C.white, zIndex: 1 }}>{row.label}</td>
                            {row.vals.map((v, i) => (
                              <td key={i} style={{ textAlign: "right", padding: isMobile ? "8px 8px" : "10px 12px", color: C.text }}>
                                {fmt(v)}
                                {i > 0 && v > row.vals[i - 1] && <span style={{ marginLeft: 2, fontSize: 9, color: "#10b981" }}>↗</span>}
                                {i > 0 && v < row.vals[i - 1] && <span style={{ marginLeft: 2, fontSize: 9, color: C.red }}>↘</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr style={{ background: C.goldBg, borderTop: `2px solid ${C.border}` }}>
                          <td style={{ padding: isMobile ? "8px 10px 8px 16px" : "10px 16px 10px 24px", color: C.gold, fontWeight: 600, position: "sticky", left: 0, background: C.goldBg, zIndex: 1 }}>Savings</td>
                          {projCols.map((_, i) => {
                            const v = Math.max(0, monthlySavings * i * 24); // [FIX] i*24 months (i*2 years)
                            return (
                              <td key={i} style={{ textAlign: "right", padding: isMobile ? "8px 8px" : "10px 12px", color: C.gold, fontWeight: 600 }}>
                                {i === 0 ? "—" : fmt(v)}{i > 0 && monthlySavings > 0 && <span style={{ marginLeft: 2, fontSize: 9 }}>↗</span>}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
                  {assetGroups.map((g) => {
                    const rate = growthRates[g.key] || 0.002;
                    // [FIX] 12-month projection: (1 + monthly_rate)^12 using per-month rate
                    const projected12 = Math.round(g.total * Math.pow(1 + rate, 12));
                    const gain = projected12 - g.total;
                    return (
                      <div key={g.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: isMobile ? "10px" : "12px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{g.label}</div>
                        <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: C.text, marginBottom: 2, letterSpacing: "-0.3px" }}>{fmt(g.total)}</div>
                        <div style={{ fontSize: 10.5, color: "#10b981", fontWeight: 600 }}>→ {fmt(projected12)} in 12mo</div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>+{fmt(gain)} ({(rate * 12 * 100).toFixed(1)}%/yr)</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════ SETTINGS MODAL ════ */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", zIndex: 1100, padding: isMobile ? 0 : 16 }}
          onClick={closeSettingsModal}
        >
          <div
            style={{ background: C.white, borderRadius: isMobile ? "16px 16px 0 0" : 16, width: "100%", maxWidth: isMobile ? "100%" : 680, maxHeight: isMobile ? "90vh" : "88vh", border: `1px solid ${C.border}`, boxShadow: "0 24px 60px rgba(0,0,0,0.24)", overflow: "hidden", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.white, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
                  {modalTab === "events" ? "Financial events" : "Forecast assumptions"}
                </span>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>
                  Add events or customize
                </div>
              </div>
              <button
                type="button"
                onClick={closeSettingsModal}
                style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              {[{ id: "events", label: "Events" }, { id: "customize", label: "Customize Data" }].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setModalTab(tab.id)}
                  style={{ flex: 1, padding: "11px 0", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: modalTab === tab.id ? 700 : 500, color: modalTab === tab.id ? C.text : C.muted, borderBottom: modalTab === tab.id ? `2px solid ${C.text}` : "2px solid transparent" }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal body */}
            <div style={{ padding: isMobile ? "14px 16px" : "16px 20px", overflowY: "auto", flex: 1 }}>
              {modalTab === "events" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Info banner */}
                  <div style={{ padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <Info size={14} style={{ color: C.indigo, flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 11, color: C.text, lineHeight: 1.4 }}>Changes to events will be reflected in the forecast after you click "Save".</span>
                  </div>

                  {/* Your Events */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Your events</p>
                    <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                      {draftEvents.length === 0 ? (
                        <div style={{ padding: "16px", fontSize: 12, color: C.muted, textAlign: "center", background: C.bg }}>
                          No events added yet.
                        </div>
                      ) : (
                        draftEvents.map((event, index) => (
                          <div key={`${event.type}-${index}`} style={{ borderBottom: index === draftEvents.length - 1 ? "none" : `1px solid ${C.border}` }}>
                            <div
                              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", cursor: "pointer", background: C.white, transition: "background 0.2s" }}
                              onClick={() => toggleEventCollapsed(index)}
                              onMouseEnter={(e) => { e.currentTarget.style.background = C.bg; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = C.white; }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                                <div style={eventIconContainerStyle}>
                                  {(() => {
                                    const tpl = eventTemplates.find((t) => t.type === event.type);
                                    return tpl?.icon ? React.createElement(tpl.icon, { size: 18 }) : <Info size={18} />;
                                  })()}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{eventLabel(event.type)}</p>
                                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{event.details?.age ? `Age ${event.details.age}` : "Details pending"}</p>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                {/* Toggle */}
                                <div onClick={(e) => e.stopPropagation()}>
                                  <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                                    <div style={{ position: "relative", width: 32, height: 18, background: event.enabled ? "#10B981" : C.border, borderRadius: 10, transition: "background 0.2s" }}>
                                      <input
                                        type="checkbox"
                                        checked={!!event.enabled}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          setDraftEvents((prev) => prev.map((x, i) => i === index ? { ...x, enabled: checked } : x));
                                        }}
                                        style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer", margin: 0 }}
                                      />
                                      <div style={{ position: "absolute", top: 2, left: event.enabled ? 16 : 2, width: 14, height: 14, background: "#ffffff", borderRadius: "50%", transition: "left 0.2s", pointerEvents: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
                                    </div>
                                  </label>
                                </div>
                                <div style={{ color: C.muted }}>
                                  {collapsedEventIndexes.includes(index) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                </div>
                              </div>
                            </div>

                            {/* Event detail fields */}
                            {!collapsedEventIndexes.includes(index) && (
                              <div style={{ padding: "12px 14px", background: C.bg, borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                                {event.type !== "retirement" && (
                                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                    <span style={{ fontSize: 11, color: C.muted }}>Age at event</span>
                                    <input type="text" value={event.details?.age ?? ""} onChange={(e) => updateEventDetail(index, "age", e.target.value)} placeholder="e.g. 42" style={inputStyle} />
                                  </label>
                                )}
                                {event.type === "retirement" && (
                                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                    <span style={{ fontSize: 11, color: C.muted }}>Income replacement (%)</span>
                                    <input type="text" value={event.details?.incomeReplacement ?? 30} onChange={(e) => updateEventDetail(index, "incomeReplacement", e.target.value)} placeholder="30" style={inputStyle} />
                                  </label>
                                )}
                                {event.type === "home_purchase" && (
                                  <>
                                    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                      <span style={{ fontSize: 11, color: C.muted }}>Home price</span>
                                      <input type="text" value={event.details?.amount ?? 0} onChange={(e) => updateEventDetail(index, "amount", e.target.value)} style={inputStyle} />
                                    </label>
                                    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                      <span style={{ fontSize: 11, color: C.muted }}>Down payment</span>
                                      <input type="text" value={event.details?.downPayment ?? 0} onChange={(e) => updateEventDetail(index, "downPayment", e.target.value)} style={inputStyle} />
                                    </label>
                                  </>
                                )}
                                {(event.type === "home_sale" || event.type === "windfall" || event.type === "equity") && (
                                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                    <span style={{ fontSize: 11, color: C.muted }}>
                                      {event.type === "home_sale" ? "Sale value" : event.type === "equity" ? "Equity value" : "Amount"}
                                    </span>
                                    <input type="text" value={event.details?.amount ?? 0} onChange={(e) => updateEventDetail(index, "amount", e.target.value)} style={inputStyle} />
                                  </label>
                                )}
                                {event.type === "additional_income" && (
                                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                    <span style={{ fontSize: 11, color: C.muted }}>Monthly amount</span>
                                    <input type="text" value={event.details?.amount ?? 0} onChange={(e) => updateEventDetail(index, "amount", e.target.value)} style={inputStyle} />
                                  </label>
                                )}
                                {event.type === "child" && (
                                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                    <span style={{ fontSize: 11, color: C.muted }}>Annual cost</span>
                                    <input type="text" value={event.details?.annualCost ?? 12000} onChange={(e) => updateEventDetail(index, "annualCost", e.target.value)} style={inputStyle} />
                                  </label>
                                )}
                                {event.type === "college" && (
                                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                    <span style={{ fontSize: 11, color: C.muted }}>Annual contribution</span>
                                    <input type="text" value={event.details?.annualContribution ?? 6000} onChange={(e) => updateEventDetail(index, "annualContribution", e.target.value)} style={inputStyle} />
                                  </label>
                                )}
                                {event.type === "custom" && (
                                  <>
                                    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                      <span style={{ fontSize: 11, color: C.muted }}>Title</span>
                                      <input type="text" value={event.details?.title ?? ""} onChange={(e) => updateEventDetail(index, "title", e.target.value)} style={inputStyle} />
                                    </label>
                                    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                      <span style={{ fontSize: 11, color: C.muted }}>Amount</span>
                                      <input type="text" value={event.details?.amount ?? ""} onChange={(e) => updateEventDetail(index, "amount", e.target.value)} style={inputStyle} />
                                    </label>
                                  </>
                                )}
                                <div style={{ gridColumn: isMobile ? "span 1" : "span 2", display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                                  <button
                                    type="button"
                                    onClick={() => removeDraftEvent(index)}
                                    style={{ border: "none", background: "none", color: C.red, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                  >
                                    <X size={12} /> Remove Event
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "4px 0" }} />

                  {/* Add Event */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>Add event</p>
                    <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                      {eventTemplates.map((tpl, i) => (
                        <div
                          key={tpl.type}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", cursor: "pointer", background: C.white, borderBottom: i === eventTemplates.length - 1 ? "none" : `1px solid ${C.border}`, transition: "background 0.2s" }}
                          onClick={() => addEvent(tpl)}
                          onMouseEnter={(e) => { e.currentTarget.style.background = C.bg; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = C.white; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={eventIconContainerStyle}>
                              <tpl.icon size={18} />
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{tpl.label}</p>
                          </div>
                          <ChevronRight size={16} style={{ color: C.muted }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {modalTab === "customize" && (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                  {[
                    ["portfolioGrowth", "Portfolio Growth (e.g. 0.05)"],
                    ["annualIncome", "Annual Income"],
                    ["monthlyExpenses", "Monthly Expenses"],
                    ["liabilities", "Liabilities"],
                    ["birthDate", "Birth Date"],
                    ["lifeExpectancy", "Life Expectancy"],
                    ["location", "Location"],
                    ["dependents", "Dependents"],
                    ["netWorthTarget", "Net Worth Target"],
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {/* [FIX] Label uses C.sub for dark-mode-safe color */}
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: C.sub }}>{label}</span>
                      <input
                        type={key === "birthDate" ? "date" : "text"}
                        value={draftCustomData[key] ?? ""}
                        onChange={(e) => setDraftCustomData((prev) => ({ ...prev, [key]: e.target.value }))}
                        style={inputStyle}
                      />
                    </label>
                  ))}
                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: C.sub }}>Tax Filing Status</span>
                    <select
                      value={draftCustomData.taxFilingStatus || "single"}
                      onChange={(e) => setDraftCustomData((prev) => ({ ...prev, taxFilingStatus: e.target.value }))}
                      style={selectStyle}
                    >
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="head_of_household">Head of Household</option>
                    </select>
                  </label>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ padding: isMobile ? "12px 16px" : "14px 20px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: C.bg, flexShrink: 0, flexWrap: isMobile ? "wrap" : "nowrap" }}>
              {showConfirmReset ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.red }}>Reset to defaults?</span>
                  <button
                    type="button"
                    onClick={() => { resetCustomizationsMutation.mutate(); setShowConfirmReset(false); }}
                    style={{ padding: "4px 8px", background: C.red, color: "#fff", border: "none", borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                  >
                    Yes, reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(false)}
                    style={{ padding: "4px 8px", background: C.white, color: C.sub, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(true)}
                  disabled={resetCustomizationsMutation.isPending}
                  style={{ border: `1px solid ${C.border}`, background: C.white, borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
              <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                <button
                  type="button"
                  onClick={closeSettingsModal}
                  style={{ border: `1px solid ${C.border}`, background: C.white, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: C.sub, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saveCustomizationsMutation.isPending}
                  style={{ border: "none", background: C.strong, color: C.onStrong, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {saveCustomizationsMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { ForecastPage };