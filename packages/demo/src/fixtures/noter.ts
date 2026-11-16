import type { folders, notes } from "@jf/db";

import { type IsoDate, addDays, atHour } from "./dates";
import { stableUuid } from "./determinism";
import { bullets, doc, heading, paragraph, tasks } from "./rich-text";

export interface NoterFixtures {
  folders: (typeof folders.$inferInsert)[];
  /** No reminder blocks anywhere, so Noter's reminder cron never pushes for the demo user. */
  notes: (typeof notes.$inferInsert)[];
}

interface FolderSpec {
  key: string;
  name: string;
  color: string | null;
  parent?: string;
  archivedDaysAgo?: number;
  updatedDaysAgo: number;
}

const FOLDERS: FolderSpec[] = [
  { key: "home", name: "Home", color: "var(--green-400)", updatedDaysAgo: 3 },
  { key: "work", name: "Work", color: "var(--blue-400)", updatedDaysAgo: 1 },
  { key: "travel", name: "Travel", color: "var(--purple-400)", updatedDaysAgo: 6 },
  {
    key: "japan",
    name: "Japan 2027",
    color: "var(--magenta-400)",
    parent: "travel",
    updatedDaysAgo: 6,
  },
  { key: "recipes", name: "Recipes", color: "var(--yellow-400)", updatedDaysAgo: 10 },
  { key: "old-flat", name: "Old flat", color: null, archivedDaysAgo: 90, updatedDaysAgo: 90 },
];

interface NoteSpec {
  key: string;
  title: string;
  body: string;
  folder?: string;
  color?: string;
  pinned?: boolean;
  archivedDaysAgo?: number;
  updatedDaysAgo: number;
}

