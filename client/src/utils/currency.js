export const DEFAULT_CURRENCY = "USD";

const FALLBACK_CURRENCY = DEFAULT_CURRENCY;

function normalizeCurrencyCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return FALLBACK_CURRENCY;

  try {
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    });
    return code;
  } catch {
    return FALLBACK_CURRENCY;
  }
}

export const getUserCurrency = (user) =>
  normalizeCurrencyCode(user?.preferredCurrency || DEFAULT_CURRENCY);

export const getCurrencySymbol = (currency = DEFAULT_CURRENCY, locale = "en-US") => {
  const safeCurrency = normalizeCurrencyCode(currency);

  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: safeCurrency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    const symbol = parts.find((part) => part.type === "currency")?.value;
    return symbol || safeCurrency;
  } catch {
    return safeCurrency;
  }
};

export const formatCurrencyAmount = (
  value,
  currency = DEFAULT_CURRENCY,
  { minimumFractionDigits = 0, maximumFractionDigits = 0, locale, currencyDisplay = "narrowSymbol", ...rest } = {}
) => {
  const amount = Number(value ?? 0);
  const safeCurrency = normalizeCurrencyCode(currency);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  try {
    return new Intl.NumberFormat(locale || "en-US", {
      style: "currency",
      currency: safeCurrency,
      currencyDisplay,
      minimumFractionDigits,
      maximumFractionDigits,
      ...rest,
    }).format(safeAmount);
  } catch {
    return new Intl.NumberFormat(locale || "en-US", {
      style: "currency",
      currency: FALLBACK_CURRENCY,
      currencyDisplay,
      minimumFractionDigits,
      maximumFractionDigits,
      ...rest,
    }).format(safeAmount);
  }
};
