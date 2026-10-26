import {
  type Edition,
  type SearchHit,
  type Store,
  normalizeUrl,
  readPrice,
  searchStore,
} from "./price-reader";
import { nameMatchKey } from "./price-reader/match-key";
import { psConceptUrl, psLocale, psProductUrl } from "./price-reader/ps-store";
import { needsEnglishName } from "./summary";

// Finds an item in another store or region. One call per target, so the panel can show
// each one as it comes back. Fetching is injected, as in the price reader: the module never
// reaches the network in tests.
//
// A PS target follows the item's concept, which every region shares: the edition with the
// same platforms and kind as the tracked one is certain enough to add without asking.
// Anything less certain comes back as a suggestion for the user to tick.
//
// Other stores are searched by name, and so is the PS Store when there's no concept to
// follow. A search only gives links and names, so the best few are read like pasted links:
// that gives their real prices and editions, and their kind, which is how DLC, demos and
// add-ons are left out.

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
  /** The store refuses searches for now (the PS Store's query hash went stale). */
  | { status: "unavailable" }
  | { status: "failed"; detail?: string };

/** How many suggestions one store and region gives at most. */
export const MAX_SUGGESTIONS = 3;
/** How many search hits are read to find them, as some turn out to be DLC or unpriced. */
const MAX_READS = 6;

/** The kinds that are the thing itself, as opposed to DLC, demos, add-ons or soundtracks. */
const GAME_KINDS = new Set(["game", "FULL_GAME", "PREMIUM_EDITION", "GAME_BUNDLE"]);
const isGame = (kind: string) => GAME_KINDS.has(kind);

export type DiscoveryInput = {
  source: DiscoverySource | null;
  /** What to search for, in stores that search by name. */
  term: string;
  target: DiscoveryTarget;
  /** Links the user already tracks (any item), left out of the suggestions. */
  tracked: string[];
};

export async function discover(
  { source, term, target, tracked }: DiscoveryInput,
  options: { fetch?: typeof fetch } = {}
): Promise<Discovery> {
  // A PS target follows the item's concept when it has one. Without one (a game added from
  // Steam), or when the concept can't be read, it searches like any other store.
  if (target.store === "ps-store" && source) {
    const followed = await followConcept(source, target, options);
    if (followed.status !== "failed") return followed;
  }
  return searchByName(term, target, tracked, options);
}

async function followConcept(
  source: DiscoverySource,
  target: DiscoveryTarget,
  options: { fetch?: typeof fetch }
): Promise<Discovery> {
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

async function searchByName(
  term: string,
  target: DiscoveryTarget,
  tracked: string[],
  options: { fetch?: typeof fetch }
): Promise<Discovery> {
  if (!term.trim()) return { status: "nothing-found" };
  const search = await searchStore(target.store, term.trim(), target.region, options);
  if (!search.ok) {
    return search.unavailable
      ? { status: "unavailable" }
      : { status: "failed", ...(search.detail && { detail: search.detail }) };
  }

  const trackedUrls = new Set(tracked.map((url) => normalizeUrl(new URL(url))));
  const hits = rankByName(search.hits, term).filter(
    (hit) =>
      // The PS Store says what a product is in its search; Steam only once it's read.
      (hit.kind === undefined || isGame(hit.kind)) &&
      !trackedUrls.has(normalizeUrl(new URL(hit.url)))
  );

  // Read side by side (a PS page takes most of a second), then kept in ranking order.
  const read = await Promise.all(
    hits.slice(0, MAX_READS).map(async (hit): Promise<Candidate | null> => {
      const result = await readPrice(hit.url, { region: target.region, ...options });
      if (!result.ok) return null;
      const { reading } = result;
      const editions = reading.editions.filter((e) => e.kind === undefined || isGame(e.kind));
      return editions.length > 0
        ? { url: hit.url, name: reading.name, imageUrl: reading.imageUrl, editions }
        : null;
    })
  );
  const suggestions = read.filter((c): c is Candidate => c !== null).slice(0, MAX_SUGGESTIONS);
  return suggestions.length > 0
    ? { status: "found", autoAdd: null, suggestions }
    : { status: "nothing-found" };
}

/**
 * Search hits closest to the term first: the same name, then names that start with it
 * ("Mortal Shell II" for "Mortal Shell"), then names holding all its words. Hits with none
 * of that are dropped, except names written only in another script: the store matched
 * those across languages ("Monster Hunter Wilds" finds モンスターハンターワイルズ), which a
 * comparison of words can't check, so they're kept last. Stores order by their own idea of
 * relevance, which puts a sequel above the game asked for, so their order only breaks ties.
 */
export function rankByName(hits: SearchHit[], term: string): SearchHit[] {
  const wanted = nameMatchKey(term);
  const words = wanted.split(" ").filter(Boolean);
  const score = (name: string) => {
    const key = nameMatchKey(name);
    if (key === wanted) return 0;
    if (key.startsWith(`${wanted} `)) return 1;
    const keyWords = key.split(" ");
    if (words.length > 0 && words.every((w) => keyWords.includes(w))) return 2;
    return needsEnglishName(name) && !needsEnglishName(term) ? 3 : null;
  };
  return hits
    .map((hit, index) => ({ hit, index, score: score(hit.name) }))
    .filter((h): h is typeof h & { score: number } => h.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((h) => h.hit);
}

/** Same platforms (in any order) and the same kind: the same thing to buy, another region. */
function sameEdition(edition: Edition, source: DiscoverySource): boolean {
  const platforms = [...(edition.platforms ?? [])].sort().join("/");
  return platforms === [...source.platforms].sort().join("/") && edition.kind === source.kind;
}
