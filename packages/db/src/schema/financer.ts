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
  currency: text("currency").notNull().default("USD"),
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
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const financerAssetSources = pgTable("financer_asset_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  currency: text("currency").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const financerAssetEntries = pgTable("financer_asset_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => financerAssetSources.id, { onDelete: "cascade" }),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  month: text("month").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const financerIncomeSources = pgTable("financer_income_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  currency: text("currency").notNull(),
  color: text("color"),
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

export const financerIncomeSummaries = pgTable("financer_income_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  month: text("month").notNull(),
  currency: text("currency").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const financerAssetSummaries = pgTable("financer_asset_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  month: text("month").notNull(),
  currency: text("currency").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const financerUserSettings = pgTable("financer_user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  homeCurrency: text("home_currency").notNull().default("USD"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const financerExchangeRates = pgTable("financer_exchange_rates", {
  currency: text("currency").primaryKey(),
  rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
