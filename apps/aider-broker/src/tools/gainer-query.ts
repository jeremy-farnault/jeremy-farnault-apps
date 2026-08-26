import { db, gainerSessions } from "@jf/db";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";

export interface WorkoutSessionSummary {
  name: string;
  startedAt: Date;
  finishedAt: Date;
}

export async function getWorkoutsInRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<WorkoutSessionSummary[]> {
  const rows = await db
    .select({
      name: gainerSessions.name,
      startedAt: gainerSessions.startedAt,
      finishedAt: gainerSessions.finishedAt,
    })
    .from(gainerSessions)
    .where(
      and(
        eq(gainerSessions.userId, userId),
        isNotNull(gainerSessions.finishedAt),
        gte(gainerSessions.startedAt, startDate),
        lte(gainerSessions.startedAt, endDate)
      )
    )
    .orderBy(gainerSessions.startedAt);

  // isNotNull() above guarantees finishedAt is set, but Drizzle doesn't
  // narrow the column type from the WHERE clause, so it's still `Date | null`.
  return rows.map((row) => ({
    name: row.name,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt as Date,
  }));
}
