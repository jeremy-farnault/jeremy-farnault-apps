import { discountPercent, minorDigits, toMinorUnits } from "./money";
import type { PageEdition, PageReading, SearchHit } from "./types";

// Reads Steam's public appdetails endpoint, which prices an app for a country code. A
// Steam link carries no region, so the region is chosen when the link is added.
//
// Two Steam quirks: prices always come with two decimals, even yen (473000 is ¥4,730), and
// several countries share a currency (the Swedish store sells in euros).

type Json = Record<string, unknown>;

/** The Steam storefronts Scanner offers, one per supported currency. */
export const STEAM_REGIONS = [
  { region: "SE", label: "Sweden (EUR)" },
  { region: "NZ", label: "New Zealand (NZD)" },
  { region: "JP", label: "Japan (JPY)" },
  { region: "US", label: "United States (USD)" },
  { region: "GB", label: "United Kingdom (GBP)" },
  { region: "DE", label: "Germany (EUR)" },
  { region: "CA", label: "Canada (CAD)" },
] as const;

const REGION_FOR_CURRENCY: Record<string, string> = {
  SEK: "SE",
  NZD: "NZ",
  JPY: "JP",
  USD: "US",
  GBP: "GB",
  EUR: "DE",
  CAD: "CA",
};

/** The Steam storefront a user most likely buys from, from their home currency. */
export function defaultSteamRegion(homeCurrency: string): string {
  return REGION_FOR_CURRENCY[homeCurrency] ?? "SE";
}

export function isSteamRegion(region: string): boolean {
  return STEAM_REGIONS.some((r) => r.region === region);
}

/** The app id in a store link (store.steampowered.com/app/<id>/<slug>), or null. */
export function parseSteamAppId(url: URL): string | null {
  return /^\/app\/(\d+)/.exec(url.pathname)?.[1] ?? null;
}

export function steamApiUrl(appId: string, region: string): string {
  return `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${region.toLowerCase()}&l=english`;
}

/** Steam's store search for one storefront. It matches the name stored on Steam, in English. */
export function steamSearchUrl(term: string, region: string): string {
  const params = new URLSearchParams({ term, cc: region.toLowerCase(), l: "english" });
  return `https://store.steampowered.com/api/storesearch/?${params}`;
}

/**
 * The apps a store search found, in Steam's order. Everything is an "app" here, games and
 * DLC alike: only an app's own details say which it is.
 */
export function readSteamSearch(body: string): SearchHit[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }
  const items =
    isObject(parsed) && Array.isArray(parsed.items) ? parsed.items.filter(isObject) : [];
  return items.flatMap((item) =>
    typeof item.id === "number" && typeof item.name === "string"
      ? [{ url: `https://store.steampowered.com/app/${item.id}/`, name: item.name }]
      : []
  );
}

export type SteamPage = PageReading & { found: boolean; free: boolean };

export function readSteamApi(body: string, appId: string): SteamPage {
  const empty = { name: null, imageUrl: null, editions: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ...empty, found: true, free: false };
  }
  const entry = isObject(parsed) && isObject(parsed[appId]) ? parsed[appId] : null;
  if (!entry || entry.success !== true || !isObject(entry.data)) {
    return { ...empty, found: false, free: false };
  }
  const data = entry.data;
  const name = typeof data.name === "string" ? data.name : null;
  const imageUrl = typeof data.header_image === "string" ? data.header_image : null;
  if (data.is_free === true) return { name, imageUrl, editions: [], found: true, free: true };

  const overview = isObject(data.price_overview) ? data.price_overview : null;
  const currency = overview && typeof overview.currency === "string" ? overview.currency : null;
  if (!currency) return { name, imageUrl, editions: [], found: true, free: false };

  const editions = packageEditions(data, currency);
  if (editions.length === 0) {
    // No package list: price the app itself.
    const edition = overview && editionFromOverview(overview, currency, name ?? appId);
    if (edition) editions.push(edition);
  }
  // "game", "dlc", "demo"…: what tells a game from its add-ons when searching.
  const kind = typeof data.type === "string" ? data.type : null;
  return {
    name,
    imageUrl,
    editions: kind ? editions.map((e) => ({ ...e, kind })) : editions,
    found: true,
    free: false,
  };
}

/** One edition per paid package in the "default" group; subscriptions live elsewhere. */
function packageEditions(data: Json, currency: string): PageEdition[] {
  const groups = Array.isArray(data.package_groups) ? data.package_groups.filter(isObject) : [];
  const buy = groups.find((g) => g.name === "default");
  const subs = buy && Array.isArray(buy.subs) ? buy.subs.filter(isObject) : [];

  return subs.flatMap((sub) => {
    const final =
      typeof sub.price_in_cents_with_discount === "number" ? sub.price_in_cents_with_discount : 0;
    if (final <= 0 || sub.is_free_license === true || sub.packageid === undefined) return [];

    const optionText = typeof sub.option_text === "string" ? sub.option_text : "";
    // "Name - <span class="discount_original_price">59,99€</span> 17,99€" while on sale.
    const original = /discount_original_price">([^<]+)</.exec(optionText)?.[1];
    const salePrice = fromSteam(final, currency);
    const normal = original ? toMinorUnits(original, currency) : null;
    const onSale = normal !== null && normal > salePrice;
    const normalPrice = onSale ? normal : salePrice;

    return [
      {
        id: String(sub.packageid),
        name: packageName(optionText),
        normalPrice,
        salePrice: onSale ? salePrice : null,
        currency,
        inStock: true,
        discountPercent: discountPercent(normalPrice, onSale ? salePrice : null),
        // appdetails doesn't say when a sale ends.
        saleEndsAt: null,
      },
    ];
  });
}

function editionFromOverview(overview: Json, currency: string, name: string): PageEdition | null {
  if (typeof overview.initial !== "number" || typeof overview.final !== "number") return null;
  const normalPrice = fromSteam(overview.initial, currency);
  const final = fromSteam(overview.final, currency);
  const salePrice = final < normalPrice ? final : null;
  return {
    id: "default",
    name,
    normalPrice,
    salePrice,
    currency,
    inStock: true,
    discountPercent: discountPercent(normalPrice, salePrice),
    saleEndsAt: null,
  };
}

/** The package's name: its option text without the price and markup after the last " - ". */
function packageName(optionText: string): string {
  const text = optionText.replace(/<[^>]+>/g, "");
  const cut = text.lastIndexOf(" - ");
  return (cut > 0 ? text.slice(0, cut) : text).trim();
}

/** Steam's two-decimal integer to the currency's own minor unit. */
function fromSteam(value: number, currency: string): number {
  return Math.round(value / 10 ** (2 - minorDigits(currency)));
}

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
