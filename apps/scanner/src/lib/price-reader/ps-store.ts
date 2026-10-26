import { discountPercent } from "./money";
import type { PageEdition, PageReading } from "./types";

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
