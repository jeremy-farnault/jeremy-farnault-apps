// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readPrice } from "./index";
import { defaultSteamRegion, steamApiUrl } from "./steam";
import { normalizeUrl } from "./url";

// The fixtures are real appdetails replies, fetched on 2026-10-24 and trimmed to the fields
// the adapter reads. Space Marine 2 was on sale (−75%), GTA V Enhanced has a subscription
// package, Apex Legends is free.

/** Serves the saved reply for the app and country the adapter asks for. */
function serveSteam() {
  return (async (input: string | URL) => {
    const url = new URL(String(input));
    const app = url.searchParams.get("appids");
    const cc = url.searchParams.get("cc");
    const body = readFileSync(
      new URL(`./fixtures/steam-${app}-${cc}.json`, import.meta.url),
      "utf8"
    );
    return { status: 200, ok: true, url: String(input), text: async () => body };
  }) as unknown as typeof fetch;
}

const DARK_SOULS = "https://store.steampowered.com/app/570940/DARK_SOULS_REMASTERED/";

describe("Steam links", () => {
  it.each([
    ["SE", 3999, "EUR"],
    ["NZ", 6799, "NZD"],
    ["JP", 4730, "JPY"],
  ] as const)("prices the app for %s", async (region, price, currency) => {
    const result = await readPrice(DARK_SOULS, { region, fetch: serveSteam() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reading).toMatchObject({
      store: "steam",
      region,
      name: "DARK SOULS™: REMASTERED",
      matchKey: "dark souls remastered",
    });
    expect(result.reading.imageUrl).toMatch(/570940\/header/);
    expect(result.reading.editions).toHaveLength(1);
    // Yen arrive ×100 from Steam (473000) and are stored as whole yen.
    expect(result.reading.edition).toMatchObject({ normalPrice: price, salePrice: null, currency });
  });

  it("lists paid packages as editions, with their sale prices, and skips free ones", async () => {
    const url = "https://store.steampowered.com/app/2183900/Warhammer_40000_Space_Marine_2/";
    const result = await readPrice(url, { region: "SE", fetch: serveSteam() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reading.edition).toBeNull();
    expect(
      result.reading.editions.map((e) => [e.name, e.normalPrice, e.salePrice, e.discountPercent])
    ).toEqual([
      ["Warhammer 40,000: Space Marine 2 - Standard Edition", 5999, 1499, 75],
      ["Warhammer 40,000: Space Marine 2 - 1-Year Anniversary Edition", 8999, 2249, 75],
      ["Warhammer 40,000: Space Marine 2 - 2-Year Anniversary Edition", 11999, 5399, 55],
      ["Warhammer 40,000: Space Marine 2 - 3-Year Anniversary Edition", 14999, null, null],
    ]);
  });

  it("prices the chosen package", async () => {
    const url = "https://store.steampowered.com/app/2183900/";
    const result = await readPrice(url, {
      region: "SE",
      editionId: "1380594",
      fetch: serveSteam(),
    });
    expect(result.ok && result.reading.edition?.salePrice).toBe(5399);
  });

  it("leaves subscriptions out of the editions", async () => {
    const url = "https://store.steampowered.com/app/3240220/Grand_Theft_Auto_V_Enhanced/";
    const result = await readPrice(url, { region: "SE", fetch: serveSteam() });
    expect(result.ok && result.reading.editions.map((e) => e.name)).toEqual([
      "Grand Theft Auto V Enhanced",
      "Grand Theft Auto V Enhanced & Great White Shark Card",
    ]);
  });

  it("rejects a free game", async () => {
    const url = "https://store.steampowered.com/app/1172470/Apex_Legends/";
    const result = await readPrice(url, { region: "SE", fetch: serveSteam() });
    expect(result).toEqual({ ok: false, reason: "unreadable", detail: "free" });
  });

  it("reports an unknown app as not found", async () => {
    const url = "https://store.steampowered.com/app/99999999/";
    const result = await readPrice(url, { region: "SE", fetch: serveSteam() });
    expect(result).toMatchObject({ ok: false, reason: "not-found" });
  });

  it("needs a supported region", async () => {
    for (const region of [null, "FR"]) {
      const result = await readPrice(DARK_SOULS, { region, fetch: serveSteam() });
      expect(result).toMatchObject({ ok: false, reason: "unreadable" });
    }
  });

  it("rejects store pages that aren't games", async () => {
    const result = await readPrice("https://store.steampowered.com/search/?term=souls", {
      region: "SE",
      fetch: serveSteam(),
    });
    expect(result).toMatchObject({ ok: false, reason: "unreadable" });
  });
});

describe("Steam helpers", () => {
  it("asks appdetails for the region's country", () => {
    expect(steamApiUrl("570940", "JP")).toBe(
      "https://store.steampowered.com/api/appdetails?appids=570940&cc=jp&l=english"
    );
  });

  it("defaults to the home currency's storefront", () => {
    expect(defaultSteamRegion("SEK")).toBe("SE");
    expect(defaultSteamRegion("JPY")).toBe("JP");
    expect(defaultSteamRegion("EUR")).toBe("DE");
  });

  it("reduces a Steam link to its app id for duplicate checks", () => {
    expect(normalizeUrl(new URL(DARK_SOULS))).toBe("store.steampowered.com/app/570940");
    expect(normalizeUrl(new URL("https://store.steampowered.com/app/570940?snr=1_4_4"))).toBe(
      "store.steampowered.com/app/570940"
    );
  });
});
