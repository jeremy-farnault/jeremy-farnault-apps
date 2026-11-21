import {
  db,
  financerAssetEntries,
  financerAssetSources,
  financerEntries,
  financerIncomeEntries,
  financerIncomeSources,
  financerSpendingCategories,
  financerUserSettings,
  getExchangeRates,
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
  sourceId: string;
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
  sourceId: string;
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
  const entries = await db
    .select({
      category: financerEntries.category,
      currency: financerEntries.currency,
      value: financerEntries.value,
    })
    .from(financerEntries)
    .where(and(eq(financerEntries.userId, userId), eq(financerEntries.month, month)));

  const totals = new Map<string, SpendingRow>();
  for (const row of entries) {
    const key = `${row.category}::${row.currency}`;
    const existing = totals.get(key);
    if (existing) {
      existing.total += Number(row.value);
    } else {
      totals.set(key, { category: row.category, currency: row.currency, total: Number(row.value) });
    }
  }

  return Array.from(totals.values()).sort(
    (a, b) => a.category.localeCompare(b.category) || a.currency.localeCompare(b.currency)
  );
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

export async function getAssetsForMonth(userId: string, month: string): Promise<AssetRow[]> {
  const entryRows = await db
    .select({
      sourceId: financerAssetEntries.sourceId,
      name: financerAssetSources.name,
      currency: financerAssetSources.currency,
      value: financerAssetEntries.value,
    })
    .from(financerAssetEntries)
    .innerJoin(financerAssetSources, eq(financerAssetEntries.sourceId, financerAssetSources.id))
    .where(and(eq(financerAssetEntries.userId, userId), eq(financerAssetEntries.month, month)));

  const totals = new Map<string, AssetRow>();
  for (const row of entryRows) {
    const existing = totals.get(row.sourceId);
    if (existing) {
      existing.total += Number(row.value);
    } else {
      totals.set(row.sourceId, {
        sourceId: row.sourceId,
        name: row.name,
        currency: row.currency,
        total: Number(row.value),
      });
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
  const entryMonths = await db
    .selectDistinct({ month: financerAssetEntries.month })
    .from(financerAssetEntries)
    .where(eq(financerAssetEntries.userId, userId));

  const currentMonth = getCurrentMonth();
  const all = new Set(entryMonths.map((r) => r.month));
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
  const entryRows = await db
    .select({
      sourceId: financerIncomeEntries.sourceId,
      name: financerIncomeSources.name,
      currency: financerIncomeSources.currency,
      value: financerIncomeEntries.value,
    })
    .from(financerIncomeEntries)
    .innerJoin(financerIncomeSources, eq(financerIncomeEntries.sourceId, financerIncomeSources.id))
    .where(and(eq(financerIncomeEntries.userId, userId), eq(financerIncomeEntries.month, month)));

  const totals = new Map<string, IncomeRow>();
  for (const row of entryRows) {
    const existing = totals.get(row.sourceId);
    if (existing) {
      existing.total += Number(row.value);
    } else {
      totals.set(row.sourceId, {
        sourceId: row.sourceId,
        name: row.name,
        currency: row.currency,
        total: Number(row.value),
      });
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
  const entryMonths = await db
    .selectDistinct({ month: financerIncomeEntries.month })
    .from(financerIncomeEntries)
    .where(eq(financerIncomeEntries.userId, userId));

  const currentMonth = getCurrentMonth();
  const all = new Set(entryMonths.map((r) => r.month));
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
  const entriesUsing = await db
    .selectDistinct({ category: financerEntries.category })
    .from(financerEntries)
    .where(and(eq(financerEntries.userId, userId), inArray(financerEntries.category, names)));

  const usedNames = new Set(entriesUsing.map((r) => r.category));

  return categories
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(({ createdAt: _, ...c }) => ({ ...c, hasEntries: usedNames.has(c.name) }));
}

export async function getAvailableMonths(userId: string): Promise<string[]> {
  const entryMonths = await db
    .selectDistinct({ month: financerEntries.month })
    .from(financerEntries)
    .where(eq(financerEntries.userId, userId));

  const currentMonth = getCurrentMonth();
  const all = new Set(entryMonths.map((r) => r.month));
  all.delete(currentMonth);

  const past = Array.from(all).sort((a, b) => b.localeCompare(a));
  return [currentMonth, ...past];
}

export async function getHomeCurrency(userId: string): Promise<string> {
  const [row] = await db
    .select({ homeCurrency: financerUserSettings.homeCurrency })
    .from(financerUserSettings)
    .where(eq(financerUserSettings.userId, userId));
  return row?.homeCurrency ?? "USD";
}

export async function getMonthlyTotals(userId: string, months: string[]): Promise<MonthlyTotals[]> {
  if (months.length === 0) return [];

  const [entries, assetRows, incomeRows, rates, homeCurrency] = await Promise.all([
    db
      .select({
        month: financerEntries.month,
        category: financerEntries.category,
        value: financerEntries.value,
        currency: financerEntries.currency,
      })
      .from(financerEntries)
      .where(and(eq(financerEntries.userId, userId), inArray(financerEntries.month, months))),
    db
      .select({
        month: financerAssetEntries.month,
        value: financerAssetEntries.value,
        name: financerAssetSources.name,
        currency: financerAssetSources.currency,
      })
      .from(financerAssetEntries)
      .innerJoin(financerAssetSources, eq(financerAssetEntries.sourceId, financerAssetSources.id))
      .where(
        and(eq(financerAssetEntries.userId, userId), inArray(financerAssetEntries.month, months))
      ),
    db
      .select({
        month: financerIncomeEntries.month,
        value: financerIncomeEntries.value,
        name: financerIncomeSources.name,
        currency: financerIncomeSources.currency,
      })
      .from(financerIncomeEntries)
      .innerJoin(
        financerIncomeSources,
        eq(financerIncomeEntries.sourceId, financerIncomeSources.id)
      )
      .where(
        and(eq(financerIncomeEntries.userId, userId), inArray(financerIncomeEntries.month, months))
      ),
    getExchangeRates(),
    getHomeCurrency(userId),
  ]);

  const rateTo = rates[homeCurrency];
  const convert = (value: string | number, currency: string) => {
    const amount = Number(value);
    const rateFrom = rates[currency];
    return rateFrom && rateTo ? amount * (rateTo / rateFrom) : amount;
  };

  const result = new Map<string, MonthlyTotals>(
    months.map((m) => [
      m,
      { month: m, spending: 0, assets: {}, income: {}, spendingByCategory: {} },
    ])
  );

  for (const row of entries) {
    const entry = result.get(row.month);
    if (entry) {
      const converted = convert(row.value, row.currency);
      entry.spending += converted;
      entry.spendingByCategory[row.category] =
        (entry.spendingByCategory[row.category] ?? 0) + converted;
    }
  }

  for (const row of assetRows) {
    const entry = result.get(row.month);
    if (entry) {
      entry.assets[row.name] = (entry.assets[row.name] ?? 0) + convert(row.value, row.currency);
    }
  }

  for (const row of incomeRows) {
    const entry = result.get(row.month);
    if (entry) {
      entry.income[row.name] = (entry.income[row.name] ?? 0) + convert(row.value, row.currency);
    }
  }

  return months.map((m) => result.get(m)!);
}
