import {
  db,
  financerAssetEntries,
  financerAssetSources,
  financerAssetSummaries,
  financerExchangeRates,
  financerUserSettings,
} from "@jf/db";
import { and, eq } from "drizzle-orm";

export interface AssetRow {
  name: string;
  currency: string;
  value: number;
}

export interface CurrentAssetsData {
  // Per-source asset values for the month, in each source's own currency.
  rows: AssetRow[];
  homeCurrency: string;
  // USD-based exchange-rate map (currency -> units per 1 USD), read from the DB.
  rates: Record<string, number>;
}

/**
 * Assemble the user's asset values for a given `month` (YYYY-MM), mirroring the
 * Financer app's `getAssetsForMonth`: open months are served by
 * `financerAssetEntries` (joined to sources for name/currency), closed months by
 * `financerAssetSummaries`; rows are summed per (name, currency) in their own
 * currency. Also returns the user's home currency and the DB-stored exchange
 * rates so the caller can convert — no external rate refresh is performed.
 */
export async function getCurrentAssets(userId: string, month: string): Promise<CurrentAssetsData> {
  const entryRows = await db
    .select({
      name: financerAssetSources.name,
      currency: financerAssetSources.currency,
      value: financerAssetEntries.value,
    })
    .from(financerAssetEntries)
    .innerJoin(financerAssetSources, eq(financerAssetSources.id, financerAssetEntries.sourceId))
    .where(and(eq(financerAssetEntries.userId, userId), eq(financerAssetEntries.month, month)));

  const summaryRows = await db
    .select({
      name: financerAssetSummaries.name,
      currency: financerAssetSummaries.currency,
      value: financerAssetSummaries.value,
    })
    .from(financerAssetSummaries)
    .where(and(eq(financerAssetSummaries.userId, userId), eq(financerAssetSummaries.month, month)));

  const grouped = new Map<string, AssetRow>();
  for (const row of [...entryRows, ...summaryRows]) {
    const key = `${row.name}::${row.currency}`;
    const value = Number(row.value);
    const existing = grouped.get(key);
    if (existing) existing.value += value;
    else grouped.set(key, { name: row.name, currency: row.currency, value });
  }
  const rows = [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));

  const [settings] = await db
    .select({ homeCurrency: financerUserSettings.homeCurrency })
    .from(financerUserSettings)
    .where(eq(financerUserSettings.userId, userId))
    .limit(1);
  const homeCurrency = settings?.homeCurrency ?? "USD";

  const rateRows = await db
    .select({ currency: financerExchangeRates.currency, rate: financerExchangeRates.rate })
    .from(financerExchangeRates);
  const rates: Record<string, number> = {};
  for (const row of rateRows) rates[row.currency] = Number(row.rate);

  return { rows, homeCurrency, rates };
}
