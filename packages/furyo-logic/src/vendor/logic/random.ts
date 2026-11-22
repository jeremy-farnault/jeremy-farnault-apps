/**
 * A seeded random number generator (mulberry32): the state carries the seed,
 * so the same state always rolls the same numbers. Never Math.random in logic.
 */
export function roll(seed: number): { value: number; seed: number } {
  const next = (seed + 0x6d2b79f5) >>> 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next }
}
