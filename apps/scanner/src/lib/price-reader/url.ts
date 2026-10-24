import type { Store } from "./types";

// Query parameters that only say where a click came from. Anything else might pick the
// product, variant or region, so it stays.
const TRACKING_PARAM = /^(utm_.*|gclid|gbraid|wbraid|fbclid|msclkid|mc_[a-z]+|_ga|ref|ref_)$/i;

/**
 * Parses a pasted link, or returns null when it isn't an http(s) URL. Pasted text often
 * comes with surrounding spaces or without a scheme, so both are forgiven.
 */
export function parseLink(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * The form duplicates are compared on: lowercased host without "www.", no tracking
 * parameters, no fragment, no trailing slash, remaining parameters sorted. Steam links
 * reduce to their app id.
 */
export function normalizeUrl(url: URL): string {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  // A Steam game is its app id; the slug after it and any parameters are decoration.
  const steamApp = host === "store.steampowered.com" && /^\/app\/(\d+)/.exec(url.pathname)?.[1];
  if (steamApp) return `${host}/app/${steamApp}`;
  const params = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAM.test(key))
    .sort(([a], [b]) => a.localeCompare(b));
  const query = params.length ? `?${new URLSearchParams(params).toString()}` : "";
  const path = url.pathname.replace(/\/+$/, "");
  return `${host}${path}${query}`;
}

/** Which adapter reads this link. */
export function storeFor(url: URL): Store {
  const host = url.hostname.toLowerCase();
  if (host === "store.playstation.com") return "ps-store";
  if (host === "store.steampowered.com") return "steam";
  return "web";
}
