import { generateKeyBetween } from "fractional-indexing";

/**
 * `n` sequential fractional-index keys, as `@jf/ui/ordering`'s `seedKeys` makes them (same
 * library, same keys). Not imported from `@jf/ui`: that package isn't an ES module, so the
 * seed CLI, which Node runs through tsx, can't load its named exports.
 */
export function seedKeys(n: number): string[] {
  const keys: string[] = [];
  let previous: string | null = null;
  for (let i = 0; i < n; i++) {
    previous = generateKeyBetween(previous, null);
    keys.push(previous);
  }
  return keys;
}
