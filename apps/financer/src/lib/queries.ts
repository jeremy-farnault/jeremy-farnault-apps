import {
  db,
  financerEntries,
  financerIncomeEntries,
  financerIncomeSources,
  financerSummaries,
} from "@jf/db";
import { and, eq } from "drizzle-orm";

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export type SpendingRow = {
  category: string;
  total: number;
};

export type SavingsRow = {
  sourceId: string;
  name: string;
  currency: string;
  total: number;
};

export type IncomeSourceRow = {
  id: string;
  name: string;
  currency: string;
  hasEntries: boolean;
};

export async function getSpendingForMonth(userId: string, month: string): Promise<SpendingRow[]> {
  const [entries, summaries] = await Promise.all([
    db
      .select({ category: financerEntries.category, value: financerEntries.value })
      .from(financerEntries)
      .where(and(eq(financerEntries.userId, userId), eq(financerEntries.month, month))),
    db
      .select({ category: financerSummaries.category, value: financerSummaries.value })
      .from(financerSummaries)
      .where(and(eq(financerSummaries.userId, userId), eq(financerSummaries.month, month))),
  ]);

  const totals = new Map<string, number>();
  for (const row of [...entries, ...summaries]) {
    const current = totals.get(row.category) ?? 0;
    totals.set(row.category, current + Number(row.value));
  }

  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export async function hasOpenEntries(userId: string, month: string): Promise<boolean> {
  const rows = await db
    .select({ id: financerEntries.id })
    .from(financerEntries)
    .where(and(eq(financerEntries.userId, userId), eq(financerEntries.month, month)))
    .limit(1);
  return rows.length > 0;
}

export async function getSavingsForMonth(userId: string, month: string): Promise<SavingsRow[]> {
  const rows = await db
    .select({
      sourceId: financerIncomeEntries.sourceId,
      name: financerIncomeSources.name,
      currency: financerIncomeSources.currency,
      value: financerIncomeEntries.value,
    })
    .from(financerIncomeEntries)
    .innerJoin(financerIncomeSources, eq(financerIncomeEntries.sourceId, financerIncomeSources.id))
    .where(and(eq(financerIncomeEntries.userId, userId), eq(financerIncomeEntries.month, month)));

  const totals = new Map<string, { name: string; currency: string; total: number }>();
  for (const row of rows) {
    const existing = totals.get(row.sourceId);
    if (existing) {
      existing.total += Number(row.value);
    } else {
      totals.set(row.sourceId, {
        name: row.name,
        currency: row.currency,
        total: Number(row.value),
      });
    }
  }

  return Array.from(totals.entries())
    .map(([sourceId, { name, currency, total }]) => ({ sourceId, name, currency, total }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSavingsAvailableMonths(userId: string): Promise<string[]> {
  const months = await db
    .selectDistinct({ month: financerIncomeEntries.month })
    .from(financerIncomeEntries)
    .where(eq(financerIncomeEntries.userId, userId));

  const currentMonth = getCurrentMonth();
  const all = new Set(months.map((r) => r.month));
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
    .map((s) => ({ ...s, hasEntries: sourceIdsWithEntries.has(s.id) }))
    .sort((a, b) => a.name.localeCompare(b.name));
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
