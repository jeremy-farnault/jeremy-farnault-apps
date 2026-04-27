import { classers } from "@jf/db";
import { db } from "@jf/db";
import { and, eq } from "drizzle-orm";

type ClasserRow = typeof classers.$inferSelect;

export async function getClasserById(userId: string, id: string): Promise<ClasserRow | undefined> {
  const rows = await db
    .select()
    .from(classers)
    .where(and(eq(classers.id, id), eq(classers.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function insertClasser(
  userId: string,
  data: { name: string; description: string | null; imageKey: string | null }
): Promise<{ id: string }> {
  const rows = await db
    .insert(classers)
    .values({ userId, ...data })
    .returning({ id: classers.id });
  const row = rows[0];
  if (!row) throw new Error("Insert failed to return a row");
  return row;
}

export async function updateClasserById(
  userId: string,
  id: string,
  data: { name: string; description: string | null; imageKey: string | null }
): Promise<void> {
  await db
    .update(classers)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(classers.id, id), eq(classers.userId, userId)));
}

export async function archiveClasserById(userId: string, id: string): Promise<void> {
  await db
    .update(classers)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(classers.id, id), eq(classers.userId, userId)));
}

export async function deleteClasserById(userId: string, id: string): Promise<void> {
  await db.delete(classers).where(and(eq(classers.id, id), eq(classers.userId, userId)));
}
