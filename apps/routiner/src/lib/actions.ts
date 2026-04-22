"use server";

import { auth } from "@jf/auth";
import { db, routinerHabits, routinerLogs } from "@jf/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { type Habit, type SortOption, getHabit, getHabits, searchHabits } from "./queries";

async function getAuthUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

// ─── Read actions ─────────────────────────────────────────────────────────────

export async function getHabitsAction(sort?: SortOption): Promise<Habit[]> {
  const userId = await getAuthUserId();
  return getHabits(userId, sort);
}

export async function searchHabitsAction(query: string): Promise<Habit[]> {
  if (!query.trim()) return [];
  const userId = await getAuthUserId();
  return searchHabits(userId, query.trim());
}

// ─── Mutation actions ─────────────────────────────────────────────────────────

export async function createHabitAction(input: {
  name: string;
  type: "boolean" | "numeric" | "time";
  startDate: string;
  color: string;
  description?: string;
}): Promise<Habit> {
  const userId = await getAuthUserId();
  const [habit] = await db
    .insert(routinerHabits)
    .values({
      userId,
      name: input.name,
      type: input.type,
      startDate: input.startDate,
      color: input.color,
      description: input.description ?? null,
    })
    .returning();
  if (!habit) throw new Error("Failed to create habit");
  revalidatePath("/", "layout");
  return habit;
}

export async function updateHabitAction(input: {
  id: string;
  name: string;
  color: string;
  description?: string;
}): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .update(routinerHabits)
    .set({
      name: input.name,
      color: input.color,
      description: input.description ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(routinerHabits.id, input.id), eq(routinerHabits.userId, userId)));
  revalidatePath("/", "layout");
}

export async function archiveHabitAction(habitId: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .update(routinerHabits)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(routinerHabits.id, habitId), eq(routinerHabits.userId, userId)));
  revalidatePath("/", "layout");
}

export async function unarchiveHabitAction(habitId: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .update(routinerHabits)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(and(eq(routinerHabits.id, habitId), eq(routinerHabits.userId, userId)));
  revalidatePath("/", "layout");
}

export async function deleteHabitAction(habitId: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .delete(routinerHabits)
    .where(and(eq(routinerHabits.id, habitId), eq(routinerHabits.userId, userId)));
  revalidatePath("/", "layout");
}

export async function logHabitAction(input: {
  habitId: string;
  date: string;
  value: string;
  comment?: string;
}): Promise<void> {
  const userId = await getAuthUserId();
  const habit = await getHabit(userId, input.habitId);
  if (!habit) throw new Error("Habit not found");

  await db
    .insert(routinerLogs)
    .values({
      habitId: input.habitId,
      userId,
      date: input.date,
      value: input.value,
      comment: input.comment ?? null,
    })
    .onConflictDoUpdate({
      target: [routinerLogs.habitId, routinerLogs.date],
      set: { value: input.value, comment: input.comment ?? null, updatedAt: new Date() },
    });
  revalidatePath("/", "layout");
}
