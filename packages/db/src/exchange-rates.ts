import { inArray, sql } from "drizzle-orm";

import { db } from "./client";
import { exchangeRates, monthExchangeRates } from "./schema/exchange-rates";

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "SEK", "NZD", "JPY", "CAD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * USD-based rates for every supported currency, as a currency → rate map. Converting
 * `amount` from A to B is `amount * (rates[B] / rates[A])`.
 *
 * Served from the `exchange_rates` cache, which is refilled from open.er-api.com when a
 * currency is missing or the rows are more than a day old. Each refill also saves the rates
 * as the current month's month rates.
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
    await captureMonthRates(fresh);
    return Object.fromEntries(fresh.map((r) => [r.currency, Number(r.rate)]));
  }

  return Object.fromEntries(rows.map((r) => [r.currency, Number(r.rate)]));
}

/**
 * Saves freshly fetched rates as the current UTC month's month rates. The last refresh of a
 * month wins; once the month is over nothing writes to its rows again. A failure is logged
 * and swallowed: the live rates must still reach the caller (Scanner's daily check among them).
 */
async function captureMonthRates(
  fresh: { currency: string; rate: string; updatedAt: Date }[]
): Promise<void> {
  const month = new Date().toISOString().slice(0, 7);
  try {
    await db
      .insert(monthExchangeRates)
      .values(fresh.map((r) => ({ ...r, month })))
      .onConflictDoUpdate({
        target: [monthExchangeRates.currency, monthExchangeRates.month],
        set: { rate: sql`excluded.rate`, updatedAt: sql`excluded.updated_at` },
      });
  } catch (error) {
    console.error(`Saving the month rates for ${month} failed`, error);
  }
}
