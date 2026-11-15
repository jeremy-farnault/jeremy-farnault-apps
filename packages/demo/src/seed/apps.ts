import { routinerHabits, routinerLogs } from "@jf/db";
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
  routiner: async (tx, userId, { habits, logs }) => {
    await tx.delete(routinerLogs).where(eq(routinerLogs.userId, userId));
    await tx.delete(routinerHabits).where(eq(routinerHabits.userId, userId));
    await insertInChunks(habits, (chunk) => tx.insert(routinerHabits).values(chunk));
    await insertInChunks(logs, (chunk) => tx.insert(routinerLogs).values(chunk));
  },
};
