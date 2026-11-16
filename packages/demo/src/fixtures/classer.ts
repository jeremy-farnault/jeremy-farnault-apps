import type { classerItems, classers } from "@jf/db";

import { type IsoDate, addDays, atHour } from "./dates";
import { stableUuid } from "./determinism";

export interface ClasserFixtures {
  classers: (typeof classers.$inferInsert)[];
  items: (typeof classerItems.$inferInsert)[];
}

interface ListSpec {
  key: string;
  name: string;
  description: string;
  /** Created this many days ago; lists show newest first. */
  createdDaysAgo: number;
  archivedDaysAgo?: number;
  /** Best first: [name, description or null]. */
  items: [string, string | null][];
}

export const CLASSER_LISTS: ListSpec[] = [
  {
    key: "hikes",
    name: "Hikes",
    description: "Every multi-day walk I've done, best first.",
    createdDaysAgo: 20,
    items: [
      ["Tongariro Alpine Crossing", "Volcanoes, emerald lakes, and wind."],
      ["Kumano Kodō", "Old pilgrim paths and onsen every night."],
      ["Kungsleden, Abisko to Nikkaluokta", "Midnight sun the whole way."],
      ["Routeburn Track", null],
      ["Nakasendō, Magome to Tsumago", "Short, but the post towns are perfect."],
      ["GR20, northern half", "Hardest thing I've walked."],
      ["Sörmlandsleden, stage 1", null],
    ],
  },
  {
    key: "films",
    name: "Favourite films",
    description: "The ones I'd save from a fire.",
    createdDaysAgo: 75,
    items: [
      ["Spirited Away", null],
      ["Perfect Days", "Small things, done well."],
      ["In the Mood for Love", null],
      ["Drive My Car", null],
      ["Paris, Texas", null],
      ["Past Lives", null],
      ["Arrival", "The ending gets me every time."],
      ["My Neighbour Totoro", null],
    ],
  },
  {
    key: "coffee",
    name: "Coffee beans",
    description: "Ranked as filter coffee, light roast.",
    createdDaysAgo: 140,
    items: [
      ["Ethiopia Yirgacheffe, washed", "Jasmine and lemon."],
      ["Kenya Nyeri AA", "Blackcurrant, bright."],
      ["Colombia Huila, pink bourbon", null],
      ["Rwanda Gakenke", null],
      ["Guatemala Huehuetenango", "Chocolate, easy morning cup."],
      ["Brazil Cerrado, natural", null],
    ],
  },
  {
    key: "ramen",
    name: "Ramen styles",
    description: "After two years in Tokyo.",
    createdDaysAgo: 210,
    items: [
      ["Tsukemen", "Dipping, thick noodles, rich broth."],
      ["Tonkotsu", null],
      ["Shoyu", null],
      ["Miso", "Best in winter."],
      ["Shio", null],
      ["Tantanmen", null],
    ],
  },
  {
    key: "board-games",
    name: "Board games",
    description: "Before the kids took over the table.",
    createdDaysAgo: 400,
    archivedDaysAgo: 120,
    items: [
      ["Root", null],
      ["Wingspan", null],
      ["Azul", null],
      ["Carcassonne", null],
    ],
  },
];

export function buildClasserFixtures({
  userId,
  today,
}: {
  userId: string;
  today: IsoDate;
}): ClasserFixtures {
  const fixtures: ClasserFixtures = { classers: [], items: [] };
  for (const list of CLASSER_LISTS) {
    const classerId = stableUuid(userId, `classer:list:${list.key}`);
    const createdAt = atHour(addDays(today, -list.createdDaysAgo), 19);
    const archivedAt =
      list.archivedDaysAgo === undefined ? null : atHour(addDays(today, -list.archivedDaysAgo), 19);
    fixtures.classers.push({
      id: classerId,
      userId,
      name: list.name,
      description: list.description,
      imageKey: null,
      archivedAt,
      createdAt,
      updatedAt: archivedAt ?? createdAt,
    });
    list.items.forEach(([name, description], index) => {
      fixtures.items.push({
        id: stableUuid(userId, `classer:item:${list.key}:${index}`),
        classerId,
        userId,
        name,
        description,
        imageKey: null,
        rank: index + 1,
        createdAt,
        updatedAt: createdAt,
      });
    });
  }
  return fixtures;
}
