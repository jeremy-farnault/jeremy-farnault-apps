import { db, routinerHabits, routinerLogs } from "@jf/db";
import { and, asc, desc, eq, ilike, isNotNull, isNull, max, sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Habit = typeof routinerHabits.$inferSelect;
export type HabitLog = typeof routinerLogs.$inferSelect;
export type SortOption = "name" | "createdAt" | "lastLogged";

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getHabits(userId: string, sort: SortOption = "createdAt"): Promise<Habit[]> {
  const lastLoggedSubq = db
    .select({ habitId: routinerLogs.habitId, lastLogged: max(routinerLogs.date).as("last_logged") })
    .from(routinerLogs)
    .groupBy(routinerLogs.habitId)
    .as("last_logged_subq");

  const orderBy =
    sort === "name"
      ? asc(routinerHabits.name)
      : sort === "lastLogged"
        ? sql`${lastLoggedSubq.lastLogged} desc nulls last`
        : desc(routinerHabits.createdAt);

  const rows = await db
    .select({ habit: routinerHabits })
    .from(routinerHabits)
    .leftJoin(lastLoggedSubq, eq(routinerHabits.id, lastLoggedSubq.habitId))
    .where(and(eq(routinerHabits.userId, userId), isNull(routinerHabits.archivedAt)))
    .orderBy(orderBy);

  return rows.map((r) => r.habit);
}

export async function getArchivedHabits(userId: string): Promise<Habit[]> {
  return db
    .select()
    .from(routinerHabits)
    .where(and(eq(routinerHabits.userId, userId), isNotNull(routinerHabits.archivedAt)))
    .orderBy(desc(routinerHabits.archivedAt));
}

export async function searchHabits(userId: string, query: string): Promise<Habit[]> {
  return db
    .select()
    .from(routinerHabits)
    .where(
      and(
        eq(routinerHabits.userId, userId),
        isNull(routinerHabits.archivedAt),
        ilike(routinerHabits.name, `%${query}%`)
      )
    );
}

export async function getHabit(userId: string, habitId: string): Promise<Habit | null> {
  const [habit] = await db
    .select()
    .from(routinerHabits)
    .where(and(eq(routinerHabits.id, habitId), eq(routinerHabits.userId, userId)))
    .limit(1);

  return habit ?? null;
}
