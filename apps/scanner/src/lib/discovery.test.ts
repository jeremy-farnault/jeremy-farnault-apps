// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type DiscoverySource, type DiscoveryTarget, discover, rankByName } from "./discovery";

// Concept pages saved from the PS Store: Horizon Forbidden West (concept 10000886, fetched
// 2026-10-24) and Mortal Shell (234489, fetched 2026-10-26). Mortal Shell is sold as two
// products in Sweden (PS4, and an Enhanced Edition for PS4/PS5) but one in Japan (PS4/PS5).

function serve(
  fixture: string,
  { finalUrl, status = 200 }: { finalUrl?: string; status?: number } = {}
) {
  const body = readFileSync(new URL(`./price-reader/fixtures/${fixture}`, import.meta.url), "utf8");
  const requested: string[] = [];
  const fetchFn = (async (input: string | URL) => {
    requested.push(String(input));
    return {
      status,
      ok: status < 400,
      url: finalUrl ?? String(input),
      text: async () => body,
    };
  }) as unknown as typeof fetch;
  return { fetch: fetchFn, requested };
}

/** A PS target, which follows the concept and ignores the search term. */
const follow = (
  source: DiscoverySource | null,
  target: DiscoveryTarget,
  options: { fetch: typeof fetch }
) => discover({ source, term: "", target, tracked: [] }, options);

const HFW_STANDARD: DiscoverySource = {
  conceptId: "10000886",
  platforms: ["PS4", "PS5"],
  kind: "FULL_GAME",
};

describe("discover on the PS Store", () => {
  it("adds the edition with the same platforms and kind in another region", async () => {
    const { fetch, requested } = serve("ps-concept-ja-jp.html");
    const result = await follow(HFW_STANDARD, { store: "ps-store", region: "JP" }, { fetch });
    expect(requested).toEqual(["https://store.playstation.com/ja-jp/concept/10000886"]);
    expect(result).toEqual({
      status: "found",
      autoAdd: "https://store.playstation.com/ja-jp/product/JP9000-PPSA04073_00-FORBIDDENWESTPS5",
      suggestions: [],
    });
  });

  it("tells a premium edition apart from the standard one", async () => {
    const { fetch } = serve("ps-concept-en-nz.html");
    const result = await follow(
      { conceptId: "10000886", platforms: ["PS5"], kind: "PREMIUM_EDITION" },
      { store: "ps-store", region: "NZ" },
      { fetch }
    );
    expect(result).toMatchObject({
      autoAdd: "https://store.playstation.com/en-nz/product/EP9000-PPSA17903_00-HFWCE00000000000",
    });
  });

  it("matches a game whose product IDs differ across regions", async () => {
    const { fetch } = serve("ps-concept-234489-sv-se.html");
    const result = await follow(
      { conceptId: "234489", platforms: ["PS5", "PS4"], kind: "FULL_GAME" },
      { store: "ps-store", region: "SE" },
      { fetch }
    );
    expect(result).toMatchObject({
      autoAdd: "https://store.playstation.com/sv-se/product/EP3495-PPSA02867_00-6971417207037129",
    });
  });

  it("suggests instead when no edition matches, with a product link for a single one", async () => {
    const { fetch } = serve("ps-concept-234489-ja-jp.html");
    const result = await follow(
      { conceptId: "234489", platforms: ["PS4"], kind: "FULL_GAME" },
      { store: "ps-store", region: "JP" },
      { fetch }
    );
    expect(result.status === "found" && result.autoAdd).toBeNull();
    expect(result.status === "found" && result.suggestions).toMatchObject([
      {
        url: "https://store.playstation.com/ja-jp/product/JP1201-PPSA02904_00-MORTALSHELLJPPS5",
        name: "Mortal Shell",
        editions: [{ normalPrice: 4378, currency: "JPY" }],
      },
    ]);
  });

  it("suggests the concept with every edition when several could be meant", async () => {
    const { fetch } = serve("ps-concept-sv-se.html");
    const result = await follow(
      { conceptId: "10000886", platforms: ["PS5"], kind: "FULL_GAME" },
      { store: "ps-store", region: "SE" },
      { fetch }
    );
    expect(result.status === "found" && result.suggestions).toMatchObject([
      { url: "https://store.playstation.com/sv-se/concept/10000886" },
    ]);
    expect(result.status === "found" && result.suggestions[0]?.editions).toHaveLength(3);
  });

  it("finds nothing where the region doesn't sell the game", async () => {
    const { fetch } = serve("ps-concept-ja-jp.html", {
      finalUrl: "https://store.playstation.com/ja-jp/error?conceptId=10000886",
    });
    const result = await follow(HFW_STANDARD, { store: "ps-store", region: "JP" }, { fetch });
    expect(result).toEqual({ status: "nothing-found" });
  });

  it("fails when the store can't be read", async () => {
    const { fetch } = serve("ps-concept-ja-jp.html", { status: 500 });
    const result = await follow(HFW_STANDARD, { store: "ps-store", region: "JP" }, { fetch });
    expect(result.status).toBe("failed");
  });

  it("fails without a concept to follow or for a region it doesn't know", async () => {
    const { fetch, requested } = serve("ps-concept-ja-jp.html");
    expect((await follow(null, { store: "ps-store", region: "JP" }, { fetch })).status).toBe(
      "failed"
    );
    expect(
      (await follow(HFW_STANDARD, { store: "ps-store", region: "XX" }, { fetch })).status
    ).toBe("failed");
    expect(requested).toEqual([]);
  });
});

