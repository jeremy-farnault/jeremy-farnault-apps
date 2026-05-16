import { db, financerEntries, financerSummaries } from "@jf/db";
import { and, eq } from "drizzle-orm";

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
