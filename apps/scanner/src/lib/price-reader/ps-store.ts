import { discountPercent } from "./money";
import type { PageEdition, PageReading, SearchHit } from "./types";

// Reads the PS Store's server-rendered pages. The store embeds its Apollo cache in JSON
// scripts (`env:*` ones, and `__NEXT_DATA__`'s apolloState): Product, Concept, Sku and
// GameCTA records keyed "Product:<id>" and so on. Prices sit on the GameCTA records (the
// buy buttons), as minor-unit integers with a currency code.
//
// A page carries more than its own product: a product page also embeds the concept's other
// editions and PS Plus offers. So the price is always looked up through the product's own
// SKU, and only plain purchase buttons count: a PS Plus offer ("Included", or a member
// discount) is never the price, because Scanner assumes no subscription.

type Json = Record<string, unknown>;
type Cache = Map<string, Json>;

/** The PS Store regions Scanner offers, one per supported currency, with their locale. */
export const PS_REGIONS = [
  { region: "SE", locale: "sv-se", label: "Sweden (SEK)" },
  { region: "NZ", locale: "en-nz", label: "New Zealand (NZD)" },
  { region: "JP", locale: "ja-jp", label: "Japan (JPY)" },
  { region: "US", locale: "en-us", label: "United States (USD)" },
  { region: "GB", locale: "en-gb", label: "United Kingdom (GBP)" },
  { region: "DE", locale: "de-de", label: "Germany (EUR)" },
] as const;

export function psLocale(region: string): string | null {
  return PS_REGIONS.find((r) => r.region === region)?.locale ?? null;
}

export function psConceptUrl(locale: string, conceptId: string): string {
  return `https://store.playstation.com/${locale}/concept/${encodeURIComponent(conceptId)}`;
}

export function psProductUrl(locale: string, productId: string): string {
  return `https://store.playstation.com/${locale}/product/${encodeURIComponent(productId)}`;
}

// The store's own search query, which its API only accepts by hash (an allowlisted
// persisted query). The hash changes when Sony redeploys the store's front end; search then
// answers "not whitelisted" and shows as unavailable. To update it: open a search on
// store.playstation.com with the browser's network tab, find the `getSearchResults` request
// to web.np.playstation.com, and copy `sha256Hash` from its `extensions` parameter.
const PS_SEARCH_HASH = "4df6284f982e57bec70f23c77e2c219dc792eb19af7fb3d3a81767aa3f1958aa";

/** The search request for a locale ("sv-se"): its URL and the headers the API insists on. */
export function psSearchRequest(
  term: string,
  locale: string
): { url: string; headers: Record<string, string> } {
  const [language = "", country = ""] = locale.split("-");
  const params = new URLSearchParams({
    operationName: "getSearchResults",
    variables: JSON.stringify({
      countryCode: country.toUpperCase(),
      languageCode: language,
      nextCursor: "",
      pageOffset: 0,
      pageSize: 24,
      searchTerm: term,
    }),
    extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: PS_SEARCH_HASH } }),
  });
  return {
    url: `https://web.np.playstation.com/api/graphql/v1/op?${params}`,
    headers: {
      // Without it the API refuses the request as a possible CSRF.
      "content-type": "application/json",
      "x-psn-store-locale-override": `${language}-${country.toUpperCase()}`,
    },
  };
}

export type PsSearchResult =
  | { ok: true; hits: SearchHit[] }
  | { ok: false; unavailable: boolean; detail: string };

/**
 * The products a search found, in the store's order, as product links for the locale. Its
 * concept results are left out: they carry no kind or price and are mostly noise. A refused
 * query (stale hash, or a request the API treats as CSRF) is `unavailable`.
 */
