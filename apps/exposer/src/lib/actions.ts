"use server";

import { auth } from "@jf/auth";
import { getHandleError, normalizeHandle } from "@jf/auth/handle";
import { db, user } from "@jf/db";
import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Persist the current user's handle after re-validating server-side, then route them to
 * their page. Returns `{ error }` on any rejection; on success it redirects and never
 * returns normally.
 */
export async function setHandle(rawHandle: string): Promise<{ error: string } | undefined> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "You must be signed in." };

  const handle = normalizeHandle(rawHandle);

  // Format + length + reserved-word rules (mirrors the client-side check).
  const validationError = getHandleError(handle);
  if (validationError) return { error: validationError };

  // Reject a handle already owned by a different user.
  const [taken] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.handle, handle), ne(user.id, session.user.id)))
    .limit(1);
  if (taken) return { error: "That handle is already taken." };

  try {
    await db.update(user).set({ handle }).where(eq(user.id, session.user.id));
  } catch (err) {
    // Unique-constraint race between the check above and the update.
    if (isUniqueViolation(err)) return { error: "That handle is already taken." };
    throw err;
  }

  redirect(`/${handle}`);
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}
