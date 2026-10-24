// Ticket 04's reachability check: can a server fetch PS Store pages and find the price data
// embedded in them? Removed with the debug page once the live check script (ticket 15) exists.

export const PROBE_TARGETS = [
  {
    region: "SE",
    url: "https://store.playstation.com/sv-se/product/EP9000-PPSA01521_00-FORBIDDENWESTPS5",
  },
  {
    region: "NZ",
    url: "https://store.playstation.com/en-nz/product/EP9000-PPSA01521_00-FORBIDDENWESTPS5",
  },
  {
    region: "JP",
    url: "https://store.playstation.com/ja-jp/product/JP9000-PPSA04073_00-FORBIDDENWESTPS5",
  },
] as const;

// A desktop browser's user agent: the store serves its full page to browsers.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export type ProbeResult = {
  region: string;
  url: string;
  status: number | null;
  finalUrl: string | null;
  bytes: number;
  prices: { basePriceValue: number; discountedValue: number; currencyCode: string }[];
  error: string | null;
  ms: number;
};

/** The distinct price records embedded in a PS Store page. */
export function findPrices(html: string): ProbeResult["prices"] {
  const seen = new Set<string>();
  const prices: ProbeResult["prices"] = [];
  const pattern = /"basePriceValue":(\d+),"discountedValue":(\d+),"currencyCode":"([A-Z]{3})"/g;
  for (const [match, base, discounted, currencyCode] of html.matchAll(pattern)) {
    if (seen.has(match) || !base || !discounted || !currencyCode) continue;
    seen.add(match);
    prices.push({
      basePriceValue: Number(base),
      discountedValue: Number(discounted),
      currencyCode,
    });
  }
  return prices;
}

export async function probe(
  target: { region: string; url: string },
  fetchFn: typeof fetch = fetch
): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const res = await fetchFn(target.url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const html = await res.text();
    return {
      ...target,
      status: res.status,
      finalUrl: res.url,
      bytes: html.length,
      prices: findPrices(html),
      error: null,
      ms: Date.now() - started,
    };
  } catch (err) {
    return {
      ...target,
      status: null,
      finalUrl: null,
      bytes: 0,
      prices: [],
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - started,
    };
  }
}
