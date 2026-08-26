import { db, journalerEntries } from "@jf/db";
import { and, asc, eq, gte, lte } from "drizzle-orm";

// The journaler category enum, inferred from the column so it stays in sync.
export type MediaCategory = (typeof journalerEntries.$inferSelect)["category"];

export interface MediaEntrySummary {
  title: string;
  category: MediaCategory;
  rating: number | null;
  date: string;
}

/**
 * Read the user's journaler (media) entries whose `date` falls in the inclusive
 * range, optionally filtered to a single category, oldest first. Bounds are
 * compared as `YYYY-MM-DD` strings because the column is a SQL `date`.
 */
export async function getMediaInRange(
  userId: string,
  startDate: string,
  endDate: string,
  limit: number,
  category?: MediaCategory
): Promise<MediaEntrySummary[]> {
  const conditions = [
    eq(journalerEntries.userId, userId),
    gte(journalerEntries.date, startDate),
    lte(journalerEntries.date, endDate),
  ];
  if (category) conditions.push(eq(journalerEntries.category, category));

  const rows = await db
    .select({
      title: journalerEntries.title,
      category: journalerEntries.category,
      rating: journalerEntries.rating,
      date: journalerEntries.date,
    })
    .from(journalerEntries)
    .where(and(...conditions))
    .orderBy(asc(journalerEntries.date))
    .limit(limit);

  return rows;
}
