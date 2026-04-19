import { db, journalerEntries } from "@jf/db";
import { and, eq } from "drizzle-orm";
import type { EntryCategory, JournalerEntry } from "./queries";

export async function getEntryById(
  userId: string,
  id: string
): Promise<JournalerEntry | undefined> {
  const rows = await db
    .select()
    .from(journalerEntries)
    .where(and(eq(journalerEntries.id, id), eq(journalerEntries.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function insertEntry(
  userId: string,
  data: {
    title: string;
    category: EntryCategory;
    date: string;
    comment: string | null;
    rating: number | null;
    imageKey: string | null;
  }
): Promise<{ id: string }> {
  const rows = await db
    .insert(journalerEntries)
    .values({ userId, ...data })
    .returning({ id: journalerEntries.id });
  const row = rows[0];
  if (!row) throw new Error("Insert failed to return a row");
  return row;
}

export async function updateEntryById(
  userId: string,
  id: string,
  data: {
    title: string;
    category: EntryCategory;
    date: string;
    comment: string | null;
    rating: number | null;
    imageKey: string | null;
  }
): Promise<void> {
  await db
    .update(journalerEntries)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(journalerEntries.id, id), eq(journalerEntries.userId, userId)));
}

export async function deleteEntryById(userId: string, id: string): Promise<void> {
  await db
    .delete(journalerEntries)
    .where(and(eq(journalerEntries.id, id), eq(journalerEntries.userId, userId)));
}
