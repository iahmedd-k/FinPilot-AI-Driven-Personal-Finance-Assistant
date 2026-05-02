const axios = require("axios");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Goal = require("../models/Goal");
const CryptoAsset = require("../models/CryptoAsset");
const ForecastCustomization = require("../models/ForecastCustomization");

const FALLBACK_CURRENCIES = [
  "USD", "EUR", "GBP", "CAD", "AUD", "NZD", "JPY", "CHF", "CNY", "HKD", "SGD",
  "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "TRY",
  "INR", "PKR", "AED", "SAR", "QAR", "KWD", "BHD", "OMR", "ZAR",
  "BRL", "MXN", "THB", "MYR", "IDR", "PHP", "KRW",
];

const FRANKFURTER_BASE_URL = "https://api.frankfurter.dev/v2";
const RATE_CACHE_TTL_MS = 60 * 60 * 1000;
const CURRENCY_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

let cachedCurrencies = { values: FALLBACK_CURRENCIES, expiresAt: 0 };
const rateCache = new Map();

const roundMoney = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return Number(numeric.toFixed(2));
};

const convertMoney = (value, rate) => {
  if (value == null) return value;
  return roundMoney(Number(value) * Number(rate));
};

const isMoneyLikeKey = (key) => {
  if (!key) return false;
  const k = String(key).toLowerCase();
  if (["age", "year", "month", "monthoffset", "dependents", "lifeexpectancy", "quantity", "portfoliogrowth"].includes(k)) {
    return false;
  }
  return (
    k.includes("amount") ||
    k.includes("price") ||
    k.includes("value") ||
    k.includes("cost") ||
    k.includes("income") ||
    k.includes("expense") ||
    k.includes("liabil") ||
    k.includes("target") ||
    k.includes("budget") ||
    k.includes("payment") ||
    k.includes("contribution")
  );
};

const deepConvertMoneyFields = (input, rate, parentKey = "") => {
  if (Array.isArray(input)) {
    return input.map((item) => deepConvertMoneyFields(item, rate, parentKey));
  }

  if (input && typeof input === "object") {
    const output = {};
    for (const [key, value] of Object.entries(input)) {
      output[key] = deepConvertMoneyFields(value, rate, key);
    }
    return output;
  }

  if (typeof input === "number" && isMoneyLikeKey(parentKey)) {
    return convertMoney(input, rate);
  }

  return input;
};

const bulkWriteAmountUpdates = async (Model, documents, fieldNames, rate, filterKey = "_id") => {
  if (!documents.length) return 0;

  const operations = [];
  for (const doc of documents) {
    const $set = {};
    for (const field of fieldNames) {
      if (doc[field] != null) {
        $set[field] = convertMoney(doc[field], rate);
      }
    }

    if (Object.keys($set).length) {
      operations.push({
        updateOne: {
          filter: { [filterKey]: doc[filterKey] },
          update: { $set },
        },
      });
    }
  }

  if (!operations.length) return 0;
  await Model.bulkWrite(operations, { ordered: false });
  return operations.length;
};

const getSupportedCurrencies = async () => {
  const now = Date.now();
  if (cachedCurrencies.expiresAt > now && Array.isArray(cachedCurrencies.values) && cachedCurrencies.values.length) {
    return cachedCurrencies.values;
  }

  try {
    const { data } = await axios.get(`${FRANKFURTER_BASE_URL}/currencies`, { timeout: 10000 });
    const codes = Array.isArray(data)
      ? data.map((item) => String(item?.iso_code || "").toUpperCase())
      : [];

    const normalizedCodes = codes
      .filter((c) => /^[A-Z]{3}$/.test(c));

    if (!normalizedCodes.length) {
      throw new Error("No currencies returned by Frankfurter");
    }

    const values = Array.from(new Set(normalizedCodes)).sort();
    cachedCurrencies = {
      values,
      expiresAt: now + CURRENCY_CACHE_TTL_MS,
    };
    return values;
  } catch (err) {
    cachedCurrencies = {
      values: FALLBACK_CURRENCIES,
      expiresAt: now + CURRENCY_CACHE_TTL_MS,
    };
    return FALLBACK_CURRENCIES;
  }
};

