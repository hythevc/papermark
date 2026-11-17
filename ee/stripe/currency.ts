/** The local catalog exposes EUR amounts and contains no configured USD prices. */
export const SUPPORTED_CURRENCIES = ["eur"] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "eur";

export const CURRENCY_LABEL: Record<Currency, string> = { eur: "EUR" };
export const CURRENCY_SYMBOL: Record<Currency, string> = { eur: "€" };

export function isSupportedCurrency(value: unknown): value is Currency {
  return value === DEFAULT_CURRENCY;
}
