import { inArray } from "drizzle-orm";

import { db } from "./client";
import { exchangeRates } from "./schema/exchange-rates";

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "SEK", "NZD", "JPY", "CAD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * USD-based rates for every supported currency, as a currency → rate map. Converting
 * `amount` from A to B is `amount * (rates[B] / rates[A])`.
 *
 * Served from the `exchange_rates` cache, which is refilled from open.er-api.com when a
 * currency is missing or the rows are more than a day old.
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      currency: exchangeRates.currency,
      rate: exchangeRates.rate,
      updatedAt: exchangeRates.updatedAt,
    })
    .from(exchangeRates)
    .where(inArray(exchangeRates.currency, [...SUPPORTED_CURRENCIES]));

  const stale =
    rows.length < SUPPORTED_CURRENCIES.length ||
    rows.some((r) => Date.now() - r.updatedAt.getTime() > MAX_AGE_MS);

  if (stale) {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const json = (await res.json()) as { rates: Record<string, number> };
    const fresh = SUPPORTED_CURRENCIES.map((c) => ({
      currency: c,
      rate: String(json.rates[c] ?? 1),
      updatedAt: new Date(),
    }));
    await db
      .delete(exchangeRates)
      .where(inArray(exchangeRates.currency, [...SUPPORTED_CURRENCIES]));
    await db.insert(exchangeRates).values(fresh);
    return Object.fromEntries(fresh.map((r) => [r.currency, Number(r.rate)]));
  }

  return Object.fromEntries(rows.map((r) => [r.currency, Number(r.rate)]));
}
