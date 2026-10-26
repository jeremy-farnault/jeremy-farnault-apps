import { type Edition, type Store, readPrice } from "./price-reader";
import { psConceptUrl, psLocale, psProductUrl } from "./price-reader/ps-store";

// Finds an item in another store or region. One call per target, so the panel can show
// each one as it comes back. Fetching is injected, as in the price reader: the module never
// reaches the network in tests.
//
// A PS target follows the item's concept, which every region shares: the edition with the
// same platforms and kind as the tracked one is certain enough to add without asking.
// Anything less certain comes back as a suggestion for the user to tick.

/** What the item is tracked as on the PS Store: its concept and the tracked edition. */
export type DiscoverySource = {
  conceptId: string;
  platforms: string[];
  kind: string | null;
};

export type DiscoveryTarget = { store: Store; region: string };

/** A product found in the target, for the user to pick. Several editions mean a picker. */
export type Candidate = {
  url: string;
  name: string;
  imageUrl: string | null;
  editions: Edition[];
};

export type Discovery =
  | {
      status: "found";
      /** The link to add without asking, when the match is certain. */
      autoAdd: string | null;
      suggestions: Candidate[];
    }
  | { status: "nothing-found" }
  | { status: "failed"; detail?: string };

export async function discover(
  source: DiscoverySource | null,
  target: DiscoveryTarget,
  options: { fetch?: typeof fetch } = {}
): Promise<Discovery> {
  if (target.store !== "ps-store") return { status: "failed", detail: "Store can't search" };
  if (!source) return { status: "failed", detail: "No PS Store link to follow" };
  const locale = psLocale(target.region);
  if (!locale) return { status: "failed", detail: `No PS Store for ${target.region}` };

  const result = await readPrice(psConceptUrl(locale, source.conceptId), options);
  if (!result.ok) {
    // The store answers a concept it doesn't sell in a region with its error page.
    return result.reason === "not-found"
      ? { status: "nothing-found" }
      : { status: "failed", detail: result.detail ?? result.reason };
  }
  const { reading } = result;

  const matches = reading.editions.filter((e) => sameEdition(e, source));
  const match = matches.length === 1 ? matches[0] : undefined;
  if (match) return { status: "found", autoAdd: psProductUrl(locale, match.id), suggestions: [] };

  // No single edition to take for granted: offer them all, a product link when there's one.
  const only = reading.editions.length === 1 ? reading.editions[0] : undefined;
  return {
    status: "found",
    autoAdd: null,
    suggestions: [
      {
        url: only ? psProductUrl(locale, only.id) : psConceptUrl(locale, source.conceptId),
        name: reading.name,
        imageUrl: reading.imageUrl,
        editions: reading.editions,
      },
    ],
  };
}

/** Same platforms (in any order) and the same kind: the same thing to buy, another region. */
function sameEdition(edition: Edition, source: DiscoverySource): boolean {
  const platforms = [...(edition.platforms ?? [])].sort().join("/");
  return platforms === [...source.platforms].sort().join("/") && edition.kind === source.kind;
}
