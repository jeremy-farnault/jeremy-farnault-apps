import { describe, expect, it } from "vitest";
import {
  type SummaryCheck,
  type SummaryItem,
  type SummaryLink,
  convert,
  needsEnglishName,
  needsRecheck,
  offeredStores,
  parseSort,
  searchTermFor,
  sortItems,
  suggestItem,
  summarizeItem,
} from "./summary";

// USD-based, like getExchangeRates: 1 USD = 10 SEK = 150 JPY = 1.6 NZD.
const RATES = { USD: 1, SEK: 10, JPY: 150, NZD: 1.6, EUR: 0.9 };
const NOW = new Date(2026, 9, 24, 12, 0);

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
function link(latest: SummaryCheck | null, extra: Partial<SummaryLink> = {}): SummaryLink {
  n += 1;
  return {
    id: `link-${n}`,
    url: `https://shop.example/${n}`,
    store: "web",
    region: null,
    lastStatus: "ok",
    lastCheckedAt: NOW,
    latest,
    ...extra,
  };
}
function item(name: string, links: SummaryLink[], daysAgo = 0): SummaryItem {
  return {
    id: name,
    name,
    imageUrl: null,
    createdAt: new Date(NOW.getTime() - daysAgo * 86_400_000),
    links,
  };
}

describe("convert", () => {
  it("converts through the USD-based rates, in minor units", () => {
    // ¥2,990 = $19.93 = 199.33 kr.
    expect(convert(2990, "JPY", "SEK", RATES)).toBe(19933);
    // 296.46 kr = $29.646 = ¥4,447.
    expect(convert(29646, "SEK", "JPY", RATES)).toBe(4447);
  });

  it("returns the amount unchanged in the same currency, and null without a rate", () => {
    expect(convert(5000, "SEK", "SEK", RATES)).toBe(5000);
    expect(convert(5000, "CHF", "SEK", RATES)).toBeNull();
  });
});

describe("summarizeItem", () => {
  it("picks the cheapest link after conversion, not by face value", () => {
    const se = link(check(29646, "SEK")); // 296.46 kr
    const jp = link(check(2990, "JPY")); // ≈ 199.33 kr
    const nz = link(check(4722, "NZD")); // ≈ 295.13 kr
    const summary = summarizeItem(item("HFW", [se, jp, nz]), RATES, "SEK");
    expect(summary.lowest?.id).toBe(jp.id);
    expect(summary.lowest?.current).toEqual({ price: 2990, currency: "JPY", converted: 19933 });
    expect(summary.lowest?.unavailable).toBe(false);
  });

  it("uses the sale price while on sale", () => {
    const onSale = link(check(64900, "SEK", { salePrice: 29205, discountPercent: 55 }));
    const summary = summarizeItem(item("HFW", [onSale]), RATES, "SEK");
    expect(summary.lowest?.current.price).toBe(29205);
  });

  it("leaves out-of-stock and stale links out of the lowest price", () => {
    const cheapButGone = link(check(100, "SEK", { inStock: false }));
    const cheapButStale = link(check(200, "SEK"), { lastStatus: "failed" });
    const fine = link(check(50000, "SEK"));
    const summary = summarizeItem(item("x", [cheapButGone, cheapButStale, fine]), RATES, "SEK");
    expect(summary.lowest?.id).toBe(fine.id);
    expect(summary.links.find((l) => l.id === cheapButStale.id)?.stale).toBe(true);
  });

  it("falls back to the cheapest last price, flagged unavailable, when nothing is eligible", () => {
    const gone = link(check(30000, "SEK", { inStock: false }));
    const stale = link(check(20000, "SEK"), { lastStatus: "failed" });
    const summary = summarizeItem(item("x", [gone, stale]), RATES, "SEK");
    expect(summary.lowest).toMatchObject({ id: stale.id, unavailable: true });
  });

  it("has no lowest price for an item with no checks", () => {
    expect(summarizeItem(item("x", [link(null)]), RATES, "SEK").lowest).toBeNull();
  });

  it("doesn't count a link whose currency can't be converted", () => {
    const unknown = link(check(1, "CHF"));
    const fine = link(check(90000, "SEK"));
    const summary = summarizeItem(item("x", [unknown, fine]), RATES, "SEK");
    expect(summary.lowest?.id).toBe(fine.id);
  });

  it("is not stale when a link failed before ever succeeding", () => {
    const summary = summarizeItem(item("x", [link(null, { lastStatus: "failed" })]), RATES, "SEK");
    expect(summary.links[0]?.stale).toBe(false);
  });
});

describe("needsRecheck", () => {
  it("rechecks only after more than an hour", () => {
    const at = (minutesAgo: number) => ({
      lastCheckedAt: new Date(NOW.getTime() - minutesAgo * 60_000),
    });
    expect(needsRecheck(at(59), NOW)).toBe(false);
    expect(needsRecheck(at(60), NOW)).toBe(false);
    expect(needsRecheck(at(61), NOW)).toBe(true);
  });
});

