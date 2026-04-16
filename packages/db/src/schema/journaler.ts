import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Journaler ────────────────────────────────────────────────────────────────

export const journalerCategoryEnum = pgEnum("journaler_category", [
  "Movie",
  "TV Show",
  "Book",
  "Game",
  "Manga",
]);

export const journalerEntries = pgTable(
  "journaler_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: journalerCategoryEnum("category").notNull(),
    date: date("date").notNull(),
    comment: text("comment"),
    rating: integer("rating"),
    imageKey: text("image_key"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "journaler_entries_rating_check",
      sql`${table.rating} >= 1 AND ${table.rating} <= 10`,
    ),
  ],
);
