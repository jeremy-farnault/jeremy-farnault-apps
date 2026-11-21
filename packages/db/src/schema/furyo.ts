import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Furyodachi ───────────────────────────────────────────────────────────────

// One furyo per user: the game's whole state as JSON. `version` is bumped on every save,
// and a save only lands if the caller still holds the stored version (optimistic locking),
// so a stale tab can't overwrite a newer furyo.
export const furyoSaves = pgTable("furyo_saves", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  state: jsonb("state").notNull(),
  version: integer("version").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
