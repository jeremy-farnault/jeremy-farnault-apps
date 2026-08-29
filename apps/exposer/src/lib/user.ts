import "server-only";

import { auth } from "@jf/auth";
import { db, user } from "@jf/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export type SessionUser = {
  id: string;
  name: string;
  /** null until the user has picked a handle. */
  handle: string | null;
};

/**
 * The signed-in user plus their (possibly null) handle, read straight from the DB —
 * Better Auth does not surface the non-standard `handle` column on the session object.
 * Returns null for anonymous visitors.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [row] = await db
    .select({ handle: user.handle })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  return {
    id: session.user.id,
    name: session.user.name,
    handle: row?.handle ?? null,
  };
}
