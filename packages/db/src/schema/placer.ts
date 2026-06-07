import { doublePrecision, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Placer ───────────────────────────────────────────────────────────────────

export const placerCategories = pgTable(
  "placer_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    icon: text("icon").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("placer_categories_user_id_idx").on(table.userId)]
);

export const placerSpots = pgTable(
  "placer_spots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => placerCategories.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    photoKey: text("photo_key"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("placer_spots_user_id_idx").on(table.userId)]
);
