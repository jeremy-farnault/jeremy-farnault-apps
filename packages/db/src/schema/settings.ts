import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Fleet-wide user settings ─────────────────────────────────────────────────

export const themePreferenceEnum = pgEnum("theme_preference", ["light", "dark", "system"]);

// One row per user, created on the first change: a user with no row has the defaults.
// Future fleet-wide preferences become columns here; per-app settings stay in their app's
// own tables (e.g. Financer's).
export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  theme: themePreferenceEnum("theme").notNull().default("system"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