// Steam's search for "Mortal Shell" (SE, 2026-10-26) lists Mortal Shell II first, then
// Mortal Shell, a DLC for each and an open beta. Each app's details say which is a game.
const STEAM_FIXTURES: Record<string, string> = {
  "/api/storesearch/": "steam-search-mortal-shell-se.json",
  "appids=1110910": "steam-1110910-se.json",
  "appids=2584270": "steam-2584270-se.json",
  "appids=4711720": "steam-4711720-se.json",
  "appids=1672210": "steam-1672210-se.json",
  "appids=4711740": "steam-4711740-se.json",
};

function steamStore() {
  const requested: string[] = [];
  const fetchFn = (async (input: string | URL) => {
    const url = String(input);
    requested.push(url);
    const fixture = Object.entries(STEAM_FIXTURES).find(([part]) => url.includes(part))?.[1];
    if (!fixture) throw new Error(`No fixture for ${url}`);
    const body = readFileSync(
      new URL(`./price-reader/fixtures/${fixture}`, import.meta.url),
      "utf8"
    );
    return { status: 200, ok: true, url, text: async () => body };
  }) as unknown as typeof fetch;
  return { fetch: fetchFn, requested };
}

const STEAM_SE: DiscoveryTarget = { store: "steam", region: "SE" };

describe("discover on Steam", () => {
  it("suggests the games found, the exact name first, without DLC or demos", async () => {
    const { fetch } = steamStore();
    const result = await discover(
      { source: null, term: "Mortal Shell", target: STEAM_SE, tracked: [] },
      { fetch }
    );
    expect(result.status).toBe("found");
    if (result.status !== "found") return;
    expect(result.autoAdd).toBeNull();
    expect(result.suggestions.map((s) => [s.url, s.name])).toEqual([
      ["https://store.steampowered.com/app/1110910/", "Mortal Shell"],
      ["https://store.steampowered.com/app/2584270/", "Mortal Shell II"],
    ]);
    // Priced for the target storefront: the Swedish Steam store sells in euros.
    expect(result.suggestions[0]?.editions[0]).toMatchObject({
      normalPrice: 2499,
      currency: "EUR",
    });
  });

  it("leaves out what the user already tracks, without reading it", async () => {
    const { fetch, requested } = steamStore();
    const result = await discover(
      {
        source: null,
        term: "Mortal Shell",
        target: STEAM_SE,
        tracked: ["https://store.steampowered.com/app/1110910/Mortal_Shell/"],
      },
      { fetch }
    );
    expect(result.status === "found" && result.suggestions.map((s) => s.name)).toEqual([
      "Mortal Shell II",
    ]);
    expect(requested.some((url) => url.includes("appids=1110910"))).toBe(false);
  });

  it("finds nothing when no hit is a game, or for an empty term", async () => {
    const { fetch, requested } = steamStore();
    expect(
      await discover(
        { source: null, term: "Virtuous Cycle", target: STEAM_SE, tracked: [] },
        { fetch }
      )
    ).toEqual({ status: "nothing-found" });
    requested.length = 0;
    expect(
      await discover({ source: null, term: "  ", target: STEAM_SE, tracked: [] }, { fetch })
    ).toEqual({ status: "nothing-found" });
    expect(requested).toEqual([]);
  });
});

describe("rankByName", () => {
  const hit = (name: string) => ({ url: `https://example.com/${name}`, name });

  it("puts the exact name first, then names that start with it, then ones holding its words", () => {
    const hits = [
      hit("Mortal Shell II"),
      hit("The Mortal Shell Collection"),
      hit("Wild West Panic"),
      hit("Mortal Shell™"),
    ];
    expect(rankByName(hits, "Mortal Shell").map((h) => h.name)).toEqual([
      "Mortal Shell™",
      "Mortal Shell II",
      "The Mortal Shell Collection",
    ]);
  });
});
