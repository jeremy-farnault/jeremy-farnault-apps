import type { routinerHabits, routinerLogs } from "@jf/db";

import { type IsoDate, addDays, atHour } from "./dates";
import { seededRandom, stableUuid } from "./determinism";

export type RoutinerHabitRow = typeof routinerHabits.$inferInsert;
export type RoutinerLogRow = typeof routinerLogs.$inferInsert;

export interface RoutinerFixtures {
  habits: RoutinerHabitRow[];
  logs: RoutinerLogRow[];
}

type HabitType = RoutinerHabitRow["type"];

interface HabitSpec {
  key: string;
  name: string;
  type: HabitType;
  color: string;
  description: string;
  /** How many days before today the habit was started. */
  startedDaysAgo: number;
  /** Chance of a log on a given day, early on and lately: habits get steadier over time. */
  rate: { early: number; late: number };
  /** The logged value, as Routiner stores it, from a 0–1 roll and how far along the habit is. */
  value: (roll: number, progress: number) => string;
  /** Archived this many days ago, or still active. */
  archivedDaysAgo?: number;
  /** A few hand-written comments, by days before today. */
  comments?: Record<number, string>;
}

function minutes(total: number): string {
  const rounded = Math.max(1, Math.round(total));
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

const HABITS: HabitSpec[] = [
  {
    key: "run",
    name: "Morning run",
    type: "boolean",
    color: "var(--green-400)",
    description: "Any distance counts, as long as it's before work.",
    startedDaysAgo: 330,
    rate: { early: 0.35, late: 0.65 },
    value: () => "true",
    comments: { 3: "Rainy, but did the full loop", 40: "First 10k!" },
  },
  {
    key: "meditate",
    name: "Meditation",
    type: "time",
    color: "var(--purple-400)",
    description: "Guided or silent, logged as duration.",
    startedDaysAgo: 300,
    rate: { early: 0.45, late: 0.8 },
    value: (roll, progress) => minutes(5 + progress * 15 + roll * 10),
  },
  {
    key: "read",
    name: "Pages read",
    type: "numeric",
    color: "var(--blue-600)",
    description: "Before bed, no screens.",
    startedDaysAgo: 270,
    rate: { early: 0.55, late: 0.75 },
    value: (roll, progress) => String(Math.round(8 + progress * 22 + roll * 30)),
    comments: { 12: "Finished The Left Hand of Darkness" },
  },
  {
    key: "water",
    name: "Glasses of water",
    type: "numeric",
    color: "var(--teal-400)",
    description: "Aim for eight.",
    startedDaysAgo: 200,
    rate: { early: 0.7, late: 0.9 },
    value: (roll) => String(4 + Math.round(roll * 5)),
  },
  {
    key: "stretch",
    name: "Stretch",
    type: "boolean",
    color: "var(--teal-600)",
    description: "Ten minutes after the run or before bed.",
    startedDaysAgo: 150,
    rate: { early: 0.4, late: 0.7 },
    value: () => "true",
  },
  {
    key: "cold-shower",
    name: "Cold shower",
    type: "boolean",
    color: "var(--red-600)",
    description: "Tried it for a winter.",
    startedDaysAgo: 250,
    rate: { early: 0.5, late: 0.3 },
    value: () => "true",
    archivedDaysAgo: 60,
  },
];

export function buildRoutinerFixtures({
  userId,
  today,
}: {
  userId: string;
  today: IsoDate;
}): RoutinerFixtures {
  const habits: RoutinerHabitRow[] = [];
  const logs: RoutinerLogRow[] = [];

  for (const spec of HABITS) {
    const habitId = stableUuid(userId, `routiner:habit:${spec.key}`);
    const startDate = addDays(today, -spec.startedDaysAgo);
    const archivedAt =
      spec.archivedDaysAgo === undefined ? null : atHour(addDays(today, -spec.archivedDaysAgo), 9);

    habits.push({
      id: habitId,
      userId,
      name: spec.name,
      type: spec.type,
      startDate,
      color: spec.color,
      description: spec.description,
      archivedAt,
      createdAt: atHour(startDate, 8),
      updatedAt: archivedAt ?? atHour(startDate, 8),
    });

    // Rolls are drawn per day offset from the start, never from the calendar date, so moving
    // `today` moves every log by the same number of days.
    const random = seededRandom(`${userId}:routiner:${spec.key}`);
    const lastDaysAgo = spec.archivedDaysAgo ?? 0;
    for (let daysAgo = spec.startedDaysAgo; daysAgo >= lastDaysAgo; daysAgo--) {
      const progress = (spec.startedDaysAgo - daysAgo) / spec.startedDaysAgo || 0;
      const rate = spec.rate.early + (spec.rate.late - spec.rate.early) * progress;
      const logRoll = random();
      const valueRoll = random();
      if (logRoll >= rate) continue;

      const date = addDays(today, -daysAgo);
      logs.push({
        id: stableUuid(userId, `routiner:log:${spec.key}:${daysAgo}`),
        habitId,
        userId,
        date,
        value: spec.value(valueRoll, progress),
        comment: spec.comments?.[daysAgo] ?? null,
        createdAt: atHour(date, 20),
        updatedAt: atHour(date, 20),
      });
    }
  }

  return { habits, logs };
}
