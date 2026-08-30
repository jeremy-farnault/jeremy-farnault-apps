"use server";

import { auth } from "@jf/auth";
import { db, exposerTags } from "@jf/db";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";

export type Tag = { id: string; name: string; color: string | null };

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

/** The signed-in user's tags, ordered by name. */
export async function getUserTags(): Promise<Tag[]> {
  const userId = await requireUserId();
  return db
    .select({ id: exposerTags.id, name: exposerTags.name, color: exposerTags.color })
    .from(exposerTags)
    .where(eq(exposerTags.userId, userId))
    .orderBy(asc(exposerTags.name));
}

/** Create a tag, reusing an existing one with the same name (per-user uniqueness). */
export async function createTagAction(name: string, color?: string | null): Promise<Tag> {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag name is required.");

  const [inserted] = await db
    .insert(exposerTags)
    .values({ userId, name: trimmed, color: color ?? null })
    .onConflictDoNothing()
    .returning({ id: exposerTags.id, name: exposerTags.name, color: exposerTags.color });
  if (inserted) return inserted;

  // Conflict → the tag already exists; return it.
  const [existing] = await db
    .select({ id: exposerTags.id, name: exposerTags.name, color: exposerTags.color })
    .from(exposerTags)
    .where(and(eq(exposerTags.userId, userId), eq(exposerTags.name, trimmed)))
    .limit(1);
  if (!existing) throw new Error("Could not create tag.");
  return existing;
}

export async function renameTagAction(
  id: string,
  name: string
): Promise<{ error: string } | undefined> {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Tag name is required." };

  try {
    await db
      .update(exposerTags)
      .set({ name: trimmed })
      .where(and(eq(exposerTags.id, id), eq(exposerTags.userId, userId)));
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "You already have a tag with that name." };
    throw err;
  }
}

export async function setTagColorAction(id: string, color: string | null): Promise<void> {
  const userId = await requireUserId();
  await db
    .update(exposerTags)
    .set({ color })
    .where(and(eq(exposerTags.id, id), eq(exposerTags.userId, userId)));
}

export async function deleteTagAction(id: string): Promise<void> {
  const userId = await requireUserId();
  // Join rows drop via FK cascade; items are untouched.
  await db.delete(exposerTags).where(and(eq(exposerTags.id, id), eq(exposerTags.userId, userId)));
}
