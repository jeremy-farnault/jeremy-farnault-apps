import {
  boolean,
  date,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Organiser ────────────────────────────────────────────────────────────────

export const organiserBoards = pgTable("organiser_boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const organiserColumns = pgTable(
  "organiser_columns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => organiserBoards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Optional palette value, e.g. "var(--blue-600)".
    color: text("color"),
    // Fractional-index key; columns are read as `position ASC`.
    position: text("position").notNull(),
    collapsed: boolean("collapsed").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("organiser_columns_board_id_position_idx").on(table.boardId, table.position)]
);

export const organiserCards = pgTable(
  "organiser_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    columnId: uuid("column_id")
      .notNull()
      .references(() => organiserColumns.id, { onDelete: "cascade" }),
    // Denormalised board reference (columns and cards carry it from day one).
    boardId: uuid("board_id")
      .notNull()
      .references(() => organiserBoards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // Structured rich-text editor JSON, stored as text (mirrors noter's `body`).
    body: text("body"),
    // Optional palette value, e.g. "var(--blue-600)".
    color: text("color"),
    // Date-only deadline; overdue is computed against the current local day.
    deadline: date("deadline"),
    // Fractional-index key; cards are read as `position ASC` within a column.
    position: text("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("organiser_cards_column_id_position_idx").on(table.columnId, table.position)]
);

export const organiserTags = pgTable(
  "organiser_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Palette value, e.g. "var(--blue-600)"; tags always carry a colour.
    color: text("color").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.name)]
);

export const organiserCardTags = pgTable(
  "organiser_card_tags",
  {
    cardId: uuid("card_id")
      .notNull()
      .references(() => organiserCards.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => organiserTags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.cardId, table.tagId] })]
);
