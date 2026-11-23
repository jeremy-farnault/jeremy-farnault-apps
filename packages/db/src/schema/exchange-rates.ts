import { numeric, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

// ─── Fleet-wide exchange rates ────────────────────────────────────────────────

// A cache of USD-based rates, one row per currency, refilled by `getExchangeRates` once a
// day. No app's records point at it: amounts are converted when they are read.
export const exchangeRates = pgTable("exchange_rates", {
  currency: text("currency").primaryKey(),
  rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Month rates: one USD-based rate per currency per UTC month (`YYYY-MM`). Every refresh of
// `exchangeRates` also upserts the current month's rows, so the last refresh of a month
// becomes its rate, and the row stops changing once the month is over. Past months convert
// at these; the current month keeps the live rate.
export const monthExchangeRates = pgTable(
  "month_exchange_rates",
  {
    currency: text("currency").notNull(),
    month: text("month").notNull(),
    rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.currency, t.month] })]
);
