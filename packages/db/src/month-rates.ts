// Month-rate rules, kept pure (no database, no network) so they can be tested on their own.

/** USD-based rates, as a currency → rate map. */
export type Rates = Record<string, number>;

/** One stored month rate: a currency's USD-based rate for a UTC month (`YYYY-MM`). */
export interface MonthRateRow {
  currency: string;
  month: string;
  rate: number;
}

/**
 * The rates each month converts at. The current month always gets the live rates. Any
 * other month gets its stored month rates, and each currency it has no rate for falls back
 * to the live rate, so a month without rows converts entirely at the live rates.
 */
export function resolveMonthRates({
  live,
  stored,
  months,
  currentMonth,
}: {
  live: Rates;
  stored: MonthRateRow[];
  months: string[];
  currentMonth: string;
}): Record<string, Rates> {
  const byMonth = new Map<string, Rates>();
  for (const row of stored) {
    const rates = byMonth.get(row.month) ?? {};
    rates[row.currency] = row.rate;
    byMonth.set(row.month, rates);
  }
  return Object.fromEntries(
    months.map((month) => [
      month,
      month === currentMonth ? { ...live } : { ...live, ...byMonth.get(month) },
    ])
  );
}
