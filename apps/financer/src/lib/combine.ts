// Combine: merge a month's entries that belong together into one entry each (Combine
// Entries, ticket 03). Pure: entries in, groups out. Amounts are summed in whole cents
// from the database's decimal strings, never with floating-point numbers.

const AMOUNT = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

/** "123.4" → 12340. Throws on anything that isn't an amount with at most two decimals. */
export function toCents(value: string): number {
  const match = AMOUNT.exec(value.trim());
  if (!match) throw new Error(`Not an amount: ${value}`);
  const cents = Number(match[2]) * 100 + Number((match[3] ?? "").padEnd(2, "0"));
  return match[1] && cents !== 0 ? -cents : cents;
}

/** 12340 → "123.40", the shape a numeric(12, 2) column takes. */
export function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export type SpendingCombineEntry = {
  id: string;
  category: string;
  currency: string;
  value: string;
};

export type SpendingCombineGroup = {
  category: string;
  currency: string;
  /** The entries this group replaces, in input order. */
  ids: string[];
  total: string;
};

export type SourceCombineEntry = {
  id: string;
  sourceId: string;
  value: string;
};

export type SourceCombineGroup = {
  sourceId: string;
  ids: string[];
  total: string;
};

type Group<E> = { first: E; ids: string[]; cents: number };

function group<E extends { id: string; value: string }>(
  entries: E[],
  keyOf: (entry: E) => string
): Map<string, Group<E>> {
  const groups = new Map<string, Group<E>>();
  for (const entry of entries) {
    const key = keyOf(entry);
    const existing = groups.get(key);
    if (existing) {
      existing.ids.push(entry.id);
      existing.cents += toCents(entry.value);
    } else {
      groups.set(key, { first: entry, ids: [entry.id], cents: toCents(entry.value) });
    }
  }
  return groups;
}

const spendingKey = (e: { category: string; currency: string }) =>
  JSON.stringify([e.category, e.currency]);
const sourceKey = (e: { sourceId: string }) => e.sourceId;

/**
 * Spending merges per category + currency, never across currencies. A group with a
 * single entry is left alone, so running it on its own result plans nothing.
 */
export function planSpendingCombine(entries: SpendingCombineEntry[]): SpendingCombineGroup[] {
  return [...group(entries, spendingKey).values()]
    .filter((g) => g.ids.length > 1)
    .map((g) => ({
      category: g.first.category,
      currency: g.first.currency,
      ids: g.ids,
      total: fromCents(g.cents),
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.currency.localeCompare(b.currency));
}

/** Income and assets merge per source (its currency is the source's). */
export function planSourceCombine(entries: SourceCombineEntry[]): SourceCombineGroup[] {
  return [...group(entries, sourceKey).values()]
    .filter((g) => g.ids.length > 1)
    .map((g) => ({ sourceId: g.first.sourceId, ids: g.ids, total: fromCents(g.cents) }))
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

/** Total in cents per group key: what a combine must leave unchanged. */
export function spendingTotals(entries: SpendingCombineEntry[]): Map<string, number> {
  return new Map([...group(entries, spendingKey)].map(([key, g]) => [key, g.cents]));
}

export function sourceTotals(entries: SourceCombineEntry[]): Map<string, number> {
  return new Map([...group(entries, sourceKey)].map(([key, g]) => [key, g.cents]));
}

export function sameTotals(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, cents] of a) if (b.get(key) !== cents) return false;
  return true;
}
