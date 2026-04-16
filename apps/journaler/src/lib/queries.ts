import { db, journalerEntries } from "@jf/db";
import { and, desc, eq, lt, or } from "drizzle-orm";

export type JournalerEntry = typeof journalerEntries.$inferSelect;
export type EntryCursor = { date: string; id: string };

export async function getEntries(
  userId: string,
  cursor: EntryCursor | null,
  limit = 30,
): Promise<{ entries: JournalerEntry[]; nextCursor: EntryCursor | null }> {
  const cursorCondition = cursor
    ? or(
        lt(journalerEntries.date, cursor.date),
        and(eq(journalerEntries.date, cursor.date), lt(journalerEntries.id, cursor.id)),
      )
    : undefined;

  const rows = await db
    .select()
    .from(journalerEntries)
    .where(and(eq(journalerEntries.userId, userId), cursorCondition))
    .orderBy(desc(journalerEntries.date), desc(journalerEntries.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const entries = hasMore ? rows.slice(0, limit) : rows;
  const lastEntry = entries[entries.length - 1];
  const nextCursor = hasMore && lastEntry
    ? { date: lastEntry.date, id: lastEntry.id }
    : null;

  return { entries, nextCursor };
}
