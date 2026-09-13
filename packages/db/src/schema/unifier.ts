import { boolean, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Unifier ──────────────────────────────────────────────────────────────────

export const unifierArcs = pgTable(
  "unifier_arcs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Optional palette value, e.g. "var(--teal-600)".
    color: text("color"),
    // Fractional-index key; arcs are read as `position ASC`.
    position: text("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("unifier_arcs_user_id_position_idx").on(table.userId, table.position)]
);

/** Per-arc slot template: the labelled fields every person in the arc carries. */
export const unifierSlots = pgTable(
  "unifier_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    arcId: uuid("arc_id")
      .notNull()
      .references(() => unifierArcs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    // Fractional-index key; slots are read as `position ASC` within an arc.
    position: text("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("unifier_slots_arc_id_position_idx").on(table.arcId, table.position)]
);

export const unifierPersons = pgTable(
  "unifier_persons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Each person belongs to exactly one arc.
    arcId: uuid("arc_id")
      .notNull()
      .references(() => unifierArcs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Free-text overflow for anything the arc's slots don't capture.
    note: text("note"),
    // Marks the person as critical; drives ring growth on the orbit.
    important: boolean("important").notNull().default(false),
    // Set when `important` turns true, cleared back to null when it turns false.
    flaggedAt: timestamp("flagged_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("unifier_persons_arc_id_idx").on(table.arcId)]
);

/** One person's value for one of their arc's slots. */
export const unifierSlotValues = pgTable(
  "unifier_slot_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => unifierPersons.id, { onDelete: "cascade" }),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => unifierSlots.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    value: text("value"),
  },
  (table) => [unique().on(table.personId, table.slotId)]
);

/** A logged contact with a person; touches reset drift. */
export const unifierTouches = pgTable(
  "unifier_touches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => unifierPersons.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Optional short note describing the contact.
    note: text("note"),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("unifier_touches_person_id_occurred_at_idx").on(table.personId, table.occurredAt.desc()),
  ]
);
