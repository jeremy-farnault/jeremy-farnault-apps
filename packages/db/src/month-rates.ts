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

/** Daily USD-based rates by date (`YYYY-MM-DD`), as a historical-rates source returns them. */
export type DailyRates = Record<string, Rates>;

/** The UTC months from `fromMonth` up to, but not including, `untilMonth` (`YYYY-MM`). */
export function monthsBetween(fromMonth: string, untilMonth: string): string[] {
  const months: string[] = [];
  let [year, month] = fromMonth.split("-").map(Number) as [number, number];
  for (;;) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (key >= untilMonth) return months;
    months.push(key);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
}

/**
 * The month rates a historical fill inserts: for each month from `fromMonth` to the month
 * before `currentMonth`, each currency's rate on the last day of that month the source has
 * a rate for (its last business day). A month and currency that already has a stored rate is
 * skipped, so a captured rate is never overwritten, and the current month is never written.
 */
export function backfillRows({
  daily,
  currencies,
  fromMonth,
  currentMonth,
  stored,
}: {
  daily: DailyRates;
  currencies: readonly string[];
  fromMonth: string;
  currentMonth: string;
  stored: { currency: string; month: string }[];
}): MonthRateRow[] {
  const have = new Set(stored.map((r) => `${r.month}:${r.currency}`));
  const datesByMonth = new Map<string, string[]>();
  for (const date of Object.keys(daily).sort()) {
    const month = date.slice(0, 7);
    datesByMonth.set(month, [...(datesByMonth.get(month) ?? []), date]);
  }

  const rows: MonthRateRow[] = [];
  for (const month of monthsBetween(fromMonth, currentMonth)) {
    const dates = datesByMonth.get(month) ?? [];
    for (const currency of currencies) {
      if (have.has(`${month}:${currency}`)) continue;
      const rate = lastRate(daily, dates, currency);
      if (rate !== undefined) rows.push({ currency, month, rate });
    }
  }
  return rows;
}

// The currency's rate on the latest of `dates` (sorted) that has one.
function lastRate(daily: DailyRates, dates: string[], currency: string): number | undefined {
  for (let i = dates.length - 1; i >= 0; i--) {
    const rate = daily[dates[i] ?? ""]?.[currency];
    if (rate !== undefined) return rate;
  }
  return undefined;
}
