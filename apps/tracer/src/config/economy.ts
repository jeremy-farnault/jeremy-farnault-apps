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

export const WORK_CONFIG = {
  ratePerHour: 1200,
  shiftDuration: 28800, // seconds (8 hours)
  maxEarnings: 9600,
} as const;
