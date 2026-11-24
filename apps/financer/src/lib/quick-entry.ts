// The Log spending quick-entry line: "45 gr" → a 45 row in Groceries. Pure, so the rules can
// be tested on their own; the modal only feeds it text and shows what it returns.

/** A row the line adds: the amount as the modal's inputs hold it, its category and currency. */
export type QuickEntryRow = { value: string; category: string; currency: string };

export type QuickEntryResult = { ok: true; row: QuickEntryRow } | { ok: false; error: string };

export type QuickEntryContext = {
  /** Every category the line can pick: built-in and custom. */
  categories: string[];
  /** The currency codes a line can end with. */
  currencies: readonly string[];
  /** The currency of a row whose line names none. */
  sessionCurrency: string;
};

// An amount: digits, with "." or "," as the decimal mark. No thousands separator.
const AMOUNT = /^\d+(?:[.,]\d+)?$/;
// What a currency code looks like, so a mistyped one is reported as a currency.
const CODE_LIKE = /^[a-z]{3}$/i;

/**
 * Reads one quick-entry line: the first part is the amount, then the start of a category,
 * then optionally a currency code (`45 gr eur`), only when there are at least three parts.
 * Returns null for a blank line (nothing to preview), else the row or why not.
 */
export function parseQuickEntry(text: string, context: QuickEntryContext): QuickEntryResult | null {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  const [amount, ...rest] = parts;
  if (amount === undefined) return null;

  if (!AMOUNT.test(amount)) return { ok: false, error: `'${amount}' isn't an amount` };
  const value = amount.replace(",", ".");
  if (Number(value) <= 0) return { ok: false, error: "Enter a positive amount" };
  if (rest.length === 0) return { ok: false, error: "Type the start of a category" };

  const last = rest[rest.length - 1] ?? "";
  const code = rest.length >= 2 ? supportedCode(last, context.currencies) : undefined;
  if (code) {
    const prefix = rest.slice(0, -1).join(" ");
    const category = matchCategory(prefix, context.categories);
    if (!category) return { ok: false, error: `No category matches '${prefix}'` };
    return { ok: true, row: { value, category, currency: code } };
  }

  // Whole rest as the category first, so `45 public tra` isn't read as currency "TRA".
  const prefix = rest.join(" ");
  const category = matchCategory(prefix, context.categories);
  if (category) return { ok: true, row: { value, category, currency: context.sessionCurrency } };
  if (rest.length >= 2 && CODE_LIKE.test(last)) {
    return { ok: false, error: `Unknown currency '${last.toUpperCase()}'` };
  }
  return { ok: false, error: `No category matches '${prefix}'` };
}

function supportedCode(part: string, currencies: readonly string[]): string | undefined {
  const upper = part.toUpperCase();
  return currencies.find((c) => c.toUpperCase() === upper);
}

/**
 * The category a prefix picks: one whose name, or any word in it, starts with the prefix,
 * ignoring case. Several matches give the first alphabetically.
 */
export function matchCategory(prefix: string, categories: string[]): string | undefined {
  const p = prefix.toLowerCase();
  return categories
    .filter((name) => {
      const lower = name.toLowerCase();
      return lower.startsWith(p) || lower.split(/\s+/).some((word) => word.startsWith(p));
    })
    .sort((a, b) => a.localeCompare(b))[0];
}
