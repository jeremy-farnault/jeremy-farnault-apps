import { minorDigits } from "./price-reader/money";
import type { Store } from "./price-reader/types";

/** A minor-unit price in its own currency, the way that country writes it ("¥2,990", "296,46 kr"). */
export function formatPrice(minor: number, currency: string): string {
  const digits = minorDigits(currency);
  return new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency,
    minimumFractionDigits: minor % 10 ** digits === 0 ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(minor / 10 ** digits);
}

function localeFor(currency: string): string {
  switch (currency) {
    case "SEK":
      return "sv-SE";
    case "JPY":
      return "ja-JP";
    case "NZD":
      return "en-NZ";
    case "GBP":
      return "en-GB";
    case "EUR":
      return "de-DE";
    default:
      return "en-US";
  }
}

/** The shop's name as a person would say it: "PS Store", "Steam", or the site's domain. */
export function storeLabel(store: Store | string, url: string): string {
  if (store === "ps-store") return "PS Store";
  if (store === "steam") return "Steam";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
