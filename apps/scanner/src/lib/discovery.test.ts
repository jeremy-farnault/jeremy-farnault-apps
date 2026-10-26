// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type DiscoverySource, discover } from "./discovery";

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

const HFW_STANDARD: DiscoverySource = {
  conceptId: "10000886",
  platforms: ["PS4", "PS5"],
  kind: "FULL_GAME",
};

describe("discover on the PS Store", () => {
  it("adds the edition with the same platforms and kind in another region", async () => {
    const { fetch, requested } = serve("ps-concept-ja-jp.html");
    const result = await discover(HFW_STANDARD, { store: "ps-store", region: "JP" }, { fetch });
    expect(requested).toEqual(["https://store.playstation.com/ja-jp/concept/10000886"]);
    expect(result).toEqual({
      status: "found",
      autoAdd: "https://store.playstation.com/ja-jp/product/JP9000-PPSA04073_00-FORBIDDENWESTPS5",
      suggestions: [],
    });
  });

  it("tells a premium edition apart from the standard one", async () => {
    const { fetch } = serve("ps-concept-en-nz.html");
    const result = await discover(
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
    const result = await discover(
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
    const result = await discover(
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
    const result = await discover(
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
    const result = await discover(HFW_STANDARD, { store: "ps-store", region: "JP" }, { fetch });
    expect(result).toEqual({ status: "nothing-found" });
  });

  it("fails when the store can't be read", async () => {
    const { fetch } = serve("ps-concept-ja-jp.html", { status: 500 });
    const result = await discover(HFW_STANDARD, { store: "ps-store", region: "JP" }, { fetch });
    expect(result.status).toBe("failed");
  });

  it("fails without a concept to follow or for a region it doesn't know", async () => {
    const { fetch, requested } = serve("ps-concept-ja-jp.html");
    expect((await discover(null, { store: "ps-store", region: "JP" }, { fetch })).status).toBe(
      "failed"
    );
    expect(
      (await discover(HFW_STANDARD, { store: "ps-store", region: "XX" }, { fetch })).status
    ).toBe("failed");
    expect(requested).toEqual([]);
  });
});
