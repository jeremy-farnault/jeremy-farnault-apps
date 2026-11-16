import type { gainerSessionExercises, gainerSessions, gainerSets } from "@jf/db";

import { type IsoDate, addDays, atHour } from "./dates";
import { seededRandom, stableUuid } from "./determinism";

type SessionExerciseRow = typeof gainerSessionExercises.$inferInsert;

export interface GainerFixtures {
  sessions: (typeof gainerSessions.$inferInsert)[];
  /**
   * Exercises in a session. They name a predefined exercise instead of carrying its id: the
   * seeder looks the id up, since predefined exercises are shared rows the fixtures never create.
   */
  sessionExercises: (Omit<SessionExerciseRow, "exerciseId"> & { exerciseName: string })[];
  sets: (typeof gainerSets.$inferInsert)[];
}

type ExerciseKind = "standard" | "pdc" | "duration";

interface ExerciseSpec {
  /** A predefined exercise's name, exactly as seeded by `pnpm seed:gainer`. */
  name: string;
  kind: ExerciseKind;
  /** Weight in kg (standard), reps (pdc) or seconds (duration), at the start and today. */
  from: number;
  to: number;
  /** Rep range for standard exercises. */
  reps?: [number, number];
  sets: number;
}

const WORKOUTS: ExerciseSpec[][] = [
  [
    { name: "Bench Press", kind: "standard", from: 60, to: 72.5, reps: [5, 8], sets: 4 },
    { name: "Overhead Press", kind: "standard", from: 40, to: 47.5, reps: [6, 8], sets: 3 },
    { name: "Dips", kind: "pdc", from: 8, to: 14, sets: 3 },
    { name: "Tricep Pushdown", kind: "standard", from: 25, to: 32.5, reps: [10, 12], sets: 3 },
  ],
  [
    { name: "Deadlift", kind: "standard", from: 100, to: 125, reps: [4, 6], sets: 3 },
    { name: "Pull-Up", kind: "pdc", from: 6, to: 10, sets: 4 },
    { name: "Barbell Row", kind: "standard", from: 55, to: 65, reps: [8, 10], sets: 3 },
    { name: "Bicep Curl", kind: "standard", from: 12, to: 16, reps: [10, 12], sets: 3 },
  ],
  [
    { name: "Squat", kind: "standard", from: 80, to: 100, reps: [5, 8], sets: 4 },
    { name: "Romanian Deadlift", kind: "standard", from: 70, to: 85, reps: [8, 10], sets: 3 },
    { name: "Leg Press", kind: "standard", from: 120, to: 150, reps: [10, 12], sets: 3 },
    { name: "Plank", kind: "duration", from: 45, to: 90, sets: 3 },
  ],
];

/** Every predefined exercise the fixtures use. */
export const GAINER_EXERCISE_NAMES = WORKOUTS.flat().map((exercise) => exercise.name);

/** How far back the history goes. */
const HISTORY_DAYS = 70;
/** Days between sessions, repeating: three sessions a week. */
const GAPS = [2, 2, 3];

/** Weights move in plate steps: 2.5 kg, or 1 kg below 20 kg (dumbbells, cables). */
function roundWeight(kg: number): number {
  const step = kg < 20 ? 1 : 2.5;
  return Math.round(kg / step) * step;
}

/** Session names match what Gainer gives a new session: the date, "16 November 2026". */
function sessionName(date: IsoDate): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(
    atHour(date, 12)
  );
}

export function buildGainerFixtures({
  userId,
  today,
}: {
  userId: string;
  today: IsoDate;
}): GainerFixtures {
  const fixtures: GainerFixtures = { sessions: [], sessionExercises: [], sets: [] };
  const random = seededRandom(`${userId}:gainer`);

  // Session days, oldest first, counted back from yesterday.
  const daysAgo: number[] = [];
  for (let day = 1, gap = 0; day <= HISTORY_DAYS; day += GAPS[gap++ % GAPS.length] as number) {
    daysAgo.unshift(day);
  }

  const addSession = (index: number, ago: number, active: boolean, exerciseCount: number) => {
    const date = addDays(today, -ago);
    const sessionId = stableUuid(userId, `gainer:session:${ago}`);
    // Evening sessions; today's is in progress since the morning.
    const startedAt = atHour(date, active ? 6 : 17);
    fixtures.sessions.push({
      id: sessionId,
      userId,
      name: sessionName(date),
      startedAt,
      finishedAt: active ? null : new Date(startedAt.getTime() + (62 + (index % 4) * 6) * 60_000),
    });

    const workout = WORKOUTS[index % WORKOUTS.length] as ExerciseSpec[];
    const progress = 1 - ago / HISTORY_DAYS;
    workout.slice(0, exerciseCount).forEach((exercise, position) => {
      const sessionExerciseId = stableUuid(userId, `gainer:session:${ago}:${exercise.name}`);
      const exerciseStart = new Date(startedAt.getTime() + position * 14 * 60_000);
      fixtures.sessionExercises.push({
        id: sessionExerciseId,
        sessionId,
        exerciseName: exercise.name,
        position,
        createdAt: exerciseStart,
      });

      // Today's second exercise is mid-way: one set logged so far.
      const setCount = active && position === exerciseCount - 1 ? 1 : exercise.sets;
      const target = exercise.from + (exercise.to - exercise.from) * progress;
      for (let setNumber = 1; setNumber <= setCount; setNumber++) {
        const fatigue = setNumber - 1;
        const set: typeof gainerSets.$inferInsert = {
          id: stableUuid(userId, `gainer:set:${ago}:${exercise.name}:${setNumber}`),
          sessionExerciseId,
          setNumber,
          createdAt: new Date(exerciseStart.getTime() + setNumber * 3 * 60_000),
        };
        if (exercise.kind === "standard") {
          const [low, high] = exercise.reps ?? [8, 10];
          set.weight = roundWeight(target).toFixed(2);
          set.reps = Math.max(low, high - fatigue - Math.floor(random() * 2));
        } else if (exercise.kind === "pdc") {
          set.reps = Math.max(1, Math.round(target) - fatigue - Math.floor(random() * 2));
        } else {
          set.durationSeconds = Math.round((target - fatigue * 5) / 5) * 5;
        }
        fixtures.sets.push(set);
      }
    });
  };

  let index = 0;
  for (const ago of daysAgo) {
    // Now and then life gets in the way.
    if (random() < 0.1) continue;
    addSession(index++, ago, false, 4);
  }
  // Today: the next workout in the rotation, two exercises in.
  addSession(index, 0, true, 2);

  return fixtures;
}
