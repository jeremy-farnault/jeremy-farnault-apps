import { discountPercent, toMinorUnits } from "./money";
import type { PageEdition, PageReading } from "./types";

// Reads the structured data shops publish for search engines: schema.org Product/Offer
// JSON-LD first, then Open Graph / product price meta tags. No headless browser, no
// shop-specific rules: a page without either is unreadable.

type Json = Record<string, unknown>;

export function readGenericPage(html: string, pageUrl: URL): PageReading {
  const meta = readMeta(html);
  const product = findProduct(readJsonLd(html));
  const fromJsonLd = product ? editionsFromProduct(product) : [];
  const editions = fromJsonLd.length ? fromJsonLd : editionsFromMeta(meta);

  const name =
    (product && typeof product.name === "string" ? product.name : null) ??
    meta.get("og:title") ??
    titleTag(html);

  return {
    name: name ? decodeEntities(name).trim() : null,
    imageUrl:
      resolveUrl(product ? imageOf(product.image) : null, pageUrl) ??
      resolveUrl(meta.get("og:image") ?? null, pageUrl),
    editions,
  };
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function readJsonLd(html: string): Json[] {
  const nodes: Json[] = [];
  const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const [, body] of html.matchAll(pattern)) {
    try {
      collect(JSON.parse(body ?? ""), nodes);
    } catch {
      // A broken block is skipped; another one on the page may still be readable.
    }
  }
  return nodes;
}

/** Flattens arrays and `@graph` containers into a list of nodes. */
function collect(value: unknown, into: Json[]): void {
  if (Array.isArray(value)) {
    for (const v of value) collect(v, into);
  } else if (isObject(value)) {
    into.push(value);
    if (Array.isArray(value["@graph"])) collect(value["@graph"], into);
  }
}

function hasType(node: Json, type: string): boolean {
  const t = node["@type"];
  return Array.isArray(t) ? t.includes(type) : t === type;
}

/** The page's main product: the first Product or ProductGroup that carries an offer. */
function findProduct(nodes: Json[]): Json | null {
  const products = nodes.filter((n) => hasType(n, "Product") || hasType(n, "ProductGroup"));
  return (
    products.find((p) => p.offers !== undefined || Array.isArray(p.hasVariant)) ??
    products[0] ??
    null
  );
}

function editionsFromProduct(product: Json): PageEdition[] {
  const baseName = typeof product.name === "string" ? decodeEntities(product.name) : "";

  // A ProductGroup lists its variants as products of their own.
  if (Array.isArray(product.hasVariant)) {
    return product.hasVariant.filter(isObject).flatMap((variant, i) => {
      const name = typeof variant.name === "string" ? decodeEntities(variant.name) : baseName;
      const offer = offersOf(variant.offers)[0];
      const edition = offer && editionFromOffer(offer, idOf(variant) ?? `variant-${i}`, name);
      return edition ? [edition] : [];
    });
  }

  const offers = offersOf(product.offers);
  return offers.flatMap((offer, i) => {
    const name =
      offers.length > 1 && typeof offer.name === "string" ? decodeEntities(offer.name) : baseName;
    const fallbackId = offers.length > 1 ? `offer-${i}` : "default";
    const edition = editionFromOffer(offer, idOf(offer) ?? fallbackId, name);
    return edition ? [edition] : [];
  });
}

/** Offers as a list. An AggregateOffer (several sellers) counts as one, at its low price. */
function offersOf(value: unknown): Json[] {
  if (Array.isArray(value)) return value.filter(isObject);
  if (!isObject(value)) return [];
  if (hasType(value, "AggregateOffer") && Array.isArray(value.offers)) {
    return value.offers.filter(isObject);
  }
  return [value];
}

function editionFromOffer(offer: Json, id: string, name: string): PageEdition | null {
  const specs = Array.isArray(offer.priceSpecification)
    ? offer.priceSpecification.filter(isObject)
    : isObject(offer.priceSpecification)
      ? [offer.priceSpecification]
      : [];
  const isListPrice = (s: Json) =>
    typeof s.priceType === "string" && /StrikethroughPrice|ListPrice|SRP/i.test(s.priceType);
  const currentSpec = specs.find((s) => !isListPrice(s));
  const listSpec = specs.find(isListPrice);

  const currency = stringOf(offer.priceCurrency) ?? stringOf(currentSpec?.priceCurrency);
  if (!currency) return null;
  const current = toMinorUnits(
    offer.price ?? offer.lowPrice ?? currentSpec?.price ?? currentSpec?.minPrice,
    currency
  );
  if (current === null) return null;

  // A strikethrough or list price above the current one means the item is on sale.
  const list = listSpec ? toMinorUnits(listSpec.price, currency) : null;
  const onSale = list !== null && list > current;
  const normalPrice = onSale ? list : current;
  const salePrice = onSale ? current : null;

  return {
    id,
    name,
    normalPrice,
    salePrice,
    currency: currency.toUpperCase(),
    inStock: inStock(offer.availability),
    discountPercent: discountPercent(normalPrice, salePrice),
    saleEndsAt: null,
  };
}

function inStock(availability: unknown): boolean {
  if (typeof availability !== "string") return true;
  return !/OutOfStock|SoldOut|Discontinued/i.test(availability);
}

function idOf(node: Json): string | null {
  for (const key of ["sku", "productID", "gtin13", "gtin", "@id", "url"]) {
    const v = node[key];
    if (typeof v === "string" && v) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

function imageOf(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return imageOf(value[0]);
  if (isObject(value)) return stringOf(value.url) ?? stringOf(value.contentUrl);
  return null;
}

// ─── Meta tags ────────────────────────────────────────────────────────────────

/** `property`/`name` → `content` for every meta tag, whichever order the attributes are in. */
function readMeta(html: string): Map<string, string> {
  const meta = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\s[^>]*>/gi)) {
    const key = /(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (key && content !== undefined && !meta.has(key.toLowerCase())) {
      meta.set(key.toLowerCase(), decodeEntities(content));
    }
  }
  return meta;
}

function editionsFromMeta(meta: Map<string, string>): PageEdition[] {
  const amount = meta.get("product:price:amount") ?? meta.get("og:price:amount");
  const currency = meta.get("product:price:currency") ?? meta.get("og:price:currency");
  if (!amount || !currency) return [];
  const price = toMinorUnits(amount, currency);
  if (price === null) return [];
  const availability = meta.get("product:availability") ?? meta.get("og:availability");
  return [
    {
      id: "default",
      name: meta.get("og:title") ?? "",
      normalPrice: price,
      salePrice: null,
      currency: currency.toUpperCase(),
      inStock: availability ? !/out ?of ?stock|oos|sold ?out/i.test(availability) : true,
      discountPercent: null,
      saleEndsAt: null,
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function titleTag(html: string): string | null {
  return /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() || null;
}

function resolveUrl(value: string | null, base: URL): string | null {
  if (!value) return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function stringOf(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1]?.toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}
