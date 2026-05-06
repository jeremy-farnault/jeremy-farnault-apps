"use server";

import { auth } from "@jf/auth";
import { db, reminders } from "@jf/db";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

type RepeatRule = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

async function getAuthUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

// ─── Reminder actions ─────────────────────────────────────────────────────────

export async function createReminder(
  noteId: string,
  blockId: string,
  title: string,
  scheduledAt: Date,
  repeatRule: RepeatRule
) {
  const userId = await getAuthUserId();
  const [reminder] = await db
    .insert(reminders)
    .values({ userId, noteId, blockId, title, scheduledAt, repeatRule })
    .returning();
  if (!reminder) throw new Error("Failed to create reminder");
  return reminder;
}

export async function updateReminder(
  id: string,
  fields: Partial<{ title: string; scheduledAt: Date; repeatRule: RepeatRule; isDone: boolean }>
) {
  const userId = await getAuthUserId();
  await db
    .update(reminders)
    .set({ ...fields, updatedAt: new Date() })
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
}

export async function deleteReminder(id: string) {
  const userId = await getAuthUserId();
  await db.delete(reminders).where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
}
