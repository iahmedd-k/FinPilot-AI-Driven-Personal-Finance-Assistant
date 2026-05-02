export const DEFAULT_CURRENCY = "USD";

export const getUserCurrency = (user) =>
  String(user?.preferredCurrency || DEFAULT_CURRENCY).toUpperCase();

export const formatCurrencyAmount = (
  value,
  currency = DEFAULT_CURRENCY,
  { minimumFractionDigits = 0, maximumFractionDigits = 0, locale } = {}
) => {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(locale || undefined, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Number.isFinite(amount) ? amount : 0);
};
