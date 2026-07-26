export type CatalogueItem = {
  id: string;
  name: string;
  emoji: string;
  price: number;
  hungerRestore: number;
  thirstRestore: number;
};

export const ITEM_CATALOGUE: CatalogueItem[] = [
  { id: "onigiri", name: "Onigiri", emoji: "🍙", price: 150, hungerRestore: 20, thirstRestore: 0 },
  { id: "snack", name: "Snack", emoji: "🍫", price: 100, hungerRestore: 10, thirstRestore: 0 },
  { id: "water", name: "Water", emoji: "💧", price: 120, hungerRestore: 0, thirstRestore: 30 },
  { id: "juice", name: "Juice", emoji: "🧃", price: 180, hungerRestore: 0, thirstRestore: 20 },
  { id: "coffee", name: "Coffee", emoji: "☕", price: 200, hungerRestore: 5, thirstRestore: 10 },
];

export const MEAL_CONFIG = {
  cost: 800,
  duration: 1200, // seconds (20 min)
  maxHungerRestore: 50,
  maxThirstRestore: 50,
} as const;

export const EXPLORE_CONFIG = {
  duration: 7200, // seconds (2 hours)
} as const;

export const STUDY_CONFIG = {
  cost: 0,
  duration: 28800, // seconds (8 hours)
  maxAttributeGain: 5,
} as const;

export const TRAIN_VIGOR_CONFIG = {
  cost: 800,
  duration: 7200, // seconds (2 hours)
  maxAttributeGain: 3,
} as const;

export const TRAIN_MIGHT_CONFIG = {
  cost: 2000,
  duration: 7200, // seconds (2 hours)
  maxAttributeGain: 3,
} as const;

export const REST_CONFIG = {
  cost: 0,
  duration: 28800, // seconds (8 hours — a full night)
  maxShieldRestore: 100,
  maxHealthRestore: 100,
} as const;

export const CONFRONT_CONFIG = {
  cost: 0,
  duration: 600, // seconds (10 min) — 1v1; multi-fighter duration is a future rule
  minDamage: 15, // also the flat damage taken on a win or an early stop
  maxDamage: 50,
} as const;
