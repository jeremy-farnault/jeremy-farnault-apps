import type { SupportedCurrency } from "@jf/db";

/** Which adapter reads a link. Stored on the link. */
export type Store = "web" | "ps-store" | "steam";

/**
 * One purchasable version of the product on a page: an edition, a variant, or the only
 * thing on sale. Prices are integers in the currency's minor unit.
 */
export type Edition = {
  /** Stable across checks, so a link can find its edition again. */
  id: string;
  name: string;
  normalPrice: number;
  /** The discounted price while on sale, otherwise null. */
  salePrice: number | null;
  currency: SupportedCurrency;
  inStock: boolean;
  discountPercent: number | null;
  saleEndsAt: Date | null;
  /** PS Store only: the platforms it runs on ("PS4", "PS5"). */
  platforms?: string[];
  /** PS Store only: the store's classification ("FULL_GAME", "PREMIUM_EDITION", "LEVEL"…). */
  kind?: string;
};

export type Reading = {
  store: Store;
  /** Country code the price is for, or null for web shops. */
  region: string | null;
  name: string;
  imageUrl: string | null;
  matchKey: string;
  /** PS Store only: the concept, shared by the same game in every region. */
  conceptId?: string;
  /** Every edition found on the page, in page order. */
  editions: Edition[];
  /**
   * The edition the price is for: the requested one, or the only one. Null when the page
   * sells several and none was asked for, which is when the add preview shows its picker.
   */
  edition: Edition | null;
};

export type RejectionReason = "unreadable" | "unsupported-currency" | "blocked" | "not-found";

export type ReadResult =
  | { ok: true; reading: Reading }
  | { ok: false; reason: RejectionReason; detail?: string };

/**
 * What an adapter pulls out of a page before the reader applies the shared rules (supported
 * currency, edition choice). Currencies are still raw strings here.
 */
export type PageEdition = Omit<Edition, "currency"> & { currency: string };
export type PageReading = {
  name: string | null;
  conceptId?: string;
  imageUrl: string | null;
  editions: PageEdition[];
};
