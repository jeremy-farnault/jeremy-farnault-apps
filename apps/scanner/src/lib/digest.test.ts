import { describe, expect, it } from "vitest";
import { buildDigest, isSendHour } from "./digest";
import { type SummaryCheck, type SummaryLink, summarizeItem } from "./summary";

// USD-based, like getExchangeRates: 1 USD = 10 SEK = 150 JPY.
const RATES = { USD: 1, SEK: 10, JPY: 150 };
const NOW = new Date(2026, 9, 31, 7, 0);

let n = 0;
function check(price: number, currency: string, extra: Partial<SummaryCheck> = {}): SummaryCheck {
  return {
    normalPrice: price,
    salePrice: null,
    currency,
    inStock: true,
    discountPercent: null,
    saleEndsAt: null,
    checkedAt: NOW,
    ...extra,
  };
}
function sale(
  normal: number,
  salePrice: number,
  currency: string,
  extra: Partial<SummaryCheck> = {}
) {
  return check(normal, currency, {
    salePrice,
    discountPercent: Math.round((1 - salePrice / normal) * 100),
    ...extra,
  });
}
function link(latest: SummaryCheck | null, extra: Partial<SummaryLink> = {}): SummaryLink {
  n += 1;
  return {
    id: `link-${n}`,
    url: `https://shop.example/${n}`,
    store: "ps-store",
    region: "SE",
    lastStatus: "ok",
    lastCheckedAt: NOW,
    latest,
    ...extra,
  };
}
function item(name: string, links: SummaryLink[]) {
  return summarizeItem({ id: name, name, imageUrl: null, createdAt: NOW, links }, RATES, "SEK");
}

describe("buildDigest", () => {
  it("sends nothing when no item is on sale", () => {
    expect(buildDigest([item("Full price", [link(check(29900, "SEK"))])])).toBeNull();
    expect(buildDigest([])).toBeNull();
  });

  it("leaves out a sale whose check failed this morning", () => {
    const stale = link(sale(29900, 14900, "SEK"), { lastStatus: "failed" });
    expect(buildDigest([item("Stale", [stale])])).toBeNull();
  });

  it("leaves out a sale that's out of stock", () => {
    const gone = link(sale(29900, 14900, "SEK", { inStock: false }));
    expect(buildDigest([item("Gone", [gone])])).toBeNull();
  });

  it("includes an item whose sale isn't on its cheapest link", () => {
    const jpFull = link(check(1500, "JPY"), { region: "JP" }); // ≈ 100 kr
    const seSale = link(sale(29900, 19900, "SEK")); // 199 kr
    const digest = buildDigest([item("Mortal Shell", [jpFull, seSale])]);
    expect(digest?.subject).toBe("1 item on sale");
    expect(digest?.html).toContain("Mortal Shell");
    expect(digest?.html).toContain("PS Store SE: −33%");
    expect(digest?.html).not.toContain("PS Store JP");
  });

  it("counts items, not links, in the subject", () => {
    const twoSales = item("Horizon", [
      link(sale(29900, 14900, "SEK")),
      link(sale(4000, 2000, "JPY"), { region: "JP" }),
    ]);
    const oneSale = item("Astro Bot", [link(sale(69900, 48900, "SEK"))]);
    const fullPrice = item("Elden Ring", [link(check(59900, "SEK"))]);
    expect(buildDigest([twoSales, oneSale, fullPrice])?.subject).toBe("2 items on sale");
  });

  it("works the discount out from the prices when the store gives none", () => {
    const noPercent = link(sale(20000, 15000, "SEK", { discountPercent: null }));
    expect(buildDigest([item("Kena", [noPercent])])?.html).toContain("−25%");
  });

  it("escapes the item name", () => {
    const html = buildDigest([item("<b>Tom & Jerry</b>", [link(sale(100, 50, "SEK"))])])?.html;
    expect(html).toContain("&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;");
  });
});

describe("isSendHour", () => {
  // Stockholm is UTC+2 until the last Sunday of October (25 Oct 2026), then UTC+1 until the
  // last Sunday of March (28 Mar 2027).
  const utc = (iso: string) => new Date(`${iso}Z`);

  it("is true at 7:xx in Stockholm in summer time (05:xx UTC)", () => {
    expect(isSendHour(utc("2026-07-15T05:00:00"))).toBe(true);
    expect(isSendHour(utc("2026-07-15T05:59:00"))).toBe(true);
    expect(isSendHour(utc("2026-07-15T04:59:00"))).toBe(false);
    expect(isSendHour(utc("2026-07-15T06:00:00"))).toBe(false);
  });

  it("is true at 7:xx in Stockholm in winter time (06:xx UTC)", () => {
    expect(isSendHour(utc("2027-01-15T06:00:00"))).toBe(true);
    expect(isSendHour(utc("2027-01-15T05:00:00"))).toBe(false);
    expect(isSendHour(utc("2027-01-15T07:00:00"))).toBe(false);
  });

  it("follows the October clock change", () => {
    // Saturday 24 Oct, still summer time; Sunday 25 Oct, winter time from 03:00.
    expect(isSendHour(utc("2026-10-24T05:10:00"))).toBe(true);
    expect(isSendHour(utc("2026-10-25T05:10:00"))).toBe(false);
    expect(isSendHour(utc("2026-10-25T06:10:00"))).toBe(true);
  });

  it("follows the March clock change", () => {
    // Saturday 27 Mar, still winter time; Sunday 28 Mar, summer time from 02:00.
    expect(isSendHour(utc("2027-03-27T06:10:00"))).toBe(true);
    expect(isSendHour(utc("2027-03-28T06:10:00"))).toBe(false);
    expect(isSendHour(utc("2027-03-28T05:10:00"))).toBe(true);
  });
});
