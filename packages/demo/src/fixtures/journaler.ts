import type { journalerEntries } from "@jf/db";

import { type ArtSpec, artFor } from "../images/art";
import { type IsoDate, addDays, atHour } from "./dates";
import { stableUuid } from "./determinism";

type EntryRow = typeof journalerEntries.$inferInsert;

export interface JournalerFixtures {
  entries: EntryRow[];
  /**
   * Generated art behind every `imageKey`, drawn by the capture (see `images/serve.ts`).
   * Abstract landscapes, not covers: real covers are copyrighted.
   */
  images: { key: string; art: ArtSpec }[];
}

type Category = EntryRow["category"];

/** [title, category, days ago, rating or null, comment or null], newest first. */
const ENTRIES: [string, Category, number, number | null, string | null][] = [
  ["Frieren: Beyond Journey's End", "Manga", 2, 9, "Quiet, sad and funny at once."],
  ["The Bear", "TV Show", 5, 8, null],
  ["Hades II", "Game", 9, 9, "One more run, every night."],
  ["Perfect Days", "Movie", 13, 10, "Made me want to clean toilets in Shibuya."],
  ["Tomorrow, and Tomorrow, and Tomorrow", "Book", 18, 8, null],
  ["Dune: Part Two", "Movie", 24, 8, "Saw it on the biggest screen I could find."],
  ["Shōgun", "TV Show", 31, 9, null],
  ["Vagabond", "Manga", 38, 10, "Every page is a painting."],
  ["Outer Wilds", "Game", 45, 10, "Go in knowing nothing."],
  ["Project Hail Mary", "Book", 52, 9, "Rocky!"],
  ["Past Lives", "Movie", 60, 9, null],
  ["Severance", "TV Show", 67, 8, null],
  ["Balatro", "Game", 74, 7, "Too many hours."],
  ["The Overstory", "Book", 83, 7, "Long, but I look at trees differently now."],
  ["Spirited Away", "Movie", 90, 10, "Rewatch with the kids."],
  ["Blue Period", "Manga", 98, 7, null],
  ["Slow Horses", "TV Show", 106, 8, null],
  ["Piranesi", "Book", 115, 9, null],
  ["Hollow Knight", "Game", 124, 8, "Gave up on the Path of Pain."],
  ["Oppenheimer", "Movie", 133, 7, null],
  ["The Expanse", "TV Show", 142, 8, null],
  ["Pluto", "Manga", 151, 9, null],
  ["Sea of Tranquility", "Book", 160, 8, null],
  ["Anatomy of a Fall", "Movie", 170, 8, null],
  ["Tears of the Kingdom", "Game", 181, 9, "Built a lot of terrible cars."],
  ["Mushishi", "Manga", 193, null, null],
  ["The Remains of the Day", "Book", 205, 8, null],
  ["Fallen Leaves", "Movie", 216, 7, null],
  ["Blue Eye Samurai", "TV Show", 228, 9, null],
  ["Stardew Valley", "Game", 241, 7, null],
  ["Klara and the Sun", "Book", 254, 7, null],
  ["The Boy and the Heron", "Movie", 268, 8, null],
  ["Monster", "Manga", 282, 9, null],
  ["Arcane", "TV Show", 297, 9, null],
  ["Celeste", "Game", 312, 8, null],
  ["A Psalm for the Wild-Built", "Book", 330, 8, "Tea and robots."],
  ["Drive My Car", "Movie", 348, 9, null],
  ["Mob Psycho 100", "Manga", 366, 7, null],
  ["Baldur's Gate 3", "Game", 384, 9, null],
  ["The Left Hand of Darkness", "Book", 402, 8, null],
];

export function buildJournalerFixtures({
  userId,
  today,
}: {
  userId: string;
  today: IsoDate;
}): JournalerFixtures {
  const images: JournalerFixtures["images"] = [];
  const entries = ENTRIES.map(([title, category, daysAgo, rating, comment], index): EntryRow => {
    const date = addDays(today, -daysAgo);
    // Its own prefix: Journaler's image config only allows /journaler/**.
    const key = `journaler/${userId}/demo/entry-${index + 1}.jpg`;
    images.push({ key, art: artFor(`journaler:${title}`, 900, 600) });
    return {
      id: stableUuid(userId, `journaler:entry:${title}`),
      userId,
      title,
      category,
      date,
      rating,
      comment,
      imageKey: key,
      createdAt: atHour(date, 21),
      updatedAt: atHour(date, 21),
    };
  });
  return { entries, images };
}
