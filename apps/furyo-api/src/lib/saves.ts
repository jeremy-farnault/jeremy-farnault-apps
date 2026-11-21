import { type Db, furyoSaves } from "@jf/db";
import { and, eq, sql } from "drizzle-orm";

export interface Saved {
  state: unknown;
  version: number;
}

export type SaveResult = { ok: true; version: number } | { ok: false; reason: "conflict" };

/** The user's furyo, or null before the first save. */
export async function loadSave(db: Db, userId: string): Promise<Saved | null> {
  const [row] = await db
    .select({ state: furyoSaves.state, version: furyoSaves.version })
    .from(furyoSaves)
    .where(eq(furyoSaves.userId, userId));
  return row ?? null;
}

/**
 * Stores the state only if the stored version is still `expectedVersion` (0: nothing stored
 * yet), in one statement, so two tabs saving at once can't both win: the second gets a conflict
 * and nothing it sent is written.
 */
export async function saveState(
  db: Db,
  userId: string,
  state: unknown,
  expectedVersion: number
): Promise<SaveResult> {
  const rows =
    expectedVersion === 0
      ? await db
          .insert(furyoSaves)
          .values({ userId, state, version: 1 })
          .onConflictDoNothing({ target: furyoSaves.userId })
          .returning({ version: furyoSaves.version })
      : await db
          .update(furyoSaves)
          .set({ state, version: sql`${furyoSaves.version} + 1`, updatedAt: sql`now()` })
          .where(and(eq(furyoSaves.userId, userId), eq(furyoSaves.version, expectedVersion)))
          .returning({ version: furyoSaves.version });
  const [row] = rows;
  return row ? { ok: true, version: row.version } : { ok: false, reason: "conflict" };
}

/** Deletes the user's furyo (the game's dev reset). */
export async function clearSave(db: Db, userId: string): Promise<void> {
  await db.delete(furyoSaves).where(eq(furyoSaves.userId, userId));
}
