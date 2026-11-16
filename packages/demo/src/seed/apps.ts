import {
  financerAssetEntries,
  financerAssetSources,
  financerEntries,
  financerIncomeEntries,
  financerIncomeSources,
  financerSpendingCategories,
  financerSummaries,
  financerUserSettings,
  routinerHabits,
  routinerLogs,
} from "@jf/db";
import { eq } from "drizzle-orm";

import type { DemoApp, DemoFixtures } from "../fixtures";
import type { Tx } from "./types";

type Reset<A extends DemoApp> = (
  tx: Tx,
  userId: string,
  fixtures: DemoFixtures[A]
) => Promise<void>;

/** Inserts in batches, so long log histories stay under Postgres's parameter limit. */
async function insertInChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += 500) {
    await insert(rows.slice(i, i + 500));
  }
}

/**
 * Per app: delete every row the demo user owns, children first, then insert the fixtures.
 * Shared rows (no user id) are never touched.
 */
export const RESETS: { [A in DemoApp]: Reset<A> } = {
  financer: async (tx, userId, fixtures) => {
    // Entries before their sources; every table filtered on the demo user.
    await tx.delete(financerAssetEntries).where(eq(financerAssetEntries.userId, userId));
    await tx.delete(financerIncomeEntries).where(eq(financerIncomeEntries.userId, userId));
    await tx.delete(financerAssetSources).where(eq(financerAssetSources.userId, userId));
    await tx.delete(financerIncomeSources).where(eq(financerIncomeSources.userId, userId));
    await tx.delete(financerEntries).where(eq(financerEntries.userId, userId));
    await tx.delete(financerSummaries).where(eq(financerSummaries.userId, userId));
    await tx
      .delete(financerSpendingCategories)
      .where(eq(financerSpendingCategories.userId, userId));
    await tx.delete(financerUserSettings).where(eq(financerUserSettings.userId, userId));

    await tx.insert(financerUserSettings).values(fixtures.settings);
    await tx.insert(financerSpendingCategories).values(fixtures.spendingCategories);
    await insertInChunks(fixtures.entries, (c) => tx.insert(financerEntries).values(c));
    await insertInChunks(fixtures.summaries, (c) => tx.insert(financerSummaries).values(c));
    await tx.insert(financerIncomeSources).values(fixtures.incomeSources);
    await tx.insert(financerAssetSources).values(fixtures.assetSources);
    await insertInChunks(fixtures.incomeEntries, (c) => tx.insert(financerIncomeEntries).values(c));
    await insertInChunks(fixtures.assetEntries, (c) => tx.insert(financerAssetEntries).values(c));
  },
  routiner: async (tx, userId, { habits, logs }) => {
    await tx.delete(routinerLogs).where(eq(routinerLogs.userId, userId));
    await tx.delete(routinerHabits).where(eq(routinerHabits.userId, userId));
    await insertInChunks(habits, (chunk) => tx.insert(routinerHabits).values(chunk));
    await insertInChunks(logs, (chunk) => tx.insert(routinerLogs).values(chunk));
  },
};
