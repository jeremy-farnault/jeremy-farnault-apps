import { describe, expect, it } from "vitest";

import { SUPPORTED_CURRENCIES } from "@jf/db";
import { DEMO_APPS, buildDemoFixtures } from ".";

import { makeShotContext } from "../capture/manifest";
import { addDays } from "./dates";
import { DOSER_SYMPTOM_NAMES } from "./doser";
import { FINANCER_MONTHS, monthBefore } from "./financer";
import { GAINER_EXERCISE_NAMES } from "./gainer";

const USER_ID = "demo-user-id";
const TODAY = "2026-11-15";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
/** How far back any fixture may reach. */
const MAX_DAYS_BACK = 730;
/** Fields that are meant to be in the future, and how far ahead they may go. */
const FUTURE_FIELDS = new Set(["deadline"]);
const MAX_DAYS_AHEAD = 90;

type Row = Record<string, unknown>;

/** Every row of every table of every app, tagged with where it came from. */
function allRows(fixtures: ReturnType<typeof buildDemoFixtures>) {
  return Object.entries(fixtures).flatMap(([app, tables]) =>
    Object.entries(tables as Record<string, Row[]>).flatMap(([table, rows]) =>
      rows.map((row) => ({ where: `${app}.${table}`, row }))
    )
  );
}

/** The day offset from TODAY of each date-like field, keyed by row and field. */
function dateOffsets(fixtures: ReturnType<typeof buildDemoFixtures>, today: string) {
  const base = Date.parse(`${today}T00:00:00Z`);
  const offsets = new Map<string, number>();
  allRows(fixtures).forEach(({ where, row }, index) => {
    for (const [field, value] of Object.entries(row)) {
      const time =
        value instanceof Date
          ? value.getTime()
          : typeof value === "string" && ISO_DATE.test(value)
            ? Date.parse(`${value}T00:00:00Z`)
            : null;
      if (time !== null) offsets.set(`${where}#${index}.${field}`, (time - base) / DAY_MS);
    }
  });
  return offsets;
}

