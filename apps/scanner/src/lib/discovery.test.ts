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

  it("falls back to searching by name when the concept can't be read", async () => {
    const { fetch, requested } = psStore({ concept: 500 });
    const result = await discover(
      { source: HFW_STANDARD, term: "Horizon Forbidden West", target: PS_JP, tracked: [] },
      { fetch }
    );
    expect(requested[0]).toContain("/ja-jp/concept/10000886");
    expect(result.status === "found" && result.suggestions.length).toBe(3);
  });
});

// PS Store searches saved on 2026-10-26: "Horizon Forbidden West" in ja-jp (the PS5 and PS4
// versions, the Complete Edition, the Burning Shores DLC, an unrelated character pack and
// concepts), "Mortal Shell" in sv-se, and "Monster Hunter Wilds" in ja-jp, which finds the
// Japanese title. Product pages are served from saved pages that embed those products.
const PS_SEARCHES: Record<string, string> = {
  "Horizon Forbidden West": "ps-search-horizon-ja-jp.json",
  "Mortal Shell": "ps-search-mortal-shell-sv-se.json",
  "Monster Hunter Wilds": "ps-search-monster-hunter-ja-jp.json",
};
const PS_PAGES: [RegExp, string][] = [
  [/\/ja-jp\/product\/JP9000-/, "ps-product-ja-jp.html"],
  [/\/ja-jp\/product\/UP0102-PPSA07862_00-MHWILDSSTANDARD0/, "ps-product-mhwilds-ja-jp.html"],
  [/\/sv-se\/product\/EP3495-(CUSA20133|PPSA02867)_00-/, "ps-concept-234489-sv-se.html"],
];

function psStore({ concept = 200, search }: { concept?: number; search?: string } = {}) {
  const requested: string[] = [];
  const fetchFn = (async (input: string | URL) => {
    const url = String(input);
    requested.push(url);
    const respond = (status: number, body: string) => ({
      status,
      ok: status < 400,
      url,
      text: async () => body,
    });
    const fixture = (name: string) =>
      readFileSync(new URL(`./price-reader/fixtures/${name}`, import.meta.url), "utf8");
    if (url.includes("/concept/")) return respond(concept, fixture("ps-concept-ja-jp.html"));
    if (url.includes("web.np.playstation.com")) {
      if (search) return respond(400, search);
      const term = JSON.parse(new URL(url).searchParams.get("variables") ?? "{}").searchTerm;
      return respond(200, fixture(PS_SEARCHES[term] ?? "no-price.html"));
    }
    const page = PS_PAGES.find(([pattern]) => pattern.test(url))?.[1];
    return page ? respond(200, fixture(page)) : respond(404, "");
  }) as unknown as typeof fetch;
  return { fetch: fetchFn, requested };
}

const PS_JP: DiscoveryTarget = { store: "ps-store", region: "JP" };

describe("search on the PS Store", () => {
  it("searches by name without a concept, each PS4/PS5 product its own row, no DLC", async () => {
    const { fetch, requested } = psStore();
    const result = await discover(
      { source: null, term: "Horizon Forbidden West", target: PS_JP, tracked: [] },
      { fetch }
    );
    const search = new URL(requested[0] ?? "");
    expect(search.host).toBe("web.np.playstation.com");
    expect(JSON.parse(search.searchParams.get("variables") ?? "")).toMatchObject({
      countryCode: "JP",
      languageCode: "ja",
      searchTerm: "Horizon Forbidden West",
    });
    // The DLC and the character pack are skipped on their search kind, never read.
    expect(requested.some((u) => u.includes("BURNINGSHORES"))).toBe(false);
    expect(result.status === "found" && result.suggestions.map((s) => s.url)).toEqual([
      "https://store.playstation.com/ja-jp/product/JP9000-PPSA04073_00-FORBIDDENWESTPS5",
      "https://store.playstation.com/ja-jp/product/JP9000-CUSA28563_00-FORBIDDENWESTPS4",
      "https://store.playstation.com/ja-jp/product/JP9000-PPSA17907_00-HFWCE00000000000",
    ]);
  });

  it("leaves out what the user tracks, and what can't be read", async () => {
    const { fetch } = psStore();
    const result = await discover(
      {
        source: null,
        term: "Mortal Shell",
        target: { store: "ps-store", region: "SE" },
        tracked: [
          "https://store.playstation.com/sv-se/product/EP3495-CUSA20133_00-MORTALSHELLGGAME",
        ],
      },
      { fetch }
    );
    // Mortal Shell II's pages aren't saved, so they read as gone: only the Enhanced Edition.
    expect(result.status === "found" && result.suggestions.map((s) => s.name)).toEqual([
      "Mortal Shell: Enhanced Edition",
    ]);
    expect(result.status === "found" && result.suggestions[0]?.url).toContain(
      "EP3495-PPSA02867_00-6971417207037129"
    );
  });

  it("finds a game listed under its Japanese title with an English term", async () => {
    const { fetch } = psStore();
    const result = await discover(
      { source: null, term: "Monster Hunter Wilds", target: PS_JP, tracked: [] },
      { fetch }
    );
    expect(result.status === "found" && result.suggestions.map((s) => s.url)).toEqual([
      "https://store.playstation.com/ja-jp/product/UP0102-PPSA07862_00-MHWILDSSTANDARD0",
    ]);
  });

  it("is unavailable when the store refuses the query, failed for a region it doesn't know", async () => {
    const stale = psStore({
      search: '{"message":"Query 4df6284f… not whitelisted"}',
    });
    expect(
      await discover(
        { source: null, term: "Mortal Shell", target: PS_JP, tracked: [] },
        { fetch: stale.fetch }
      )
    ).toEqual({ status: "unavailable" });

    const { fetch, requested } = psStore();
    const result = await discover(
      {
        source: null,
        term: "Mortal Shell",
        target: { store: "ps-store", region: "XX" },
        tracked: [],
      },
      { fetch }
    );
    expect(result.status).toBe("failed");
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

  it("keeps a name in another script last, as the store matched it across languages", () => {
    const hits = [
      hit("モンスターハンターワイルズ"),
      hit("Demon's Souls"),
      hit("Monster Hunter Wilds"),
    ];
    expect(rankByName(hits, "Monster Hunter Wilds").map((h) => h.name)).toEqual([
      "Monster Hunter Wilds",
      "モンスターハンターワイルズ",
    ]);
  });
});
