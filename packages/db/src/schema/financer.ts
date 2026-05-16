import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Financer ─────────────────────────────────────────────────────────────────

export const financerEntries = pgTable("financer_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  month: text("month").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const financerSummaries = pgTable("financer_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  month: text("month").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const financerIncomeSources = pgTable("financer_income_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  currency: text("currency").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const financerIncomeEntries = pgTable("financer_income_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => financerIncomeSources.id, { onDelete: "cascade" }),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  month: text("month").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
