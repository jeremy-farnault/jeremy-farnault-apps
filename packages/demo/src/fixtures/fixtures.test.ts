import { describe, expect, it } from "vitest";

import { SUPPORTED_CURRENCIES } from "@jf/db";
import { DEMO_APPS, buildDemoFixtures } from ".";

import { addDays } from "./dates";
import { FINANCER_MONTHS, monthBefore } from "./financer";

const USER_ID = "demo-user-id";
const TODAY = "2026-11-15";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
/** How far back any fixture may reach. */
const MAX_DAYS_BACK = 730;

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

  it("dates everything within the last two years, never after today", () => {
    const offsets = dateOffsets(fixtures, TODAY);
    expect(offsets.size).toBeGreaterThan(0);
    for (const [field, offset] of offsets) {
      // Timestamps fall during the day, so allow up to one day past today's midnight.
      expect(offset, field).toBeLessThan(1);
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
    const ids = allRows(fixtures).map(({ row }) => row.id);
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
