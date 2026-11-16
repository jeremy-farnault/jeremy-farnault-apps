import type { classerItems, classers } from "@jf/db";

import type { ArtSpec } from "../images/art";
import { type IsoDate, addDays, atHour } from "./dates";
import { stableUuid } from "./determinism";

export interface ClasserFixtures {
  classers: (typeof classers.$inferInsert)[];
  items: (typeof classerItems.$inferInsert)[];
  /** Generated art behind every `imageKey`, drawn by the capture (see `images/serve.ts`). */
  images: { key: string; art: ArtSpec }[];
}

type Art = Pick<ArtSpec, "composition" | "palette">;
const COVER = { width: 1200, height: 800 };
const THUMBNAIL = { width: 640, height: 640 };

interface ListSpec {
  key: string;
  name: string;
  description: string;
  /** Created this many days ago; lists show newest first. */
  createdDaysAgo: number;
  archivedDaysAgo?: number;
  cover: Art;
  /** Best first: [name, description or null, thumbnail art or none]. */
  items: [string, string | null, Art?][];
}

export const CLASSER_LISTS: ListSpec[] = [
  {
    key: "hikes",
    name: "Hikes",
    description: "Every multi-day walk I've done, best first.",
    createdDaysAgo: 20,
    cover: { composition: "ridges", palette: "dusk" },
    items: [
      [
        "Tongariro Alpine Crossing",
        "Volcanoes, emerald lakes, and wind.",
        { composition: "ridges", palette: "desert" },
      ],
      [
        "Kumano Kodō",
        "Old pilgrim paths and onsen every night.",
        { composition: "forest", palette: "mist" },
      ],
      [
        "Kungsleden, Abisko to Nikkaluokta",
        "Midnight sun the whole way.",
        { composition: "ridges", palette: "winter" },
      ],
      ["Routeburn Track", null, { composition: "forest", palette: "dawn" }],
      [
        "Nakasendō, Magome to Tsumago",
        "Short, but the post towns are perfect.",
        { composition: "forest", palette: "dusk" },
      ],
      [
        "GR20, northern half",
        "Hardest thing I've walked.",
        { composition: "ridges", palette: "dawn" },
      ],
      ["Sörmlandsleden, stage 1", null, { composition: "sea", palette: "mist" }],
    ],
  },
  {
    key: "films",
    name: "Favourite films",
    description: "The ones I'd save from a fire.",
    createdDaysAgo: 75,
    cover: { composition: "night", palette: "midnight" },
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
    cover: { composition: "dunes", palette: "desert" },
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
    cover: { composition: "sea", palette: "dawn" },
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
    cover: { composition: "forest", palette: "winter" },
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
  const fixtures: ClasserFixtures = { classers: [], items: [], images: [] };
  // Under Classer's own prefix: its image config only allows /classer/**.
  const image = (name: string, art: Art, size: { width: number; height: number }) => {
    const key = `classer/${userId}/demo/${name}.jpg`;
    fixtures.images.push({ key, art: { ...art, ...size, seed: `classer:${name}` } });
    return key;
  };
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
      imageKey: image(list.key, list.cover, COVER),
      archivedAt,
      createdAt,
      updatedAt: archivedAt ?? createdAt,
    });
    list.items.forEach(([name, description, art], index) => {
      fixtures.items.push({
        id: stableUuid(userId, `classer:item:${list.key}:${index}`),
        classerId,
        userId,
        name,
        description,
        imageKey: art ? image(`${list.key}-${index + 1}`, art, THUMBNAIL) : null,
        rank: index + 1,
        createdAt,
        updatedAt: createdAt,
      });
    });
  }
  return fixtures;
}
