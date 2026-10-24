import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@jf/db";

import { readGenericPage } from "./generic";
import { nameMatchKey } from "./match-key";
import type { Edition, PageReading, ReadResult, Store } from "./types";
import { parseLink, storeFor } from "./url";

export type { Edition, ReadResult, Reading, RejectionReason, Store } from "./types";
export { normalizeUrl, parseLink, storeFor } from "./url";

// A desktop browser's user agent: shops serve their full page, structured data included,
// to browsers.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const TIMEOUT_MS = 15_000;

export type ReadOptions = {
  /** Country code, for stores whose price depends on it. Unused by web shops. */
  region?: string | null;
  /** The edition to price, when the page sells several. */
  editionId?: string | null;
  /** Injected so tests read saved pages instead of the network. */
  fetch?: typeof fetch;
};

/**
 * Reads a product link: fetches the page, runs the adapter for its store, and applies the
 * rules every store shares (supported currency, edition choice). Never throws: anything
 * that goes wrong is a rejection the add preview can explain.
 */
export async function readPrice(input: string, options: ReadOptions = {}): Promise<ReadResult> {
  const url = parseLink(input);
  if (!url) return { ok: false, reason: "unreadable", detail: "Not a web link" };

  const store = storeFor(url);
  // The PS Store and Steam adapters land in tickets 06 and 07. Until then their pages go
  // through the generic adapter like any other shop.

  const page = await fetchPage(url, options.fetch ?? fetch);
  if (!page.ok) return page;

  const reading = readGenericPage(page.html, page.url);
  return finish(reading, {
    store,
    region: null,
    editionId: options.editionId ?? null,
  });
}

type Fetched =
  | { ok: true; html: string; url: URL }
  | { ok: false; reason: "blocked" | "not-found" | "unreadable"; detail?: string };

async function fetchPage(url: URL, fetchFn: typeof fetch): Promise<Fetched> {
  let res: Response;
  try {
    res = await fetchFn(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en,sv;q=0.8",
      },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    return {
      ok: false,
      reason: "unreadable",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
  if (res.status === 404 || res.status === 410) return { ok: false, reason: "not-found" };
  if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 503) {
    return { ok: false, reason: "blocked", detail: `HTTP ${res.status}` };
  }
  if (!res.ok) return { ok: false, reason: "unreadable", detail: `HTTP ${res.status}` };

  let finalUrl = url;
  try {
    if (res.url) finalUrl = new URL(res.url);
  } catch {
    // Keep the requested URL.
  }
  return { ok: true, html: await res.text(), url: finalUrl };
}

function isSupported(currency: string): currency is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(currency);
}

/** Applies the shared rules to what an adapter read. Exported for the adapters' tests. */
export function finish(
  page: PageReading,
  context: { store: Store; region: string | null; editionId: string | null; matchKey?: string }
): ReadResult {
  if (page.editions.length === 0) return { ok: false, reason: "unreadable" };

  const unsupported = page.editions.find((e) => !isSupported(e.currency));
  if (unsupported) {
    return { ok: false, reason: "unsupported-currency", detail: unsupported.currency };
  }
  const editions = page.editions as Edition[];

  let edition: Edition | null;
  if (context.editionId !== null) {
    edition = editions.find((e) => e.id === context.editionId) ?? null;
    if (!edition) return { ok: false, reason: "not-found", detail: "Edition no longer listed" };
  } else {
    edition = editions.length === 1 ? (editions[0] ?? null) : null;
  }

  const name = page.name ?? edition?.name ?? "";
  if (!name) return { ok: false, reason: "unreadable", detail: "No product name" };

  return {
    ok: true,
    reading: {
      store: context.store,
      region: context.region,
      name,
      imageUrl: page.imageUrl,
      matchKey: context.matchKey ?? nameMatchKey(name),
      editions,
      edition,
    },
  };
}
