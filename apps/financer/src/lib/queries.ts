import {
  db,
  financerAssetEntries,
  financerAssetSources,
  financerAssetSummaries,
  financerEntries,
  financerExchangeRates,
  financerIncomeEntries,
  financerIncomeSources,
  financerIncomeSummaries,
  financerSpendingCategories,
  financerSummaries,
  financerUserSettings,
} from "@jf/db";
import { and, eq, inArray } from "drizzle-orm";

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export type SpendingRow = {
  category: string;
  currency: string;
  total: number;
};

export type SpendingEntryRow = {
  id: string;
  category: string;
  currency: string;
  value: number;
};

export type AssetRow = {
  sourceId?: string;
  name: string;
  currency: string;
  total: number;
};

export type AssetEntryRow = {
  id: string;
  sourceId: string;
  value: number;
};

export type AssetSourceRow = {
  id: string;
  name: string;
  currency: string;
  color: string | null;
  hasEntries: boolean;
};

export type IncomeRow = {
  sourceId?: string;
  name: string;
  currency: string;
  total: number;
};

export type IncomeEntryRow = {
  id: string;
  sourceId: string;
  value: number;
};

export type IncomeSourceRow = {
  id: string;
  name: string;
  currency: string;
  color: string | null;
  hasEntries: boolean;
};

export type SpendingCategoryRow = {
  id: string;
  name: string;
  color: string | null;
  hasEntries: boolean;
};

export type MonthlyTotals = {
  month: string;
  spending: number;
  assets: Record<string, number>;
  income: Record<string, number>;
  spendingByCategory: Record<string, number>;
};

export async function getSpendingForMonth(userId: string, month: string): Promise<SpendingRow[]> {
  const [entries, summaries] = await Promise.all([
    db
      .select({
        category: financerEntries.category,
        currency: financerEntries.currency,
        value: financerEntries.value,
      })
      .from(financerEntries)
      .where(and(eq(financerEntries.userId, userId), eq(financerEntries.month, month))),
    db
      .select({
        category: financerSummaries.category,
        currency: financerSummaries.currency,
        value: financerSummaries.value,
      })
      .from(financerSummaries)
      .where(and(eq(financerSummaries.userId, userId), eq(financerSummaries.month, month))),
  ]);

  const totals = new Map<string, { currency: string; total: number }>();
  for (const row of [...entries, ...summaries]) {
    const key = `${row.category}::${row.currency}`;
    const existing = totals.get(key);
    if (existing) {
      existing.total += Number(row.value);
    } else {
      totals.set(key, { currency: row.currency, total: Number(row.value) });
    }
  }

  return Array.from(totals.entries())
    .map(([key, { currency, total }]) => ({
      category: key.split("::")[0]!,
      currency,
      total,
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.currency.localeCompare(b.currency));
}

export async function getSpendingEntriesForMonth(
  userId: string,
  month: string
): Promise<SpendingEntryRow[]> {
  const rows = await db
    .select({
      id: financerEntries.id,
      category: financerEntries.category,
      currency: financerEntries.currency,
      value: financerEntries.value,
    })
    .from(financerEntries)
    .where(and(eq(financerEntries.userId, userId), eq(financerEntries.month, month)));

  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    currency: r.currency,
    value: Number(r.value),
  }));
}

export async function hasOpenEntries(userId: string, month: string): Promise<boolean> {
  const rows = await db
    .select({ id: financerEntries.id })
    .from(financerEntries)
    .where(and(eq(financerEntries.userId, userId), eq(financerEntries.month, month)))
    .limit(1);
  return rows.length > 0;
}

export async function hasOpenIncomeEntries(userId: string, month: string): Promise<boolean> {
  const rows = await db
    .select({ id: financerIncomeEntries.id })
    .from(financerIncomeEntries)
    .where(and(eq(financerIncomeEntries.userId, userId), eq(financerIncomeEntries.month, month)))
    .limit(1);
  return rows.length > 0;
}

export async function hasOpenAssetEntries(userId: string, month: string): Promise<boolean> {
  const rows = await db
    .select({ id: financerAssetEntries.id })
    .from(financerAssetEntries)
    .where(and(eq(financerAssetEntries.userId, userId), eq(financerAssetEntries.month, month)))
    .limit(1);
  return rows.length > 0;
}

