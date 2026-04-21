import { date, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Routiner ─────────────────────────────────────────────────────────────────

export const routinerHabitTypeEnum = pgEnum("routiner_habit_type", ["boolean", "numeric", "time"]);

export const routinerHabits = pgTable("routiner_habits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: routinerHabitTypeEnum("type").notNull(),
  startDate: date("start_date").notNull(),
  color: text("color").notNull(),
  description: text("description"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const routinerLogs = pgTable(
  "routiner_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => routinerHabits.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    value: text("value").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.habitId, table.date)]
);
