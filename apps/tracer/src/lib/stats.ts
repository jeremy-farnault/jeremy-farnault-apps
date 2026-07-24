// Full bar (100) → empty (0) over 24 real-world hours
export const DECAY_RATE = 100 / (24 * 3600);

// Persistent trainable attributes any actor (player or future NPC) can carry.
export type Attributes = {
  knowledge: number;
  vigor: number;
  might: number;
};

// Depleting resources on an actor. Only vitals decay over time.
export type Vitals = {
  health: number;
  hunger: number;
  thirst: number;
};

export type CharacterStats = Attributes &
  Vitals & {
    money: number;
    lastComputedAt: number; // wall timestamp
  };

export function defaultStats(): CharacterStats {
  return {
    health: 100,
    hunger: 100,
    thirst: 100,
    knowledge: 0,
    vigor: 0,
    might: 5,
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

// Increment an attribute by `delta`, clamped to [0, 100] and rounded to int.
// Returns a new CharacterStats; immutable, matches applyDecay's pattern.
export function pumpAttribute(
  stats: CharacterStats,
  name: keyof Attributes,
  delta: number
): CharacterStats {
  const next = Math.max(0, Math.min(100, Math.round(stats[name] + delta)));
  return { ...stats, [name]: next };
}
