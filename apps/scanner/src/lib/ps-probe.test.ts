import { describe, expect, it } from "vitest";
import { findPrices, probe } from "./ps-probe";

const PRICE = (base: number, discounted: number, currency: string) =>
  `"price":{"__typename":"Price","basePriceValue":${base},"discountedValue":${discounted},"currencyCode":"${currency}"}`;

describe("findPrices", () => {
  it("returns each distinct price record once", () => {
    const html = `${PRICE(54900, 29646, "SEK")}${PRICE(54900, 0, "SEK")}${PRICE(54900, 29646, "SEK")}`;
    expect(findPrices(html)).toEqual([
      { basePriceValue: 54900, discountedValue: 29646, currencyCode: "SEK" },
      { basePriceValue: 54900, discountedValue: 0, currencyCode: "SEK" },
    ]);
  });

  it("finds nothing on a page without price data", () => {
    expect(findPrices("<html><title>Access Denied</title></html>")).toEqual([]);
  });
});

describe("probe", () => {
  const target = { region: "JP", url: "https://store.playstation.com/ja-jp/product/X" };

  it("reports the status, final URL and prices", async () => {
    const fetchFn = async () => ({
      status: 200,
      url: target.url,
      text: async () => PRICE(5980, 2990, "JPY"),
    });
    const result = await probe(target, fetchFn as unknown as typeof fetch);
    expect(result).toMatchObject({
      status: 200,
      finalUrl: target.url,
      prices: [{ basePriceValue: 5980, discountedValue: 2990, currencyCode: "JPY" }],
      error: null,
    });
  });

  it("reports a network failure instead of throwing", async () => {
    const fetchFn = async () => {
      throw new Error("ECONNRESET");
    };
    const result = await probe(target, fetchFn as typeof fetch);
    expect(result).toMatchObject({ status: null, prices: [], error: "ECONNRESET" });
  });
});
