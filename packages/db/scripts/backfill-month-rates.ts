// One-off historical fill of month rates (Monthly Exchange Rates, ticket 05).
//
// Fills every month from the first Financer entry (spending, income or assets, any user) to
// last month with each currency's rate on that month's last business day, from Frankfurter
// (ECB rates, free, no key). Only month and currency pairs with no stored rate are written,
// so captured rates are never overwritten, and the current month is never touched.
//
// Dry run by default; pass --apply to insert.
//   DATABASE_URL=… pnpm --filter @jf/db backfill:month-rates [--apply]

import { inArray, sql } from "drizzle-orm";

import { db } from "../src/client";
import { SUPPORTED_CURRENCIES } from "../src/exchange-rates";
import { type DailyRates, backfillRows, monthsBetween } from "../src/month-rates";
import { monthExchangeRates } from "../src/schema/exchange-rates";

const FRANKFURTER = "https://api.frankfurter.dev/v1";
// Each month's last days are fetched from this day on: always at least one business day.
const WINDOW_START_DAY = 22;

async function main() {
  const apply = process.argv.includes("--apply");
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [{ first } = { first: null }] = (
    await db.execute<{ first: string | null }>(sql`
      select min(month) as first from (
        select month from financer_entries
        union all select month from financer_income_entries
        union all select month from financer_asset_entries
      ) m`)
  ).rows;
  if (!first || first >= currentMonth) {
    console.log("No Financer entries before the current month: nothing to fill.");
    return;
  }
  const months = monthsBetween(first, currentMonth);
  console.log(`Months: ${first} → ${months.at(-1)} (${months.length})`);

  const stored = await db
    .select({ currency: monthExchangeRates.currency, month: monthExchangeRates.month })
    .from(monthExchangeRates)
    .where(inArray(monthExchangeRates.month, months));

  const daily: DailyRates = {};
  for (const month of months) Object.assign(daily, await fetchMonthEnd(month));

  const rows = backfillRows({
    daily,
    currencies: SUPPORTED_CURRENCIES,
    fromMonth: first,
    currentMonth,
    stored,
  });

  const perMonth = new Map<string, number>();
  for (const row of rows) perMonth.set(row.month, (perMonth.get(row.month) ?? 0) + 1);
  for (const month of months) {
    const count = perMonth.get(month) ?? 0;
    const sek = rows.find((r) => r.month === month && r.currency === "SEK");
    const sample = sek ? ` (SEK ${sek.rate})` : "";
    const missing = SUPPORTED_CURRENCIES.length - count;
    const skipped = missing > 0 ? `, ${missing} already stored or unavailable` : "";
    console.log(`  ${month}: ${count} to insert${sample}${skipped}`);
  }
  console.log(`Rows to insert: ${rows.length}. Already stored: ${stored.length}.`);

  if (!apply) {
    console.log("Dry run: nothing written. Re-run with --apply to insert.");
    return;
  }
  if (rows.length > 0) {
    await db
      .insert(monthExchangeRates)
      .values(rows.map((r) => ({ ...r, rate: String(r.rate) })))
      .onConflictDoNothing();
  }
  console.log(`Inserted ${rows.length} rows.`);
}

// USD-based daily rates over the last days of `month`. USD itself is the base, so it is 1.
async function fetchMonthEnd(month: string): Promise<DailyRates> {
  const [year, m] = month.split("-").map(Number) as [number, number];
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const symbols = SUPPORTED_CURRENCIES.filter((c) => c !== "USD").join(",");
  const url = `${FRANKFURTER}/${month}-${WINDOW_START_DAY}..${month}-${lastDay}?base=USD&symbols=${symbols}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Frankfurter ${res.status} for ${month}`);
  const json = (await res.json()) as { rates: DailyRates };
  return Object.fromEntries(
    Object.entries(json.rates).map(([date, rates]) => [date, { ...rates, USD: 1 }])
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
