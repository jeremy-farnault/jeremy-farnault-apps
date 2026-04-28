import { classerItems, db } from "@jf/db";
import { and, eq } from "drizzle-orm";

type ClasserItemRow = typeof classerItems.$inferSelect;

export async function getClasserItemById(
  userId: string,
  id: string
): Promise<ClasserItemRow | undefined> {
  const rows = await db
    .select()
    .from(classerItems)
    .where(and(eq(classerItems.id, id), eq(classerItems.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function insertClasserItem(
  userId: string,
  classerId: string,
  data: { name: string; description: string | null; imageKey: string | null; rank: number }
): Promise<{ id: string }> {
  const rows = await db
    .insert(classerItems)
    .values({ userId, classerId, ...data })
    .returning({ id: classerItems.id });
  const row = rows[0];
  if (!row) throw new Error("Insert failed to return a row");
  return row;
}

export async function updateClasserItemById(
  userId: string,
  id: string,
  data: { name: string; description: string | null; imageKey: string | null; rank: number }
): Promise<void> {
  await db
    .update(classerItems)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(classerItems.id, id), eq(classerItems.userId, userId)));
}
