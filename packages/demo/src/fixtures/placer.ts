import type { placerCategories, placerSpots } from "@jf/db";

import { type IsoDate, addDays, atHour } from "./dates";
import { stableUuid } from "./determinism";

export interface PlacerFixtures {
  categories: (typeof placerCategories.$inferInsert)[];
  spots: (typeof placerSpots.$inferInsert)[];
}

/** Icons are keys of Placer's category icon map. */
const CATEGORIES = [
  { key: "lived", name: "Lived", color: "var(--teal-600)", icon: "House" },
  { key: "loved", name: "Loved", color: "var(--magenta-400)", icon: "Heart" },
  { key: "wishlist", name: "Want to visit", color: "var(--yellow-600)", icon: "Star" },
  { key: "food", name: "Food", color: "var(--red-400)", icon: "Utensils" },
  { key: "hikes", name: "Hikes", color: "var(--green-600)", icon: "Mountain" },
] as const;
type CategoryKey = (typeof CATEGORIES)[number]["key"];

/**
 * Public places and neighbourhoods only, never a private address:
 * [name, category, lat, lng, description, added days ago].
 */
const SPOTS: [string, CategoryKey, number, number, string, number][] = [
  ["Toulouse, Capitole", "lived", 43.6045, 1.444, "Seven years building planes.", 360],
  ["Wellington, Aro Valley", "lived", -41.2959, 174.7656, "Two windy, happy years.", 355],
  ["Tokyo, Nakameguro", "lived", 35.644, 139.6987, "Cherry blossoms along the canal.", 350],
  ["Stockholm, Södermalm", "lived", 59.315, 18.071, "Home now.", 345],
  ["Fushimi Inari, Kyoto", "loved", 34.9671, 135.7727, "Go at 6am, the gates are all yours.", 300],
  ["Lake Tekapo", "loved", -44.0047, 170.4776, "Darkest sky I've ever seen.", 290],
  ["Naoshima", "loved", 34.46, 133.995, "Art island, rent a bike.", 280],
  ["Mont-Saint-Michel", "loved", 48.6361, -1.5115, "Cross the bay at low tide with a guide.", 270],
  ["Abisko", "loved", 68.3495, 18.8312, "Northern lights three nights in a row.", 260],
  ["Reine, Lofoten", "wishlist", 67.9327, 13.089, "Summer, with a tent.", 120],
  ["Torres del Paine", "wishlist", -50.9423, -73.4068, "The W trek.", 110],
  ["Shiretoko", "wishlist", 44.07, 145.15, "Bears and drift ice.", 100],
  ["Gásadalur, Faroe Islands", "wishlist", 62.11, -7.433, "The waterfall into the sea.", 90],
  ["Landmannalaugar", "wishlist", 63.983, -19.06, "Hot springs at the end of the hike.", 80],
  ["Tsukiji Outer Market", "food", 35.6655, 139.7707, "Tamagoyaki on a stick for breakfast.", 200],
  ["Östermalms Saluhall", "food", 59.3355, 18.079, "Saturday lunch spot.", 190],
  ["Les Halles de Lyon", "food", 45.763, 4.8508, "Oysters and a glass of white at 11.", 180],
  ["Wellington Night Market", "food", -41.29, 174.777, "Friday dumplings.", 170],
  [
    "Routeburn Track",
    "hikes",
    -44.718,
    168.277,
    "Three days, every view better than the last.",
    240,
  ],
  ["Kumano Kodō, Nakahechi", "hikes", 33.835, 135.775, "Pilgrim trail through cedar forest.", 230],
  ["GR20, Calenzana", "hikes", 42.507, 8.855, "Hardest walk I've done.", 220],
  ["Tongariro Alpine Crossing", "hikes", -39.1328, 175.642, "Start before sunrise.", 210],
];

export function buildPlacerFixtures({
  userId,
  today,
}: {
  userId: string;
  today: IsoDate;
}): PlacerFixtures {
  const id = (key: string) => stableUuid(userId, `placer:${key}`);
  const createdAt = atHour(addDays(today, -365), 10);
  return {
    categories: CATEGORIES.map((category) => ({
      id: id(`category:${category.key}`),
      userId,
      name: category.name,
      color: category.color,
      icon: category.icon,
      createdAt,
    })),
    spots: SPOTS.map(([name, category, lat, lng, description, daysAgo]) => {
      const added = atHour(addDays(today, -daysAgo), 18);
      return {
        id: id(`spot:${name}`),
        userId,
        categoryId: id(`category:${category}`),
        name,
        description,
        photoKey: null,
        lat,
        lng,
        createdAt: added,
        updatedAt: added,
      };
    }),
  };
}
