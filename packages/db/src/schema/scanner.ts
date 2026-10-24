import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// ─── Scanner ──────────────────────────────────────────────────────────────────

// Prices are integers in the currency's minor unit (öre, cents; yen have none), as the PS
// Store already returns them, so nothing is ever rounded.

export const scannerItemStatusEnum = pgEnum("scanner_item_status", ["wishlist", "bought"]);
export const scannerLinkStatusEnum = pgEnum("scanner_link_status", ["ok", "failed"]);

/** Something the user wants to buy, tracked at one or more links. */
export const scannerItems = pgTable(
  "scanner_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // S3 object key of the item's image; null shows the placeholder.
    imageKey: text("image_key"),
    status: scannerItemStatusEnum("status").notNull().default("wishlist"),
    // Set together when the item is marked bought, cleared when it goes back to the list.
    boughtPrice: integer("bought_price"),
    boughtCurrency: text("bought_currency"),
    boughtStore: text("bought_store"),
    boughtAt: timestamp("bought_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("scanner_items_user_id_status_idx").on(table.userId, table.status)]
);

/** One store, in one region, for one edition of an item. */
export const scannerLinks = pgTable(
  "scanner_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => scannerItems.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // As pasted, for "Open in store".
    url: text("url").notNull(),
    // Lowercased host, tracking parameters stripped: what duplicates are checked on.
    normalizedUrl: text("normalized_url").notNull(),
    // "web" (any shop with structured data), "ps-store" or "steam".
    store: text("store").notNull(),
    // Country code, from the URL (PS Store) or chosen when adding (Steam); null for web shops.
    region: text("region"),
    // The chosen edition when the page sells several; null when it sells one.
    editionId: text("edition_id"),
    // That edition's name as the store gave it, to tell links to one page apart.
    editionName: text("edition_name"),
    // What "Add to existing item?" compares: a PS product label or a cleaned-up name.
    matchKey: text("match_key").notNull(),
    lastStatus: scannerLinkStatusEnum("last_status").notNull().default("ok"),
    lastCheckedAt: timestamp("last_checked_at").notNull().defaultNow(),
    lastSuccessAt: timestamp("last_success_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("scanner_links_item_id_idx").on(table.itemId),
    // The same page may be tracked once per region and edition, never twice for both.
    unique("scanner_links_user_url_region_edition_unique")
      .on(table.userId, table.normalizedUrl, table.region, table.editionId)
      .nullsNotDistinct(),
  ]
);

/** One successful reading of a link's price. Failed checks only update the link. */
export const scannerPriceChecks = pgTable(
  "scanner_price_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    linkId: uuid("link_id")
      .notNull()
      .references(() => scannerLinks.id, { onDelete: "cascade" }),
    normalPrice: integer("normal_price").notNull(),
    // The sale price when the item is discounted; null when it isn't.
    salePrice: integer("sale_price"),
    currency: text("currency").notNull(),
    inStock: boolean("in_stock").notNull(),
    discountPercent: integer("discount_percent"),
    saleEndsAt: timestamp("sale_ends_at"),
    checkedAt: timestamp("checked_at").notNull().defaultNow(),
  },
  (table) => [
    index("scanner_price_checks_link_id_checked_at_idx").on(table.linkId, table.checkedAt),
  ]
);
