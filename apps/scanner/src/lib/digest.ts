import { storeLabel } from "./format";
import type { ItemSummary, LinkSummary } from "./summary";

// Turns the morning's checks into the daily discount email. Pure, like the summary: items
// come in already summarised, and "now" is an argument, so every rule is testable.

const SEND_TIME_ZONE = "Europe/Stockholm";
const SEND_HOUR = 7;

/**
 * True during the hour the email goes out (7:xx in Stockholm). The workflow runs at both
 * 05:00 and 06:00 UTC, one for summer time and one for winter time, and this picks the
 * run that lands at 7.
 */
export function isSendHour(now: Date): boolean {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: SEND_TIME_ZONE,
    hour: "numeric",
    hourCycle: "h23",
  }).format(now);
  return Number(hour) === SEND_HOUR;
}

/** On sale today: a sale price on its latest check, in stock, and that check is fresh. */
export function isOnSale(link: LinkSummary): boolean {
  return link.latest?.salePrice != null && link.latest.inStock && !link.stale;
}

export type Digest = { subject: string; html: string };

/**
 * The email for one user: every item with at least one link on sale, whether or not that
 * link is the item's cheapest. Null when nothing is on sale, so no email goes out.
 */
export function buildDigest(items: ItemSummary[]): Digest | null {
  const onSale = items
    .map((item) => ({ item, links: item.links.filter(isOnSale) }))
    .filter(({ links }) => links.length > 0);
  if (onSale.length === 0) return null;

  const count = onSale.length;
  const subject = `${count} ${count === 1 ? "item" : "items"} on sale`;
  const html = onSale
    .map(
      ({ item, links }) =>
        `<h2>${escapeHtml(item.name)}</h2><ul>${links
          .map((l) => `<li>${escapeHtml(linkLabel(l))}: −${discountOf(l)}%</li>`)
          .join("")}</ul>`
    )
    .join("");
  return { subject, html };
}

/** "PS Store JP", "Steam SE", or a web shop's domain. */
function linkLabel(link: LinkSummary): string {
  const store = storeLabel(link.store, link.url);
  return link.region ? `${store} ${link.region}` : store;
}

/** The store's own discount, or one worked out from the prices when it gives none. */
function discountOf(link: LinkSummary): number {
  const latest = link.latest;
  if (!latest?.salePrice) return 0;
  return latest.discountPercent ?? Math.round((1 - latest.salePrice / latest.normalPrice) * 100);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
