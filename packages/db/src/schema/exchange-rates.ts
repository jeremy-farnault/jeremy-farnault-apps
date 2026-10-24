import { numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// ─── Fleet-wide exchange rates ────────────────────────────────────────────────

// A cache of USD-based rates, one row per currency, refilled by `getExchangeRates` once a
// day. No app's records point at it: amounts are converted when they are read.
export const exchangeRates = pgTable("exchange_rates", {
  currency: text("currency").primaryKey(),
  rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
