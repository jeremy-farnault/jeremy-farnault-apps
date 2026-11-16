import type { exposerItemTags, exposerItems, exposerPhotos, exposerTags } from "@jf/db";

import type { ArtSpec } from "../images/art";
import { type IsoDate, addDays, atHour } from "./dates";
import { stableUuid } from "./determinism";
import { doc, paragraph } from "./rich-text";

type PhotoRow = typeof exposerPhotos.$inferInsert;

export interface ExposerFixtures {
  items: (typeof exposerItems.$inferInsert)[];
  /**
   * Each photo carries the art it shows. Nothing is uploaded: during the capture, requests for
   * the photo's storage key (under `exposer/<userId>/demo/`, which Exposer's image config
   * allows) are answered with the art, drawn on the spot (see `images/serve.ts`).
   */
  photos: (PhotoRow & { art: ArtSpec })[];
  tags: (typeof exposerTags.$inferInsert)[];
  itemTags: (typeof exposerItemTags.$inferInsert)[];
}

const TAGS = [
  { name: "Mountains", color: "var(--teal-600)" },
  { name: "Sea", color: "var(--blue-400)" },
  { name: "Night", color: "var(--purple-600)" },
  { name: "Winter", color: "var(--teal-400)" },
  { name: "Desert", color: "var(--yellow-600)" },
];

interface Size {
  width: number;
  height: number;
}

const LANDSCAPE: Size = { width: 1800, height: 1200 };
const PORTRAIT: Size = { width: 1200, height: 1500 };
const SQUARE: Size = { width: 1500, height: 1500 };

interface ItemSpec {
  key: string;
  title: string;
  description: string;
  daysAgo: number;
  draft?: boolean;
  tags: string[];
  photos: { composition: ArtSpec["composition"]; palette: ArtSpec["palette"]; size: Size }[];
}

const ITEMS: ItemSpec[] = [
  {
    key: "first-snow",
    title: "First snow",
    description: "The week the light turned blue.",
    daysAgo: 6,
    tags: ["Winter", "Mountains"],
    photos: [
      { composition: "ridges", palette: "winter", size: LANDSCAPE },
      { composition: "forest", palette: "winter", size: PORTRAIT },
    ],
  },
  {
    key: "nightfall",
    title: "Nightfall",
    description: "Three evenings above the tree line.",
    daysAgo: 34,
    tags: ["Night", "Mountains"],
    photos: [
      { composition: "night", palette: "midnight", size: LANDSCAPE },
      { composition: "ridges", palette: "dusk", size: SQUARE },
      { composition: "night", palette: "midnight", size: PORTRAIT },
    ],
  },
  {
    key: "west-coast",
    title: "West coast",
    description: "Low tide, long shadows.",
    daysAgo: 75,
    tags: ["Sea"],
    photos: [
      { composition: "sea", palette: "dawn", size: LANDSCAPE },
      { composition: "sea", palette: "dusk", size: LANDSCAPE },
    ],
  },
  {
    key: "dunes",
    title: "Dunes",
    description: "Wind does all the work.",
    daysAgo: 130,
    tags: ["Desert"],
    photos: [
      { composition: "dunes", palette: "desert", size: PORTRAIT },
      { composition: "dunes", palette: "dawn", size: SQUARE },
    ],
  },
  {
    key: "valley-mist",
    title: "Valley mist",
    description: "Before the sun burned it off.",
    daysAgo: 190,
    tags: ["Mountains"],
    photos: [
      { composition: "forest", palette: "mist", size: LANDSCAPE },
      { composition: "ridges", palette: "mist", size: PORTRAIT },
    ],
  },
  {
    key: "work-in-progress",
    title: "Coastline studies",
    description: "Not ready yet.",
    daysAgo: 1,
    draft: true,
    tags: ["Sea"],
    photos: [{ composition: "sea", palette: "mist", size: SQUARE }],
  },
];

export function buildExposerFixtures({
  userId,
  today,
}: {
  userId: string;
  today: IsoDate;
}): ExposerFixtures {
  const id = (key: string) => stableUuid(userId, `exposer:${key}`);
  const fixtures: ExposerFixtures = {
    items: [],
    photos: [],
    tags: TAGS.map((tag) => ({
      id: id(`tag:${tag.name}`),
      userId,
      ...tag,
      createdAt: atHour(addDays(today, -365), 10),
    })),
    itemTags: [],
  };

  for (const item of ITEMS) {
    const itemId = id(`item:${item.key}`);
    const date = addDays(today, -item.daysAgo);
    const createdAt = atHour(date, 19);
    fixtures.items.push({
      id: itemId,
      userId,
      title: item.title,
      description: doc(paragraph(item.description)),
      date,
      visibility: item.draft ? "draft" : "public",
      createdAt,
      updatedAt: createdAt,
    });
    item.photos.forEach((photo, position) => {
      const name = `${item.key}-${position + 1}`;
      fixtures.photos.push({
        id: id(`photo:${name}`),
        itemId,
        // Named after the art, not the date, so a key always shows the same picture.
        storageKey: `exposer/${userId}/demo/${name}.jpg`,
        position,
        width: photo.size.width,
        height: photo.size.height,
        createdAt,
        art: { ...photo.size, composition: photo.composition, palette: photo.palette, seed: name },
      });
    });
    for (const tag of item.tags) fixtures.itemTags.push({ itemId, tagId: id(`tag:${tag}`) });
  }

  return fixtures;
}
