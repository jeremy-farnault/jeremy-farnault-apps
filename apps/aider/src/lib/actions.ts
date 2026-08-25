"use server";

import { auth } from "@jf/auth";
import { aiderConversations, aiderMessages, db, withTransaction } from "@jf/db";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

async function getAuthUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

/**
 * Create a conversation. The `id` is minted client-side so the URL can flip to
 * `/chat/[id]` optimistically; it's safe because the row is stamped with the
 * authenticated `userId` and the id is never trusted for authorization.
 */
export async function createConversation(id: string, title: string, model: string): Promise<void> {
  const userId = await getAuthUserId();
  await db.insert(aiderConversations).values({ id, userId, title, model });
}

/**
 * Append a message to a conversation the caller owns. A single guarded
 * transaction verifies ownership, touches `updatedAt` (and updates the
 * last-used `model` when provided on a user message), then inserts the message.
 */
export async function appendMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  model?: string
): Promise<void> {
  const userId = await getAuthUserId();
  await withTransaction(async (tx) => {
    const [owned] = await tx
      .update(aiderConversations)
      .set({ updatedAt: new Date(), ...(model ? { model } : {}) })
      .where(and(eq(aiderConversations.id, conversationId), eq(aiderConversations.userId, userId)))
      .returning({ id: aiderConversations.id });
    if (!owned) throw new Error("Unauthorized");
    await tx.insert(aiderMessages).values({ conversationId, role, content });
  });
}

/**
 * Rename a conversation the caller owns. Sets `title` only — deliberately not
 * touching `updatedAt`, so a rename does not reorder the sidebar.
 */
export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .update(aiderConversations)
    .set({ title })
    .where(and(eq(aiderConversations.id, id), eq(aiderConversations.userId, userId)));
}

/** Hard-delete a conversation the caller owns; messages are removed via the FK cascade. */
export async function deleteConversation(id: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .delete(aiderConversations)
    .where(and(eq(aiderConversations.id, id), eq(aiderConversations.userId, userId)));
}
