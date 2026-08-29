import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Conversations ─────────────────────────────────────────────────────────────

export const aiderConversations = pgTable("aider_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  model: text("model").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Messages ──────────────────────────────────────────────────────────────────

export const aiderMessages = pgTable("aider_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => aiderConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  // Set when this assistant reply was grounded by a tool call, so the tool chip
  // can be rehydrated on reload. Null for user messages and untooled replies.
  toolName: text("tool_name"),
  toolArguments: text("tool_arguments"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
