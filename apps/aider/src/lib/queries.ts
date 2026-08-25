import { aiderConversations, aiderMessages, db } from "@jf/db";
import { and, asc, eq } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AiderConversation = typeof aiderConversations.$inferSelect;
export type AiderMessage = typeof aiderMessages.$inferSelect;

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getConversationWithMessages(
  userId: string,
  conversationId: string
): Promise<{ conversation: AiderConversation; messages: AiderMessage[] } | null> {
  const [conversation] = await db
    .select()
    .from(aiderConversations)
    .where(and(eq(aiderConversations.id, conversationId), eq(aiderConversations.userId, userId)))
    .limit(1);

  if (!conversation) return null;

  // Messages are only reachable through an already-ownership-checked conversation,
  // so no separate userId filter is needed here.
  const messages = await db
    .select()
    .from(aiderMessages)
    .where(eq(aiderMessages.conversationId, conversationId))
    .orderBy(asc(aiderMessages.createdAt));

  return { conversation, messages };
}