const isSupportedCurrency = async (currency) => {
  const normalized = String(currency || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) return false;
  const supported = await getSupportedCurrencies();
  return supported.includes(normalized);
};

const getFxRate = async (fromCurrency, toCurrency) => {
  const from = String(fromCurrency || "").trim().toUpperCase();
  const to = String(toCurrency || "").trim().toUpperCase();

  if (from === to) return 1;

  const cacheKey = `${from}->${to}`;
  const now = Date.now();
  const cached = rateCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.rate;
  }

  const { data } = await axios.get(`${FRANKFURTER_BASE_URL}/rates`, {
    params: {
      base: from,
      quotes: to,
    },
    timeout: 10000,
  });

  const rate = Number(Array.isArray(data) && data.length ? data[0]?.rate : undefined);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Unable to fetch valid FX rate for ${from} -> ${to}`);
  }

  rateCache.set(cacheKey, {
    rate,
    expiresAt: now + RATE_CACHE_TTL_MS,
  });

  return rate;
};

const convertUserFinancialData = async ({ userId, fromCurrency, toCurrency }) => {
  const from = String(fromCurrency || "").trim().toUpperCase();
  const to = String(toCurrency || "").trim().toUpperCase();

  if (!userId) throw new Error("userId is required for currency conversion");
  if (from === to) {
    return {
      fromCurrency: from,
      toCurrency: to,
      rate: 1,
      converted: {
        user: true,
        transactions: 0,
        goals: 0,
        assets: 0,
        forecast: 0,
      },
    };
  }

  const rate = await getFxRate(from, to);

  const user = await User.findById(userId).select("annualIncome monthlyIncome budgets preferredCurrency");
  if (!user) {
    throw new Error("User not found for currency conversion");
  }

  const userUpdate = { preferredCurrency: to };
  if (user.annualIncome != null) userUpdate.annualIncome = convertMoney(user.annualIncome, rate);
  if (user.monthlyIncome != null) userUpdate.monthlyIncome = convertMoney(user.monthlyIncome, rate);
  if (Array.isArray(user.budgets)) {
    userUpdate.budgets = user.budgets.map((budget) => ({
      ...budget.toObject?.() || budget,
      amount: convertMoney(budget.amount, rate),
    }));
  }
  await User.updateOne({ _id: userId }, { $set: userUpdate });

  const transactions = await Transaction.find({ userId }).select("_id amount").lean();
  const transactionUpdates = await bulkWriteAmountUpdates(Transaction, transactions, ["amount"], rate);

  const goals = await Goal.find({ userId }).select("_id targetAmount currentAmount").lean();
  const goalUpdates = await bulkWriteAmountUpdates(Goal, goals, ["targetAmount", "currentAmount"], rate);

  const assets = await CryptoAsset.find({ userId }).select("_id buyingPrice currentValue buyPrice").lean();
  const assetUpdates = await bulkWriteAmountUpdates(CryptoAsset, assets, ["buyingPrice", "currentValue", "buyPrice"], rate);

  const forecast = await ForecastCustomization.findOne({ userId }).lean();
  let forecastUpdates = 0;
  if (forecast) {
    const customData = { ...(forecast.customData || {}) };
    ["annualIncome", "monthlyExpenses", "liabilities", "netWorthTarget"].forEach((field) => {
      if (customData[field] != null) {
        customData[field] = convertMoney(customData[field], rate);
      }
    });

    const events = Array.isArray(forecast.events)
      ? forecast.events.map((event) => ({
          ...event,
          details: deepConvertMoneyFields(event?.details || {}, rate),
        }))
      : [];

    await ForecastCustomization.updateOne(
      { _id: forecast._id },
      {
        $set: {
          customData,
          events,
        },
      }
    );
    forecastUpdates = 1;
  }

  return {
    fromCurrency: from,
    toCurrency: to,
    rate,
    converted: {
      user: true,
      transactions: transactionUpdates,
      goals: goalUpdates,
      assets: assetUpdates,
      forecast: forecastUpdates,
    },
  };
};

module.exports = {
  getSupportedCurrencies,
  isSupportedCurrency,
  getFxRate,
  convertUserFinancialData,
};