describe("buildDemoFixtures", () => {
  const fixtures = buildDemoFixtures({ userId: USER_ID, today: TODAY });

  it("covers every demo app", () => {
    expect(Object.keys(fixtures).sort()).toEqual([...DEMO_APPS].sort());
  });

  it("gives every app some rows", () => {
    for (const app of DEMO_APPS) {
      const tables = Object.values(fixtures[app]) as Row[][];
      expect(
        tables.every((rows) => rows.length > 0),
        app
      ).toBe(true);
    }
  });

  it("assigns every user-owned row to the given user", () => {
    for (const { where, row } of allRows(fixtures)) {
      if ("userId" in row) expect(row.userId, where).toBe(USER_ID);
    }
  });

  it("dates everything within the last two years, never after today except deadlines", () => {
    const offsets = dateOffsets(fixtures, TODAY);
    expect(offsets.size).toBeGreaterThan(0);
    for (const [field, offset] of offsets) {
      const name = field.slice(field.lastIndexOf(".") + 1);
      // Timestamps fall during the day, so allow up to one day past today's midnight.
      expect(offset, field).toBeLessThan(FUTURE_FIELDS.has(name) ? MAX_DAYS_AHEAD : 1);
      expect(offset, field).toBeGreaterThanOrEqual(-MAX_DAYS_BACK);
    }
  });

  it("moves every date by the same number of days when today moves", () => {
    const later = addDays(TODAY, 45);
    const moved = buildDemoFixtures({ userId: USER_ID, today: later });
    expect(dateOffsets(moved, later)).toEqual(dateOffsets(fixtures, TODAY));
  });

  it("gives identical output for the same inputs", () => {
    expect(buildDemoFixtures({ userId: USER_ID, today: TODAY })).toEqual(fixtures);
  });

  it("gives every row a unique id", () => {
    // Join rows (Organiser's card tags) have no id of their own.
    const ids = allRows(fixtures)
      .map(({ row }) => row.id)
      .filter((id) => id !== undefined);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("rejects a today that isn't a YYYY-MM-DD date", () => {
    expect(() => buildDemoFixtures({ userId: USER_ID, today: "15/11/2026" })).toThrow();
  });
});

describe("routiner fixtures", () => {
  const { habits, logs } = buildDemoFixtures({ userId: USER_ID, today: TODAY }).routiner;
  const habitsById = new Map(habits.map((habit) => [habit.id, habit]));

  it("points every log at a habit in the output", () => {
    for (const log of logs) expect(habitsById.has(log.habitId), log.id).toBe(true);
  });

  it("logs each habit at most once a day", () => {
    const keys = logs.map((log) => `${log.habitId}:${log.date}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never logs a habit before it started or after it was archived", () => {
    for (const log of logs) {
      const habit = habitsById.get(log.habitId);
      expect(log.date >= (habit?.startDate ?? ""), log.id).toBe(true);
      if (habit?.archivedAt) {
        expect(log.date <= habit.archivedAt.toISOString().slice(0, 10), log.id).toBe(true);
      }
    }
  });

  it("stores values in the format Routiner reads for each habit type", () => {
    const formats = { boolean: /^true$/, numeric: /^\d+$/, time: /^\d{2}:\d{2}$/ };
    for (const log of logs) {
      const type = habitsById.get(log.habitId)?.type ?? "boolean";
      expect(log.value, `${type} ${log.id}`).toMatch(formats[type]);
    }
  });

  it("keeps at least one archived habit and several active ones", () => {
    expect(habits.filter((habit) => habit.archivedAt).length).toBeGreaterThanOrEqual(1);
    expect(habits.filter((habit) => !habit.archivedAt).length).toBeGreaterThanOrEqual(4);
  });

  it("logs every active habit in the last week", () => {
    const weekAgo = addDays(TODAY, -7);
    for (const habit of habits.filter((h) => !h.archivedAt)) {
      expect(
        logs.some((log) => log.habitId === habit.id && log.date >= weekAgo),
        habit.name
      ).toBe(true);
    }
  });
});

describe("financer fixtures", () => {
  const financer = buildDemoFixtures({ userId: USER_ID, today: TODAY }).financer;
  const expectedMonths = Array.from({ length: FINANCER_MONTHS }, (_, i) =>
    monthBefore(TODAY, FINANCER_MONTHS - 1 - i)
  );
  const monthRows = [
    ...financer.entries,
    ...financer.summaries,
    ...financer.incomeEntries,
    ...financer.assetEntries,
  ];

  it("covers the twelve months ending with today's month", () => {
    expect(expectedMonths.at(-1)).toBe("2026-11");
    expect(expectedMonths[0]).toBe("2025-12");
    expect(new Set(monthRows.map((row) => row.month))).toEqual(new Set(expectedMonths));
  });

  it("moves every month along when today moves into the next month", () => {
    const next = buildDemoFixtures({ userId: USER_ID, today: "2026-12-03" }).financer;
    const months = (f: typeof financer) => [...new Set(f.assetEntries.map((row) => row.month))];
    expect(months(next)).toEqual([...months(financer).slice(1), "2026-12"]);
  });

  it("keeps this month open and every past month closed", () => {
    const current = expectedMonths.at(-1);
    expect(financer.entries.length).toBeGreaterThan(0);
    expect(financer.entries.every((row) => row.month === current)).toBe(true);
    expect(financer.summaries.some((row) => row.month === current)).toBe(false);
    for (const month of expectedMonths.slice(0, -1)) {
      expect(
        financer.summaries.some((row) => row.month === month),
        month
      ).toBe(true);
    }
  });

  it("only spends in categories that exist", () => {
    const names = new Set(financer.spendingCategories.map((category) => category.name));
    for (const row of [...financer.entries, ...financer.summaries]) {
      expect(names.has(row.category), row.category).toBe(true);
    }
  });

  it("points every income and asset entry at a source in the output", () => {
    const income = new Set(financer.incomeSources.map((source) => source.id));
    const assets = new Set(financer.assetSources.map((source) => source.id));
    for (const row of financer.incomeEntries) expect(income.has(row.sourceId), row.id).toBe(true);
    for (const row of financer.assetEntries) expect(assets.has(row.sourceId), row.id).toBe(true);
  });

  it("records each asset source once a month", () => {
    const keys = financer.assetEntries.map((row) => `${row.sourceId}:${row.month}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBe(financer.assetSources.length * FINANCER_MONTHS);
  });

  it("stores amounts as positive two-decimal numbers in supported currencies", () => {
    for (const row of monthRows) expect(row.value, row.id).toMatch(/^\d+\.\d{2}$/);
    const currencies = [
      ...financer.entries,
      ...financer.summaries,
      ...financer.incomeSources,
      ...financer.assetSources,
    ].map((row) => row.currency);
    for (const currency of currencies) {
      expect(SUPPORTED_CURRENCIES as readonly string[]).toContain(currency);
    }
  });

  it("has one settings row with a home currency", () => {
    expect(financer.settings).toHaveLength(1);
    expect(financer.settings[0]?.homeCurrency).toBe("SEK");
  });
});

describe("gainer fixtures", () => {
  const { sessions, sessionExercises, sets } = buildDemoFixtures({
    userId: USER_ID,
    today: TODAY,
  }).gainer;
  // The predefined exercises `pnpm seed:gainer` creates, with their types.
  const PREDEFINED: Record<string, "standard" | "pdc" | "duration"> = {
    "Bench Press": "standard",
    "Overhead Press": "standard",
    Dips: "pdc",
    "Tricep Pushdown": "standard",
    Deadlift: "standard",
    "Pull-Up": "pdc",
    "Barbell Row": "standard",
    "Bicep Curl": "standard",
    Squat: "standard",
    "Romanian Deadlift": "standard",
    "Leg Press": "standard",
    Plank: "duration",
  };

  it("only uses predefined exercises, by name", () => {
    for (const name of GAINER_EXERCISE_NAMES) expect(PREDEFINED, name).toHaveProperty(name);
    for (const row of sessionExercises) expect(row).not.toHaveProperty("exerciseId");
  });

  it("points every set at a session exercise and every exercise at a session", () => {
    const sessionIds = new Set(sessions.map((s) => s.id));
    const exerciseIds = new Set(sessionExercises.map((e) => e.id));
    for (const row of sessionExercises) expect(sessionIds.has(row.sessionId), row.id).toBe(true);
    for (const row of sets) expect(exerciseIds.has(row.sessionExerciseId), row.id).toBe(true);
  });

  it("has exactly one session in progress, started today, and the rest finished", () => {
    const active = sessions.filter((s) => s.finishedAt === null);
    expect(active).toHaveLength(1);
    expect(active[0]?.startedAt?.toISOString().slice(0, 10)).toBe(TODAY);
    for (const session of sessions.filter((s) => s.finishedAt)) {
      expect(session.finishedAt?.getTime(), session.name).toBeGreaterThan(
        session.startedAt?.getTime() ?? 0
      );
    }
    expect(sessions.length).toBeGreaterThan(20);
  });

  it("logs sets in the shape each exercise type reads", () => {
    const nameById = new Map(sessionExercises.map((e) => [e.id, e.exerciseName]));
    for (const set of sets) {
      const type = PREDEFINED[nameById.get(set.sessionExerciseId) ?? ""];
      if (type === "standard") {
        expect(set.weight, set.id).toMatch(/^\d+\.\d{2}$/);
        expect(set.reps, set.id).toBeGreaterThan(0);
      } else if (type === "pdc") {
        expect(set.weight ?? null, set.id).toBeNull();
        expect(set.reps, set.id).toBeGreaterThan(0);
      } else {
        expect(set.durationSeconds, set.id).toBeGreaterThan(0);
      }
    }
  });

  it("numbers sets from 1 within each session exercise", () => {
    const byExercise = new Map<string, number[]>();
    for (const set of sets) {
      byExercise.set(set.sessionExerciseId, [
        ...(byExercise.get(set.sessionExerciseId) ?? []),
        set.setNumber,
      ]);
    }
    for (const numbers of byExercise.values()) {
      expect(numbers).toEqual(numbers.map((_, i) => i + 1));
    }
  });

  it("gets stronger over time", () => {
    const benchWeights = sessionExercises
      .filter((e) => e.exerciseName === "Bench Press")
      .map((e) => Number(sets.find((s) => s.sessionExerciseId === e.id)?.weight));
    expect(benchWeights.at(-1)).toBeGreaterThan(benchWeights[0] ?? 0);
  });
});

describe("doser fixtures", () => {
  const doser = buildDemoFixtures({ userId: USER_ID, today: TODAY }).doser;
  const medicineIds = new Set(doser.medicines.map((m) => m.id));

  it("points pill types, overrides and doses at a medicine in the output", () => {
    for (const row of [...doser.pillTypes, ...doser.dayOverrides, ...doser.doseLogs]) {
      expect(medicineIds.has(row.medicineId), row.id).toBe(true);
    }
  });

  it("points every symptom entry at a log, naming a predefined symptom", () => {
    const logIds = new Set(doser.symptomLogs.map((log) => log.id));
    for (const row of doser.symptomLogEntries) {
      expect(logIds.has(row.symptomLogId), row.id).toBe(true);
      expect(DOSER_SYMPTOM_NAMES as readonly string[]).toContain(row.symptomName);
      expect(row).not.toHaveProperty("symptomId");
    }
  });

  it("keeps one dose per medicine per day, one override per medicine per day, one log per day", () => {
    const unique = (keys: string[]) => new Set(keys).size === keys.length;
    expect(unique(doser.doseLogs.map((r) => `${r.medicineId}:${r.date}`))).toBe(true);
    expect(unique(doser.dayOverrides.map((r) => `${r.medicineId}:${r.date}`))).toBe(true);
    expect(unique(doser.symptomLogs.map((r) => r.date))).toBe(true);
    expect(unique(doser.symptomLogEntries.map((r) => `${r.symptomLogId}:${r.symptomName}`))).toBe(
      true
    );
  });

  it("numbers pill types from 0 within each medicine", () => {
    for (const medicine of doser.medicines) {
      const positions = doser.pillTypes
        .filter((type) => type.medicineId === medicine.id)
        .map((type) => type.position);
      expect(positions).toEqual(positions.map((_, i) => i));
    }
  });

  it("never logs a dose before a cycle started or on a day switched off", () => {
    const startById = new Map(doser.medicines.map((m) => [m.id, m.cycleStartDate]));
    const off = new Set(doser.dayOverrides.map((r) => `${r.medicineId}:${r.date}`));
    for (const dose of doser.doseLogs) {
      expect(dose.date >= (startById.get(dose.medicineId) ?? ""), dose.id).toBe(true);
      expect(off.has(`${dose.medicineId}:${dose.date}`), dose.id).toBe(false);
    }
  });

  it("logs symptoms for today, so the symptoms shot opens a filled-in day", () => {
    expect(doser.symptomLogs.some((log) => log.date === TODAY)).toBe(true);
  });
});

describe("journaler fixtures", () => {
  const { entries } = buildDemoFixtures({ userId: USER_ID, today: TODAY }).journaler;

  it("covers every category, with ratings Journaler accepts", () => {
    expect(new Set(entries.map((e) => e.category))).toEqual(
      new Set(["Movie", "TV Show", "Book", "Game", "Manga"])
    );
    for (const entry of entries) {
      if (entry.rating !== null && entry.rating !== undefined) {
        expect(entry.rating, entry.title).toBeGreaterThanOrEqual(1);
        expect(entry.rating, entry.title).toBeLessThanOrEqual(10);
      }
    }
  });

  it("has enough entries to fill the grid, with no images", () => {
    expect(entries.length).toBeGreaterThanOrEqual(30);
    expect(entries.every((e) => e.imageKey === null)).toBe(true);
  });
});

describe("classer fixtures", () => {
  const fixtures = buildDemoFixtures({ userId: USER_ID, today: TODAY }).classer;

  it("points every item at a list in the output", () => {
    const ids = new Set(fixtures.classers.map((c) => c.id));
    for (const item of fixtures.items) expect(ids.has(item.classerId), item.name).toBe(true);
  });

  it("ranks each list's items 1, 2, 3… with no gaps or ties", () => {
    for (const classer of fixtures.classers) {
      const ranks = fixtures.items
        .filter((item) => item.classerId === classer.id)
        .map((item) => item.rank);
      expect(ranks, classer.name).toEqual(ranks.map((_, i) => i + 1));
    }
  });

  it("keeps one archived list and several active ones", () => {
    expect(fixtures.classers.filter((c) => c.archivedAt).length).toBe(1);
    expect(fixtures.classers.filter((c) => !c.archivedAt).length).toBeGreaterThanOrEqual(4);
  });

  it("gives the detail shot's list an id the manifest can find", () => {
    const hikes = makeShotContext(USER_ID).fixtureId("classer:list:hikes");
    expect(fixtures.classers.some((c) => c.id === hikes && !c.archivedAt)).toBe(true);
  });
});

describe("organiser fixtures", () => {
  const organiser = buildDemoFixtures({ userId: USER_ID, today: TODAY }).organiser;

  it("has one board, and every column and card on it", () => {
    expect(organiser.boards).toHaveLength(1);
    const boardId = organiser.boards[0]?.id;
    const columnIds = new Set(organiser.columns.map((c) => c.id));
    for (const column of organiser.columns) expect(column.boardId).toBe(boardId);
    for (const card of organiser.cards) {
      expect(card.boardId, card.title).toBe(boardId);
      expect(columnIds.has(card.columnId), card.title).toBe(true);
    }
  });

  it("orders columns and each column's cards by strictly increasing positions", () => {
    const increasing = (keys: string[]) =>
      keys.every((key, i) => i === 0 || key > (keys[i - 1] ?? ""));
    expect(increasing(organiser.columns.map((c) => c.position))).toBe(true);
    for (const column of organiser.columns) {
      const keys = organiser.cards.filter((c) => c.columnId === column.id).map((c) => c.position);
      expect(increasing(keys), column.name).toBe(true);
    }
  });

  it("tags cards with tags that exist, once each", () => {
    const tagIds = new Set(organiser.tags.map((t) => t.id));
    const cardIds = new Set(organiser.cards.map((c) => c.id));
    for (const link of organiser.cardTags) {
      expect(tagIds.has(link.tagId)).toBe(true);
      expect(cardIds.has(link.cardId)).toBe(true);
    }
    const keys = organiser.cardTags.map((l) => `${l.cardId}:${l.tagId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("marks exactly one done column, and stores bodies as rich-text documents", () => {
    expect(organiser.columns.filter((c) => c.isDone)).toHaveLength(1);
    for (const card of organiser.cards.filter((c) => c.body)) {
      expect(JSON.parse(card.body ?? "").type, card.title).toBe("doc");
    }
  });

  it("has overdue and upcoming deadlines", () => {
    const deadlines = organiser.cards.flatMap((c) => (c.deadline ? [c.deadline] : []));
    expect(deadlines.some((d) => d < TODAY)).toBe(true);
    expect(deadlines.some((d) => d > TODAY)).toBe(true);
  });
});

describe("unifier fixtures", () => {
  const unifier = buildDemoFixtures({ userId: USER_ID, today: TODAY }).unifier;
  const personIds = new Set(unifier.persons.map((p) => p.id));

  it("points slots and people at arcs, values at their person's arc's slots, touches at people", () => {
    const arcIds = new Set(unifier.arcs.map((a) => a.id));
    const arcOfSlot = new Map(unifier.slots.map((s) => [s.id, s.arcId]));
    const arcOfPerson = new Map(unifier.persons.map((p) => [p.id, p.arcId]));
    for (const slot of unifier.slots) expect(arcIds.has(slot.arcId)).toBe(true);
    for (const person of unifier.persons) expect(arcIds.has(person.arcId)).toBe(true);
    for (const value of unifier.slotValues) {
      expect(arcOfSlot.get(value.slotId), value.id).toBe(arcOfPerson.get(value.personId));
    }
    for (const touch of unifier.touches) expect(personIds.has(touch.personId)).toBe(true);
  });

  it("keeps the important flag and its date together", () => {
    for (const person of unifier.persons) {
      expect(person.important, person.name).toBe(person.flaggedAt !== null);
    }
  });

  it("spreads drift from today to never", () => {
    const touched = new Set(unifier.touches.map((t) => t.personId));
    expect(unifier.persons.some((p) => !touched.has(p.id ?? ""))).toBe(true);
    const days = unifier.touches.map((t) => t.occurredAt?.toISOString().slice(0, 10));
    expect(days).toContain(TODAY);
  });
});
