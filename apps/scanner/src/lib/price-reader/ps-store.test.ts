// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readPrice } from "./index";
import { parsePsLink, psMatchKey } from "./ps-store";

// The fixtures are trimmed copies of the real Horizon Forbidden West pages, fetched on
// 2026-10-24 while the game was on sale: PS5 649 → 292.05 kr, PS4 549 → 296.46 kr, and the
// Complete Edition at full price. Each page also carries PS Plus "Included" offers.

function servePage(fixture: string, finalUrl?: string) {
  const html = readFileSync(new URL(`./fixtures/${fixture}`, import.meta.url), "utf8");
  return (async (input: string | URL) => ({
    status: 200,
    ok: true,
    url: finalUrl ?? String(input),
    text: async () => html,
  })) as unknown as typeof fetch;
}

const PRODUCT = {
  "sv-se": "https://store.playstation.com/sv-se/product/EP9000-PPSA01521_00-FORBIDDENWESTPS5",
  "en-nz": "https://store.playstation.com/en-nz/product/EP9000-PPSA01521_00-FORBIDDENWESTPS5",
  "ja-jp": "https://store.playstation.com/ja-jp/product/JP9000-PPSA04073_00-FORBIDDENWESTPS5",
};
const CONCEPT = (locale: string) => `https://store.playstation.com/${locale}/concept/10000886`;

describe("PS Store product links", () => {
  it.each([
    ["sv-se", "SE", 64900, 29205, "SEK"],
    ["en-nz", "NZ", 10495, 4722, "NZD"],
    ["ja-jp", "JP", 6980, 4188, "JPY"],
  ] as const)(
    "reads the product's own price in %s",
    async (locale, region, base, sale, currency) => {
      const result = await readPrice(PRODUCT[locale], {
        fetch: servePage(`ps-product-${locale}.html`),
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const { reading } = result;
      expect(reading.store).toBe("ps-store");
      expect(reading.region).toBe(region);
      // One edition: the page's other editions and PS Plus offers are not this link's price.
      expect(reading.editions).toHaveLength(1);
      expect(reading.edition).toMatchObject({
        normalPrice: base,
        salePrice: sale,
        currency,
        inStock: true,
        discountPercent: Math.round((1 - sale / base) * 100),
      });
      expect(reading.edition?.saleEndsAt).toBeInstanceOf(Date);
      expect(reading.name).toMatch(/^Horizon Forbidden West/);
      expect(reading.imageUrl).toMatch(/^https:\/\/image\.api\.playstation\.com\//);
    }
  );

  it("gives the same match key in every region", async () => {
    const keys = await Promise.all(
      (["sv-se", "en-nz", "ja-jp"] as const).map(async (locale) => {
        const r = await readPrice(PRODUCT[locale], {
          fetch: servePage(`ps-product-${locale}.html`),
        });
        return r.ok ? r.reading.matchKey : null;
      })
    );
    expect(keys).toEqual(["ps:FORBIDDENWESTPS5", "ps:FORBIDDENWESTPS5", "ps:FORBIDDENWESTPS5"]);
  });

  it("reports a product the region doesn't sell as not found", async () => {
    const result = await readPrice(PRODUCT["sv-se"], {
      fetch: servePage(
        "ps-product-sv-se.html",
        "https://store.playstation.com/sv-se/error?productId=EP9000-PPSA01521_00-FORBIDDENWESTPS5"
      ),
    });
    expect(result).toMatchObject({ ok: false, reason: "not-found" });
  });

  it("reports a product missing from the page as unreadable", async () => {
    const url = "https://store.playstation.com/sv-se/product/EP9000-NOPE00000_00-NOTONTHISPAGE000";
    const result = await readPrice(url, { fetch: servePage("ps-product-sv-se.html") });
    expect(result).toMatchObject({ ok: false, reason: "unreadable" });
  });
});

describe("PS Store concept links", () => {
  it("lists every edition with its plain price, ignoring PS Plus offers", async () => {
    const result = await readPrice(CONCEPT("sv-se"), { fetch: servePage("ps-concept-sv-se.html") });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reading.name).toBe("Horizon Forbidden West");
    expect(result.reading.edition).toBeNull();
    expect(result.reading.editions.map((e) => [e.id, e.name, e.normalPrice, e.salePrice])).toEqual([
      ["EP9000-PPSA01521_00-FORBIDDENWESTPS5", "Standard Edition · PS4/PS5", 64900, 29205],
      ["EP9000-CUSA24705_00-FORBIDDENWESTPS4", "Standard Edition · PS4", 54900, 29646],
      ["EP9000-PPSA17903_00-HFWCE00000000000", "Complete Edition · PS5", 76900, null],
    ]);
    // Nothing on the page is "Included" (0) or a member price.
    expect(result.reading.editions.every((e) => (e.salePrice ?? e.normalPrice) > 0)).toBe(true);
  });

  it("prices the chosen edition and keys it by that edition", async () => {
    const result = await readPrice(CONCEPT("ja-jp"), {
      editionId: "JP9000-PPSA17907_00-HFWCE00000000000",
      fetch: servePage("ps-concept-ja-jp.html"),
    });
    expect(result.ok && result.reading.edition).toMatchObject({
      normalPrice: 7980,
      salePrice: null,
      currency: "JPY",
      saleEndsAt: null,
    });
    expect(result.ok && result.reading.matchKey).toBe("ps:HFWCE00000000000");
  });

  it("reports a chosen edition that left the page as not found", async () => {
    const result = await readPrice(CONCEPT("en-nz"), {
      editionId: "EP9000-GONE",
      fetch: servePage("ps-concept-en-nz.html"),
    });
    expect(result).toMatchObject({ ok: false, reason: "not-found" });
  });
});

describe("parsePsLink", () => {
  it("reads kind, id and region from the path", () => {
    expect(parsePsLink(new URL(PRODUCT["ja-jp"]))).toEqual({
      kind: "product",
      id: "JP9000-PPSA04073_00-FORBIDDENWESTPS5",
      locale: "ja-jp",
      region: "JP",
    });
    expect(parsePsLink(new URL(CONCEPT("en-nz")))).toMatchObject({ kind: "concept", region: "NZ" });
  });

  it("refuses en-jp, which shows US prices", async () => {
    expect(parsePsLink(new URL(CONCEPT("en-jp")))).toEqual({ error: "en-jp" });
    const neverFetch = (async () => {
      throw new Error("should not fetch");
    }) as unknown as typeof fetch;
    const result = await readPrice(CONCEPT("en-jp"), { fetch: neverFetch });
    expect(result).toEqual({ ok: false, reason: "unreadable", detail: "en-jp" });
  });

  it("ignores store pages that aren't products", () => {
    expect(parsePsLink(new URL("https://store.playstation.com/sv-se/pages/latest"))).toBeNull();
  });
});

describe("psMatchKey", () => {
  it("keeps the label at the end of the product ID", () => {
    expect(psMatchKey("EP9000-PPSA01521_00-FORBIDDENWESTPS5")).toBe("ps:FORBIDDENWESTPS5");
  });
});