export function readPsSearch(body: string, locale: string): PsSearchResult {
  if (/not whitelisted|PersistedQueryNotFound|Cross-Site Request Forgery/i.test(body)) {
    return { ok: false, unavailable: true, detail: body.slice(0, 200) };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, unavailable: false, detail: "Not JSON" };
  }
  const data = isObject(parsed) && isObject(parsed.data) ? parsed.data : null;
  const search = data && isObject(data.universalSearch) ? data.universalSearch : null;
  if (!search || !Array.isArray(search.results)) {
    return { ok: false, unavailable: false, detail: body.slice(0, 200) };
  }
  const hits = search.results.filter(isObject).flatMap((r) => {
    const id = stringOf(r.id);
    const name = stringOf(r.name);
    if (r.__typename !== "Product" || !id || !name) return [];
    const kind = stringOf(r.storeDisplayClassification);
    return [{ url: psProductUrl(locale, id), name, ...(kind && { kind }) }];
  });
  return { ok: true, hits };
}

export type PsLink = { kind: "product" | "concept"; id: string; locale: string; region: string };

/**
 * Where a PS Store link points, from its path: /<locale>/product/<id> or
 * /<locale>/concept/<id>. Returns an error for `en-jp`, which shows US-dollar prices rather
 * than the Japanese store's, and null for any other path.
 */
