// The Log spending quick-entry line: "45 gr" → a 45 row in Groceries. Pure, so the rules can
// be tested on their own; the modal only feeds it text and shows what it returns.

/** A row the line adds: the amount as the modal's inputs hold it, and the matched category. */
export type QuickEntryRow = { value: string; category: string };

export type QuickEntryResult = { ok: true; row: QuickEntryRow } | { ok: false; error: string };

// An amount: digits, with "." or "," as the decimal mark. No thousands separator.
const AMOUNT = /^\d+(?:[.,]\d+)?$/;

/**
 * Reads one quick-entry line: the first part is the amount, the rest is the start of a
 * category. Returns null for a blank line (nothing to preview), else the row or why not.
 */
export function parseQuickEntry(text: string, categories: string[]): QuickEntryResult | null {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  const [amount, ...rest] = parts;
  if (amount === undefined) return null;

  if (!AMOUNT.test(amount)) return { ok: false, error: `'${amount}' isn't an amount` };
  const value = amount.replace(",", ".");
  if (Number(value) <= 0) return { ok: false, error: "Enter a positive amount" };

  const prefix = rest.join(" ");
  if (!prefix) return { ok: false, error: "Type the start of a category" };
  const category = matchCategory(prefix, categories);
  if (!category) return { ok: false, error: `No category matches '${prefix}'` };

  return { ok: true, row: { value, category } };
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