describe("sortItems", () => {
  const cheap = summarizeItem(item("Banana", [link(check(1000, "SEK"))], 3), RATES, "SEK");
  const pricey = summarizeItem(item("apple", [link(check(90000, "SEK"))], 1), RATES, "SEK");
  const gone = summarizeItem(
    item("Cherry", [link(check(10, "SEK", { inStock: false }))], 2),
    RATES,
    "SEK"
  );
  const unpriced = summarizeItem(item("Date", [link(null)], 0), RATES, "SEK");
  const all = [cheap, pricey, gone, unpriced];
  const names = (sort: Parameters<typeof sortItems>[1]) => sortItems(all, sort).map((i) => i.name);

  it("sorts by date added, newest first", () => {
    expect(names("added-desc")).toEqual(["Date", "apple", "Cherry", "Banana"]);
  });

  it("sorts by name, ignoring case", () => {
    expect(names("name-asc")).toEqual(["apple", "Banana", "Cherry", "Date"]);
  });

  it("sorts by price either way, with price-less items last", () => {
    expect(names("price-asc")).toEqual(["Banana", "apple", "Date", "Cherry"]);
    expect(names("price-desc")).toEqual(["apple", "Banana", "Date", "Cherry"]);
  });

  it("sorts by discount, then by price, with price-less items last", () => {
    const sale = (name: string, price: number, discountPercent: number | null, daysAgo: number) =>
      summarizeItem(
        item(name, [link(check(price, "SEK", { discountPercent }))], daysAgo),
        RATES,
        "SEK"
      );
    const big = sale("Big sale", 5000, 50, 5);
    const smallPricey = sale("Small sale, pricey", 9000, 20, 4);
    const smallCheap = sale("Small sale, cheap", 2000, 20, 6);
    const goneOnSale = summarizeItem(
      item("Gone", [link(check(10, "SEK", { inStock: false, discountPercent: 90 }))], 7),
      RATES,
      "SEK"
    );
    const order = sortItems(
      [cheap, smallPricey, unpriced, big, goneOnSale, smallCheap, pricey],
      "discount-desc"
    );
    expect(order.map((i) => i.name)).toEqual([
      "Big sale",
      "Small sale, cheap",
      "Small sale, pricey",
      "Banana",
      "apple",
      "Date",
      "Gone",
    ]);
  });
});

describe("parseSort", () => {
  it("falls back to biggest discount", () => {
    expect(parseSort("price-asc")).toBe("price-asc");
    expect(parseSort("nope")).toBe("discount-desc");
    expect(parseSort(undefined)).toBe("discount-desc");
  });
});

describe("suggestItem", () => {
  const tracked = [
    { matchKey: "ps-concept:10000886", itemId: "hfw", itemName: "Horizon Forbidden West" },
    { matchKey: "ps-concept:234489", itemId: "ms", itemName: "Mortal Shell" },
    { matchKey: "dark souls remastered", itemId: "ds", itemName: "Dark Souls" },
    { matchKey: "horizon forbidden west", itemId: "hfw-pc", itemName: "HFW on Steam" },
  ];

  it("matches the same PS game across regions by concept, even with a Japanese title", () => {
    expect(
      suggestItem(
        { storeKey: "ps-concept:10000886", nameKey: "ホライゾン フォビドゥン ウェスト" },
        tracked
      )
    ).toEqual({ itemId: "hfw", itemName: "Horizon Forbidden West" });
  });

  it("matches Mortal Shell JP to the SE item, whose product IDs share nothing", () => {
    expect(
      suggestItem({ storeKey: "ps-concept:234489", nameKey: "mortal shell" }, tracked)?.itemId
    ).toBe("ms");
  });

  it("prefers a concept match over a name match", () => {
    expect(
      suggestItem({ storeKey: "ps-concept:10000886", nameKey: "horizon forbidden west" }, tracked)
        ?.itemId
    ).toBe("hfw");
  });

  it("falls back to the cleaned-up name", () => {
    expect(suggestItem({ storeKey: null, nameKey: "dark souls remastered" }, tracked)?.itemId).toBe(
      "ds"
    );
  });

  it("suggests nothing without a match", () => {
    expect(suggestItem({ storeKey: "ps-concept:999", nameKey: "elden ring" }, tracked)).toBeNull();
    expect(suggestItem({ storeKey: null, nameKey: "" }, tracked)).toBeNull();
  });
});

describe("offeredStores", () => {
  const userLinks = [
    { store: "ps-store", region: "SE" },
    { store: "ps-store", region: "JP" },
    { store: "steam", region: "SE" },
    { store: "ps-store", region: "JP" },
    { store: "ps-store", region: "NZ" },
    { store: "web", region: null },
  ];

  it("offers the user's stores that can search, once each, minus the item's own", () => {
    expect(
      offeredStores(userLinks, [{ store: "ps-store", region: "SE" }], (s) => s === "ps-store")
    ).toEqual([
      { store: "ps-store", region: "JP" },
      { store: "ps-store", region: "NZ" },
    ]);
  });

  it("keeps the same region in another store apart", () => {
    expect(
      offeredStores(userLinks, [{ store: "steam", region: "SE" }], () => true).map(
        (s) => `${s.store} ${s.region}`
      )
    ).toEqual(["ps-store SE", "ps-store JP", "ps-store NZ"]);
  });
});

describe("searchTermFor", () => {
  it("keeps a name with Latin letters, and swaps one without for its English name", () => {
    expect(searchTermFor("Mortal Shell", "Mortal Shell")).toBe("Mortal Shell");
    expect(searchTermFor("ホライゾン フォビドゥン ウェスト", "Horizon Forbidden West")).toBe(
      "Horizon Forbidden West"
    );
    expect(searchTermFor("Horizon Forbidden West™ 完全版", "Horizon")).toBe(
      "Horizon Forbidden West™ 完全版"
    );
    expect(searchTermFor("モンスターハンターワイルズ", null)).toBe("モンスターハンターワイルズ");
  });

  it("asks for an English name only when the name has no Latin letters", () => {
    expect(needsEnglishName("ホライゾン フォビドゥン ウェスト")).toBe(true);
    expect(needsEnglishName("Horizon Forbidden West™ 完全版")).toBe(false);
  });
});
