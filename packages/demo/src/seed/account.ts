import { account, user, withTransaction } from "@jf/db";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

import { DEMO_USER, isDemoEmail } from "../identity";
import type { Tx } from "./types";

/**
 * Makes sure the demo user exists, with its email verified and an email-and-password
 * credential for `password`, hashed with Better Auth's own hasher so a normal sign-in works.
 * Running it again changes nothing, unless the password changed. Returns the demo user's id.
 */
export async function ensureDemoAccount(password: string): Promise<string> {
  return withTransaction(async (tx) => {
    const now = new Date();
    const [existing] = await tx
      .select({ id: user.id, emailVerified: user.emailVerified, handle: user.handle })
      .from(user)
      .where(eq(user.email, DEMO_USER.email));

    let userId: string;
    if (existing) {
      userId = existing.id;
      if (!existing.emailVerified) {
        await tx
          .update(user)
          .set({ emailVerified: true, updatedAt: now })
          .where(eq(user.id, userId));
      }
      // Exposer needs a handle: its home page sends a user without one to onboarding.
      if (!existing.handle) {
        const handle = await freeHandle(tx);
        if (handle) {
          await tx.update(user).set({ handle, updatedAt: now }).where(eq(user.id, userId));
        }
      }
    } else {
      userId = crypto.randomUUID();
      await tx.insert(user).values({
        id: userId,
        name: DEMO_USER.name,
        email: DEMO_USER.email,
        emailVerified: true,
        handle: await freeHandle(tx),
        createdAt: now,
        updatedAt: now,
      });
      console.log(`Created the demo user (${DEMO_USER.email}).`);
    }

    await ensureCredential(tx, userId, password, now);
    return userId;
  });
}

/** The demo handle, or null when a real user already took it (it only matters for Exposer). */
async function freeHandle(tx: Tx): Promise<string | null> {
  const [taken] = await tx
    .select({ id: user.id })
    .from(user)
    .where(eq(user.handle, DEMO_USER.handle));
  if (!taken) return DEMO_USER.handle;
  console.warn(`The handle "${DEMO_USER.handle}" is taken; the demo user gets none.`);
  return null;
}

async function ensureCredential(tx: Tx, userId: string, password: string, now: Date) {
  const [credential] = await tx
    .select({ id: account.id, password: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));

  if (!credential) {
    // Same shape as Better Auth's sign-up: the credential's accountId is the user id.
    await tx.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: await hashPassword(password),
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  const matches = credential.password
    ? await verifyPassword({ hash: credential.password, password })
    : false;
  if (!matches) {
    await tx
      .update(account)
      .set({ password: await hashPassword(password), updatedAt: now })
      .where(eq(account.id, credential.id));
    console.log("Updated the demo user's password.");
  }
}

/**
 * Throws unless `userId` belongs to the demo email. Every reset calls this inside its
 * transaction before deleting anything, so a wrong id can never wipe someone's data.
 */
export async function assertDemoUser(tx: Tx, userId: string): Promise<void> {
  const [row] = await tx.select({ email: user.email }).from(user).where(eq(user.id, userId));
  if (!row || !isDemoEmail(row.email)) {
    throw new Error(`Refusing to seed: user ${userId} is not the demo user (${DEMO_USER.email}).`);
  }
}
