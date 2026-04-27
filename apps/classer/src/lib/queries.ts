import { classerItems, classers, db } from "@jf/db";
import { and, count, desc, eq, ilike, isNull, lt, or } from "drizzle-orm";

export type Classer = typeof classers.$inferSelect;

export type ClasserCursor = { createdAt: string; id: string };

export type ClasserRow = {
  id: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  itemCount: number;
  createdAt: Date;
};

export async function getClassers(
  userId: string,
  cursor: ClasserCursor | null,
  limit = 20
): Promise<{ classers: ClasserRow[]; nextCursor: ClasserCursor | null }> {
  const baseConditions = [eq(classers.userId, userId), isNull(classers.archivedAt)];

  const cursorCondition = cursor
    ? or(
        lt(classers.createdAt, new Date(cursor.createdAt)),
        and(eq(classers.createdAt, new Date(cursor.createdAt)), lt(classers.id, cursor.id))
      )
    : undefined;

  const rows = await db
    .select({
      id: classers.id,
      name: classers.name,
      description: classers.description,
      imageKey: classers.imageKey,
      itemCount: count(classerItems.id),
      createdAt: classers.createdAt,
    })
    .from(classers)
    .leftJoin(classerItems, eq(classerItems.classerId, classers.id))
    .where(and(...baseConditions, cursorCondition))
    .groupBy(classers.id)
    .orderBy(desc(classers.createdAt), desc(classers.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const result = hasMore ? rows.slice(0, limit) : rows;
  const last = result[result.length - 1];
  const nextCursor: ClasserCursor | null =
    hasMore && last ? { createdAt: last.createdAt.toISOString(), id: last.id } : null;

  return { classers: result, nextCursor };
}

export async function searchClassers(
  userId: string,
  query: string,
  limit = 50
): Promise<ClasserRow[]> {
  return db
    .select({
      id: classers.id,
      name: classers.name,
      description: classers.description,
      imageKey: classers.imageKey,
      itemCount: count(classerItems.id),
      createdAt: classers.createdAt,
    })
    .from(classers)
    .leftJoin(classerItems, eq(classerItems.classerId, classers.id))
    .where(
      and(
        eq(classers.userId, userId),
        isNull(classers.archivedAt),
        ilike(classers.name, `%${query}%`)
      )
    )
    .groupBy(classers.id)
    .orderBy(desc(classers.createdAt), desc(classers.id))
    .limit(limit);
}
