import { db, routinerHabits, routinerLogs } from "@jf/db";
import { and, asc, eq, gte, ilike, isNull, lte } from "drizzle-orm";

export type RoutinerHabitType = (typeof routinerHabits.$inferSelect)["type"];

export interface HabitLog {
  date: string;
  value: string;
}

export interface HabitLogsResult {
  name: string;
  type: RoutinerHabitType;
  logs: HabitLog[];
}

/**
 * Resolve a (non-archived) habit by fuzzy name match for the user, then return
 * all of its logs whose `date` falls in the inclusive range, oldest first.
 * Returns null when no habit matches. `date` bounds are `YYYY-MM-DD` strings
 * because the column is a SQL `date`. A habit has at most one log per day, and
 * the range is capped at ~366 days upstream, so the log set stays small enough
 * to count in memory (boolean habits store "true"/"false" in `value`).
 */
export async function getHabitLogsInRange(
  userId: string,
  habitName: string,
  startDate: string,
  endDate: string
): Promise<HabitLogsResult | null> {
  const [habit] = await db
    .select({ id: routinerHabits.id, name: routinerHabits.name, type: routinerHabits.type })
    .from(routinerHabits)
    .where(
      and(
        eq(routinerHabits.userId, userId),
        isNull(routinerHabits.archivedAt),
        ilike(routinerHabits.name, `%${habitName}%`)
      )
    )
    .orderBy(asc(routinerHabits.name))
    .limit(1);

  if (!habit) return null;

  const logs = await db
    .select({ date: routinerLogs.date, value: routinerLogs.value })
    .from(routinerLogs)
    .where(
      and(
        eq(routinerLogs.habitId, habit.id),
        eq(routinerLogs.userId, userId),
        gte(routinerLogs.date, startDate),
        lte(routinerLogs.date, endDate)
      )
    )
    .orderBy(asc(routinerLogs.date));

  return { name: habit.name, type: habit.type, logs };
}

/** The user's non-archived habit names, for a no-match error payload. */
export async function listHabitNames(userId: string): Promise<string[]> {
  const rows = await db
    .select({ name: routinerHabits.name })
    .from(routinerHabits)
    .where(and(eq(routinerHabits.userId, userId), isNull(routinerHabits.archivedAt)))
    .orderBy(asc(routinerHabits.name));
  return rows.map((row) => row.name);
}
