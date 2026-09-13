import { generateKeyBetween } from "fractional-indexing";

/**
 * Fractional-index ordering helpers. Ordered rows store a `position` text key;
 * ordering is the lexicographic sort of those keys. A move computes a key
 * strictly between two neighbours, touching only the moved row.
 */

/** A key strictly between `a` and `b`; pass `null` for an open end. */
export function keyBetween(a: string | null, b: string | null): string {
  return generateKeyBetween(a, b);
}

/** A key that sorts after `last` (append), or the first key when `last` is null. */
export function keyAfter(last: string | null): string {
  return generateKeyBetween(last, null);
}

/** `n` sequential end-keys, e.g. for seeding an initial ordered set. */
export function seedKeys(n: number): string[] {
  const keys: string[] = [];
  let prev: string | null = null;
  for (let i = 0; i < n; i++) {
    prev = generateKeyBetween(prev, null);
    keys.push(prev);
  }
  return keys;
}
