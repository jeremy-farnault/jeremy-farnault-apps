import { formatPrice, formatShortDate, storeLabel } from "./format";
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

export type DigestOptions = {
  homeCurrency: string;
  /** Scanner's origin, for links to item pages. */
  appUrl: string;
  now: Date;
};

type OnSaleItem = { item: ItemSummary; links: LinkSummary[] };

/**
 * The email for one user: every item with at least one link on sale, whether or not that
 * link is the item's cheapest, biggest discount first. Null when nothing is on sale, so no
 * email goes out.
 */
export function buildDigest(items: ItemSummary[], options: DigestOptions): Digest | null {
  const onSale = items
    .map((item) => ({ item, links: item.links.filter(isOnSale).sort(byDiscount) }))
    .filter(({ links }) => links.length > 0)
    .sort((a, b) => byDiscount(a.links[0], b.links[0]));
  if (onSale.length === 0) return null;

  const count = onSale.length;
  const subject = `${count} ${count === 1 ? "item" : "items"} on sale`;
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">${onSale
    .map((entry) => itemHtml(entry, options))
    .join("")}</div>`;
  return { subject, html };
}

function itemHtml({ item, links }: OnSaleItem, options: DigestOptions): string {
  const href = `${options.appUrl}/items/${encodeURIComponent(item.id)}`;
  const image = item.imageUrl
    ? `<td width="72" valign="top" style="padding-right:12px"><a href="${escapeHtml(href)}"><img src="${escapeHtml(item.imageUrl)}" width="72" height="72" alt="" style="display:block;width:72px;height:72px;object-fit:cover;border-radius:8px"></a></td>`
    : "";
  const lowest = item.lowest;
  const cheaper =
    lowest && !lowest.unavailable && !links.some((l) => l.id === lowest.id)
      ? `<p style="margin:6px 0 0;font-size:13px;color:#666">Cheaper at ${escapeHtml(linkLabel(lowest))}: ${escapeHtml(priceText(lowest, options.homeCurrency))}</p>`
      : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-bottom:1px solid #e5e5e5;padding:16px 0"><tr>${image}<td valign="top"><a href="${escapeHtml(href)}" style="font-size:16px;font-weight:600;color:#1a1a1a;text-decoration:none">${escapeHtml(item.name)}</a>${links
    .map((l) => linkHtml(l, options))
    .join("")}${cheaper}</td></tr></table>`;
}

function linkHtml(link: LinkSummary, { homeCurrency, now }: DigestOptions): string {
  const latest = link.latest;
  if (!latest) return "";
  const ends = latest.saleEndsAt
    ? ` · ends ${escapeHtml(formatShortDate(latest.saleEndsAt, now, SEND_TIME_ZONE))}`
    : "";
  return `<p style="margin:8px 0 0;font-size:14px">${escapeHtml(linkLabel(link))}: <strong>${escapeHtml(priceText(link, homeCurrency))}</strong> <s style="color:#999">${escapeHtml(formatPrice(latest.normalPrice, latest.currency))}</s> <span style="color:#b0367f;font-weight:600">−${discountOf(link)}%</span>${ends} · <a href="${escapeHtml(link.url)}" style="color:#b0367f">Open in store</a></p>`;
}

/** "¥2,990 (≈ 199 kr)", or just the price when it's already in the home currency. */
function priceText(link: LinkSummary, homeCurrency: string): string {
  const current = link.current;
  if (!current) return "";
  const price = formatPrice(current.price, current.currency);
  return current.currency !== homeCurrency && current.converted !== null
    ? `${price} (≈ ${formatPrice(current.converted, homeCurrency, { round: true })})`
    : price;
}

/** Biggest discount first, then the cheaper after conversion; unconvertible prices last. */
function byDiscount(a: LinkSummary | undefined, b: LinkSummary | undefined): number {
  if (!a || !b) return 0;
  const discount = discountOf(b) - discountOf(a);
  if (discount !== 0) return discount;
  return (
    (a.current?.converted ?? Number.POSITIVE_INFINITY) -
    (b.current?.converted ?? Number.POSITIVE_INFINITY)
  );
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
