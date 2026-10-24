import { describe, expect, it } from "vitest";
import { nameMatchKey } from "./match-key";
import { discountPercent, toMinorUnits } from "./money";
import { normalizeUrl, parseLink, storeFor } from "./url";

describe("toMinorUnits", () => {
  it.each([
    ["649", "SEK", 64900],
    ["4490.000000000", "SEK", 449000],
    ["1 299,00", "SEK", 129900],
    ["1.299,00", "EUR", 129900],
    ["1,299.00", "USD", 129900],
    ["1,299", "USD", 129900],
    ["549,9", "SEK", 54990],
    ["1.299.000", "JPY", 1299000],
    ["¥5,980", "JPY", 5980],
    [54.9, "EUR", 5490],
    [5980, "JPY", 5980],
  ])("reads %j %s as %d", (value, currency, expected) => {
    expect(toMinorUnits(value, currency)).toBe(expected);
  });

  it.each([[""], ["free"], [0], [-5], [null], [undefined]])("rejects %j", (value) => {
    expect(toMinorUnits(value, "SEK")).toBeNull();
  });
});

describe("discountPercent", () => {
  it("rounds to a whole percent", () => {
    expect(discountPercent(54900, 29646)).toBe(46);
  });

  it("is null without a lower sale price", () => {
    expect(discountPercent(54900, null)).toBeNull();
    expect(discountPercent(54900, 54900)).toBeNull();
  });
});

describe("parseLink", () => {
  it("accepts a link without a scheme and trims spaces", () => {
    expect(parseLink("  www.kjell.com/se/p66975 ")?.toString()).toBe(
      "https://www.kjell.com/se/p66975"
    );
  });

  it("rejects text and other schemes", () => {
    expect(parseLink("dark souls")).toBeNull();
    expect(parseLink("ftp://example.com/x")).toBeNull();
    expect(parseLink("")).toBeNull();
  });
});

describe("normalizeUrl", () => {
  it("drops tracking, the fragment, www and a trailing slash", () => {
    const url = new URL("https://WWW.Kjell.com/se/p66975/?utm_source=x&gclid=1#reviews");
    expect(normalizeUrl(url)).toBe("kjell.com/se/p66975");
  });

  it("keeps parameters that may pick the product, sorted", () => {
    const url = new URL("https://shop.example/p?variant=2&color=red&fbclid=z");
    expect(normalizeUrl(url)).toBe("shop.example/p?color=red&variant=2");
  });
});

describe("storeFor", () => {
  it("routes by host", () => {
    expect(storeFor(new URL("https://store.playstation.com/sv-se/product/X"))).toBe("ps-store");
    expect(storeFor(new URL("https://store.steampowered.com/app/570940"))).toBe("steam");
    expect(storeFor(new URL("https://www.kjell.com/se/p1"))).toBe("web");
  });
});

describe("nameMatchKey", () => {
  it("drops trademark signs, platforms and edition words", () => {
    expect(nameMatchKey("Horizon Forbidden West™ Complete Edition (PS5)")).toBe(
      "horizon forbidden west"
    );
  });

  it("strips accents and punctuation", () => {
    expect(nameMatchKey("Pokémon: Legends – Z-A")).toBe("pokemon legends z a");
  });

  it("keeps non-Latin titles", () => {
    expect(nameMatchKey("ホライゾン フォビドゥン ウェスト")).toBe(
      "ホライゾン フォビドゥン ウェスト"
    );
  });
});