const NOTES: NoteSpec[] = [
  {
    key: "groceries",
    title: "Groceries",
    pinned: true,
    color: "var(--yellow-400)",
    updatedDaysAgo: 0,
    body: doc(
      tasks([
        ["Oat milk", true],
        ["Eggs", true],
        ["Rye bread", false],
        ["Lingonberry jam", false],
        ["Coffee beans", false],
        ["Bananas", true],
      ])
    ),
  },
  {
    key: "weekend",
    title: "This weekend",
    pinned: true,
    color: "var(--teal-400)",
    updatedDaysAgo: 1,
    body: doc(
      bullets(["Swimming with the kids on Saturday morning", "Fix the bike brake", "Call Maman"])
    ),
  },
  {
    key: "books",
    title: "Books to read",
    updatedDaysAgo: 4,
    body: doc(
      bullets([
        "The Dispossessed, Ursula K. Le Guin",
        "Kitchen, Banana Yoshimoto",
        "The Peregrine, J. A. Baker",
        "Exhalation, Ted Chiang",
      ])
    ),
  },
  {
    key: "gifts",
    title: "Gift ideas",
    color: "var(--magenta-400)",
    updatedDaysAgo: 8,
    body: doc(
      paragraph("Saga: the big Lego set she keeps looking at."),
      paragraph("Papa: a good pocket knife."),
      paragraph("Camille: something for the new baby, ask first.")
    ),
  },
  {
    key: "running",
    title: "Half marathon plan",
    color: "var(--green-600)",
    updatedDaysAgo: 12,
    body: doc(
      paragraph("Race in May. Three runs a week, long run on Sunday."),
      tasks([
        ["Week 1–4: base, 25 km a week", true],
        ["Week 5–8: add tempo runs", false],
        ["Week 9–12: long runs up to 18 km", false],
      ])
    ),
  },
  {
    key: "paint",
    title: "Paint colours",
    folder: "home",
    updatedDaysAgo: 3,
    body: doc(paragraph("Kids' room: soft green, matt. Two coats. Ceiling stays white.")),
  },
  {
    key: "boiler",
    title: "Boiler service",
    folder: "home",
    updatedDaysAgo: 30,
    body: doc(paragraph("Every autumn. Last one done in October, all fine.")),
  },
  {
    key: "one-on-one",
    title: "1:1 template",
    folder: "work",
    color: "var(--blue-400)",
    updatedDaysAgo: 1,
    body: doc(
      heading(2, "1:1"),
      bullets([
        "How are you, really?",
        "What's blocking you?",
        "Growth: one thing to try",
        "Anything for me?",
      ])
    ),
  },
  {
    key: "offsite",
    title: "Team offsite",
    folder: "work",
    updatedDaysAgo: 5,
    body: doc(
      paragraph("Two days in March, somewhere reachable by train."),
      tasks([
        ["Pick dates", true],
        ["Book venue", false],
        ["Agenda draft", false],
      ])
    ),
  },
  {
    key: "itinerary",
    title: "Itinerary",
    folder: "japan",
    color: "var(--purple-400)",
    updatedDaysAgo: 6,
    body: doc(
      heading(2, "Two weeks in July"),
      bullets([
        "Tokyo, 4 nights: Nakameguro, Yanaka, a day in Kamakura",
        "Kyoto, 4 nights: Fushimi Inari at dawn, Arashiyama",
        "Kumano Kodō, 3 nights: Takijiri to Hongū",
        "Naoshima, 2 nights",
      ])
    ),
  },
  {
    key: "packing",
    title: "Packing list",
    folder: "travel",
    updatedDaysAgo: 40,
    body: doc(
      tasks([
        ["Passports", false],
        ["Adapters", false],
        ["Hiking shoes", false],
      ])
    ),
  },
  {
    key: "pancakes",
    title: "Sunday pancakes",
    folder: "recipes",
    color: "var(--yellow-400)",
    updatedDaysAgo: 10,
    body: doc(
      paragraph("The kids' favourite. Makes about twelve, enough for four."),
      heading(2, "Ingredients"),
      bullets([
        "250 g flour",
        "2 eggs",
        "500 ml milk",
        "1 tbsp sugar",
        "A pinch of salt",
        "Butter for the pan",
      ]),
      heading(2, "Method"),
      paragraph(
        "Whisk the flour, sugar and salt. Make a well, add the eggs and half the milk, and whisk until smooth. Add the rest of the milk slowly."
      ),
      paragraph(
        "Rest the batter for 30 minutes. Cook on a hot, buttered pan, about a minute per side."
      ),
      paragraph("Serve with lingonberry jam, or lemon and sugar.")
    ),
  },
  {
    key: "miso",
    title: "Miso soup",
    folder: "recipes",
    updatedDaysAgo: 25,
    body: doc(paragraph("Dashi, then tofu and wakame. Miso goes in last, off the heat.")),
  },
  {
    key: "moving",
    title: "Moving checklist",
    folder: "old-flat",
    archivedDaysAgo: 90,
    updatedDaysAgo: 90,
    body: doc(
      tasks([
        ["Change address", true],
        ["Meter readings", true],
        ["Return keys", true],
      ])
    ),
  },
];

export function buildNoterFixtures({
  userId,
  today,
}: {
  userId: string;
  today: IsoDate;
}): NoterFixtures {
  const id = (key: string) => stableUuid(userId, `noter:${key}`);
  const createdAt = atHour(addDays(today, -200), 9);
  const at = (daysAgo: number) => atHour(addDays(today, -daysAgo), daysAgo === 0 ? 6 : 18);

  return {
    folders: FOLDERS.map((folder) => ({
      id: id(`folder:${folder.key}`),
      userId,
      parentFolderId: folder.parent ? id(`folder:${folder.parent}`) : null,
      name: folder.name,
      color: folder.color,
      archivedAt: folder.archivedDaysAgo === undefined ? null : at(folder.archivedDaysAgo),
      createdAt,
      updatedAt: at(folder.updatedDaysAgo),
    })),
    notes: NOTES.map((note) => ({
      id: id(`note:${note.key}`),
      userId,
      parentFolderId: note.folder ? id(`folder:${note.folder}`) : null,
      title: note.title,
      body: note.body,
      backgroundColor: note.color ?? null,
      archivedAt: note.archivedDaysAgo === undefined ? null : at(note.archivedDaysAgo),
      pinned: note.pinned ?? false,
      createdAt,
      updatedAt: at(note.updatedDaysAgo),
    })),
  };
}