export function parsePsLink(url: URL): PsLink | { error: "en-jp" } | null {
  const match = /^\/([a-z]{2})-([a-z]{2})\/(product|concept)\/([^/?#]+)/i.exec(url.pathname);
  if (!match) return null;
  const [, language = "", country = "", kind, id = ""] = match;
  const locale = `${language}-${country}`.toLowerCase();
  if (locale === "en-jp") return { error: "en-jp" };
  return {
    kind: kind === "concept" ? "concept" : "product",
    id: decodeURIComponent(id),
    locale,
    region: country.toUpperCase(),
  };
}

/**
 * The cross-region match key: the concept, which every region shares even when the product
 * IDs don't ("EP3495-CUSA20133_00-MORTALSHELLGGAME" in Sweden and "JP1201-PPSA02904_00-
 * MORTALSHELLJPPS5" in Japan are both concept 234489).
 */
export function psMatchKey(conceptId: string): string {
  return `ps-concept:${conceptId}`;
}

export function readPsStorePage(html: string, link: PsLink): PageReading {
  const cache = readCache(html);
  const prices = purchasePrices(cache);

  if (link.kind === "product") {
    const product = cache.get(`Product:${link.id}`);
    if (!product) return { name: null, imageUrl: null, editions: [] };
    const edition = editionOf(product, prices, { withEditionName: false });
    const conceptRef = isObject(product.concept) ? stringOf(product.concept.__ref) : null;
    return {
      name: stringOf(product.name),
      ...(conceptRef && { conceptId: conceptRef.replace(/^Concept:/, "") }),
      imageUrl: imageOf(product.media),
      editions: edition ? [edition] : [],
    };
  }

  const concept = cache.get(`Concept:${link.id}`);
  if (!concept) return { name: null, imageUrl: null, editions: [] };
  const products = refs(concept.products)
    .map((ref) => cache.get(ref))
    .filter((p): p is Json => p !== undefined);
  const editions = products.flatMap((p) => {
    const edition = editionOf(p, prices, { withEditionName: true });
    return edition ? [edition] : [];
  });
  return {
    name: stringOf(concept.name),
    conceptId: link.id,
    imageUrl: imageOf(concept.media),
    editions,
  };
}

// ─── The embedded cache ───────────────────────────────────────────────────────

function readCache(html: string): Cache {
  const cache: Cache = new Map();
  const merge = (records: unknown) => {
    if (!isObject(records)) return;
    for (const [key, value] of Object.entries(records)) {
      if (isObject(value)) cache.set(key, { ...cache.get(key), ...value });
    }
  };
  const pattern = /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const [, body] of html.matchAll(pattern)) {
    let data: unknown;
    try {
      data = JSON.parse(body ?? "");
    } catch {
      continue;
    }
    if (!isObject(data)) continue;
    merge(data.cache);
    const props = isObject(data.props) ? data.props : null;
    const pageProps = props && isObject(props.pageProps) ? props.pageProps : null;
    merge(props?.apolloState ?? pageProps?.apolloState);
  }
  return cache;
}

type Price = { base: number; discounted: number; currency: string; endTime: string | null };

/** SKU id → the plain purchase price for it, from the page's buy buttons. */
function purchasePrices(cache: Cache): Map<string, Price> {
  const prices = new Map<string, Price>();
  for (const [key, cta] of cache) {
    if (!key.startsWith("GameCTA:")) continue;
    if (cta.type !== "ADD_TO_CART" && cta.type !== "PREORDER") continue;
    const price = isObject(cta.price) ? cta.price : null;
    if (!price) continue;
    const branding = Array.isArray(price.serviceBranding) ? price.serviceBranding : [];
    if (branding.some((b) => b !== "NONE") || price.applicability === "UPSELL") continue;

    const base = numberOf(price.basePriceValue);
    const discounted = numberOf(price.discountedValue);
    const currency = stringOf(price.currencyCode);
    const sku = skuOf(cta);
    if (!sku || !currency || base === null || base <= 0 || discounted === null) continue;

    // Of several plain offers for one SKU, the cheapest one is what anyone can pay.
    const existing = prices.get(sku);
    if (existing && existing.discounted <= discounted) continue;
    prices.set(sku, { base, discounted, currency, endTime: stringOf(price.endTime) });
  }
  return prices;
}

function skuOf(cta: Json): string | null {
  const action = isObject(cta.action) ? cta.action : null;
  const params = action && Array.isArray(action.param) ? action.param.filter(isObject) : [];
  return stringOf(params.find((p) => p.name === "skuId")?.value);
}

function editionOf(
  product: Json,
  prices: Map<string, Price>,
  { withEditionName }: { withEditionName: boolean }
): PageEdition | null {
  const id = stringOf(product.id);
  if (!id) return null;
  const price = refs(product.skus)
    .map((ref) => prices.get(ref.replace(/^Sku:/, "")))
    .find((p) => p !== undefined);
  if (!price) return null;

  const onSale = price.discounted < price.base;
  const salePrice = onSale ? price.discounted : null;
  const endTime = onSale && price.endTime ? new Date(Number(price.endTime)) : null;
  const platforms = platformsOf(product);
  const kind = stringOf(product.storeDisplayClassification);
  return {
    id,
    name: withEditionName ? editionName(product) : (stringOf(product.name) ?? id),
    normalPrice: price.base,
    salePrice,
    currency: price.currency,
    // Digital: anything with a purchase button can be bought.
    inStock: true,
    discountPercent: discountPercent(price.base, salePrice),
    saleEndsAt: endTime && !Number.isNaN(endTime.getTime()) ? endTime : null,
    ...(platforms.length > 0 && { platforms }),
    ...(kind && { kind }),
  };
}

/** "Standard Edition · PS4/PS5": the edition and its platforms, which tell editions apart. */
function editionName(product: Json): string {
  const edition = isObject(product.edition) ? stringOf(product.edition.name) : null;
  const platforms = platformsOf(product);
  const label = edition ?? stringOf(product.name) ?? stringOf(product.id) ?? "";
  return platforms.length ? `${label} · ${platforms.join("/")}` : label;
}

function platformsOf(product: Json): string[] {
  return Array.isArray(product.platforms)
    ? product.platforms.filter((p): p is string => typeof p === "string")
    : [];
}

const IMAGE_ROLES = ["MASTER", "GAMEHUB_COVER_ART", "PORTRAIT_BANNER", "EDITION_KEY_ART"];

function imageOf(media: unknown): string | null {
  const images = Array.isArray(media)
    ? media.filter(isObject).filter((m) => m.type === "IMAGE" && typeof m.url === "string")
    : [];
  for (const role of IMAGE_ROLES) {
    const found = images.find((m) => m.role === role);
    if (found) return found.url as string;
  }
  return (images[0]?.url as string | undefined) ?? null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function refs(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(isObject).flatMap((r) => (typeof r.__ref === "string" ? [r.__ref] : []))
    : [];
}

function stringOf(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function numberOf(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
