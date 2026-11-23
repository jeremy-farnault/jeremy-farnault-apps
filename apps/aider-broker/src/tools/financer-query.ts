import {
  db,
  financerAssetEntries,
  financerAssetSources,
  financerUserSettings,
  getMonthExchangeRates,
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
  // USD-based exchange-rate map (currency -> units per 1 USD) for the month: its month
  // rates, or the live rates for the current month, as Financer converts it.
  rates: Record<string, number>;
}

/**
 * Assemble the user's asset values for a given `month` (YYYY-MM), mirroring the
 * Financer app's `getAssetsForMonth`: `financerAssetEntries` joined to sources for
 * name/currency, summed per (name, currency) in their own currency. Also returns
 * the user's home currency and the month's exchange rates (through the same shared
 * reader as Financer, so both convert a month alike) so the caller can convert.
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

  const grouped = new Map<string, AssetRow>();
  for (const row of entryRows) {
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

  const rates = (await getMonthExchangeRates([month]))[month] ?? {};

  return { rows, homeCurrency, rates };
}