export async function getAssetsForMonth(userId: string, month: string): Promise<AssetRow[]> {
  const [entryRows, summaryRows] = await Promise.all([
    db
      .select({
        sourceId: financerAssetEntries.sourceId,
        name: financerAssetSources.name,
        currency: financerAssetSources.currency,
        value: financerAssetEntries.value,
      })
      .from(financerAssetEntries)
      .innerJoin(financerAssetSources, eq(financerAssetEntries.sourceId, financerAssetSources.id))
      .where(and(eq(financerAssetEntries.userId, userId), eq(financerAssetEntries.month, month))),
    db
      .select({
        name: financerAssetSummaries.name,
        currency: financerAssetSummaries.currency,
        value: financerAssetSummaries.value,
      })
      .from(financerAssetSummaries)
      .where(
        and(eq(financerAssetSummaries.userId, userId), eq(financerAssetSummaries.month, month))
      ),
  ]);

  const totals = new Map<
    string,
    { sourceId?: string; name: string; currency: string; total: number }
  >();
  for (const row of entryRows) {
    const key = `${row.sourceId}::${row.currency}`;
    const existing = totals.get(key);
    if (existing) {
      existing.total += Number(row.value);
    } else {
      totals.set(key, {
        sourceId: row.sourceId,
        name: row.name,
        currency: row.currency,
        total: Number(row.value),
      });
    }
  }
  for (const row of summaryRows) {
    const key = `summary::${row.name}::${row.currency}`;
    const existing = totals.get(key);
    if (existing) {
      existing.total += Number(row.value);
    } else {
      totals.set(key, { name: row.name, currency: row.currency, total: Number(row.value) });
    }
  }

  return Array.from(totals.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAssetEntriesForMonth(
  userId: string,
  month: string
): Promise<AssetEntryRow[]> {
  const rows = await db
    .select({
      id: financerAssetEntries.id,
      sourceId: financerAssetEntries.sourceId,
      value: financerAssetEntries.value,
    })
    .from(financerAssetEntries)
    .where(and(eq(financerAssetEntries.userId, userId), eq(financerAssetEntries.month, month)));

  return rows.map((r) => ({ id: r.id, sourceId: r.sourceId, value: Number(r.value) }));
}

export async function getAssetsAvailableMonths(userId: string): Promise<string[]> {
  const [entryMonths, summaryMonths] = await Promise.all([
    db
      .selectDistinct({ month: financerAssetEntries.month })
      .from(financerAssetEntries)
      .where(eq(financerAssetEntries.userId, userId)),
    db
      .selectDistinct({ month: financerAssetSummaries.month })
      .from(financerAssetSummaries)
      .where(eq(financerAssetSummaries.userId, userId)),
  ]);

  const currentMonth = getCurrentMonth();
  const all = new Set([...entryMonths, ...summaryMonths].map((r) => r.month));
  all.delete(currentMonth);

  const past = Array.from(all).sort((a, b) => b.localeCompare(a));
  return [currentMonth, ...past];
}

export async function getAssetSources(userId: string): Promise<AssetSourceRow[]> {
  const [sources, entrySources] = await Promise.all([
    db
      .select({
        id: financerAssetSources.id,
        name: financerAssetSources.name,
        currency: financerAssetSources.currency,
        color: financerAssetSources.color,
        createdAt: financerAssetSources.createdAt,
      })
      .from(financerAssetSources)
      .where(eq(financerAssetSources.userId, userId)),
    db
      .selectDistinct({ sourceId: financerAssetEntries.sourceId })
      .from(financerAssetEntries)
      .where(eq(financerAssetEntries.userId, userId)),
  ]);

  const sourceIdsWithEntries = new Set(entrySources.map((r) => r.sourceId));
  return sources
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(({ createdAt: _, ...s }) => ({ ...s, hasEntries: sourceIdsWithEntries.has(s.id) }));
}

export async function getIncomeForMonth(userId: string, month: string): Promise<IncomeRow[]> {
  const [entryRows, summaryRows] = await Promise.all([
    db
      .select({
        sourceId: financerIncomeEntries.sourceId,
        name: financerIncomeSources.name,
        currency: financerIncomeSources.currency,
        value: financerIncomeEntries.value,
      })
      .from(financerIncomeEntries)
      .innerJoin(
        financerIncomeSources,
        eq(financerIncomeEntries.sourceId, financerIncomeSources.id)
      )
      .where(and(eq(financerIncomeEntries.userId, userId), eq(financerIncomeEntries.month, month))),
    db
      .select({
        name: financerIncomeSummaries.name,
        currency: financerIncomeSummaries.currency,
        value: financerIncomeSummaries.value,
      })
      .from(financerIncomeSummaries)
      .where(
        and(eq(financerIncomeSummaries.userId, userId), eq(financerIncomeSummaries.month, month))
      ),
  ]);

  const totals = new Map<
    string,
    { sourceId?: string; name: string; currency: string; total: number }
  >();
  for (const row of entryRows) {
    const key = `${row.sourceId}::${row.currency}`;
    const existing = totals.get(key);
    if (existing) {
      existing.total += Number(row.value);
    } else {
      totals.set(key, {
        sourceId: row.sourceId,
        name: row.name,
        currency: row.currency,
        total: Number(row.value),
      });
    }
  }
  for (const row of summaryRows) {
    const key = `summary::${row.name}::${row.currency}`;
    const existing = totals.get(key);
    if (existing) {
      existing.total += Number(row.value);
    } else {
      totals.set(key, { name: row.name, currency: row.currency, total: Number(row.value) });
    }
  }

  return Array.from(totals.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getIncomeEntriesForMonth(
  userId: string,
  month: string
): Promise<IncomeEntryRow[]> {
  const rows = await db
    .select({
      id: financerIncomeEntries.id,
      sourceId: financerIncomeEntries.sourceId,
      value: financerIncomeEntries.value,
    })
    .from(financerIncomeEntries)
    .where(and(eq(financerIncomeEntries.userId, userId), eq(financerIncomeEntries.month, month)));

  return rows.map((r) => ({ id: r.id, sourceId: r.sourceId, value: Number(r.value) }));
}

export async function getIncomeAvailableMonths(userId: string): Promise<string[]> {
  const [entryMonths, summaryMonths] = await Promise.all([
    db
      .selectDistinct({ month: financerIncomeEntries.month })
      .from(financerIncomeEntries)
      .where(eq(financerIncomeEntries.userId, userId)),
    db
      .selectDistinct({ month: financerIncomeSummaries.month })
      .from(financerIncomeSummaries)
      .where(eq(financerIncomeSummaries.userId, userId)),
  ]);

  const currentMonth = getCurrentMonth();
  const all = new Set([...entryMonths, ...summaryMonths].map((r) => r.month));
  all.delete(currentMonth);

  const past = Array.from(all).sort((a, b) => b.localeCompare(a));
  return [currentMonth, ...past];
}

export async function getIncomeSources(userId: string): Promise<IncomeSourceRow[]> {
  const [sources, entrySources] = await Promise.all([
    db
      .select({
        id: financerIncomeSources.id,
        name: financerIncomeSources.name,
        currency: financerIncomeSources.currency,
        color: financerIncomeSources.color,
        createdAt: financerIncomeSources.createdAt,
      })
      .from(financerIncomeSources)
      .where(eq(financerIncomeSources.userId, userId)),
    db
      .selectDistinct({ sourceId: financerIncomeEntries.sourceId })
      .from(financerIncomeEntries)
      .where(eq(financerIncomeEntries.userId, userId)),
  ]);

  const sourceIdsWithEntries = new Set(entrySources.map((r) => r.sourceId));
  return sources
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(({ createdAt: _, ...s }) => ({ ...s, hasEntries: sourceIdsWithEntries.has(s.id) }));
}

export async function getSpendingCategories(userId: string): Promise<SpendingCategoryRow[]> {
  const categories = await db
    .select({
      id: financerSpendingCategories.id,
      name: financerSpendingCategories.name,
      color: financerSpendingCategories.color,
      createdAt: financerSpendingCategories.createdAt,
    })
    .from(financerSpendingCategories)
    .where(eq(financerSpendingCategories.userId, userId));

  if (categories.length === 0) return [];

  const names = categories.map((c) => c.name);
  const [entriesUsing, summariesUsing] = await Promise.all([
    db
      .selectDistinct({ category: financerEntries.category })
      .from(financerEntries)
      .where(and(eq(financerEntries.userId, userId), inArray(financerEntries.category, names))),
    db
      .selectDistinct({ category: financerSummaries.category })
      .from(financerSummaries)
      .where(and(eq(financerSummaries.userId, userId), inArray(financerSummaries.category, names))),
  ]);

  const usedNames = new Set([
    ...entriesUsing.map((r) => r.category),
    ...summariesUsing.map((r) => r.category),
  ]);

  return categories
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(({ createdAt: _, ...c }) => ({ ...c, hasEntries: usedNames.has(c.name) }));
}

export async function getAvailableMonths(userId: string): Promise<string[]> {
  const [entryMonths, summaryMonths] = await Promise.all([
    db
      .selectDistinct({ month: financerEntries.month })
      .from(financerEntries)
      .where(eq(financerEntries.userId, userId)),
    db
      .selectDistinct({ month: financerSummaries.month })
      .from(financerSummaries)
      .where(eq(financerSummaries.userId, userId)),
  ]);

  const currentMonth = getCurrentMonth();
  const all = new Set([...entryMonths, ...summaryMonths].map((r) => r.month));
  all.delete(currentMonth);

  const past = Array.from(all).sort((a, b) => b.localeCompare(a));
  return [currentMonth, ...past];
}

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "SEK", "NZD", "JPY"] as const;

export async function getHomeCurrency(userId: string): Promise<string> {
  const [row] = await db
    .select({ homeCurrency: financerUserSettings.homeCurrency })
    .from(financerUserSettings)
    .where(eq(financerUserSettings.userId, userId));
  return row?.homeCurrency ?? "USD";
}

export async function getExchangeRates(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      currency: financerExchangeRates.currency,
      rate: financerExchangeRates.rate,
      updatedAt: financerExchangeRates.updatedAt,
    })
    .from(financerExchangeRates)
    .where(inArray(financerExchangeRates.currency, [...SUPPORTED_CURRENCIES]));

  const stale =
    rows.length < SUPPORTED_CURRENCIES.length ||
    rows.some((r) => Date.now() - r.updatedAt.getTime() > 24 * 60 * 60 * 1000);

  if (stale) {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const json = await res.json();
    const fresh = SUPPORTED_CURRENCIES.map((c) => ({
      currency: c,
      rate: String(json.rates[c] ?? 1),
      updatedAt: new Date(),
    }));
    await db
      .delete(financerExchangeRates)
      .where(inArray(financerExchangeRates.currency, [...SUPPORTED_CURRENCIES]));
    await db.insert(financerExchangeRates).values(fresh);
    return Object.fromEntries(fresh.map((r) => [r.currency, Number(r.rate)]));
  }

  return Object.fromEntries(rows.map((r) => [r.currency, Number(r.rate)]));
}

export async function getMonthlyTotals(userId: string, months: string[]): Promise<MonthlyTotals[]> {
  if (months.length === 0) return [];

  const [summaries, entries, assetRows, assetSummaryRows, incomeRows, incomeSummaryRows] =
    await Promise.all([
      db
        .select({
          month: financerSummaries.month,
          category: financerSummaries.category,
          value: financerSummaries.value,
        })
        .from(financerSummaries)
        .where(and(eq(financerSummaries.userId, userId), inArray(financerSummaries.month, months))),
      db
        .select({
          month: financerEntries.month,
          category: financerEntries.category,
          value: financerEntries.value,
        })
        .from(financerEntries)
        .where(and(eq(financerEntries.userId, userId), inArray(financerEntries.month, months))),
      db
        .select({
          month: financerAssetEntries.month,
          value: financerAssetEntries.value,
          name: financerAssetSources.name,
        })
        .from(financerAssetEntries)
        .innerJoin(financerAssetSources, eq(financerAssetEntries.sourceId, financerAssetSources.id))
        .where(
          and(eq(financerAssetEntries.userId, userId), inArray(financerAssetEntries.month, months))
        ),
      db
        .select({
          month: financerAssetSummaries.month,
          value: financerAssetSummaries.value,
          name: financerAssetSummaries.name,
        })
        .from(financerAssetSummaries)
        .where(
          and(
            eq(financerAssetSummaries.userId, userId),
            inArray(financerAssetSummaries.month, months)
          )
        ),
      db
        .select({
          month: financerIncomeEntries.month,
          value: financerIncomeEntries.value,
          name: financerIncomeSources.name,
        })
        .from(financerIncomeEntries)
        .innerJoin(
          financerIncomeSources,
          eq(financerIncomeEntries.sourceId, financerIncomeSources.id)
        )
        .where(
          and(
            eq(financerIncomeEntries.userId, userId),
            inArray(financerIncomeEntries.month, months)
          )
        ),
      db
        .select({
          month: financerIncomeSummaries.month,
          value: financerIncomeSummaries.value,
          name: financerIncomeSummaries.name,
        })
        .from(financerIncomeSummaries)
        .where(
          and(
            eq(financerIncomeSummaries.userId, userId),
            inArray(financerIncomeSummaries.month, months)
          )
        ),
    ]);

  const result = new Map<string, MonthlyTotals>(
    months.map((m) => [
      m,
      { month: m, spending: 0, assets: {}, income: {}, spendingByCategory: {} },
    ])
  );

  for (const row of [...summaries, ...entries]) {
    const entry = result.get(row.month);
    if (entry) {
      entry.spending += Number(row.value);
      entry.spendingByCategory[row.category] =
        (entry.spendingByCategory[row.category] ?? 0) + Number(row.value);
    }
  }

  for (const row of [...assetRows, ...assetSummaryRows]) {
    const entry = result.get(row.month);
    if (entry) {
      entry.assets[row.name] = (entry.assets[row.name] ?? 0) + Number(row.value);
    }
  }

  for (const row of [...incomeRows, ...incomeSummaryRows]) {
    const entry = result.get(row.month);
    if (entry) {
      entry.income[row.name] = (entry.income[row.name] ?? 0) + Number(row.value);
    }
  }

  return months.map((m) => result.get(m)!);
}
