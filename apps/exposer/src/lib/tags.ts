import "server-only";

import { db, exposerTags } from "@jf/db";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Resolve tag names to the given user's tag ids, creating any that don't exist yet
 * (create-or-reuse). Trims, drops blanks, and de-dupes. Server-internal — never exposed
 * as an action, since it takes a userId directly.
 */
export async function resolveTagIds(userId: string, names: string[]): Promise<string[]> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  await db
    .insert(exposerTags)
    .values(unique.map((name) => ({ userId, name })))
    .onConflictDoNothing();

  const rows = await db
    .select({ id: exposerTags.id })
    .from(exposerTags)
    .where(and(eq(exposerTags.userId, userId), inArray(exposerTags.name, unique)));

  return rows.map((r) => r.id);
}
