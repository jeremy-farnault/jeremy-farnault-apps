import { classerItems, classers, db } from "@jf/db";
import { and, asc, eq, ilike, isNull } from "drizzle-orm";

export interface ClasserItemSummary {
  rank: number;
  name: string;
  description: string | null;
}

export interface TopItemsResult {
  listName: string;
  items: ClasserItemSummary[];
}

/**
 * Resolve a (non-archived) ranked list by fuzzy name match for the user, then
 * return its top `limit` items ordered by rank (rank 1 = top). Returns null
 * when no list matches, so the caller can surface the available list names.
 */
export async function getTopItemsInList(
  userId: string,
  listName: string,
  limit: number
): Promise<TopItemsResult | null> {
  const [classer] = await db
    .select({ id: classers.id, name: classers.name })
    .from(classers)
    .where(
      and(
        eq(classers.userId, userId),
        isNull(classers.archivedAt),
        ilike(classers.name, `%${listName}%`)
      )
    )
    .orderBy(asc(classers.name))
    .limit(1);

  if (!classer) return null;

  const items = await db
    .select({
      rank: classerItems.rank,
      name: classerItems.name,
      description: classerItems.description,
    })
    .from(classerItems)
    .where(eq(classerItems.classerId, classer.id))
    .orderBy(asc(classerItems.rank))
    .limit(limit);

  return { listName: classer.name, items };
}

/** The user's non-archived list names, for a no-match error payload. */
export async function listClasserNames(userId: string): Promise<string[]> {
  const rows = await db
    .select({ name: classers.name })
    .from(classers)
    .where(and(eq(classers.userId, userId), isNull(classers.archivedAt)))
    .orderBy(asc(classers.name));
  return rows.map((row) => row.name);
}
