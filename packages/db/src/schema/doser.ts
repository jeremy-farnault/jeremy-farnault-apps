import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Doser ────────────────────────────────────────────────────────────────────

export const doserMedicines = pgTable("doser_medicines", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  daysOff: integer("days_off").notNull(),
  cycleStartDate: date("cycle_start_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const doserPillTypes = pgTable(
  "doser_pill_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => doserMedicines.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name"),
    color: text("color").notNull(),
    days: integer("days").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.medicineId, table.position)]
);

export const doserDayOverrides = pgTable(
  "doser_day_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => doserMedicines.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    isOn: boolean("is_on").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.medicineId, table.date)]
);

export const doserDoseLogs = pgTable(
  "doser_dose_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => doserMedicines.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    taken: boolean("taken").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.medicineId, table.date)]
);

export const doserSymptoms = pgTable("doser_symptoms", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isCustom: boolean("is_custom").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const doserSymptomLogs = pgTable(
  "doser_symptom_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.date)]
);

export const doserSymptomLogEntries = pgTable(
  "doser_symptom_log_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    symptomLogId: uuid("symptom_log_id")
      .notNull()
      .references(() => doserSymptomLogs.id, { onDelete: "cascade" }),
    symptomId: uuid("symptom_id")
      .notNull()
      .references(() => doserSymptoms.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.symptomLogId, table.symptomId)]
);
