import { createHash } from "node:crypto";

/**
 * A stable UUID for a fixture row, derived from the user and a key naming the row. The same
 * inputs always give the same id, so rows can reference each other and output is reproducible.
 */
export function stableUuid(userId: string, key: string): string {
  const hex = createHash("sha256").update(`${userId}:${key}`).digest("hex");
  // Shape it as a version-5-style UUID with the RFC 4122 variant bits, so uuid columns accept it.
  const variant = ((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

/**
 * A small seeded generator (mulberry32) for the bits of fixture data that should look organic,
 * like which days a habit was skipped. Seeded from a string, so output never changes between runs.
 */
export function seededRandom(seed: string): () => number {
  let state = Number.parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
