import { minorDigits } from "./price-reader/money";

// Turns saved price checks into what the screens show. Pure: rates, home currency and "now"
// come in as arguments, so every rule here is testable without a database or a clock.

/** How old a check may get before opening the page checks again. */
export const RECHECK_AFTER_MS = 60 * 60 * 1000;

export type SummaryCheck = {
  normalPrice: number;
  salePrice: number | null;
  currency: string;
  inStock: boolean;
  discountPercent: number | null;
  saleEndsAt: Date | null;
  checkedAt: Date;
};

export type SummaryLink = {
  id: string;
  url: string;
  store: string;
  region: string | null;
  lastStatus: "ok" | "failed";
  lastCheckedAt: Date;
  /** The most recent successful check; null if there has never been one. */
  latest: SummaryCheck | null;
};

export type SummaryItem = { id: string; name: string; createdAt: Date; links: SummaryLink[] };

/** A price in the store's currency, and the same amount in the user's home currency. */
export type DualPrice = {
  price: number;
  currency: string;
  /** In the home currency's minor unit; null when a rate is missing. */
  converted: number | null;
};

export type LinkSummary = SummaryLink & {
  /** Failed its last check after an earlier success: the price shown is the last good one. */
  stale: boolean;
  /** What the link costs now (the sale price while on sale), or null with no check yet. */
  current: DualPrice | null;
  /** Counts toward the item's lowest price: in stock, not stale, convertible. */
  eligible: boolean;
};

export type ItemSummary = {
  id: string;
  name: string;
  createdAt: Date;
  links: LinkSummary[];
  /**
   * The cheapest eligible link. When none is eligible (all out of stock or stale), the
   * cheapest link with any price, flagged `unavailable` so the list can grey it out.
   */
  lowest: (LinkSummary & { current: DualPrice; unavailable: boolean }) | null;
};

/**
 * Converts a minor-unit amount between currencies with USD-based rates (as
 * `getExchangeRates` returns them). Null when either rate is missing.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): number | null {
  if (from === to) return amount;
  const rateFrom = rates[from];
  const rateTo = rates[to];
  if (!rateFrom || !rateTo) return null;
  const major = amount / 10 ** minorDigits(from);
  return Math.round(major * (rateTo / rateFrom) * 10 ** minorDigits(to));
}

export function summarizeLink(
  link: SummaryLink,
  rates: Record<string, number>,
  homeCurrency: string
): LinkSummary {
  const stale = link.lastStatus === "failed" && link.latest !== null;
  const latest = link.latest;
  const current = latest
    ? {
        price: latest.salePrice ?? latest.normalPrice,
        currency: latest.currency,
        converted: convert(
          latest.salePrice ?? latest.normalPrice,
          latest.currency,
          homeCurrency,
          rates
        ),
      }
    : null;
  return {
    ...link,
    stale,
    current,
    eligible: current !== null && current.converted !== null && !stale && latest?.inStock === true,
  };
}

export function summarizeItem(
  item: SummaryItem,
  rates: Record<string, number>,
  homeCurrency: string
): ItemSummary {
  const links = item.links.map((l) => summarizeLink(l, rates, homeCurrency));
  const cheapest = (candidates: LinkSummary[]) =>
    candidates
      .filter((l): l is LinkSummary & { current: DualPrice } => l.current !== null)
      .sort(
        (a, b) =>
          (a.current.converted ?? Number.POSITIVE_INFINITY) -
          (b.current.converted ?? Number.POSITIVE_INFINITY)
      )[0];

  const best = cheapest(links.filter((l) => l.eligible));
  const fallback = best ? undefined : cheapest(links);
  const lowest = best
    ? { ...best, unavailable: false }
    : fallback
      ? { ...fallback, unavailable: true }
      : null;
  return { id: item.id, name: item.name, createdAt: item.createdAt, links, lowest };
}

/** True when a link's last check is older than an hour and opening the page should redo it. */
export function needsRecheck(link: { lastCheckedAt: Date }, now: Date): boolean {
  return now.getTime() - link.lastCheckedAt.getTime() > RECHECK_AFTER_MS;
}

export const SORT_OPTIONS = [
  { value: "added-desc", label: "Recently added" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "price-asc", label: "Price ↑" },
  { value: "price-desc", label: "Price ↓" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export function parseSort(value: string | undefined): SortOption {
  return SORT_OPTIONS.some((o) => o.value === value) ? (value as SortOption) : "added-desc";
}

/**
 * Orders the wishlist. Price sorts use the converted lowest price; items without a current
 * one (no eligible link) go last either way, in date-added order.
 */
export function sortItems(items: ItemSummary[], sort: SortOption): ItemSummary[] {
  const priced = (i: ItemSummary) =>
    i.lowest && !i.lowest.unavailable ? i.lowest.current.converted : null;
  const byAdded = (a: ItemSummary, b: ItemSummary) => b.createdAt.getTime() - a.createdAt.getTime();

  return [...items].sort((a, b) => {
    switch (sort) {
      case "name-asc":
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      case "added-desc":
        return byAdded(a, b);
      case "price-asc":
      case "price-desc": {
        const pa = priced(a);
        const pb = priced(b);
        if (pa === null || pb === null) {
          if (pa === pb) return byAdded(a, b);
          return pa === null ? 1 : -1;
        }
        return sort === "price-asc" ? pa - pb : pb - pa;
      }
    }
  });
}
