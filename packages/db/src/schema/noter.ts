import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Folders ─────────────────────────────────────────────────────────────────

export const folders = pgTable("folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  parentFolderId: uuid("parent_folder_id").references(
    (): AnyPgColumn => folders.id,
    { onDelete: "cascade" },
  ),
  name: text("name").notNull(),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Notes ───────────────────────────────────────────────────────────────────

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  parentFolderId: uuid("parent_folder_id").references(() => folders.id, {
    onDelete: "cascade",
  }),
  title: text("title"),
  body: text("body"),
  backgroundColor: text("background_color"),
  archivedAt: timestamp("archived_at"),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
