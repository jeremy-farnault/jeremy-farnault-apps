import { describe, expect, it } from "vitest";
import { buildDigest, isSendHour } from "./digest";
import { formatPrice } from "./format";
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
function item(name: string, links: SummaryLink[], imageUrl: string | null = null) {
  return summarizeItem({ id: name, name, imageUrl, createdAt: NOW, links }, RATES, "SEK");
}

const OPTIONS = { homeCurrency: "SEK", appUrl: "https://scanner.example", now: NOW };
const digestOf = (items: ReturnType<typeof item>[]) => buildDigest(items, OPTIONS);

describe("buildDigest", () => {
  it("sends nothing when no item is on sale", () => {
    expect(digestOf([item("Full price", [link(check(29900, "SEK"))])])).toBeNull();
    expect(digestOf([])).toBeNull();
  });

  it("leaves out a sale whose check failed this morning", () => {
    const stale = link(sale(29900, 14900, "SEK"), { lastStatus: "failed" });
    expect(digestOf([item("Stale", [stale])])).toBeNull();
  });

  it("leaves out a sale that's out of stock", () => {
    const gone = link(sale(29900, 14900, "SEK", { inStock: false }));
    expect(digestOf([item("Gone", [gone])])).toBeNull();
  });

  it("includes an item whose sale isn't on its cheapest link, saying where it's cheaper", () => {
    const jpFull = link(check(1500, "JPY"), { region: "JP" }); // ≈ 100 kr
    const seSale = link(sale(29900, 19900, "SEK")); // 199 kr
    const digest = digestOf([item("Mortal Shell", [jpFull, seSale])]);
    expect(digest?.subject).toBe("1 item on sale");
    expect(digest?.html).toContain("PS Store SE:");
    expect(digest?.html).toContain(
      `Cheaper at PS Store JP: ${formatPrice(1500, "JPY")} (≈ ${formatPrice(10000, "SEK", { round: true })})`
    );
  });

  it("has no cheaper line when the cheapest link is the one on sale", () => {
    const seFull = link(check(29900, "SEK"));
    const jpSale = link(sale(4000, 1500, "JPY"), { region: "JP" });
    expect(digestOf([item("Horizon", [seFull, jpSale])])?.html).not.toContain("Cheaper at");
  });

  it("counts items, not links, in the subject", () => {
    const twoSales = item("Horizon", [
      link(sale(29900, 14900, "SEK")),
      link(sale(4000, 2000, "JPY"), { region: "JP" }),
    ]);
    const oneSale = item("Astro Bot", [link(sale(69900, 48900, "SEK"))]);
    const fullPrice = item("Elden Ring", [link(check(59900, "SEK"))]);
    expect(digestOf([twoSales, oneSale, fullPrice])?.subject).toBe("2 items on sale");
  });

  it("orders items by biggest discount, then by price", () => {
    const small = item("Small", [link(sale(10000, 9000, "SEK"))]); // −10%
    const bigDear = item("Big dear", [link(sale(60000, 30000, "SEK"))]); // −50%, 300 kr
    const bigCheap = item("Big cheap", [link(sale(20000, 10000, "SEK"))]); // −50%, 100 kr
    const html = digestOf([small, bigDear, bigCheap])?.html ?? "";
    const at = (name: string) => html.indexOf(`>${name}</a>`);
    expect(at("Big cheap")).toBeLessThan(at("Big dear"));
    expect(at("Big dear")).toBeLessThan(at("Small"));
  });

  it("shows the sale price, converted price, normal price, discount and end date", () => {
    const ends = new Date("2026-11-04T22:59:00Z"); // 23:59 on 4 Nov in Stockholm
    const jpSale = link(sale(4000, 2990, "JPY", { saleEndsAt: ends }), { region: "JP" });
    const html = digestOf([item("Kena", [jpSale])])?.html ?? "";
    expect(html).toContain(
      `${formatPrice(2990, "JPY")} (≈ ${formatPrice(19933, "SEK", { round: true })})`
    );
    expect(html).toContain(`<s style="color:#999">${formatPrice(4000, "JPY")}</s>`);
    expect(html).toContain("−25%");
    expect(html).toContain("ends 4 Nov");
  });

  it("doesn't convert a price already in the home currency", () => {
    const html = digestOf([item("Kena", [link(sale(20000, 15000, "SEK"))])])?.html ?? "";
    expect(html).not.toContain("≈");
  });

  it("has no end date for a sale without one", () => {
    const html = digestOf([item("Kena", [link(sale(20000, 15000, "SEK"))])])?.html ?? "";
    expect(html).not.toContain("ends");
  });

  it("works the discount out from the prices when the store gives none", () => {
    const noPercent = link(sale(20000, 15000, "SEK", { discountPercent: null }));
    expect(digestOf([item("Kena", [noPercent])])?.html).toContain("−25%");
  });

  it("links to the item page and the store", () => {
    const onSale = link(sale(20000, 15000, "SEK"), { url: "https://store.example/kena" });
    const html = digestOf([item("Kena", [onSale])])?.html ?? "";
    expect(html).toContain('href="https://scanner.example/items/Kena"');
    expect(html).toContain('href="https://store.example/kena"');
    expect(html).toContain("Open in store");
  });

  it("shows the item's image when it has one", () => {
    const withImage = item("Kena", [link(sale(100, 50, "SEK"))], "https://img.example/kena.jpg");
    const without = item("Tunic", [link(sale(100, 50, "SEK"))]);
    expect(digestOf([withImage])?.html).toContain('<img src="https://img.example/kena.jpg"');
    expect(digestOf([without])?.html).not.toContain("<img");
  });

  it("lists failed and unchecked links in the footer", () => {
    const onSale = link(sale(20000, 15000, "SEK"));
    const failed = link(check(29900, "SEK"), { region: "JP", lastStatus: "failed" });
    const neverRead = link(null, {
      store: "web",
      url: "https://www.kjell.com/x",
      region: null,
      lastStatus: "failed",
    });
    const skipped = link(check(59900, "SEK"), { store: "steam", lastStatus: "failed" });
    const html =
      buildDigest([item("Kena", [onSale, failed]), item("Cable", [neverRead, skipped])], {
        ...OPTIONS,
        unchecked: [skipped.id],
      })?.html ?? "";
    expect(html).toContain(
      "Couldn't be checked this morning: Kena (PS Store JP), Cable (kjell.com)"
    );
    expect(html).toContain("Not checked today, showing yesterday's price: Cable (Steam SE)");
  });

  it("has no footer when every check worked", () => {
    const html = digestOf([item("Kena", [link(sale(20000, 15000, "SEK"))])])?.html ?? "";
    expect(html).not.toContain("checked");
  });

  it("sends nothing on a day with only failed links and no sale", () => {
    const failed = link(check(29900, "SEK"), { lastStatus: "failed" });
    expect(buildDigest([item("Kena", [failed])], { ...OPTIONS, unchecked: ["x"] })).toBeNull();
  });

  it("keeps an unchecked link's sale from yesterday", () => {
    const skipped = link(sale(20000, 15000, "SEK"));
    const digest = buildDigest([item("Kena", [skipped])], { ...OPTIONS, unchecked: [skipped.id] });
    expect(digest?.subject).toBe("1 item on sale");
    expect(digest?.html).toContain(
      "Not checked today, showing yesterday's price: Kena (PS Store SE)"
    );
  });

  it("escapes the item name", () => {
    const html = digestOf([item("<b>Tom & Jerry</b>", [link(sale(100, 50, "SEK"))])])?.html;
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
