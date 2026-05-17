import { db, financerEntries, financerSummaries } from "@jf/db";
import { and, eq } from "drizzle-orm";

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export type SpendingRow = {
  category: string;
  total: number;
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
