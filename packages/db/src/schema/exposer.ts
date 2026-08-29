import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Exposer ──────────────────────────────────────────────────────────────────

export const exposerVisibilityEnum = pgEnum("exposer_visibility", ["public", "draft"]);

export const exposerItems = pgTable(
  "exposer_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title"),
    // Structured rich-text editor JSON, stored as text (mirrors noter's `body`).
    description: text("description"),
    // User-settable day used for ordering and day-header grouping.
    date: date("date").notNull(),
    visibility: exposerVisibilityEnum("visibility").notNull().default("draft"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    // Feed query: WHERE user_id = ? ORDER BY date DESC, created_at DESC (backward scan).
    index("exposer_items_user_id_date_created_at_idx").on(
      table.userId,
      table.date,
      table.createdAt
    ),
  ]
);

export const exposerPhotos = pgTable("exposer_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => exposerItems.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  // Display order within the item (read as `position ASC`).
  position: integer("position").notNull(),
  // Intrinsic dimensions, used to reserve layout space and prevent reflow.
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const exposerTags = pgTable(
  "exposer_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Optional palette value, e.g. "var(--purple-600)".
    color: text("color"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.name)]
);

export const exposerItemTags = pgTable(
  "exposer_item_tags",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => exposerItems.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => exposerTags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.tagId] })]
);
