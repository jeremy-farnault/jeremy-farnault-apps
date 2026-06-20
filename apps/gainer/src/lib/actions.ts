"use server";

import { auth } from "@jf/auth";
import { db, gainerExercises, gainerSessionExercises, gainerSessions, gainerSets } from "@jf/db";
import { and, count, eq, isNull, max, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

async function getAuthUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

export async function startSession(): Promise<void> {
  const userId = await getAuthUserId();
  const name = new Date().toLocaleDateString("en-GB", { dateStyle: "long" });
  await db.insert(gainerSessions).values({ userId, name });
  revalidatePath("/", "layout");
}

export async function finishSession(sessionId: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .update(gainerSessions)
    .set({ finishedAt: new Date() })
    .where(and(eq(gainerSessions.id, sessionId), eq(gainerSessions.userId, userId)));
  revalidatePath("/", "layout");
}

export async function addExerciseToSession(sessionId: string, exerciseName: string): Promise<void> {
  const userId = await getAuthUserId();

  const trimmedName = exerciseName.trim();
  if (!trimmedName) throw new Error("Exercise name is required");

  // Find existing exercise (seeded or user's own), case-insensitive
  const existing = await db
    .select()
    .from(gainerExercises)
    .where(
      and(
        sql`lower(${gainerExercises.name}) = lower(${trimmedName})`,
        or(isNull(gainerExercises.userId), eq(gainerExercises.userId, userId))
      )
    )
    .limit(1);

  let exerciseId: string;
  if (existing[0]) {
    exerciseId = existing[0].id;
  } else {
    const created = await db
      .insert(gainerExercises)
      .values({ name: trimmedName, isCustom: true, userId })
      .returning({ id: gainerExercises.id });
    if (!created[0]) throw new Error("Failed to create exercise");
    exerciseId = created[0].id;
  }

  const posResult = await db
    .select({ maxPos: max(gainerSessionExercises.position) })
    .from(gainerSessionExercises)
    .where(eq(gainerSessionExercises.sessionId, sessionId));
  const nextPosition = (posResult[0]?.maxPos ?? 0) + 1;

  await db.insert(gainerSessionExercises).values({ sessionId, exerciseId, position: nextPosition });

  revalidatePath("/", "layout");
}

export async function logSet(
  sessionExerciseId: string,
  weight: string,
  reps: number
): Promise<void> {
  await getAuthUserId();

  const countResult = await db
    .select({ total: count() })
    .from(gainerSets)
    .where(eq(gainerSets.sessionExerciseId, sessionExerciseId));
  const setNumber = (countResult[0]?.total ?? 0) + 1;

  await db.insert(gainerSets).values({ sessionExerciseId, setNumber, weight, reps });

  revalidatePath("/", "layout");
}
