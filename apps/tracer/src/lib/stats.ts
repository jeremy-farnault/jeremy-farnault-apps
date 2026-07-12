// Full bar (100) → empty (0) over 24 real-world hours
export const DECAY_RATE = 100 / (24 * 3600);

export type CharacterStats = {
  health: number;
  hunger: number;
  thirst: number;
  money: number;
  lastComputedAt: number; // wall timestamp
};

export function defaultStats(): CharacterStats {
  return {
    health: 100,
    hunger: 100,
    thirst: 100,
    money: 5000,
    lastComputedAt: Date.now(),
  };
}

export function applyDecay(stats: CharacterStats): CharacterStats {
  const elapsed = (Date.now() - stats.lastComputedAt) / 1000;
  const decayed = elapsed * DECAY_RATE;
  return {
    ...stats,
    hunger: Math.max(0, stats.hunger - decayed),
    thirst: Math.max(0, stats.thirst - decayed),
    lastComputedAt: Date.now(),
  };
}
