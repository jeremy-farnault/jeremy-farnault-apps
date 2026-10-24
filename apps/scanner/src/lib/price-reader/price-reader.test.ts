// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readPrice } from "./index";

/** A fetch that serves one saved page, as if the shop had answered with it. */
function servePage(fixture: string, { status = 200, url }: { status?: number; url?: string } = {}) {
  const html = readFileSync(new URL(`./fixtures/${fixture}`, import.meta.url), "utf8");
  return (async (input: string | URL) => ({
    status,
    ok: status >= 200 && status < 300,
    url: url ?? String(input),
    text: async () => html,
  })) as unknown as typeof fetch;
}

function serveStatus(status: number) {
  return (async () => ({
    status,
    ok: false,
    url: "",
    text: async () => "",
  })) as unknown as typeof fetch;
}

const KJELL =
  "https://www.kjell.com/se/produkter/sakerhet-overvakning/kameraovervakning/overvakningskameror/natverkskameror/eufy-eufycam-s4-solo-3-i-1-overvakningskamera-med-solpanel-p66975";

describe("readPrice on a web shop", () => {
  it("reads name, image and price from JSON-LD", async () => {
    const result = await readPrice(KJELL, { fetch: servePage("kjell-jsonld.html") });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { reading } = result;
    expect(reading.store).toBe("web");
    expect(reading.region).toBeNull();
    expect(reading.name).toBe("Eufy eufyCam S4 Solo 3-i-1 övervakningskamera med solpanel");
    expect(reading.imageUrl).toMatch(/^https:\/\/www\.kjell\.com\/globalassets\/productimages\//);
    expect(reading.editions).toHaveLength(1);
    expect(reading.edition).toMatchObject({
      normalPrice: 449000,
      salePrice: null,
      currency: "SEK",
      inStock: true,
      discountPercent: null,
    });
    expect(reading.matchKey).toBe("eufy eufycam s4 solo 3 i 1 overvakningskamera med solpanel");
  });

  it("falls back to the price meta tags when there is no JSON-LD", async () => {
    const result = await readPrice(KJELL, { fetch: servePage("kjell-meta-only.html") });
    expect(result.ok && result.reading.edition).toMatchObject({
      normalPrice: 449000,
      currency: "SEK",
      inStock: true,
    });
    expect(result.ok && result.reading.name).toBe(
      "Eufy eufyCam S4 Solo 3-i-1 övervakningskamera med solpanel"
    );
    expect(result.ok && result.reading.imageUrl).toMatch(/^https:\/\/www\.kjell\.com\/cdn-cgi\//);
  });

  it("lists every offer and asks for a choice when the page sells several", async () => {
    const url = "https://shop.example/products/infinity-cr-plus";
    const result = await readPrice(url, { fetch: servePage("several-offers.html") });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reading.name).toBe("Harder & Steenbeck Infinity CR Plus");
    expect(result.reading.edition).toBeNull();
    expect(result.reading.editions.map((e) => [e.id, e.name, e.normalPrice, e.inStock])).toEqual([
      ["126554", "0.15 mm", 319500, true],
      ["126544", "0.4 mm", 319500, false],
      ["126594", "2-in-1 set", 379500, true],
    ]);
  });

  it("prices the chosen edition", async () => {
    const url = "https://shop.example/products/infinity-cr-plus";
    const result = await readPrice(url, {
      editionId: "126594",
      fetch: servePage("several-offers.html"),
    });
    expect(result.ok && result.reading.edition?.name).toBe("2-in-1 set");
  });

  it("reports a chosen edition the page no longer lists as not found", async () => {
    const url = "https://shop.example/products/infinity-cr-plus";
    const result = await readPrice(url, {
      editionId: "gone",
      fetch: servePage("several-offers.html"),
    });
    expect(result).toMatchObject({ ok: false, reason: "not-found" });
  });

  it("reads a strikethrough price as a sale, inside a @graph", async () => {
    const url = "https://shop.example/moccamaster";
    const result = await readPrice(url, { fetch: servePage("strikethrough-sale.html") });
    expect(result.ok && result.reading.edition).toMatchObject({
      normalPrice: 329500,
      salePrice: 249500,
      discountPercent: 24,
    });
    expect(result.ok && result.reading.imageUrl).toBe("https://shop.example/moccamaster.jpg");
  });

  it("reads out of stock", async () => {
    const url = "https://shop.example/wet-palette";
    const result = await readPrice(url, { fetch: servePage("out-of-stock.html") });
    expect(result.ok && result.reading.edition).toMatchObject({
      normalPrice: 5490,
      currency: "EUR",
      inStock: false,
    });
  });

  it("rejects a price in a currency Scanner doesn't support", async () => {
    const url = "https://shop.example/jura";
    const result = await readPrice(url, { fetch: servePage("unsupported-currency.html") });
    expect(result).toEqual({ ok: false, reason: "unsupported-currency", detail: "CHF" });
  });

  it("rejects a page with no price", async () => {
    const url = "https://blog.example/best-airbrushes";
    const result = await readPrice(url, { fetch: servePage("no-price.html") });
    expect(result).toMatchObject({ ok: false, reason: "unreadable" });
  });
});

describe("readPrice failures", () => {
  it("rejects text that isn't a link without fetching", async () => {
    const result = await readPrice("dark souls", { fetch: serveStatus(500) });
    expect(result).toMatchObject({ ok: false, reason: "unreadable" });
  });

  it("treats 403 and 429 as blocked", async () => {
    for (const status of [403, 429]) {
      const result = await readPrice("https://shop.example/x", { fetch: serveStatus(status) });
      expect(result).toMatchObject({ ok: false, reason: "blocked" });
    }
  });

  it("treats 404 as not found", async () => {
    const result = await readPrice("https://shop.example/x", { fetch: serveStatus(404) });
    expect(result).toMatchObject({ ok: false, reason: "not-found" });
  });

  it("reports a network error instead of throwing", async () => {
    const failing = (async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;
    const result = await readPrice("https://shop.example/x", { fetch: failing });
    expect(result).toEqual({ ok: false, reason: "unreadable", detail: "ECONNRESET" });
  });
});
