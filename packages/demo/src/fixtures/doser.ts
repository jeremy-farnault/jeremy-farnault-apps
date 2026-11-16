import type {
  doserDayOverrides,
  doserDoseLogs,
  doserMedicines,
  doserPillTypes,
  doserSymptomLogEntries,
  doserSymptomLogs,
} from "@jf/db";

import { type IsoDate, addDays, atHour } from "./dates";
import { seededRandom, stableUuid } from "./determinism";

type SymptomLogEntryRow = typeof doserSymptomLogEntries.$inferInsert;

export interface DoserFixtures {
  medicines: (typeof doserMedicines.$inferInsert)[];
  pillTypes: (typeof doserPillTypes.$inferInsert)[];
  dayOverrides: (typeof doserDayOverrides.$inferInsert)[];
  doseLogs: (typeof doserDoseLogs.$inferInsert)[];
  symptomLogs: (typeof doserSymptomLogs.$inferInsert)[];
  /** Name a predefined symptom instead of carrying its id: the seeder looks it up. */
  symptomLogEntries: (Omit<SymptomLogEntryRow, "symptomId"> & { symptomName: string })[];
}

/** The predefined symptoms the fixtures use, as seeded by `pnpm seed:doser`. */
export const DOSER_SYMPTOM_NAMES = [
  "Headache",
  "Nausea",
  "Fatigue",
  "Cramps",
  "Mood swings",
  "Bloating",
] as const;
type SymptomName = (typeof DOSER_SYMPTOM_NAMES)[number];

/** Enough history to fill the current and the previous month. */
const HISTORY_DAYS = 75;

interface MedicineSpec {
  key: string;
  name: string;
  /** Pill types in rotation order: colour and days each. */
  types: { name: string | null; color: string; days: number }[];
  daysOff: number;
  /** The cycle started this many days ago. */
  startedDaysAgo: number;
  /** Chance a dose is ticked on an on day. */
  adherence: number;
  /** Days (before today) switched off by hand. */
  skippedDaysAgo?: number[];
}

const MEDICINES: MedicineSpec[] = [
  {
    key: "pill",
    name: "Birth control",
    types: [
      { name: "Phase 1", color: "var(--yellow-600)", days: 7 },
      { name: "Phase 2", color: "var(--magenta-400)", days: 14 },
    ],
    daysOff: 7,
    // Four full cycles ago plus nine days: today is day 10, in phase 2.
    startedDaysAgo: 28 * 4 + 9,
    adherence: 0.97,
  },
  {
    key: "vitamin-d",
    name: "Vitamin D",
    types: [{ name: null, color: "var(--yellow-400)", days: 1 }],
    daysOff: 0,
    startedDaysAgo: 200,
    adherence: 0.85,
  },
  {
    key: "magnesium",
    name: "Magnesium",
    types: [{ name: null, color: "var(--teal-400)", days: 1 }],
    daysOff: 0,
    startedDaysAgo: 120,
    adherence: 0.8,
    skippedDaysAgo: [12, 13],
  },
];

/** Mirrors Doser's cycle maths: whether a medicine is on, `daysSinceStart` into its cycle. */
function isOnDay(spec: MedicineSpec, daysSinceStart: number): boolean {
  const onLength = spec.types.reduce((sum, type) => sum + type.days, 0);
  const cycleLength = onLength + spec.daysOff;
  return ((daysSinceStart % cycleLength) + cycleLength) % cycleLength < onLength;
}

const NOTES: Record<number, string> = {
  0: "Slept badly",
  3: "Better after a walk",
  9: "Long day at work",
};

export function buildDoserFixtures({
  userId,
  today,
}: {
  userId: string;
  today: IsoDate;
}): DoserFixtures {
  const id = (key: string) => stableUuid(userId, `doser:${key}`);
  const random = seededRandom(`${userId}:doser`);
  const fixtures: DoserFixtures = {
    medicines: [],
    pillTypes: [],
    dayOverrides: [],
    doseLogs: [],
    symptomLogs: [],
    symptomLogEntries: [],
  };

  for (const spec of MEDICINES) {
    const medicineId = id(`medicine:${spec.key}`);
    const cycleStartDate = addDays(today, -spec.startedDaysAgo);
    fixtures.medicines.push({
      id: medicineId,
      userId,
      name: spec.name,
      daysOff: spec.daysOff,
      cycleStartDate,
      createdAt: atHour(cycleStartDate, 8),
      updatedAt: atHour(cycleStartDate, 8),
    });
    spec.types.forEach((type, position) => {
      fixtures.pillTypes.push({
        id: id(`pill-type:${spec.key}:${position}`),
        medicineId,
        position,
        name: type.name,
        color: type.color,
        days: type.days,
      });
    });
    for (const daysAgo of spec.skippedDaysAgo ?? []) {
      const date = addDays(today, -daysAgo);
      fixtures.dayOverrides.push({
        id: id(`override:${spec.key}:${daysAgo}`),
        medicineId,
        date,
        isOn: false,
      });
    }

    for (let daysAgo = Math.min(HISTORY_DAYS, spec.startedDaysAgo); daysAgo >= 0; daysAgo--) {
      const roll = random();
      if (spec.skippedDaysAgo?.includes(daysAgo)) continue;
      if (!isOnDay(spec, spec.startedDaysAgo - daysAgo)) continue;
      // Today's evening doses aren't taken yet.
      if (daysAgo === 0 && spec.key !== "pill") continue;
      if (roll >= spec.adherence) continue;
      const date = addDays(today, -daysAgo);
      fixtures.doseLogs.push({
        id: id(`dose:${spec.key}:${daysAgo}`),
        medicineId,
        date,
        taken: true,
        createdAt: atHour(date, 7),
        updatedAt: atHour(date, 7),
      });
    }
  }

  // Symptoms cluster in the pill's off week, with the odd headache or tired day in between.
  const pill = MEDICINES[0] as MedicineSpec;
  for (let daysAgo = HISTORY_DAYS; daysAgo >= 0; daysAgo--) {
    const offWeek = !isOnDay(pill, pill.startedDaysAgo - daysAgo);
    const symptoms: SymptomName[] = [];
    if (offWeek) {
      if (random() < 0.7) symptoms.push("Cramps");
      if (random() < 0.5) symptoms.push("Bloating");
      if (random() < 0.35) symptoms.push("Mood swings");
    } else {
      if (random() < 0.12) symptoms.push("Headache");
      if (random() < 0.08) symptoms.push("Nausea");
    }
    if (daysAgo === 0 || random() < 0.1) symptoms.push("Fatigue");
    if (symptoms.length === 0) continue;

    const date = addDays(today, -daysAgo);
    const symptomLogId = id(`symptom-log:${daysAgo}`);
    fixtures.symptomLogs.push({
      id: symptomLogId,
      userId,
      date,
      note: NOTES[daysAgo] ?? null,
      createdAt: atHour(date, 20),
      updatedAt: atHour(date, 20),
    });
    for (const symptomName of new Set(symptoms)) {
      fixtures.symptomLogEntries.push({
        id: id(`symptom-entry:${daysAgo}:${symptomName}`),
        symptomLogId,
        symptomName,
        createdAt: atHour(date, 20),
      });
    }
  }

  return fixtures;
}
